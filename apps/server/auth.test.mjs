// Admin accounts + brands SQLite migration test.  Run:  node apps/server/auth.test.mjs
//
// These are the LAST two JSON stores. They hold brand-admin logins and the white-label configs, so
// the migration has to preserve not just the data but the security behaviour: password hashes must
// still verify, sessions must still be rejected when tampered with, and a duplicate email must still
// be refused.
//
// Self-contained: its own throwaway stores and database under the OS temp directory.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEP = String.fromCharCode(92);
const SRV = "file:///" + HERE.split(SEP).join("/").split(" ").join("%20") + "/";
const TMP = join(tmpdir(), "playzoo-auth-test");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "auth"), { recursive: true });
mkdirSync(join(TMP, "brands"), { recursive: true });

// A legacy user, hashed exactly the way the old store did it, so this proves real hashes still
// verify after the move rather than only newly-created ones.
const salt = randomBytes(16);
const legacyPassword = "correct horse battery";
writeFileSync(join(TMP, "auth", "users.json"), JSON.stringify({
  u_old: {
    id: "u_old", email: "Founder@PlayZoo.test", emailLower: "founder@playzoo.test",
    salt: salt.toString("hex"),
    hash: scryptSync(legacyPassword, salt, 64).toString("hex"),
    created: Date.now() - 100000,
  },
}, null, 2));
writeFileSync(join(TMP, "auth", "owners.json"), JSON.stringify({ "acme-bar": "u_old" }, null, 2));
writeFileSync(join(TMP, "brands", "acme-bar.json"), JSON.stringify({ name: "Acme Bar", primary: "#ff0000" }, null, 2));
writeFileSync(join(TMP, "brands", "broken.json"), "{not valid json");

process.env.AUTH_DIR = join(TMP, "auth");
process.env.DATA_DIR = join(TMP, "brands");
process.env.DB_PATH = join(TMP, "playzoo.db");

const auth = await import(SRV + "auth.js");
const brands = await import(SRV + "db.js");

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`);
};

console.log("\n--- the legacy admin account survived ---");
check("ready", auth.authReady(), true);
check("found by id", auth.getUser("u_old")?.email, "Founder@PlayZoo.test");
// The one that matters: an existing password must still authenticate after the move.
check("existing password still verifies", auth.authenticate("founder@playzoo.test", legacyPassword)?.id, "u_old");
check("email match is case-insensitive", auth.authenticate("FOUNDER@PlayZoo.test", legacyPassword)?.id, "u_old");
check("wrong password refused", auth.authenticate("founder@playzoo.test", "nope"), null);
check("unknown email refused", auth.authenticate("nobody@playzoo.test", legacyPassword), null);
check("public user hides the hash", Object.keys(auth.getUser("u_old")).includes("hash"), false);

console.log("\n--- brand ownership survived ---");
check("owner of acme-bar", auth.ownerOf("acme-bar"), "u_old");
check("brands owned by that user", auth.brandsOwnedBy("u_old"), ["acme-bar"]);
check("unowned slug", auth.ownerOf("nobody-brand"), null);

console.log("\n--- brands survived ---");
check("brand config readable", brands.getBrand("acme-bar")?.name, "Acme Bar");
check("only the valid brand imported", brands.listBrandSlugs().map((b) => b.slug), ["acme-bar"]);
// A corrupt file must be skipped, not stored as junk that later fails to parse on read.
check("corrupt brand file skipped", brands.getBrand("broken"), null);
check("path traversal refused", brands.getBrand("../../etc/passwd"), null);

console.log("\n--- writes ---");
const made = auth.createUser("New@Person.test", "hunter2hunter2");
check("createUser works", !!made.user, true);
check("new password verifies", auth.authenticate("new@person.test", "hunter2hunter2")?.id, made.user.id);
check("duplicate email refused", !!auth.createUser("NEW@person.test", "another-password").error, true);
check("short password refused", !!auth.createUser("x@y.test", "short").error, true);
check("invalid email refused", !!auth.createUser("not-an-email", "hunter2hunter2").error, true);

auth.setOwner("second-brand", made.user.id);
check("setOwner", auth.ownerOf("second-brand"), made.user.id);
check("brandsOwnedBy updated", auth.brandsOwnedBy(made.user.id), ["second-brand"]);
auth.removeOwner("second-brand");
check("removeOwner", auth.ownerOf("second-brand"), null);

check("upsertBrand", brands.upsertBrand("acme-bar", { name: "Acme Bar 2", primary: "#00ff00" }), true);
check("brand updated in place", brands.getBrand("acme-bar")?.name, "Acme Bar 2");
check("no duplicate row", brands.listBrandSlugs().filter((b) => b.slug === "acme-bar").length, 1);
check("upsert refuses a bad slug", brands.upsertBrand("../evil", { name: "x" }), false);
check("deleteBrand", brands.deleteBrand("acme-bar") && brands.getBrand("acme-bar"), null);

console.log("\n--- sessions ---");
const tok = auth.makeSession("u_old");
check("valid session reads back", auth.readSession(tok)?.uid, "u_old");
check("tampered session rejected", auth.readSession(tok.slice(0, -2) + "xy"), null);
check("session for an unknown user rejected", auth.readSession(auth.makeSession("u_ghost")), null);
check("garbage rejected", auth.readSession("nonsense"), null);

// The case that caught a real bug. The brands table is EMPTY here, because the deleteBrand test
// above removed the only brand. The migrations originally guarded on "is the table empty?",
// which is NOT the same question as "has this migrated?" - so a restart re-imported the legacy
// JSON and brought a deliberately-deleted brand back to life. Migrations now record that they
// have run, in the meta table.
console.log("\n--- idempotency, and NO RESURRECTION of deleted data ---");
const { db } = await import(SRV + "sqlite.js");
const before = {
  users: db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
  owners: db.prepare("SELECT COUNT(*) AS n FROM brand_owners").get().n,
  brands: db.prepare("SELECT COUNT(*) AS n FROM brands").get().n,
};
await import(SRV + "auth.js?again");
await import(SRV + "db.js?again");
check("user count unchanged", db.prepare("SELECT COUNT(*) AS n FROM users").get().n, before.users);
check("owner count unchanged", db.prepare("SELECT COUNT(*) AS n FROM brand_owners").get().n, before.owners);
check("brand count unchanged", db.prepare("SELECT COUNT(*) AS n FROM brands").get().n, before.brands);
check("the DELETED brand stayed deleted", brands.getBrand("acme-bar"), null);
check("the migration is recorded as done", (await import(SRV + "sqlite.js")).hasMigrated("brands"), true);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
