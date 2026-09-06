// Tests the AI-host fallback contract (apps/server/host.js): with no API key it must always return
// a non-empty canned line and never throw, so Rex can't break a game. Unsets the key BEFORE import.
import { test } from "node:test";
import assert from "node:assert/strict";

delete process.env.DEEPSEEK_API_KEY;
delete process.env.HOST_API_KEY;
const host = await import("../apps/server/host.js");

test("with no API key, hostReady() is false", () => {
  assert.equal(host.hostReady(), false);
});

test("every moment returns a non-empty canned line, tagged canned", async () => {
  for (const moment of ["intro", "round_start", "reveal", "correct", "wrong", "winner", "quip", "generic", "totally-unknown-moment"]) {
    const out = await host.hostLine({ room: "R", game: "Trivia", moment });
    assert.equal(out.source, "canned");
    assert.equal(typeof out.line, "string");
    assert.ok(out.line.length > 0, `empty line for ${moment}`);
  }
});

test("never throws on junk input", async () => {
  const out = await host.hostLine({});
  assert.equal(typeof out.line, "string");
  assert.ok(out.line.length > 0);
});
