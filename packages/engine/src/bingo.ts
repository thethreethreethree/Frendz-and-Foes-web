// Frendz Bingo — a pure draw engine for standard 75-ball bingo (B/I/N/G/O), where every ball
// has a dedicated dare the host reveals after the draw. No scoring — it's a draw → dare party
// mode. Randomness lives in the DRAW action (run on the host); the resulting state is what syncs
// to the display, so followers never need to re-roll.

import { DARES } from "./bingoDares.js";

export interface BingoBall {
  id: string; // e.g. "B1", "O75"
  letter: "B" | "I" | "N" | "G" | "O";
  number: number; // 1..75
}

const COLUMNS: Array<{ letter: BingoBall["letter"]; min: number; max: number }> = [
  { letter: "B", min: 1, max: 15 },
  { letter: "I", min: 16, max: 30 },
  { letter: "N", min: 31, max: 45 },
  { letter: "G", min: 46, max: 60 },
  { letter: "O", min: 61, max: 75 },
];

export const BINGO_BALLS: BingoBall[] = COLUMNS.flatMap((c) => {
  const out: BingoBall[] = [];
  for (let n = c.min; n <= c.max; n++) out.push({ id: `${c.letter}${n}`, letter: c.letter, number: n });
  return out;
});

export const BINGO_LETTERS = ["B", "I", "N", "G", "O"] as const;

/** Balls grouped by column, for rendering the caller board as 5 rows of 15. */
export const BINGO_COLUMNS: Record<string, BingoBall[]> = Object.fromEntries(
  BINGO_LETTERS.map((l) => [l, BINGO_BALLS.filter((b) => b.letter === l)]),
);

/** One dare per ball, in BINGO_BALLS order (B1 first … O75 last). See bingoDares.ts. */
export const DEFAULT_DARES: string[] = DARES;

export interface BingoState {
  /** Ball ids in the order they were drawn. */
  drawn: string[];
  /** The most-recently drawn ball, or null before the first draw. */
  currentId: string | null;
  /** Whether the current ball's dare is revealed on the display. */
  dareRevealed: boolean;
}

export type BingoAction =
  | { type: "DRAW" }
  | { type: "REVEAL_DARE" }
  | { type: "UNDRAW" }
  | { type: "RESET" };

export function createBingo(): BingoState {
  return { drawn: [], currentId: null, dareRevealed: false };
}

export function bingoReducer(state: BingoState, action: BingoAction): BingoState {
  switch (action.type) {
    case "DRAW": {
      const remaining = BINGO_BALLS.filter((b) => !state.drawn.includes(b.id));
      if (remaining.length === 0) return state;
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      return { drawn: [...state.drawn, pick.id], currentId: pick.id, dareRevealed: false };
    }
    case "REVEAL_DARE":
      return state.currentId ? { ...state, dareRevealed: true } : state;
    case "UNDRAW": {
      if (state.drawn.length === 0) return state;
      const drawn = state.drawn.slice(0, -1);
      return { drawn, currentId: drawn[drawn.length - 1] ?? null, dareRevealed: false };
    }
    case "RESET":
      return createBingo();
    default:
      return state;
  }
}

export function ballById(id: string | null): BingoBall | null {
  return id ? (BINGO_BALLS.find((b) => b.id === id) ?? null) : null;
}

/** The dare text for a ball, from the supplied dares (defaults to the real list). */
export function dareForBall(id: string | null, dares: string[] = DEFAULT_DARES): string {
  const idx = BINGO_BALLS.findIndex((b) => b.id === id);
  return idx >= 0 ? (dares[idx] ?? "Dare coming soon.") : "";
}

export function remainingCount(state: BingoState): number {
  return BINGO_BALLS.length - state.drawn.length;
}

export function isBingoComplete(state: BingoState): boolean {
  return state.drawn.length >= BINGO_BALLS.length;
}
