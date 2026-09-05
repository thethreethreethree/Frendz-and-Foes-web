// Shared engine for our word-deck party games (Off Limits, Heads Up!, Reverse Charades,
// Monikers). One team's describer/holder works through a shuffled deck against a clock, scoring
// on "got" and optionally losing points on "skip"; teams take turns; first to the win score wins.
//
// The deck is passed IN to every function (createWordGame/reducer/cardAt) so the same engine
// drives different content. The crucial rule for hidden-word games: the current word lives only
// in the host's full state — toPublicWordGame() strips the deck/turn log so the room's display
// never sees the live word (only counts + the post-turn review).

export interface WordCard {
  word: string;
  taboo?: string[]; // Off Limits: forbidden words
  category?: string; // Heads Up!: themed decks
}

export interface TurnEntry {
  word: string;
  result: "got" | "skip";
}

export interface WordGameConfig {
  turnSeconds: number;
  winScore: number;
  skipPenalty: number; // points lost per skip (0 = free)
}

export interface WordGameTeam {
  id: string;
  name: string;
  color?: string;
  score: number;
}

export type WordGamePhase = "setup" | "ready" | "playing" | "turnover" | "ended";

/** Full host-held state — contains the deck order + turn log. NEVER broadcast as-is. */
export interface WordGameState {
  phase: WordGamePhase;
  config: WordGameConfig;
  teams: WordGameTeam[];
  activeIdx: number;
  secondsLeft: number;
  deckOrder: number[];
  cursor: number;
  turnLog: TurnEntry[];
  lastReview: TurnEntry[];
  round: number;
  winner?: string;
}

/** Broadcast-safe projection — no deck, no live word. */
export interface WordGamePublic {
  phase: WordGamePhase;
  config: WordGameConfig;
  teams: WordGameTeam[];
  activeIdx: number;
  secondsLeft: number;
  round: number;
  winner?: string;
  turnGot: number;
  turnSkip: number;
  lastReview: TurnEntry[];
}

export type WordGameAction =
  | { type: "CONFIGURE"; config: Partial<WordGameConfig> }
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

export const DEFAULT_WORDGAME_CONFIG: WordGameConfig = { turnSeconds: 60, winScore: 20, skipPenalty: 0 };

function shuffledOrder(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createWordGame(
  deck: readonly WordCard[],
  opts?: { config?: Partial<WordGameConfig>; teams?: Array<{ id: string; name: string; color?: string }> },
): WordGameState {
  const config = { ...DEFAULT_WORDGAME_CONFIG, ...opts?.config };
  return {
    phase: "setup",
    config,
    teams: (opts?.teams ?? []).map((t) => ({ ...t, score: 0 })),
    activeIdx: 0,
    secondsLeft: config.turnSeconds,
    deckOrder: shuffledOrder(deck.length),
    cursor: 0,
    turnLog: [],
    lastReview: [],
    round: 0,
  };
}

export function cardAt(deck: readonly WordCard[], state: WordGameState): WordCard | null {
  if (state.phase !== "playing") return null;
  return deck[state.deckOrder[state.cursor]] ?? null;
}

export function activeTeam(state: WordGameState): WordGameTeam | null {
  return state.teams[state.activeIdx] ?? null;
}

export function toPublicWordGame(state: WordGameState): WordGamePublic {
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

function advance(deck: readonly WordCard[], state: WordGameState): { deckOrder: number[]; cursor: number } {
  const next = state.cursor + 1;
  if (next >= state.deckOrder.length) return { deckOrder: shuffledOrder(deck.length), cursor: 0 };
  return { deckOrder: state.deckOrder, cursor: next };
}

function endTurn(state: WordGameState): WordGameState {
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

export function wordGameReducer(deck: readonly WordCard[], state: WordGameState, action: WordGameAction): WordGameState {
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
      if (state.teams.length < 2) return state;
      return {
        ...state,
        phase: "ready",
        activeIdx: 0,
        round: 0,
        secondsLeft: state.config.turnSeconds,
        deckOrder: shuffledOrder(deck.length),
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
      const card = cardAt(deck, state);
      if (!card) return state;
      const teams = state.teams.map((t, i) => (i === state.activeIdx ? { ...t, score: t.score + 1 } : t));
      return { ...state, teams, turnLog: [...state.turnLog, { word: card.word, result: "got" }], ...advance(deck, state) };
    }
    case "SKIP": {
      if (state.phase !== "playing") return state;
      const card = cardAt(deck, state);
      if (!card) return state;
      const teams = state.teams.map((t, i) =>
        i === state.activeIdx ? { ...t, score: Math.max(0, t.score - state.config.skipPenalty) } : t,
      );
      return { ...state, teams, turnLog: [...state.turnLog, { word: card.word, result: "skip" }], ...advance(deck, state) };
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
      return createWordGame(deck, {
        config: state.config,
        teams: state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      });
    }
    default:
      return state;
  }
}
