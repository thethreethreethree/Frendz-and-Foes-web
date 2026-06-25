import { describe, it, expect } from "vitest";
import {
  BINGO_BALLS,
  DEFAULT_DARES,
  createBingo,
  bingoReducer,
  remainingCount,
  isBingoComplete,
  dareForBall,
} from "../src/bingo.js";

describe("bingo engine", () => {
  it("has 75 balls (B/I/N/G/O) and a dare for each", () => {
    expect(BINGO_BALLS.length).toBe(75);
    expect(BINGO_BALLS[0].id).toBe("B1");
    expect(BINGO_BALLS[74].id).toBe("O75");
    expect(DEFAULT_DARES.length).toBe(75);
    expect(dareForBall("B1").length).toBeGreaterThan(0);
  });

  it("draws without repeats and resets the dare flag each draw", () => {
    let s = createBingo();
    s = bingoReducer(s, { type: "DRAW" });
    expect(s.drawn.length).toBe(1);
    expect(s.currentId).toBe(s.drawn[0]);
    expect(s.dareRevealed).toBe(false);

    s = bingoReducer(s, { type: "REVEAL_DARE" });
    expect(s.dareRevealed).toBe(true);

    s = bingoReducer(s, { type: "DRAW" });
    expect(s.dareRevealed).toBe(false); // new draw hides the dare again
    expect(new Set(s.drawn).size).toBe(s.drawn.length); // no repeats
  });

  it("draws all 75 with no duplicates, then stops", () => {
    let s = createBingo();
    for (let i = 0; i < 100; i++) s = bingoReducer(s, { type: "DRAW" });
    expect(s.drawn.length).toBe(75);
    expect(new Set(s.drawn).size).toBe(75);
    expect(isBingoComplete(s)).toBe(true);
    expect(remainingCount(s)).toBe(0);
  });

  it("undraws the last ball and reset clears everything", () => {
    let s = bingoReducer(bingoReducer(createBingo(), { type: "DRAW" }), { type: "DRAW" });
    expect(s.drawn.length).toBe(2);
    s = bingoReducer(s, { type: "UNDRAW" });
    expect(s.drawn.length).toBe(1);
    s = bingoReducer(s, { type: "RESET" });
    expect(s.drawn.length).toBe(0);
    expect(s.currentId).toBe(null);
  });
});
