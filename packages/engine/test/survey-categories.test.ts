import { describe, expect, it } from "vitest";
import {
  SURVEY_CATEGORIES,
  SURVEY_ROUND_SIZE,
  buildCategoryGame,
  surveyCategory,
  surveyRoundOf,
} from "../src/survey.js";

// The content itself is the product here: 300 questions a host reads aloud to a room. A typo in the
// generator that dropped an answer, or shuffled rounds the bank deliberately ordered, would not
// throw -- it would just make the game slightly wrong every night. So these assert the DATA, not
// only the function that wraps it.

describe("the ten survey categories", () => {
  it("has exactly the ten the bank defines, in document order", () => {
    expect(SURVEY_CATEGORIES.map((c) => c.title)).toEqual([
      "Night Out",
      "Dating & Relationships",
      "Travel & Backpacking",
      "Work & Office Life",
      "Guilty Pleasures & Bad Habits",
      "Food & Drinks",
      "Adulting",
      "Phones & Social Media",
      "Awkward & Embarrassing Moments",
      "Naughty but Nice (18+)",
    ]);
    expect(SURVEY_CATEGORIES.map((c) => c.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("gives every category 30 questions of 8 answers, points 8 down to 1", () => {
    for (const c of SURVEY_CATEGORIES) {
      expect(c.questions, c.title).toHaveLength(30);
      for (const q of c.questions) {
        expect(q.answers, `${c.title} / ${q.prompt}`).toHaveLength(8);
        expect(q.answers.map((a) => a.rankPoints)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
        expect(q.prompt.length).toBeGreaterThan(8);
      }
    }
  });

  it("carries REAL survey counts, not one template repeated", () => {
    // bank.ts gives its 100 questions the same [40,30,21,15,10,7,4,2] on every question. If this
    // file ever regresses to that, the number in parentheses on the slide becomes decoration.
    const shapes = new Set(
      SURVEY_CATEGORIES.flatMap((c) => c.questions.map((q) => q.answers.map((a) => a.surveyCount).join(","))),
    );
    expect(shapes.size).toBeGreaterThan(100);
  });

  it("keeps survey counts non-increasing, so the board reads top-down", () => {
    for (const c of SURVEY_CATEGORIES) {
      for (const q of c.questions) {
        const counts = q.answers.map((a) => a.surveyCount);
        expect([...counts].sort((a, b) => b - a), `${c.title} / ${q.prompt}`).toEqual(counts);
      }
    }
  });

  it("gives every question a unique id across the whole set", () => {
    const ids = SURVEY_CATEGORIES.flatMap((c) => c.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(300);
  });

  it("preserves the bank's first record verbatim", () => {
    const q = surveyCategory("night-out")!.questions[0];
    expect(q.prompt).toBe("Name something you find in your pocket the morning after a big night.");
    expect(q.answers[0]).toMatchObject({ text: "Receipts", surveyCount: 28, rankPoints: 8 });
    expect(q.answers[7]).toMatchObject({ text: "Coat check ticket", surveyCount: 5, rankPoints: 1 });
  });

  it("preserves quoted speech in the last record of the last category", () => {
    const q = surveyCategory("naughty-but-nice-18plus")!.questions[29];
    expect(q.answers[0].text).toBe('"Get out!"');
    expect(q.answers[7]).toMatchObject({ text: '"We\'re doing yoga"', surveyCount: 1 });
  });
});

describe("building a game from a category", () => {
  it("is three rounds of ten in the bank's order, plus a bonus", () => {
    const game = buildCategoryGame("night-out", () => 0);
    expect(game).toHaveLength(31);
    expect(game.slice(0, 30).every((q) => q.kind === "regular")).toBe(true);
    expect(game[30].kind).toBe("bonus");

    // Authored order, not shuffled -- the rounds were written as a difficulty curve.
    const source = surveyCategory("night-out")!.questions.map((q) => q.id);
    expect(game.slice(0, 30).map((q) => q.id)).toEqual(source);
  });

  it("draws the bonus from a DIFFERENT category so all three rounds stay whole", () => {
    const game = buildCategoryGame("night-out", () => 0);
    expect(game[30].id.startsWith("night-out-")).toBe(false);
    expect(surveyCategory("night-out")!.questions.map((q) => q.id)).not.toContain(game[30].id);
  });

  it("resets answer state, so replaying a category is a clean board", () => {
    const first = buildCategoryGame("adulting", () => 0);
    first[0].answers[0].revealed = true;
    first[0].answers[0].awardedTeamId = "t1";
    const second = buildCategoryGame("adulting", () => 0);
    expect(second[0].answers[0].revealed).toBe(false);
    expect(second[0].answers[0].awardedTeamId).toBeNull();
  });

  it("refuses an unknown category instead of silently playing the wrong deck", () => {
    expect(() => buildCategoryGame("does-not-exist")).toThrow(/Unknown survey category/);
  });

  it("maps question index to round, with the bonus as round 4", () => {
    expect(SURVEY_ROUND_SIZE).toBe(10);
    expect(surveyRoundOf(0)).toBe(1);
    expect(surveyRoundOf(9)).toBe(1);
    expect(surveyRoundOf(10)).toBe(2);
    expect(surveyRoundOf(29)).toBe(3);
    expect(surveyRoundOf(30)).toBe(4);
  });
});
