import { Logo, BingoLogo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import { getBrand } from "../brand/theme";
import type { GameType } from "../net/socket";

// Shown on the display first: the host picks which game to run, then pairing/QR appears.
// `games` limits which options appear — the controller passes ["feud","bingo"] because Murder is
// server-authoritative and pairs through the display (picking it on the controller would dead-end).
// Every card's name/tagline/icon now comes from the active brand's `games` map, so a customer
// can rename the games to their own event without a code change.
export function GamePicker({
  onPick,
  games = ["feud", "bingo", "murder", "trivia"],
}: {
  onPick: (g: GameType) => void;
  games?: GameType[];
}) {
  const brand = getBrand();
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="relative flex flex-col items-center text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 font-display text-xl tracking-wide text-muted">Pick a game</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          {games.map((g) => {
            const meta = brand.games[g];
            if (!meta) return null;
            return (
              <button
                key={g}
                onClick={() => onPick(g)}
                className="ff-sticker flex w-64 flex-col items-center bg-surface px-6 py-6 transition hover:-translate-y-1"
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
