import { describe, it, expect } from "vitest";
import {
  createGame,
  reducer,
  initHistory,
  dispatch,
  undo,
  redo,
  canUndo,
} from "../src/engine.js";
import { SAMPLE_REGULAR_1, SAMPLE_QUESTIONS } from "../src/fixtures.js";
import { teamScore, teams } from "./helpers.js";

const PASSPORT = "q1-a1"; // 8 pts

describe("scoring overrides", () => {
  it("manual score adjustment adds and subtracts", () => {
    let s = createGame({ teams: teams("a", "b"), questions: [SAMPLE_REGULAR_1] });
    s = reducer(s, { type: "ADJUST_SCORE", teamId: "a", delta: 10 });
    s = reducer(s, { type: "ADJUST_SCORE", teamId: "a", delta: -3 });
    expect(teamScore(s, "a")).toBe(7);
  });

  it("does not mutate the input state (immutability)", () => {
    const s = createGame({ teams: teams("a"), questions: [SAMPLE_REGULAR_1] });
    const next = reducer(s, { type: "ADJUST_SCORE", teamId: "a", delta: 5 });
    expect(teamScore(s, "a")).toBe(0);
    expect(teamScore(next, "a")).toBe(5);
    expect(next).not.toBe(s);
  });
});

describe("undo/redo history", () => {
  it("undoes and redoes a scoring action", () => {
    const base = reducer(
      createGame({ teams: teams("a", "b", "c"), questions: [SAMPLE_REGULAR_1] }),
      { type: "START_GAME" },
    );
    let h = initHistory(base);
    h = dispatch(h, { type: "SET_PARTICIPANTS", teamIds: ["a", "b", "c"] });
    h = dispatch(h, { type: "AWARD", answerId: PASSPORT, teamId: "a" });
    expect(teamScore(h.present, "a")).toBe(8);

    h = undo(h);
    expect(teamScore(h.present, "a")).toBe(0); // award reversed

    h = redo(h);
    expect(teamScore(h.present, "a")).toBe(8); // and back
  });

  it("no-op actions do not enter history", () => {
    const base = createGame({ teams: teams("a"), questions: [SAMPLE_REGULAR_1] });
    const h = dispatch(initHistory(base), { type: "PREV_QUESTION" }); // already at index 0 → no-op
    expect(canUndo(h)).toBe(false);
  });
});

describe("question navigation", () => {
  it("advances through questions and finishes after the last", () => {
    let s = reducer(
      createGame({ teams: teams("a"), questions: SAMPLE_QUESTIONS }),
      { type: "START_GAME" },
    );
    expect(s.currentQuestionIndex).toBe(0);
    // Advance to the last question (length-agnostic so it survives bank changes).
    const last = SAMPLE_QUESTIONS.length - 1;
    for (let i = 0; i < last; i++) s = reducer(s, { type: "NEXT_QUESTION" });
    expect(s.currentQuestionIndex).toBe(last);
    expect(s.phase).toBe("playing");
    s = reducer(s, { type: "NEXT_QUESTION" }); // past the last → finished
    expect(s.phase).toBe("finished");
  });
});
