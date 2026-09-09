// Guards on the schema file itself.
//
// WHY THIS EXISTS: I broke apps/server/sqlite.js THREE TIMES in one session, the same way each
// time — writing a SQL comment that quotes an identifier in backticks, inside a JavaScript template
// literal that is itself delimited by backticks. The first one ends the string, and the entire
// database module stops parsing. Every store that imports it degrades, which is the whole server.
//
// The mistake is invisible while writing: `events` is exactly how you would refer to a table in a
// comment, and it looks correct until node refuses the file. Being more careful three times did not
// work, so this makes it fail loudly and immediately instead.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(HERE, "sqlite.js"), "utf8");
const BT = String.fromCharCode(96);

let fails = 0;
const check = (label, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  <- " + detail}`);
};

// --- the one that keeps biting ---------------------------------------------------------------
const open = src.indexOf("db.exec(" + BT);
check("the schema template is where it is expected", open > -1);
const close = src.indexOf(BT + ");", open);
check("the schema template is closed", close > open);

const schema = src.slice(open + 9, close);
const stray = schema.split(BT).length - 1;
check("NO backticks inside the schema template", stray === 0,
      stray + " found — each one ends the template early and breaks the whole module");

// --- the schema actually contains what the app expects -----------------------------------------
const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
const EXPECTED = [
  "backers", "backer_codes", "subscriptions", "meta", "users", "brand_owners", "brands",
  "messages", "events", "payments", "fulfilment", "game_sessions", "staff", "game_picks", "venues",
];
for (const t of EXPECTED) check(`table ${t} is declared`, tables.includes(t));
check("no table is declared twice", new Set(tables).size === tables.length,
      tables.filter((t, i) => tables.indexOf(t) !== i).join(", "));

// --- columns added to an EXISTING table must go through ensureColumn ----------------------------
// CREATE TABLE IF NOT EXISTS does nothing to a table that already exists, so a column added to one
// of these after first deploy silently never appears on the live database. There is no way to check
// that automatically without the deployed schema, so this asserts the ONE case we know about is
// handled and leaves a marker for the next person.
check("events.actor_staff_id goes through ensureColumn, not the CREATE",
      /ensureColumn\("events",\s*"actor_staff_id"/.test(src) &&
      !/CREATE TABLE IF NOT EXISTS events[\s\S]{0,400}actor_staff_id/.test(schema));

// --- money is always integer minor units ---------------------------------------------------------
const moneyCols = [...schema.matchAll(/^\s*(\w*(?:cents|amount)\w*)\s+(\w+)/gim)];
for (const [, col, type] of moneyCols) {
  check(`${col} is an INTEGER (money is never a float)`, type.toUpperCase() === "INTEGER", type);
}

console.log(fails ? `\n${fails} FAILED` : "\nall schema checks passed");
process.exit(fails ? 1 : 0);
