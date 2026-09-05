import { Logo, BingoLogo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import { getBrand } from "../brand/theme";
import type { GameType } from "../net/socket";
import type { GameMeta } from "../brand/brand";

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
};

// Shown on the display first: the host picks which game to run, then pairing/QR appears.
// `games` limits which options appear — the controller passes ["feud","bingo"] because Murder is
// server-authoritative and pairs through the display (picking it on the controller would dead-end).
// Every card's name/tagline/icon now comes from the active brand's `games` map, so a customer
// can rename the games to their own event without a code change.
export function GamePicker({
  onPick,
  games = ["feud", "bingo", "murder", "trivia", "taboo", "headsup", "reverse", "monikers"],
}: {
  onPick: (g: GameType) => void;
  games?: GameType[];
}) {
  const brand = getBrand();
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="relative flex w-full max-w-5xl flex-col items-center text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 font-display text-xl tracking-wide text-muted">Pick a game</p>

        {/* Wrap into a centered grid so every game is visible at once — the row must never run off
            the screen (there's no swipe). Cards flow onto more rows as games are added. */}
        <div className="mt-8 flex w-full flex-wrap justify-center gap-4">
          {games.map((g) => {
            const meta = brand.games[g] ?? DEFAULT_GAME_META[g];
            if (!meta) return null;
            return (
              <button
                key={g}
                onClick={() => onPick(g)}
                className="ff-sticker flex w-56 flex-col items-center bg-surface px-6 py-5 transition hover:-translate-y-1"
              >
                {g === "bingo" ? (
                  <BingoLogo className="text-xl" />
                ) : (
                  <div className="ff-title text-2xl text-ink">
                    {meta.icon ? `${meta.icon} ` : ""}
                    {meta.label}
                  </div>
                )}
                <div className="mt-2 text-sm font-semibold text-muted">{meta.tagline}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
