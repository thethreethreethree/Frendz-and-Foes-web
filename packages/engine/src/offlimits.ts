// "Off Limits" — pure engine for our describe-without-the-forbidden-words party game.
//
// Host-authoritative over the dumb relay, like Trivia/Feud — BUT with one crucial difference:
// the current word and taboo list must NEVER reach the room's display (everyone can see it), so
// the host keeps the full state (deck, cursor, current card, in-turn log) locally and broadcasts
// only `toPublic(state)` — phase, teams, scores, timer, and the post-turn review. During play the
// display shows a running tally (turnGot/turnSkip) but no words.
//
// This is the shared word-deck engine: Heads Up!, Reverse Charades and Monikers will reuse the
// same deck + turn/timer/score core with different presentation.

import { OFFLIMITS_V1, type OffLimitsCard } from "./data/offlimits-v1.js";

export type { OffLimitsCard } from "./data/offlimits-v1.js";

export const OFFLIMITS_DECK: readonly OffLimitsCard[] = OFFLIMITS_V1;

export type OffLimitsPhase = "setup" | "ready" | "playing" | "turnover" | "ended";

export interface OffLimitsConfig {
  turnSeconds: number; // length of a describer's turn
  winScore: number; // first team to reach this wins
  skipPenalty: number; // points lost per skip (0 = free skips)
}

export interface OffLimitsTeam {
  id: string;
  name: string;
  color?: string;
  score: number;
}

export interface TurnEntry {
  word: string;
  result: "got" | "skip";
}

/** Full host-held state. Contains the deck + current card — NEVER broadcast as-is. */
export interface OffLimitsState {
  phase: OffLimitsPhase;
  config: OffLimitsConfig;
  teams: OffLimitsTeam[];
  activeIdx: number; // whose turn it is
  secondsLeft: number;
  deckOrder: number[]; // shuffled indices into OFFLIMITS_DECK
  cursor: number; // pointer into deckOrder
  turnLog: TurnEntry[]; // the in-progress turn's results (has words → secret during play)
  lastReview: TurnEntry[]; // the just-finished turn's results (safe to show post-turn)
  round: number; // completed turns
  winner?: string; // team id
}

/** The broadcast-safe projection. No deck, no current word — only what the room may see. */
export interface OffLimitsPublic {
  phase: OffLimitsPhase;
  config: OffLimitsConfig;
  teams: OffLimitsTeam[];
  activeIdx: number;
  secondsLeft: number;
  round: number;
  winner?: string;
  turnGot: number; // running "got" count for the live turn (no words)
  turnSkip: number;
  lastReview: TurnEntry[];
}

export type OffLimitsAction =
  | { type: "CONFIGURE"; config: Partial<OffLimitsConfig> }
  | { type: "SET_TEAMS"; teams: Array<{ id: string; name: string; color?: string }> }
  | { type: "START" }
  | { type: "BEGIN_TURN" }
  | { type: "GOT" }
  | { type: "SKIP" }
  | { type: "TICK" }
  | { type: "END_TURN" }
  | { type: "NEXT_TURN" }
  | { type: "END" }
  | { type: "RESET" };

export const DEFAULT_OFFLIMITS_CONFIG: OffLimitsConfig = { turnSeconds: 60, winScore: 20, skipPenalty: 0 };

function shuffledOrder(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createOffLimits(opts?: {
  config?: Partial<OffLimitsConfig>;
  teams?: Array<{ id: string; name: string; color?: string }>;
}): OffLimitsState {
  return {
    phase: "setup",
    config: { ...DEFAULT_OFFLIMITS_CONFIG, ...opts?.config },
    teams: (opts?.teams ?? []).map((t) => ({ ...t, score: 0 })),
    activeIdx: 0,
    secondsLeft: (opts?.config?.turnSeconds ?? DEFAULT_OFFLIMITS_CONFIG.turnSeconds),
    deckOrder: shuffledOrder(OFFLIMITS_DECK.length),
    cursor: 0,
    turnLog: [],
    lastReview: [],
    round: 0,
  };
}

/** The card the describer is currently on (host-only). */
export function currentOffLimitsCard(state: OffLimitsState): OffLimitsCard | null {
  if (state.phase !== "playing") return null;
  const idx = state.deckOrder[state.cursor];
  return OFFLIMITS_DECK[idx] ?? null;
}

export function activeTeam(state: OffLimitsState): OffLimitsTeam | null {
  return state.teams[state.activeIdx] ?? null;
}

export function toPublic(state: OffLimitsState): OffLimitsPublic {
  return {
    phase: state.phase,
    config: state.config,
    teams: state.teams,
    activeIdx: state.activeIdx,
    secondsLeft: state.secondsLeft,
    round: state.round,
    winner: state.winner,
    turnGot: state.turnLog.filter((e) => e.result === "got").length,
    turnSkip: state.turnLog.filter((e) => e.result === "skip").length,
    lastReview: state.lastReview,
  };
}

// Advance to the next card, reshuffling and wrapping when the deck is exhausted.
function advance(state: OffLimitsState): { deckOrder: number[]; cursor: number } {
  const next = state.cursor + 1;
  if (next >= state.deckOrder.length) return { deckOrder: shuffledOrder(OFFLIMITS_DECK.length), cursor: 0 };
  return { deckOrder: state.deckOrder, cursor: next };
}

// End the active team's turn: bank the review, check for a winner.
function endTurn(state: OffLimitsState): OffLimitsState {
  const team = state.teams[state.activeIdx];
  const won = team && team.score >= state.config.winScore;
  return {
    ...state,
    phase: won ? "ended" : "turnover",
    secondsLeft: 0,
    lastReview: state.turnLog,
    winner: won ? team.id : state.winner,
  };
}

export function offLimitsReducer(state: OffLimitsState, action: OffLimitsAction): OffLimitsState {
  switch (action.type) {
    case "CONFIGURE": {
      if (state.phase !== "setup") return state;
      const config = { ...state.config, ...action.config };
      return { ...state, config, secondsLeft: config.turnSeconds };
    }
    case "SET_TEAMS": {
      if (state.phase !== "setup") return state;
      return { ...state, teams: action.teams.map((t) => ({ ...t, score: 0 })) };
    }
    case "START": {
      if (state.teams.length < 2) return state; // need at least two teams
      return {
        ...state,
        phase: "ready",
        activeIdx: 0,
        round: 0,
        secondsLeft: state.config.turnSeconds,
        deckOrder: shuffledOrder(OFFLIMITS_DECK.length),
        cursor: 0,
        turnLog: [],
        lastReview: [],
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
        winner: undefined,
      };
    }
    case "BEGIN_TURN": {
      if (state.phase !== "ready") return state;
      return { ...state, phase: "playing", secondsLeft: state.config.turnSeconds, turnLog: [], lastReview: [] };
    }
    case "GOT": {
      if (state.phase !== "playing") return state;
      const card = currentOffLimitsCard(state);
      if (!card) return state;
      const teams = state.teams.map((t, i) => (i === state.activeIdx ? { ...t, score: t.score + 1 } : t));
      return { ...state, teams, turnLog: [...state.turnLog, { word: card.word, result: "got" }], ...advance(state) };
    }
    case "SKIP": {
      if (state.phase !== "playing") return state;
      const card = currentOffLimitsCard(state);
      if (!card) return state;
      const teams = state.teams.map((t, i) =>
        i === state.activeIdx ? { ...t, score: Math.max(0, t.score - state.config.skipPenalty) } : t,
      );
      return { ...state, teams, turnLog: [...state.turnLog, { word: card.word, result: "skip" }], ...advance(state) };
    }
    case "TICK": {
      if (state.phase !== "playing") return state;
      if (state.secondsLeft <= 1) return endTurn({ ...state, secondsLeft: 0 });
      return { ...state, secondsLeft: state.secondsLeft - 1 };
    }
    case "END_TURN": {
      if (state.phase !== "playing") return state;
      return endTurn(state);
    }
    case "NEXT_TURN": {
      if (state.phase !== "turnover") return state;
      return { ...state, phase: "ready", activeIdx: (state.activeIdx + 1) % state.teams.length, round: state.round + 1 };
    }
    case "END": {
      return { ...state, phase: "ended" };
    }
    case "RESET": {
      return createOffLimits({
        config: state.config,
        teams: state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      });
    }
    default:
      return state;
  }
}
