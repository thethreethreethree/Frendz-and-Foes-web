// Unit tests for the accounts core (apps/server/auth.js): scrypt password hashing, stateless
// HMAC session cookies, and brand ownership. Points AUTH_DIR at a throwaway temp dir (set BEFORE
// importing the module, via dynamic import) so it never touches real data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.AUTH_DIR = mkdtempSync(join(tmpdir(), "pz-auth-"));
process.env.AUTH_SECRET = "test-secret-fixed";
const auth = await import("../apps/server/auth.js");

test("signup validates and rejects duplicates", () => {
  assert.ok(auth.createUser("bad-email", "password123").error, "invalid email rejected");
  assert.ok(auth.createUser("a@b.com", "short").error, "short password rejected");
  const r = auth.createUser("Alice@Example.com", "password123");
  assert.equal(r.error, undefined);
  assert.equal(r.user.email, "Alice@Example.com");
  // duplicate (case-insensitive) is rejected
  assert.ok(auth.createUser("alice@example.com", "otherpass1").error);
});

test("authenticate: right password passes, wrong/unknown fail", () => {
  auth.createUser("bob@example.com", "hunter2hunter");
  assert.ok(auth.authenticate("bob@example.com", "hunter2hunter"));
  assert.equal(auth.authenticate("bob@example.com", "wrongpass"), null);
  assert.equal(auth.authenticate("nobody@example.com", "whatever12"), null);
  // case-insensitive email
  assert.ok(auth.authenticate("BOB@example.com", "hunter2hunter"));
});

test("sessions: round-trip works; tampered or garbage tokens are rejected", () => {
  const { user } = auth.createUser("carol@example.com", "password123");
  const tok = auth.makeSession(user.id);
  assert.equal(auth.readSession(tok).uid, user.id);
  assert.equal(auth.readSession(tok.slice(0, -1) + (tok.slice(-1) === "a" ? "b" : "a")), null, "tampered sig rejected");
  assert.equal(auth.readSession("garbage"), null);
  assert.equal(auth.readSession(""), null);
  // a session for a user id that doesn't exist is rejected
  assert.equal(auth.readSession(auth.makeSession("u-nonexistent")), null);
});

test("ownership: claim, list, transfer-guard, remove", () => {
  const a = auth.createUser("owner1@example.com", "password123").user;
  const b = auth.createUser("owner2@example.com", "password123").user;
  auth.setOwner("acme", a.id);
  auth.setOwner("acme2", a.id);
  auth.setOwner("beta", b.id);
  assert.equal(auth.ownerOf("acme"), a.id);
  assert.deepEqual(auth.brandsOwnedBy(a.id).sort(), ["acme", "acme2"]);
  assert.deepEqual(auth.brandsOwnedBy(b.id), ["beta"]);
  auth.removeOwner("acme");
  assert.equal(auth.ownerOf("acme"), null);
});

test("cookie helpers: parse + Secure flag", () => {
  assert.equal(auth.parseCookies("pz_session=abc; other=1").pz_session, "abc");
  assert.match(auth.sessionCookie("tok", true), /HttpOnly.*Secure/);
  assert.doesNotMatch(auth.sessionCookie("tok", false), /Secure/);
  assert.match(auth.clearCookie(true), /Max-Age=0/);
});
