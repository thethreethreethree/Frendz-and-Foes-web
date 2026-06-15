// The game engine: a pure reducer + an undo/redo history wrapper.
//
// WHY pure + history: live hosting is messy (mis-taps, wrong team credited). Routing EVERY
// action through an immutable reducer means a single `undo` can reliably reverse anything,
// including manual score overrides. The reducer never mutates its input — it clones, mutates
// the clone, and returns it — so history snapshots stay independent.

import {
  type Action,
  type GameConfig,
  type GameState,
  type Participant,
  type Question,
  type Team,
  type BuzzSlot,
  DEFAULT_CONFIG,
} from "./types.js";
import { allRevealed, currentQuestion, pointsForAnswer } from "./rules.js";

export interface NewGameInput {
  teams: Array<Pick<Team, "id" | "name"> & Partial<Pick<Team, "color">>>;
  questions: Question[];
  config?: Partial<GameConfig>;
}

function freshTurn(question: Question | null): GameState["turn"] {
  if (!question) return null;
  return question.kind === "bonus"
    ? { kind: "bonus", participants: [], chainCursor: 0 }
    : { kind: "regular", participants: [], attemptCursor: 0, misses: 0, randomFillsResolved: 0 };
}

export function createGame(input: NewGameInput): GameState {
  return {
    phase: "setup",
    config: { ...DEFAULT_CONFIG, ...input.config },
    teams: input.teams.map((t) => ({ ...t, score: 0 })),
    questions: input.questions,
    currentQuestionIndex: 0,
    turn: null,
  };
}

/** Pure reducer. Returns a new state; never mutates `state`. */
export function reducer(state: GameState, action: Action): GameState {
  const s = structuredClone(state) as GameState;

  switch (action.type) {
    case "START_GAME": {
      s.phase = "playing";
      s.currentQuestionIndex = 0;
      s.turn = freshTurn(currentQuestion(s));
      return s;
    }

    case "SET_PARTICIPANTS": {
      if (!s.turn) return state;
      const participants: Participant[] = action.teamIds
        .slice(0, 3)
        .map((teamId, i) => ({ slot: i as BuzzSlot, teamId }));
      s.turn.participants = participants;
      if (s.turn.kind === "regular") {
        s.turn.attemptCursor = 0;
        s.turn.misses = 0;
        s.turn.randomFillsResolved = 0;
      } else {
        s.turn.chainCursor = 0;
      }
      return s;
    }

    case "AWARD": {
      const q = currentQuestion(s);
      if (!q || !s.turn) return state;
      const answer = q.answers.find((a) => a.id === action.answerId);
      const team = s.teams.find((t) => t.id === action.teamId);
      if (!answer || !team || answer.revealed) return state;

      answer.revealed = true;
      answer.awardedTeamId = team.id;
      team.score += pointsForAnswer(q, answer, s.config);

      if (s.turn.kind === "regular") {
        // A correct answer consumes either a participant attempt or a random-team fill.
        if (s.turn.attemptCursor < s.turn.participants.length) s.turn.attemptCursor += 1;
        else s.turn.randomFillsResolved += 1;
      }
      // Bonus: the chainer keeps going on a correct answer — no cursor change. The turn ends
      // implicitly once all answers are revealed (see rules.turnFocus / isQuestionComplete).
      return s;
    }

    case "MISS": {
      if (!s.turn) return state;
      if (s.turn.kind === "regular") {
        if (s.turn.attemptCursor < s.turn.participants.length) {
          // A participant missed → owe one random-team fill.
          s.turn.misses += 1;
          s.turn.attemptCursor += 1;
        } else {
          // A random-team fill failed → still counts as resolved (one attempt, no points).
          s.turn.randomFillsResolved += 1;
        }
      } else {
        // Bonus: a wrong answer ends the current chainer's turn → advance to the next.
        s.turn.chainCursor += 1;
      }
      return s;
    }

    case "REVEAL_REMAINING": {
      const q = currentQuestion(s);
      if (!q) return state;
      for (const a of q.answers) {
        if (!a.revealed) {
          a.revealed = true;
          a.awardedTeamId = null; // shown for completeness, no points
        }
      }
      return s;
    }

    case "NEXT_QUESTION": {
      if (s.currentQuestionIndex >= s.questions.length - 1) {
        s.phase = "finished";
        s.turn = null;
        return s;
      }
      s.currentQuestionIndex += 1;
      s.turn = freshTurn(currentQuestion(s));
      return s;
    }

    case "PREV_QUESTION": {
      if (s.currentQuestionIndex <= 0) return state;
      s.currentQuestionIndex -= 1;
      s.phase = "playing";
      s.turn = freshTurn(currentQuestion(s));
      return s;
    }

    case "ADJUST_SCORE": {
      const team = s.teams.find((t) => t.id === action.teamId);
      if (!team) return state;
      team.score += action.delta;
      return s;
    }

    case "END_GAME": {
      s.phase = "finished";
      s.turn = null;
      return s;
    }

    default:
      return state;
  }
}

// --- Undo/redo history wrapper ---------------------------------------------------------------

export interface History {
  past: GameState[];
  present: GameState;
  future: GameState[];
}

/** Cap history depth so a long game doesn't grow memory unbounded. */
const MAX_HISTORY = 100;

export function initHistory(present: GameState): History {
  return { past: [], present, future: [] };
}

export function dispatch(history: History, action: Action): History {
  const next = reducer(history.present, action);
  if (next === history.present) return history; // no-op action, don't pollute history
  const past = [...history.past, history.present].slice(-MAX_HISTORY);
  return { past, present: next, future: [] };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

export function undo(history: History): History {
  if (!canUndo(history)) return history;
  const past = [...history.past];
  const previous = past.pop() as GameState;
  return { past, present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  if (!canRedo(history)) return history;
  const [next, ...rest] = history.future;
  return { past: [...history.past, history.present], present: next, future: rest };
}

export { allRevealed };
