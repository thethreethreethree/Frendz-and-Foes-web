import { useState } from "react";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";
import type { GameType } from "../net/socket";
import type { GameMeta } from "../brand/brand";

// Per-game scene key art (transparent-bg-free JPEGs in /tiles). Falls back to the gradient +
// emoji if the art file is missing, so a game tile always renders.
function TileArt({ game, icon }: { game: string; icon?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-5xl opacity-90 drop-shadow-lg">
        {icon ?? "🎲"}
      </span>
    );
  }
  return (
    <img
      src={`/tiles/${game}.jpg`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setOk(false)}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
    />
  );
}

// Fallback names so a game still renders on the picker even for a brand config saved before that
// game existed (forward-compat). A brand's own games map overrides these.
const DEFAULT_GAME_META: Record<string, GameMeta> = {
  feud: { label: "Survey Showdown", tagline: "Top answers win", icon: "📊" },
  bingo: { label: "Bingo Night", tagline: "Draw a ball, do the dare", icon: "🎱" },
  murder: { label: "Murder Mystery", tagline: "Wink, kill, deduce", icon: "🔪" },
  trivia: { label: "Trivia", tagline: "3 rounds · A B C D", icon: "🧠" },
  taboo: { label: "Off Limits", tagline: "Describe it — watch your words", icon: "🚫" },
  headsup: { label: "Foreheads", tagline: "Guess the word on your head", icon: "🙈" },
  reverse: { label: "Full Cast", tagline: "The whole team acts it out", icon: "🎭" },
  monikers: { label: "Encore", tagline: "Same cards, three ways", icon: "🎬" },
  codenames: { label: "Cover Ops", tagline: "Crack the secret grid", icon: "🕵️" },
  justone: { label: "Solo Clue", tagline: "One word — but not the same one", icon: "💡" },
  ballpark: { label: "Ballpark", tagline: "Guess the number, bet on the best", icon: "🎯" },
  pictionary: { label: "Quick Draw", tagline: "Sketch it, they guess", icon: "✏️" },
  telestrations: { label: "Sketch Relay", tagline: "Draw, guess, repeat — telephone", icon: "🖍️" },
  afterdark: { label: "After Dark", tagline: "Fill the blank — 18+", icon: "🌙" },
};

// A distinct vivid gradient per game (135°), so the picker reads as a colourful wall of tiles.
const GAME_GRADIENT: Record<string, [string, string]> = {
  feud: ["#38bdf8", "#0ea5e9"],
  bingo: ["#f472b6", "#db2777"],
  murder: ["#fb7185", "#9f1239"],
  trivia: ["#a78bfa", "#7c3aed"],
  taboo: ["#f87171", "#dc2626"],
  headsup: ["#fbbf24", "#d97706"],
  reverse: ["#6ee7b7", "#14b8a6"],
  monikers: ["#e879f9", "#c026d3"],
  codenames: ["#818cf8", "#4f46e5"],
  justone: ["#4ade80", "#16a34a"],
  ballpark: ["#fb923c", "#ea580c"],
  pictionary: ["#22d3ee", "#0891b2"],
  telestrations: ["#a3e635", "#65a30d"],
  afterdark: ["#8b5cf6", "#312e81"],
};
const FALLBACK: [string, string] = ["#64748b", "#334155"];

// Shown on the display first: the host picks which game to run, then pairing/QR appears.
// `games` limits which options appear — the controller passes a subset because the server-
// authoritative games pair through the display. Names/taglines come from the active brand's
// `games` map, so a customer can rename games to their own event without a code change.
export function GamePicker({
  onPick,
  games = ["feud", "bingo", "murder", "trivia", "taboo", "headsup", "reverse", "monikers", "codenames", "justone", "ballpark", "pictionary", "telestrations", "afterdark"],
}: {
  onPick: (g: GameType) => void;
  games?: GameType[];
}) {
  const brand = getBrand();
  return (
    <div className="ff-backdrop relative h-full overflow-auto p-6">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Pick a game</p>

        {/* A wall of vivid gradient tiles — every game visible at once, wrapping onto more rows. */}
        <div className="mt-7 grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((g, idx) => {
            const meta = brand.games[g] ?? DEFAULT_GAME_META[g];
            if (!meta) return null;
            const [from, to] = GAME_GRADIENT[g] ?? FALLBACK;
            return (
              <button
                key={g}
                onClick={() => onPick(g)}
                className="ff-rise group relative flex aspect-[4/3] flex-col items-start justify-end overflow-hidden rounded-2xl p-4 text-left text-white transition duration-150 hover:-translate-y-1 hover:brightness-110 active:translate-y-0 active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                  boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 16px 34px -18px rgb(0 0 0 / 0.7)",
                  animationDelay: `${Math.min(idx * 40, 400)}ms`,
                }}
              >
                {/* scene key art fills the tile (gradient shows underneath as fallback) */}
                <TileArt game={g} icon={meta.icon} />
                {/* bottom scrim keeps the label legible over any art */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                {/* diagonal shine that sweeps across on hover */}
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md transition-transform duration-500 ease-out group-hover:translate-x-[400%]" />
                <span className="relative font-display text-xl font-extrabold leading-tight tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" style={{ textWrap: "balance" }}>
                  {meta.label}
                </span>
                <span className="relative mt-0.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{meta.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
