import { Logo, BingoLogo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import type { GameType } from "../net/socket";

// Shown on the display first: the host picks which game to run, then pairing/QR appears.
// `games` limits which options appear — the controller passes ["feud","bingo"] because Murder is
// server-authoritative and pairs through the display (picking it on the controller would dead-end).
export function GamePicker({
  onPick,
  games = ["feud", "bingo", "murder", "trivia"],
}: {
  onPick: (g: GameType) => void;
  games?: GameType[];
}) {
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="relative flex flex-col items-center text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 font-display text-2xl tracking-wide text-ink/70">PICK A GAME</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          {games.includes("feud") && (
            <button
              onClick={() => onPick("feud")}
              className="ff-sticker w-64 bg-white px-6 py-6 transition hover:-translate-y-1"
            >
              <div className="ff-title text-3xl text-pink">FRENDZ &amp; FOES</div>
              <div className="mt-1 text-sm font-bold text-ink/60">Survey game show</div>
            </button>
          )}
          {games.includes("bingo") && (
            <button
              onClick={() => onPick("bingo")}
              className="ff-sticker flex w-64 flex-col items-center bg-white px-6 py-6 transition hover:-translate-y-1"
            >
              <BingoLogo className="text-xl" />
              <div className="mt-2 text-sm font-bold text-ink/60">Draw a ball, do the dare</div>
            </button>
          )}
          {games.includes("murder") && (
            <button
              onClick={() => onPick("murder")}
              className="ff-sticker flex w-64 flex-col items-center bg-white px-6 py-6 transition hover:-translate-y-1"
            >
              <div className="ff-title text-3xl text-ink">🔪 MURDER</div>
              <div className="mt-1 text-sm font-bold text-ink/60">Wink, kill, deduce</div>
            </button>
          )}
          {games.includes("trivia") && (
            <button
              onClick={() => onPick("trivia")}
              className="ff-sticker flex w-64 flex-col items-center bg-white px-6 py-6 transition hover:-translate-y-1"
            >
              <div className="ff-title text-3xl text-grape">🧠 TRIVIA</div>
              <div className="mt-1 text-sm font-bold text-ink/60">3 rounds · A B C D</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
