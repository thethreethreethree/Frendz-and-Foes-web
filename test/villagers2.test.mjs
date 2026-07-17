// Roster invariants: unique weapons per character (the deduction depends on it), valid references,
// and that every declared art path has a real file behind it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VILLAGERS, WEAPONS, villagerForWeapon, getVillager, methodAt } from "../apps/server/villagers2.js";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public");

test("roster is the full 100 characters", () => {
  assert.equal(VILLAGERS.length, 100);
});

test("every character has an art path for future graphics", () => {
  for (const v of VILLAGERS) {
    assert.equal(v.art, `/villagers/${v.id}.webp`);
    assert.equal(v.thumb, `/villagers/thumb/${v.id}.webp`);
  }
});

// A31 gate: asserting the path STRING is what let the art system look complete while the folder held
// nothing but a README. A declared path with no file behind it renders an emoji fallback that is
// indistinguishable from working. These two tests check the seam to disk, so the class fails loudly.
test("every character's art + thumb file actually EXISTS on disk", () => {
  const missing = VILLAGERS.flatMap((v) =>
    [v.art, v.thumb].filter((p) => !existsSync(join(PUBLIC, p))).map((p) => `${v.id}: ${p}`),
  );
  assert.deepEqual(missing, [], `character art files missing:\n${missing.join("\n")}`);
});

test("every weapon's art + thumb file actually EXISTS on disk", () => {
  const missing = Object.values(WEAPONS).flatMap((w) =>
    [w.art, w.thumb].filter((p) => !existsSync(join(PUBLIC, p))).map((p) => `${w.id}: ${p}`),
  );
  assert.deepEqual(missing, [], `weapon art files missing:\n${missing.join("\n")}`);
});

// The item-set model (founder's manifest). The deduction lives at the SET level; methods are
// deliberately shared between sets, so asserting method-uniqueness would be wrong — asserting SET
// uniqueness is the invariant that actually carries the game.
test("every item set carries its three methods, a location label and a set number", () => {
  for (const w of Object.values(WEAPONS)) {
    assert.equal(w.methods.length, 3, `${w.id} should have exactly 3 methods`);
    assert.ok(w.methods.every((m) => typeof m === "string" && m.length > 0), `${w.id} has an empty method`);
    assert.ok(typeof w.location === "string" && w.location.length > 0, `${w.id} has no location`);
    assert.ok(Number.isInteger(w.setNumber) && w.setNumber >= 1 && w.setNumber <= 100, `${w.id} bad setNumber`);
  }
});

test("set numbers are 1..100 and match the printed ITEM SET card numbers", () => {
  const nums = VILLAGERS.map((v) => v.setNumber).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: 100 }, (_, i) => i + 1));
});

// This is the manifest's actual shape and the reason the deduction key is the SET, not the method:
// three different villagers can each reach for a letter opener.
test("methods MAY repeat across sets — only the set identifies a suspect", () => {
  const all = Object.values(WEAPONS).flatMap((w) => w.methods.map((m) => m.toLowerCase()));
  assert.ok(new Set(all).size < all.length, "expected shared methods across sets (per the manifest)");
});

test("methodAt clamps into range and resolves the named method", () => {
  assert.equal(methodAt("scalpel", 1), "scalpel");
  assert.equal(methodAt("scalpel", 0), WEAPONS.scalpel.methods[0]);
  assert.equal(methodAt("scalpel", 99), WEAPONS.scalpel.methods[2], "out of range clamps to last");
  assert.equal(methodAt("scalpel", -5), WEAPONS.scalpel.methods[0], "negative clamps to first");
  assert.equal(methodAt("not_a_set", 0), null);
});

test("every character's weapon is UNIQUE (a clue points at exactly one profession)", () => {
  const weapons = VILLAGERS.map((v) => v.weaponId);
  assert.equal(new Set(weapons).size, weapons.length, "duplicate signature weapons exist");
});

test("every weaponId resolves to a defined weapon", () => {
  for (const v of VILLAGERS) assert.ok(WEAPONS[v.weaponId], `${v.id} has unknown weapon ${v.weaponId}`);
});

test("character ids are unique", () => {
  const ids = VILLAGERS.map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("villagerForWeapon inverts the weapon → character mapping", () => {
  for (const v of VILLAGERS) assert.equal(villagerForWeapon(v.weaponId)?.id, v.id);
  assert.equal(villagerForWeapon("nope"), null);
  assert.equal(getVillager("nope"), null);
});
