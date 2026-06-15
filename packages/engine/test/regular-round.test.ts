import { describe, it, expect } from "vitest";
import { createGame, reducer } from "../src/engine.js";
import { SAMPLE_REGULAR_1 } from "../src/fixtures.js";
import { turnFocus, isQuestionComplete, revealedCount, fillsRemaining } from "../src/rules.js";
import { play, teamScore, teams } from "./helpers.js";

// Answer ids for SAMPLE_REGULAR_1 (sorted by rank desc):
// a1 Passport(8) a2 Sunblock(7) a3 Clothes(6) a4 Gadgets(5) a5 Bank Cards(4)
const PASSPORT = "q1-a1"; // 8 pts
const SUNBLOCK = "q1-a2"; // 7 pts
const GADGETS = "q1-a4"; // 5 pts

function startedGame() {
  const g = createGame({ teams: teams("a", "b", "c", "d", "e"), questions: [SAMPLE_REGULAR_1] });
  return reducer(g, { type: "START_GAME" });
}

describe("regular round", () => {
  it("awards points by the answer's rank, not the buzz order", () => {
    // C buzzed in 3rd (blue) but names the #1 answer → still gets the full 8.
    let s = startedGame();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    expect(turnFocus(s)).toEqual({ stage: "participant", index: 0 });

    s = play(
      s,
      { type: "AWARD", answerId: GADGETS, teamId: "a" }, // 1st names Gadgets → 5
      { type: "MISS", teamId: "b" }, // 2nd misses
      { type: "AWARD", answerId: PASSPORT, teamId: "c" }, // 3rd names Passport → 8
    );

    expect(teamScore(s, "a")).toBe(5);
    expect(teamScore(s, "b")).toBe(0);
    expect(teamScore(s, "c")).toBe(8);
  });

  it("pulls one random-team fill per participant miss, then completes", () => {
    let s = startedGame();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    s = play(
      s,
      { type: "AWARD", answerId: GADGETS, teamId: "a" },
      { type: "MISS", teamId: "b" }, // one miss → one fill owed
      { type: "AWARD", answerId: PASSPORT, teamId: "c" },
    );

    // After all 3 participant attempts, exactly one random-team fill is owed.
    expect(fillsRemaining(s.turn)).toBe(1);
    expect(turnFocus(s)).toEqual({ stage: "random-fill", fillIndex: 0 });
    expect(isQuestionComplete(s)).toBe(false);

    // A random team (d) supplies the missing answer.
    s = reducer(s, { type: "AWARD", answerId: SUNBLOCK, teamId: "d" });
    expect(teamScore(s, "d")).toBe(7);
    expect(revealedCount(SAMPLE_REGULAR_1)).toBe(0); // fixture untouched (immutability)
    expect(revealedCount(s.questions[0])).toBe(3); // 3 answers on the board → goal met
    expect(isQuestionComplete(s)).toBe(true);
  });

  it("completes immediately when all three participants answer correctly", () => {
    let s = startedGame();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    s = play(
      s,
      { type: "AWARD", answerId: PASSPORT, teamId: "a" },
      { type: "AWARD", answerId: SUNBLOCK, teamId: "b" },
      { type: "AWARD", answerId: GADGETS, teamId: "c" },
    );
    expect(fillsRemaining(s.turn)).toBe(0);
    expect(isQuestionComplete(s)).toBe(true);
    expect(teamScore(s, "a") + teamScore(s, "b") + teamScore(s, "c")).toBe(8 + 7 + 5);
  });

  it("owes two fills when two participants miss, and a failed fill still resolves", () => {
    let s = startedGame();
    s = reducer(s, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    s = play(
      s,
      { type: "AWARD", answerId: PASSPORT, teamId: "a" },
      { type: "MISS", teamId: "b" },
      { type: "MISS", teamId: "c" },
    );
    expect(fillsRemaining(s.turn)).toBe(2);

    // First random team scores; second random team fails — still completes the question.
    s = reducer(s, { type: "AWARD", answerId: SUNBLOCK, teamId: "d" });
    expect(fillsRemaining(s.turn)).toBe(1);
    s = reducer(s, { type: "MISS", teamId: "e" });
    expect(fillsRemaining(s.turn)).toBe(0);
    expect(isQuestionComplete(s)).toBe(true);
    expect(revealedCount(s.questions[0])).toBe(2); // only 2 of 3 found
  });
});
