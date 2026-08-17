// Frendz Trivia — pure engine. Three rounds of 10 questions (Science, Sports, Entertainment),
// each question a 4-choice A/B/C/D. Three cyclable decks (v1/v2/v3) the host chooses from.
//
// Host-authoritative over the dumb relay (like Feud/Bingo): the host runs this reducer and
// broadcasts the whole TriviaState; followers render it. The correct answers ship in the client
// bundle (same accepted party-game cheat-tolerance as Feud answers / Bingo dares), so "reveal" is
// a DISPLAY gate keyed on `revealedRounds`, not a data boundary. Scoring is deferred: teams lock
// A/B/C/D per question with answers hidden, and the host reveals a round at its end — at which
// point every team scores +1 per correct answer for that round.

import { TRIVIA_V1 } from "./data/trivia-v1.js";
import { TRIVIA_V2 } from "./data/trivia-v2.js";
import { TRIVIA_V3 } from "./data/trivia-v3.js";

export type TriviaLetter = "A" | "B" | "C" | "D";
export type TriviaCategory = "Science" | "Sports" | "Entertainment";
export type TriviaVersion = "v1" | "v2" | "v3";
/** team = one answer-phone per team (Feud-style); view = one QR, everyone watches (Bingo-style). */
export type TriviaMode = "team" | "view";
// setup → playing (teams lock answers, nothing shown) → reveal (host walks every question in order,
// revealing answers one by one; team mode tallies as it goes) → finished.
export type TriviaPhase = "setup" | "playing" | "reveal" | "finished";

/** The raw shape each deck data file exports. */
export interface TriviaRaw {
  category: TriviaCategory;
  prompt: string;
  choices: readonly string[];
  correct: TriviaLetter;
}

export interface TriviaQuestion {
  id: string; // e.g. "v1-q07"
  round: number; // 0=Science, 1=Sports, 2=Entertainment
  category: TriviaCategory;
  prompt: string;
  choices: string[]; // exactly 4 → A,B,C,D
  correct: TriviaLetter;
}

export const QUESTIONS_PER_ROUND = 10;
export const TRIVIA_LETTERS: TriviaLetter[] = ["A", "B", "C", "D"];

export const TRIVIA_ROUNDS: { category: TriviaCategory; label: string; blurb: string }[] = [
  { category: "Science", label: "Science", blurb: "How the world works" },
  { category: "Sports", label: "Sports", blurb: "The games we play" },
  { category: "Entertainment", label: "Entertainment", blurb: "Music • Movies • TV" },
];

export const TRIVIA_VERSION_LABELS: Record<TriviaVersion, string> = {
  v1: "Frendz Trivia V1",
  v2: "Frendz Trivia V2",
  v3: "Frendz Trivia V3",
};

function build(version: TriviaVersion, raw: readonly TriviaRaw[]): TriviaQuestion[] {
  return raw.map((q, i) => ({
    id: `${version}-q${String(i + 1).padStart(2, "0")}`,
    round: Math.floor(i / QUESTIONS_PER_ROUND),
    category: q.category,
    prompt: q.prompt,
    choices: [...q.choices].slice(0, 4),
    correct: q.correct,
  }));
}

export const TRIVIA_DECKS: Record<TriviaVersion, TriviaQuestion[]> = {
  v1: build("v1", TRIVIA_V1 as readonly TriviaRaw[]),
  v2: build("v2", TRIVIA_V2 as readonly TriviaRaw[]),
  v3: build("v3", TRIVIA_V3 as readonly TriviaRaw[]),
};

export interface TriviaTeam {
  id: string;
  name: string;
  color?: string;
  score: number;
}

export interface TriviaState {
  version: TriviaVersion;
  mode: TriviaMode;
  phase: TriviaPhase;
  teams: TriviaTeam[];
  /** Index into the chosen deck, 0..29. */
  currentIndex: number;
  /** teamId -> questionId -> locked letter. Host-held, broadcast; correctness stays hidden until reveal. */
  answers: Record<string, Record<string, TriviaLetter>>;
  /** Question ids the host has revealed during the end-of-game reveal (in reveal order). Team-mode
   * scores are recomputed from these, so revealing is idempotent (re-revealing can't double-count). */
  revealedQuestions: string[];
}

export type TriviaAction =
  | { type: "CONFIGURE"; version?: TriviaVersion; mode?: TriviaMode }
  | { type: "SET_TEAMS"; teams: Array<{ id: string; name: string; color?: string }> }
  | { type: "START" }
  | { type: "ANSWER"; teamId: string; questionId: string; letter: TriviaLetter }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; index: number }
  | { type: "BEGIN_REVEAL" }
  | { type: "REVEAL_CURRENT" }
  | { type: "CONTINUE" }
  | { type: "END" }
  | { type: "RESET" };

export function createTrivia(opts?: {
  version?: TriviaVersion;
  mode?: TriviaMode;
  teams?: Array<{ id: string; name: string; color?: string }>;
}): TriviaState {
  return {
    version: opts?.version ?? "v1",
    mode: opts?.mode ?? "team",
    phase: "setup",
    teams: (opts?.teams ?? []).map((t) => ({ ...t, score: 0 })),
    currentIndex: 0,
    answers: {},
    revealedQuestions: [],
  };
}

export function triviaDeck(state: Pick<TriviaState, "version">): TriviaQuestion[] {
  return TRIVIA_DECKS[state.version];
}

export function currentTriviaQuestion(state: TriviaState): TriviaQuestion | null {
  return triviaDeck(state)[state.currentIndex] ?? null;
}

export function triviaRoundOf(index: number): number {
  return Math.floor(index / QUESTIONS_PER_ROUND);
}

/** Position within the round (1..10) for display. */
export function triviaQuestionInRound(index: number): number {
  return (index % QUESTIONS_PER_ROUND) + 1;
}

export function questionById(version: TriviaVersion, id: string): TriviaQuestion | null {
  return TRIVIA_DECKS[version].find((q) => q.id === id) ?? null;
}

/** Whether the host has revealed this question's answer during the reveal phase. */
export function isQuestionRevealed(state: TriviaState, id: string): boolean {
  return state.revealedQuestions.includes(id);
}

export function triviaReducer(state: TriviaState, action: TriviaAction): TriviaState {
  switch (action.type) {
    case "CONFIGURE": {
      if (state.phase !== "setup") return state;
      return {
        ...state,
        version: action.version ?? state.version,
        mode: action.mode ?? state.mode,
      };
    }
    case "SET_TEAMS": {
      if (state.phase !== "setup") return state;
      return { ...state, teams: action.teams.map((t) => ({ ...t, score: 0 })) };
    }
    case "START": {
      return {
        ...state,
        phase: "playing",
        currentIndex: 0,
        answers: {},
        revealedQuestions: [],
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
      };
    }
    case "ANSWER": {
      if (state.phase !== "playing") return state;
      const q = triviaDeck(state)[state.currentIndex];
      // Only the currently-shown question is answerable (host-paced). Nothing is revealed during play.
      if (!q || q.id !== action.questionId) return state;
      if (!state.teams.some((t) => t.id === action.teamId)) return state;
      const forTeam = state.answers[action.teamId] ?? {};
      return {
        ...state,
        answers: { ...state.answers, [action.teamId]: { ...forTeam, [action.questionId]: action.letter } },
      };
    }
    case "NEXT": {
      // Both play and reveal stay INSIDE the current round; rounds advance only via CONTINUE.
      if (state.phase !== "playing" && state.phase !== "reveal") return state;
      const roundEnd = triviaRoundOf(state.currentIndex) * QUESTIONS_PER_ROUND + (QUESTIONS_PER_ROUND - 1);
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, roundEnd) };
    }
    case "PREV": {
      if (state.phase !== "playing" && state.phase !== "reveal") return state;
      const roundStart = triviaRoundOf(state.currentIndex) * QUESTIONS_PER_ROUND;
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, roundStart) };
    }
    case "GOTO": {
      if (state.phase !== "playing" && state.phase !== "reveal") return state;
      const max = triviaDeck(state).length - 1;
      return { ...state, currentIndex: Math.min(Math.max(action.index, 0), max) };
    }
    case "BEGIN_REVEAL": {
      // Reveal happens PER ROUND: walk this round's 10 questions in order, revealing one by one.
      if (state.phase !== "playing") return state;
      const roundStart = triviaRoundOf(state.currentIndex) * QUESTIONS_PER_ROUND;
      return { ...state, phase: "reveal", currentIndex: roundStart };
    }
    case "REVEAL_CURRENT": {
      if (state.phase !== "reveal") return state;
      const q = triviaDeck(state)[state.currentIndex];
      if (!q || state.revealedQuestions.includes(q.id)) return state;
      const revealed = [...state.revealedQuestions, q.id];
      // Team mode: recompute each team's score from ALL revealed questions (idempotent — no double count).
      const teams =
        state.mode === "team"
          ? state.teams.map((t) => {
              const a = state.answers[t.id] ?? {};
              const score = revealed.reduce((n, qid) => {
                const qq = questionById(state.version, qid);
                return n + (qq && a[qid] === qq.correct ? 1 : 0);
              }, 0);
              return { ...t, score };
            })
          : state.teams;
      return { ...state, revealedQuestions: revealed, teams };
    }
    case "CONTINUE": {
      // Finish this round's reveal → play the next round, or finish after the last round.
      if (state.phase !== "reveal") return state;
      const nextRoundStart = (triviaRoundOf(state.currentIndex) + 1) * QUESTIONS_PER_ROUND;
      if (nextRoundStart >= triviaDeck(state).length) return { ...state, phase: "finished" };
      return { ...state, phase: "playing", currentIndex: nextRoundStart };
    }
    case "END": {
      return { ...state, phase: "finished" };
    }
    case "RESET": {
      return createTrivia({
        version: state.version,
        mode: state.mode,
        teams: state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      });
    }
    default:
      return state;
  }
}
