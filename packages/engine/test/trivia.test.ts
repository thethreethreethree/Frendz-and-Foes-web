import { describe, it, expect } from "vitest";
import {
  TRIVIA_DECKS,
  TRIVIA_LETTERS,
  QUESTIONS_PER_ROUND,
  createTrivia,
  triviaReducer,
  type TriviaVersion,
} from "../src/trivia.js";

const VERSIONS: TriviaVersion[] = ["v1", "v2", "v3"];
const CATEGORIES = ["Science", "Sports", "Entertainment"] as const;

describe("trivia decks are well-formed", () => {
  for (const v of VERSIONS) {
    const deck = TRIVIA_DECKS[v];

    it(`${v} has 30 questions, unique ids`, () => {
      expect(deck.length).toBe(30);
      expect(new Set(deck.map((q) => q.id)).size).toBe(30);
    });

    it(`${v} rounds are 10 Science / 10 Sports / 10 Entertainment in order`, () => {
      for (let round = 0; round < 3; round++) {
        const slice = deck.slice(round * QUESTIONS_PER_ROUND, (round + 1) * QUESTIONS_PER_ROUND);
        expect(slice.length).toBe(10);
        for (const q of slice) {
          expect(q.round).toBe(round);
          expect(q.category).toBe(CATEGORIES[round]);
        }
      }
    });

    it(`${v} every question has exactly 4 non-empty choices and a valid correct letter`, () => {
      for (const q of deck) {
        expect(q.choices.length).toBe(4);
        for (const c of q.choices) expect(c.trim().length).toBeGreaterThan(0);
        expect(TRIVIA_LETTERS).toContain(q.correct);
        // correct letter must point at a real option
        const idx = TRIVIA_LETTERS.indexOf(q.correct);
        expect(q.choices[idx].trim().length).toBeGreaterThan(0);
        expect(q.prompt.trim().length).toBeGreaterThan(0);
      }
    });
  }
});

describe("trivia scoring reveals at round end", () => {
  const setup = () => {
    let s = createTrivia({ mode: "team", teams: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
    s = triviaReducer(s, { type: "START" });
    return s;
  };

  it("+1 per correct answer for the revealed round; hidden until reveal", () => {
    let s = setup();
    const deck = TRIVIA_DECKS[s.version];
    // Team A answers all 10 of round 0 correctly; Team B answers all 10 wrong.
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const q = deck[i];
      const wrong = TRIVIA_LETTERS.find((l) => l !== q.correct)!;
      s = triviaReducer(s, { type: "ANSWER", teamId: "a", questionId: q.id, letter: q.correct });
      s = triviaReducer(s, { type: "ANSWER", teamId: "b", questionId: q.id, letter: wrong });
      if (i < QUESTIONS_PER_ROUND - 1) s = triviaReducer(s, { type: "NEXT" });
    }
    // Not revealed yet → no score.
    expect(s.teams.find((t) => t.id === "a")!.score).toBe(0);

    s = triviaReducer(s, { type: "REVEAL_ROUND", round: 0 });
    expect(s.teams.find((t) => t.id === "a")!.score).toBe(10);
    expect(s.teams.find((t) => t.id === "b")!.score).toBe(0);
  });

  it("revealing the same round twice does not double-score", () => {
    let s = setup();
    const q = TRIVIA_DECKS[s.version][0];
    s = triviaReducer(s, { type: "ANSWER", teamId: "a", questionId: q.id, letter: q.correct });
    s = triviaReducer(s, { type: "REVEAL_ROUND", round: 0 });
    const after = s.teams.find((t) => t.id === "a")!.score;
    s = triviaReducer(s, { type: "REVEAL_ROUND", round: 0 });
    expect(s.teams.find((t) => t.id === "a")!.score).toBe(after);
  });

  it("cannot change an answer once its round is revealed", () => {
    let s = setup();
    const q = TRIVIA_DECKS[s.version][0];
    s = triviaReducer(s, { type: "ANSWER", teamId: "a", questionId: q.id, letter: "A" });
    s = triviaReducer(s, { type: "REVEAL_ROUND", round: 0 });
    const before = s.answers["a"][q.id];
    s = triviaReducer(s, { type: "ANSWER", teamId: "a", questionId: q.id, letter: "B" });
    expect(s.answers["a"][q.id]).toBe(before);
  });
});
