import { describe, it, expect } from "vitest";
import { FULLCAST_PHRASES, fullCastDeck, createWordGame, wordGameReducer, cardAt, toPublicWordGame } from "../src/index.js";

describe("full cast (reverse charades) deck", () => {
  it("has a healthy set of unique phrases", () => {
    expect(FULLCAST_PHRASES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(FULLCAST_PHRASES).size).toBe(FULLCAST_PHRASES.length);
  });

  it("builds engine cards and plays with the shared engine, keeping the phrase off the public snapshot", () => {
    const deck = fullCastDeck();
    expect(deck[0]).toHaveProperty("word");
    let s = createWordGame(deck, { config: { winScore: 5, turnSeconds: 60, skipPenalty: 0 } });
    s = wordGameReducer(deck, s, { type: "SET_TEAMS", teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
    s = wordGameReducer(deck, s, { type: "START" });
    s = wordGameReducer(deck, s, { type: "BEGIN_TURN" });
    const phrase = cardAt(deck, s)!.word;
    s = wordGameReducer(deck, s, { type: "GOT" });
    expect(s.teams[0].score).toBe(1);
    expect(JSON.stringify(toPublicWordGame(s))).not.toContain(phrase);
  });
});
