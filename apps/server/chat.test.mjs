// Chat SQLite migration test.  Run:  node apps/server/chat.test.mjs
//
// The chat store moved off a JSON blob that was rewritten IN FULL on every send. This proves the
// migration keeps the live data intact and the behaviour identical: message SHAPES (a Rex line, a
// John line and a backer line are told apart by different fields), chronological order, the room
// access rules, the 200-per-room cap, and that a restart does not re-import.
//
// Self-contained: it builds its own throwaway store and database under the OS temp directory.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";
const TMP = join(tmpdir(), "playzoo-chat-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });

const now = Date.now();
// The legacy shape: roomId -> [ {id, at, text, backerId} | {rex:true} | {john:true} ]
writeFileSync(join(TMP, "chat.json"), JSON.stringify({
  general: [
    { id: "m1", at: now - 5000, text: "Welcome to The Watering Hole", rex: true },
    { id: "m2", at: now - 4000, text: "hello all", backerId: "b1111111111111111" },
    { id: "m3", at: now - 3000, text: "want to buy a sock?", john: true },
  ],
  rowdies: [{ id: "m4", at: now - 2000, text: "The Rowdies' den.", rex: true }],
}, null, 2));

process.env.AUTH_DIR = join(TMP, "auth");
process.env.DB_PATH = join(TMP, "playzoo.db");

const chat = await import(SRV + "chat.js");
const { db } = await import(SRV + "sqlite.js");

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

console.log("\n--- legacy messages survived, in order, with their shapes ---");
const g = chat.getMessages("general", 60);
check("3 messages in general", g.length, 3);
check("chronological order kept", g.map((m) => m.text),
  ["Welcome to The Watering Hole", "hello all", "want to buy a sock?"]);
check("Rex line keeps rex:true", g[0], { id: "m1", at: now - 5000, text: "Welcome to The Watering Hole", rex: true });
check("backer line keeps backerId", g[1], { id: "m2", at: now - 4000, text: "hello all", backerId: "b1111111111111111" });
check("John line keeps john:true", g[2], { id: "m3", at: now - 3000, text: "want to buy a sock?", john: true });

console.log("\n--- rooms that had no history got seeded, ones that had it did NOT ---");
check("rowdies kept its own single line", chat.getMessages("rowdies").length, 1);
for (const id of ["cuddle-crew", "know-it-owls", "schemers"]) {
  const m = chat.getMessages(id);
  check(`${id} seeded with one Rex welcome`, [m.length, !!m[0]?.rex], [1, true]);
}

console.log("\n--- access rules unchanged ---");
const backer = { id: "b1", enclosure: "rowdies" };
check("General is open to everyone", chat.canAccess(backer, "general"), true);
check("own enclosure allowed", chat.canAccess(backer, "rowdies"), true);
check("another enclosure refused", chat.canAccess(backer, "schemers"), false);
check("unknown room refused", chat.canAccess(backer, "nope"), false);
check("no backer refused", chat.canAccess(null, "general"), false);
check("roomsFor gives General + own", chat.roomsFor(backer).map((r) => r.id), ["general", "rowdies"]);

console.log("\n--- writes ---");
const w = chat.addMessage("general", "b1111111111111111", "a new line");
check("addMessage returns the message", !!w.message, true);
check("it reads back last", chat.getMessages("general").at(-1).text, "a new line");
check("empty text refused", !!chat.addMessage("general", "b1", "   ").error, true);
check("over-long text refused", !!chat.addMessage("general", "b1", "x".repeat(1001)).error, true);
chat.addRexMessage("general", "Rex says hi");
check("Rex line flagged", chat.getMessages("general").at(-1).rex, true);
chat.addJohnMessage("general", "John says buy this");
check("John line flagged", chat.getMessages("general").at(-1).john, true);

console.log("\n--- the 200-per-room cap still holds ---");
for (let i = 0; i < 230; i++) chat.addMessage("general", "b1111111111111111", `spam ${i}`);
const total = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE room = 'general'").get().n;
check("capped at 200", total, 200);
check("newest survived", chat.getMessages("general", 1)[0].text, "spam 229");
check("other rooms untouched by the trim", chat.getMessages("rowdies").length, 1);

console.log("\n--- limit argument ---");
check("limit returns the newest N", chat.getMessages("general", 3).map((m) => m.text),
  ["spam 227", "spam 228", "spam 229"]);

console.log("\n--- idempotency: a restart must not re-import ---");
const before = db.prepare("SELECT COUNT(*) AS n FROM messages").get().n;
await import(SRV + "chat.js?again");
check("message count unchanged", db.prepare("SELECT COUNT(*) AS n FROM messages").get().n, before);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
