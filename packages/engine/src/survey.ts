// Survey Showdown's category decks — the ten topics a host picks from before a game.
//
// The questions come from docs/feud-question-bank-with-answers (1).md via
// tools/bank/generate.mjs. This file is the small amount of GAME logic that sits on top of that
// generated data; the data itself is never hand-edited.

import type { Question } from "./types.js";
import { SURVEY_CATEGORIES, surveyCategory, type SurveyCategory } from "./data/survey-categories.js";

export { SURVEY_CATEGORIES, surveyCategory };
export type { SurveyCategory };

/** How many regular questions make one round. The bank is authored to this shape. */
export const SURVEY_ROUND_SIZE = 10;
/** Rounds per category: the bank's line 7 -- "Round 1 = questions 1-10, Round 2 = 11-20, Round 3 = 21-30". */
export const SURVEY_ROUNDS = 3;

/**
 * Build a full game from one category: all 30 questions in the order the bank authored them
 * (three rounds of ten), plus one bonus question.
 *
 * WHY THE BONUS COMES FROM ANOTHER CATEGORY. fixtures.ts line 4 sets the house pattern -- "Round 1
 * = q1-q10, Round 2 = q11-q20, then the bonus question" -- so a bonus is an EXTRA question appended
 * after the rounds, not one carved out of them. SAMPLE_QUESTIONS is 20 regular + 1 bonus for
 * exactly that reason. The bank, however, contains no bonus questions: it is 30 regular per
 * category and says nothing about a finale.
 *
 * Taking question 30 as the bonus would have left round 3 nine questions long and quietly broken
 * the shape the content was written to. Dropping the bonus entirely would disable a real engine
 * feature (flat `bonusFlatPoints` scoring and the bonus-participant turn stages). So the bonus is
 * drawn from a DIFFERENT category, which keeps all three rounds intact and makes the finale a
 * wildcard -- a change of subject is a reasonable thing for a last question to be.
 *
 * Deterministic when `pick` is supplied, so tests do not depend on Math.random.
 */
export function buildCategoryGame(
  categoryId: string,
  pick: (n: number) => number = (n) => Math.floor(Math.random() * n),
): Question[] {
  const cat = surveyCategory(categoryId);
  if (!cat) throw new Error(`Unknown survey category: ${categoryId}`);

  // Fresh answer state every time: a category can be replayed, and a Question object is shared.
  const fresh = (q: Question, kind: Question["kind"]): Question => ({
    ...q,
    kind,
    answers: q.answers.map((a) => ({ ...a, revealed: false, awardedTeamId: null })),
  });

  const rounds = cat.questions.map((q) => fresh(q, "regular"));

  const others = SURVEY_CATEGORIES.filter((c) => c.id !== cat.id);
  const from = others[pick(others.length)] ?? cat;
  const bonusSource = from.questions[pick(from.questions.length)];
  const bonus = fresh(bonusSource, "bonus");

  return [...rounds, bonus];
}

/** Which round (1-based) a question index falls in. Round 4 is the bonus. */
export function surveyRoundOf(index: number): number {
  return Math.min(SURVEY_ROUNDS + 1, Math.floor(index / SURVEY_ROUND_SIZE) + 1);
}
