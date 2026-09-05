import { describe, it, expect } from "vitest";
import {
  HEADSUP_CATEGORIES,
  headsUpDeck,
  createWordGame,
  wordGameReducer,
  cardAt,
  toPublicWordGame,
} from "../src/index.js";

describe("foreheads (heads up) decks", () => {
  it("every category has a unique id, an icon, and enough words", () => {
    const ids = new Set<string>();
    for (const c of HEADSUP_CATEGORIES) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.words.length).toBeGreaterThanOrEqual(12);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
    }
  });

  it("headsUpDeck builds cards in the shared engine's shape", () => {
    const deck = headsUpDeck("animals");
    expect(deck.length).toBeGreaterThan(0);
    expect(deck[0]).toHaveProperty("word");
    expect(deck[0].category).toBe("animals");
  });

  it("an unknown category falls back to the first category (never empty)", () => {
    expect(headsUpDeck("nope").length).toBeGreaterThan(0);
  });

  it("plays through the shared engine and keeps the live word out of the public snapshot", () => {
    const deck = headsUpDeck("food");
    let s = createWordGame(deck, { config: { winScore: 5, turnSeconds: 60, skipPenalty: 0 } });
    s = wordGameReducer(deck, s, { type: "SET_TEAMS", teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
    s = wordGameReducer(deck, s, { type: "START" });
    s = wordGameReducer(deck, s, { type: "BEGIN_TURN" });
    const word = cardAt(deck, s)!.word;
    s = wordGameReducer(deck, s, { type: "GOT" });
    expect(s.teams[0].score).toBe(1);
    expect(JSON.stringify(toPublicWordGame(s))).not.toContain(word);
  });
});
