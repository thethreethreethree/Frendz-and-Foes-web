import { describe, it, expect } from "vitest";
import { NEW_100, RANDOM_POOL, buildRandomizedGame } from "../src/bank.js";

describe("random bank", () => {
  it("has 100 new questions and a 120-question pool", () => {
    expect(NEW_100.length).toBe(100);
    expect(RANDOM_POOL.length).toBe(120);
  });

  it("every question has a prompt, a unique id, and 1-8 answers", () => {
    const ids = new Set<string>();
    for (const q of RANDOM_POOL) {
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(q.answers.length).toBeGreaterThan(0);
      expect(q.answers.length).toBeLessThanOrEqual(8);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      // points are a clean descending 8..1 ranking
      q.answers.forEach((a, i) => expect(a.rankPoints).toBe(8 - i));
    }
  });

  it("builds a 21-question randomized game: 20 regular + 1 bonus, all distinct and fresh", () => {
    const game = buildRandomizedGame(RANDOM_POOL);
    expect(game.length).toBe(21);
    expect(game.slice(0, 20).every((q) => q.kind === "regular")).toBe(true);
    expect(game[20].kind).toBe("bonus");
    expect(new Set(game.map((q) => q.id)).size).toBe(21); // no repeats within a game
    expect(game.every((q) => q.answers.every((a) => !a.revealed))).toBe(true);
  });

  it("reshuffles between games (two builds usually differ)", () => {
    const a = buildRandomizedGame(RANDOM_POOL).map((q) => q.id).join(",");
    const b = buildRandomizedGame(RANDOM_POOL).map((q) => q.id).join(",");
    // Astronomically unlikely to match across a 120-pool draw; guards against a non-random build.
    expect(a).not.toBe(b);
  });
});
