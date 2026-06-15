// Domain model for Frendz and Foes.
//
// WHY this shape: the host controller drives every action manually, so the engine's job is to
// be a *correct, deterministic scorekeeper and turn-tracker* — not to guess. Each answer
// carries its own reveal/award state so the display can render straight from engine state, and
// the per-question `turn` carries just enough flow context for the controller to know "whose
// attempt is it" and "how many random-team fills remain".

/** Which kind of question this is. Regular questions pay by answer rank; bonus pays a flat value. */
export type RoundKind = "regular" | "bonus";

/** One survey answer on the board. */
export interface Answer {
  id: string;
  text: string;
  /** Survey popularity shown in parentheses on the slide, e.g. "Passport (30)". Display only. */
  surveyCount: number;
  /** Rank value 8 (most popular) down to 1. Used as the points awarded in REGULAR rounds. */
  rankPoints: number;
  revealed: boolean;
  /** Team credited with this answer, or null if revealed without a winner (e.g. board reveal at end). */
  awardedTeamId: string | null;
}

export interface Question {
  id: string;
  prompt: string;
  kind: RoundKind;
  /** Sorted by rankPoints descending (top answer first). */
  answers: Answer[];
}

export interface Team {
  id: string;
  name: string;
  /** Optional display color (hex). */
  color?: string;
  score: number;
}

/** Buzz-in order: 0 = steady green (1st), 1 = flashing green (2nd), 2 = blue (3rd). */
export type BuzzSlot = 0 | 1 | 2;

export interface Participant {
  slot: BuzzSlot;
  teamId: string;
}

/**
 * Regular-round flow:
 * - Each of the (up to 3) buzz-in participants gets ONE attempt, in order.
 * - For each participant who MISSES, one random team is pulled to supply a missing answer
 *   (also one attempt each). So `misses` == number of random-team fills owed.
 * - Goal is 3 answers on the board; correct answers pay the answer's rank value.
 */
export interface RegularTurnState {
  kind: "regular";
  participants: Participant[];
  /** Index of the participant whose attempt is current. When >= participants.length, we are in the random-fill stage. */
  attemptCursor: number;
  /** How many participant attempts missed (== number of random-team fills owed). */
  misses: number;
  /** How many of those random-team fills have been resolved (correct or failed). */
  randomFillsResolved: number;
}

/**
 * Bonus-round flow (single question):
 * - Steady green (1st) answers and keeps going while correct; one wrong answer ends their turn.
 * - Passes to flashing green (2nd), then blue (3rd), same rule.
 * - If all three fail, a random team is selected and continues under the same rule.
 * - Every correct answer pays a flat value. Bonus ends when ALL answers are revealed.
 */
export interface BonusTurnState {
  kind: "bonus";
  participants: Participant[];
  /** 0..2 = participant index whose turn it is; 3 = random-team stage. */
  chainCursor: number;
}

export type TurnState = RegularTurnState | BonusTurnState | null;

export interface GameConfig {
  /** Target number of answers per regular question (default 3). */
  regularAnswerGoal: number;
  /** Flat points per correct answer in the bonus round (default 8). */
  bonusFlatPoints: number;
}

export type GamePhase = "setup" | "playing" | "finished";

export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  teams: Team[];
  /** Ordered questions: round 1 (10), round 2 (10), then bonus (1) — but the engine is order-agnostic. */
  questions: Question[];
  currentQuestionIndex: number;
  turn: TurnState;
}

export type Action =
  | { type: "START_GAME" }
  | { type: "SET_PARTICIPANTS"; teamIds: string[] }
  | { type: "AWARD"; answerId: string; teamId: string }
  | { type: "MISS"; teamId?: string }
  | { type: "REVEAL_REMAINING" }
  | { type: "NEXT_QUESTION" }
  | { type: "PREV_QUESTION" }
  | { type: "ADJUST_SCORE"; teamId: string; delta: number }
  | { type: "END_GAME" };

export const DEFAULT_CONFIG: GameConfig = {
  regularAnswerGoal: 3,
  bonusFlatPoints: 8,
};
