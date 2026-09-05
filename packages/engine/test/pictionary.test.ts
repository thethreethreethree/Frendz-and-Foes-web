import { describe, it, expect } from "vitest";
import { PICTIONARY_WORDS, pictionaryDeck } from "../src/index.js";

describe("quick draw (pictionary) deck", () => {
  it("has a healthy set of unique, drawable words", () => {
    expect(PICTIONARY_WORDS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(PICTIONARY_WORDS).size).toBe(PICTIONARY_WORDS.length);
  });
  it("builds cards in the shared engine's shape", () => {
    const deck = pictionaryDeck();
    expect(deck.length).toBe(PICTIONARY_WORDS.length);
    expect(deck[0]).toHaveProperty("word");
  });
});
