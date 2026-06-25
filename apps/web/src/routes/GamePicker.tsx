import { Logo, BingoLogo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import type { GameType } from "../net/socket";

// Shown on the display first: the host picks which game to run, then pairing/QR appears.
export function GamePicker({ onPick }: { onPick: (g: GameType) => void }) {
  return (
    <div className="ff-backdrop relative grid h-full place-items-center p-6">
      <FloatingAccents />
      <div className="relative flex flex-col items-center text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 font-display text-2xl tracking-wide text-ink/70">PICK A GAME</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => onPick("feud")}
            className="ff-sticker w-64 bg-white px-6 py-6 transition hover:-translate-y-1"
          >
            <div className="ff-title text-3xl text-pink">FRENDZ &amp; FOES</div>
            <div className="mt-1 text-sm font-bold text-ink/60">Survey game show</div>
          </button>
          <button
            onClick={() => onPick("bingo")}
            className="ff-sticker flex w-64 flex-col items-center bg-white px-6 py-6 transition hover:-translate-y-1"
          >
            <BingoLogo className="text-xl" />
            <div className="mt-2 text-sm font-bold text-ink/60">Draw a ball, do the dare</div>
          </button>
        </div>
      </div>
    </div>
  );
}
