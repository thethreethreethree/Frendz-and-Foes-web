import { describe, it, expect } from "vitest";
import { createGame, reducer } from "../src/engine.js";
import { SAMPLE_BONUS } from "../src/fixtures.js";
import { turnFocus, isQuestionComplete } from "../src/rules.js";
import { play, teamScore, teams } from "./helpers.js";

// SAMPLE_BONUS answers: bonus1-a1 Vigan, bonus1-a2 Cebu City, bonus1-a3 Intramuros — flat 8 each.
const VIGAN = "bonus1-a1";
const CEBU = "bonus1-a2";
const INTRAMUROS = "bonus1-a3";

function startedBonus() {
  const g = createGame({ teams: teams("a", "b", "c"), questions: [SAMPLE_BONUS] });
  return reducer(g, { type: "START_GAME" });
}

describe("bonus round", () => {
  it("pays a flat 8 per answer and lets a correct answerer keep going", () => {
    let s = startedBonus();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    expect(turnFocus(s)).toEqual({ stage: "bonus-participant", index: 0 });

    // Steady green (a) answers correctly twice — still their turn after each.
    s = reducer(s, { type: "AWARD", answerId: VIGAN, teamId: "a" });
    expect(teamScore(s, "a")).toBe(8);
    expect(turnFocus(s)).toEqual({ stage: "bonus-participant", index: 0 });

    s = reducer(s, { type: "AWARD", answerId: CEBU, teamId: "a" });
    expect(teamScore(s, "a")).toBe(16);
  });

  it("passes to the next participant on a miss, and ends when all answers are revealed", () => {
    let s = startedBonus();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    s = play(
      s,
      { type: "AWARD", answerId: VIGAN, teamId: "a" }, // a scores
      { type: "MISS", teamId: "a" }, // a misses → pass to b
    );
    expect(turnFocus(s)).toEqual({ stage: "bonus-participant", index: 1 });

    s = play(
      s,
      { type: "AWARD", answerId: CEBU, teamId: "b" },
      { type: "AWARD", answerId: INTRAMUROS, teamId: "b" }, // last answer → board complete
    );
    expect(teamScore(s, "a")).toBe(8);
    expect(teamScore(s, "b")).toBe(16);
    expect(isQuestionComplete(s)).toBe(true);
  });

  it("falls through to a random team when all three participants fail", () => {
    let s = startedBonus();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    s = play(
      s,
      { type: "MISS", teamId: "a" },
      { type: "MISS", teamId: "b" },
      { type: "MISS", teamId: "c" },
    );
    expect(turnFocus(s)).toEqual({ stage: "bonus-random" });

    // A random team now answers and keeps going under the same rule.
    s = reducer(s, { type: "AWARD", answerId: VIGAN, teamId: "c" });
    expect(teamScore(s, "c")).toBe(8);
    expect(turnFocus(s)).toEqual({ stage: "bonus-random" });
  });
});
