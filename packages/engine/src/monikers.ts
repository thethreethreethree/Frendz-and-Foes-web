// "Encore" — our take on Monikers. One shuffled subset of point-valued cards is played THREE
// times: round 1 describe with any words, round 2 one word only, round 3 act it out. Because the
// same cards come back each round, the room builds up inside jokes. Teams share the clock: when a
// turn's timer runs out the same pile passes to the next team, so the round continues where it left
// off. Highest total points after three rounds wins.
//
// Its own engine (not the shared word-deck one): it needs a persistent per-round pile that survives
// turn changes, point scoring, and round cycling. Secret-safe like the others — the current card
// stays on the host device; toPublic() exposes counts + the post-turn review only.
//
// All cards are ORIGINAL: folklore/public-domain figures, everyday archetypes, and abstract
// concepts — no trademarked names.

export interface MonikersCard {
  word: string;
  points: number; // 1 easy · 2 medium · 3 tricky
}

export const MONIKERS_DECK: readonly MonikersCard[] = [
  // 1 point — instantly recognizable
  { word: "A cowboy", points: 1 },
  { word: "A pirate", points: 1 },
  { word: "Santa Claus", points: 1 },
  { word: "A vampire", points: 1 },
  { word: "A robot", points: 1 },
  { word: "A superhero", points: 1 },
  { word: "A mermaid", points: 1 },
  { word: "A ninja", points: 1 },
  { word: "A clown", points: 1 },
  { word: "A wizard", points: 1 },
  { word: "A caveman", points: 1 },
  { word: "A ghost", points: 1 },
  { word: "A knight", points: 1 },
  { word: "An astronaut", points: 1 },
  // 2 points — everyday archetypes
  { word: "The class clown", points: 2 },
  { word: "A conspiracy theorist", points: 2 },
  { word: "A drama queen", points: 2 },
  { word: "A backseat driver", points: 2 },
  { word: "A helicopter parent", points: 2 },
  { word: "A gym rat", points: 2 },
  { word: "A night owl", points: 2 },
  { word: "A shopaholic", points: 2 },
  { word: "A know-it-all", points: 2 },
  { word: "A perfectionist", points: 2 },
  { word: "A social butterfly", points: 2 },
  { word: "A couch potato", points: 2 },
  { word: "A daredevil", points: 2 },
  { word: "A wallflower", points: 2 },
  // 3 points — abstract / tricky
  { word: "Existential dread", points: 3 },
  { word: "A midlife crisis", points: 3 },
  { word: "Impostor syndrome", points: 3 },
  { word: "A guilty pleasure", points: 3 },
  { word: "Beginner's luck", points: 3 },
  { word: "A slippery slope", points: 3 },
  { word: "A double standard", points: 3 },
  { word: "A necessary evil", points: 3 },
  { word: "A white lie", points: 3 },
  { word: "A pipe dream", points: 3 },
  { word: "The last straw", points: 3 },
  { word: "A leap of faith", points: 3 },
];

export const MONIKERS_ROUNDS = [
  { label: "Describe it", rule: "Say anything except the words on the card." },
  { label: "One word", rule: "Give exactly ONE word as your clue." },
  { label: "Act it out", rule: "No words — act it out." },
];

export type MonikersPhase = "setup" | "ready" | "playing" | "turnover" | "roundover" | "ended";

export interface MonikersConfig {
  deckSize: number; // how many cards are in play (subset of the deck)
  turnSeconds: number;
}

export interface MonikersTeam {
  id: string;
  name: string;
  color?: string;
  score: number;
}

export interface MonikersEntry {
  word: string;
  points: number;
  result: "got" | "pass";
}

export interface MonikersState {
  phase: MonikersPhase;
  config: MonikersConfig;
  teams: MonikersTeam[];
  activeIdx: number;
  round: number; // 0,1,2
  secondsLeft: number;
  pool: number[]; // the fixed subset (indices into MONIKERS_DECK) for the whole game
  remaining: number[]; // cards left in the CURRENT round (persists across turns)
  turnLog: MonikersEntry[];
  lastReview: MonikersEntry[];
  winner?: string;
}

export interface MonikersPublic {
  phase: MonikersPhase;
  config: MonikersConfig;
  teams: MonikersTeam[];
  activeIdx: number;
  round: number;
  secondsLeft: number;
  remainingCount: number;
  poolSize: number;
  turnPoints: number; // points banked this turn (no words)
  lastReview: MonikersEntry[];
  winner?: string;
}

export type MonikersAction =
  | { type: "CONFIGURE"; config: Partial<MonikersConfig> }
  | { type: "SET_TEAMS"; teams: Array<{ id: string; name: string; color?: string }> }
  | { type: "START" }
  | { type: "BEGIN_TURN" }
  | { type: "GOT" }
  | { type: "PASS" }
  | { type: "TICK" }
  | { type: "END_TURN" }
  | { type: "NEXT_TURN" }
  | { type: "NEXT_ROUND" }
  | { type: "END" }
  | { type: "RESET" };

export const DEFAULT_MONIKERS_CONFIG: MonikersConfig = { deckSize: 24, turnSeconds: 60 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMonikers(opts?: {
  config?: Partial<MonikersConfig>;
  teams?: Array<{ id: string; name: string; color?: string }>;
}): MonikersState {
  const config = { ...DEFAULT_MONIKERS_CONFIG, ...opts?.config };
  return {
    phase: "setup",
    config,
    teams: (opts?.teams ?? []).map((t) => ({ ...t, score: 0 })),
    activeIdx: 0,
    round: 0,
    secondsLeft: config.turnSeconds,
    pool: [],
    remaining: [],
    turnLog: [],
    lastReview: [],
  };
}

export function currentMonikersCard(state: MonikersState): MonikersCard | null {
  if (state.phase !== "playing") return null;
  const idx = state.remaining[0];
  return idx === undefined ? null : MONIKERS_DECK[idx] ?? null;
}

export function monikersRound(state: MonikersState) {
  return MONIKERS_ROUNDS[state.round] ?? MONIKERS_ROUNDS[0];
}

export function toPublicMonikers(state: MonikersState): MonikersPublic {
  return {
    phase: state.phase,
    config: state.config,
    teams: state.teams,
    activeIdx: state.activeIdx,
    round: state.round,
    secondsLeft: state.secondsLeft,
    remainingCount: state.remaining.length,
    poolSize: state.pool.length,
    turnPoints: state.turnLog.filter((e) => e.result === "got").reduce((n, e) => n + e.points, 0),
    lastReview: state.lastReview,
    winner: state.winner,
  };
}

// The round's pile is empty → end the round (or the whole game after round 3).
function endRound(state: MonikersState): MonikersState {
  const isLast = state.round >= MONIKERS_ROUNDS.length - 1;
  if (!isLast) return { ...state, phase: "roundover", secondsLeft: 0, lastReview: state.turnLog };
  const winner = [...state.teams].sort((a, b) => b.score - a.score)[0];
  return { ...state, phase: "ended", secondsLeft: 0, lastReview: state.turnLog, winner: winner?.id };
}

export function monikersReducer(state: MonikersState, action: MonikersAction): MonikersState {
  switch (action.type) {
    case "CONFIGURE": {
      if (state.phase !== "setup") return state;
      const config = { ...state.config, ...action.config };
      config.deckSize = Math.max(6, Math.min(config.deckSize, MONIKERS_DECK.length));
      return { ...state, config, secondsLeft: config.turnSeconds };
    }
    case "SET_TEAMS": {
      if (state.phase !== "setup") return state;
      return { ...state, teams: action.teams.map((t) => ({ ...t, score: 0 })) };
    }
    case "START": {
      if (state.teams.length < 2) return state;
      const pool = shuffle(Array.from({ length: MONIKERS_DECK.length }, (_, i) => i)).slice(0, state.config.deckSize);
      return {
        ...state,
        phase: "ready",
        activeIdx: 0,
        round: 0,
        secondsLeft: state.config.turnSeconds,
        pool,
        remaining: shuffle(pool),
        turnLog: [],
        lastReview: [],
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
        winner: undefined,
      };
    }
    case "BEGIN_TURN": {
      if (state.phase !== "ready") return state;
      return { ...state, phase: "playing", secondsLeft: state.config.turnSeconds, turnLog: [] };
    }
    case "GOT": {
      if (state.phase !== "playing") return state;
      const idx = state.remaining[0];
      const card = idx === undefined ? null : MONIKERS_DECK[idx];
      if (!card) return state;
      const teams = state.teams.map((t, i) => (i === state.activeIdx ? { ...t, score: t.score + card.points } : t));
      const remaining = state.remaining.slice(1);
      const turnLog = [...state.turnLog, { word: card.word, points: card.points, result: "got" as const }];
      const next = { ...state, teams, remaining, turnLog };
      return remaining.length === 0 ? endRound(next) : next;
    }
    case "PASS": {
      if (state.phase !== "playing") return state;
      const idx = state.remaining[0];
      const card = idx === undefined ? null : MONIKERS_DECK[idx];
      if (!card) return state;
      const remaining = [...state.remaining.slice(1), idx]; // send to the bottom of this round's pile
      return { ...state, remaining, turnLog: [...state.turnLog, { word: card.word, points: card.points, result: "pass" }] };
    }
    case "TICK": {
      if (state.phase !== "playing") return state;
      if (state.secondsLeft <= 1) return { ...state, phase: "turnover", secondsLeft: 0, lastReview: state.turnLog };
      return { ...state, secondsLeft: state.secondsLeft - 1 };
    }
    case "END_TURN": {
      if (state.phase !== "playing") return state;
      return { ...state, phase: "turnover", secondsLeft: 0, lastReview: state.turnLog };
    }
    case "NEXT_TURN": {
      if (state.phase !== "turnover") return state;
      return { ...state, phase: "ready", activeIdx: (state.activeIdx + 1) % state.teams.length };
    }
    case "NEXT_ROUND": {
      if (state.phase !== "roundover") return state;
      return {
        ...state,
        phase: "ready",
        round: state.round + 1,
        activeIdx: (state.activeIdx + 1) % state.teams.length,
        remaining: shuffle(state.pool),
        turnLog: [],
        lastReview: [],
      };
    }
    case "END": {
      return { ...state, phase: "ended", winner: [...state.teams].sort((a, b) => b.score - a.score)[0]?.id };
    }
    case "RESET": {
      return createMonikers({ config: state.config, teams: state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })) });
    }
    default:
      return state;
  }
}
