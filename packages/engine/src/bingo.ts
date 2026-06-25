// Frendz Bingo — a pure draw engine for standard 75-ball bingo (B/I/N/G/O), where every ball
// has a dedicated dare the host reveals after the draw. No scoring — it's a draw → dare party
// mode. Randomness lives in the DRAW action (run on the host); the resulting state is what syncs
// to the display, so followers never need to re-roll.

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

// Placeholder dares (one per ball, indexed to BINGO_BALLS order). Replace these with the real
// list when the dares file is provided — same length/order and everything keeps working.
export const DEFAULT_DARES: string[] = [
  "Do your best dance move for 10 seconds.",
  "Speak in a foreign accent until your next turn.",
  "Take a selfie with the person on your left.",
  "Do 10 jumping jacks.",
  "Sing the chorus of any song.",
  "Do your best animal impression.",
  "Give a 10-second motivational speech.",
  "Swap seats with someone across the room.",
  "Tell an embarrassing travel story.",
  "Strike a superhero pose for 10 seconds.",
  "Do your best catwalk strut.",
  "Talk in slow motion until your next turn.",
  "Compliment three different people.",
  "Do your best robot dance.",
  "Say the alphabet backwards from J.",
  "Imitate another player until they guess who.",
  "Do your best evil villain laugh.",
  "Balance on one foot for 15 seconds.",
  "Tell a joke — if no one laughs, do it again.",
  "Do your best impression of a tour guide.",
  "Air-guitar for 10 seconds.",
  "Make up a 4-line rap about the room.",
  "Do your best slow-motion victory celebration.",
  "Speak only in questions until your next turn.",
  "Do your best runway model face.",
  "Hum a song and let others guess it.",
  "Do 5 push-ups (or 5 squats).",
  "Pretend to be a news reporter for 15 seconds.",
  "Do your best dramatic movie death scene.",
  "Give someone a high-five and a nickname.",
  "Do your best impression of a baby.",
  "Talk like a pirate until your next turn.",
  "Do an interpretive dance of your last meal.",
  "Strike three different yoga poses.",
  "Say a tongue twister three times fast.",
  "Do your best impression of the host.",
  "Pretend you're stuck in an invisible box.",
  "Do your best slow clap and get others to join.",
  "Whisper everything until your next turn.",
  "Do your best 'caught on camera' surprised face.",
  "Make the funniest face you can for 5 seconds.",
  "Do your best impression of a flight attendant.",
  "Walk like a runway model to the door and back.",
  "Do your best impression of a robot waking up.",
  "Give a toast to the group.",
  "Do your best impression of a famous singer.",
  "Pretend to swim across the room.",
  "Do your best impression of a cat.",
  "Tell everyone your most-used emoji and why.",
  "Do your best impression of a sports commentator.",
  "Do a dramatic reading of the last text you sent.",
  "Do your best impression of a DJ hyping a crowd.",
  "Freeze like a statue for 15 seconds.",
  "Do your best impression of a waiter taking an order.",
  "Make up a secret handshake with someone.",
  "Do your best impression of a weather forecaster.",
  "Act out your morning routine in 10 seconds.",
  "Do your best impression of a superhero landing.",
  "Pretend to be a malfunctioning robot.",
  "Do your best impression of a game show host.",
  "Give an Oscar acceptance speech.",
  "Do your best impression of a tourist taking photos.",
  "Do the most dramatic sigh you can.",
  "Do your best impression of a yoga instructor.",
  "Pretend you just won the lottery.",
  "Do your best impression of a drill sergeant.",
  "Act like you're walking against a strong wind.",
  "Do your best impression of a sleepy person.",
  "Do your best impression of a fashion critic.",
  "Pretend to be a mime trapped in a box.",
  "Do your best impression of a motivational coach.",
  "Do your best impression of a dramatic soap opera.",
  "Act out catching something falling from the sky.",
  "Do your best impression of a karaoke superstar.",
  "Take a bow like you just finished a performance.",
];

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

/** The dare text for a ball, from the supplied dares (defaults to placeholders). */
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
