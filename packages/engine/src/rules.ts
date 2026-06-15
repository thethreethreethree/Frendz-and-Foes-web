// Pure rule helpers — no state mutation, easy to unit-test and reuse in the UI.

import type { GameConfig, Question, Answer, TurnState, GameState } from "./types.js";

/** Points a given answer is worth, accounting for round kind (bonus = flat, regular = rank). */
export function pointsForAnswer(question: Question, answer: Answer, config: GameConfig): number {
  return question.kind === "bonus" ? config.bonusFlatPoints : answer.rankPoints;
}

export function revealedCount(question: Question): number {
  return question.answers.filter((a) => a.revealed).length;
}

export function allRevealed(question: Question): boolean {
  return question.answers.every((a) => a.revealed);
}

export function currentQuestion(state: GameState): Question | null {
  return state.questions[state.currentQuestionIndex] ?? null;
}

/** Random-team fills still owed in a regular turn (one per participant miss). */
export function fillsRemaining(turn: TurnState): number {
  if (!turn || turn.kind !== "regular") return 0;
  return Math.max(0, turn.misses - turn.randomFillsResolved);
}

/**
 * Whose attempt is it right now, expressed for the UI:
 * - "participant": one of the buzz-in teams (index = attemptCursor)
 * - "random-fill": a random team supplying a missed answer
 * - "bonus-participant" / "bonus-random": bonus chain stages
 * - "done": the question is complete
 */
export type TurnFocus =
  | { stage: "participant"; index: number }
  | { stage: "random-fill"; fillIndex: number }
  | { stage: "bonus-participant"; index: number }
  | { stage: "bonus-random" }
  | { stage: "idle" }
  | { stage: "done" };

export function turnFocus(state: GameState): TurnFocus {
  const turn = state.turn;
  const q = currentQuestion(state);
  if (!turn || !q) return { stage: "idle" };

  if (turn.kind === "regular") {
    if (turn.participants.length === 0) return { stage: "idle" };
    if (turn.attemptCursor < turn.participants.length) {
      return { stage: "participant", index: turn.attemptCursor };
    }
    if (fillsRemaining(turn) > 0) {
      return { stage: "random-fill", fillIndex: turn.randomFillsResolved };
    }
    return { stage: "done" };
  }

  // bonus
  if (allRevealed(q)) return { stage: "done" };
  if (turn.participants.length === 0) return { stage: "idle" };
  if (turn.chainCursor < turn.participants.length) {
    return { stage: "bonus-participant", index: turn.chainCursor };
  }
  return { stage: "bonus-random" };
}

/** Is the current question finished (no more attempts expected)? */
export function isQuestionComplete(state: GameState): boolean {
  return turnFocus(state).stage === "done";
}
