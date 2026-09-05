import { useJustOne } from "./useJustOne";
import { joStart, joReveal, joNext, joReset } from "../net/justone";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Solo Clue". Roster + Start / Reveal (force) / Next / Reset. The guesser
// normally judges + advances from their phone; the host has the same controls as a backstop.
export function JustOneHost({ room }: { room: string }) {
  const { state, error } = useJustOne(room, "host");
  const label = getBrand().games.justone?.label ?? "Solo Clue";
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const guesser = state.players.find((p) => p.id === state.guesserId)?.name ?? "—";
  const written = state.players.filter((p) => p.id !== state.guesserId && p.submitted).length;
  const writers = state.players.filter((p) => p.id !== state.guesserId).length;

  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between">
        <div className="ff-title text-2xl">{label}</div>
        <StatusPill />
      </div>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <div className="rounded-2xl border border-line bg-surface p-3">
        <div className="text-sm"><b>Players ({state.players.length}):</b> {state.players.map((p) => p.name).join(", ") || "—"}</div>
        {state.phase !== "lobby" && <div className="mt-1 text-sm text-muted">Round {state.round}/{state.totalRounds} · Score {state.score} · Guesser: {guesser}</div>}
      </div>

      <div className="mt-4 space-y-2">
        {state.phase === "lobby" && (
          <button onClick={joStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
        )}
        {state.phase === "writing" && (
          <button onClick={joReveal} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">
            REVEAL CLUES ({written}/{writers} written)
          </button>
        )}
        {state.phase === "reveal" && <p className="rounded-lg bg-cream px-3 py-2 text-center text-sm">{guesser} is guessing — they judge on their phone.</p>}
        {state.phase === "roundover" && (
          <button onClick={joNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>
        )}
        {state.phase === "ended" && <p className="rounded-lg bg-cream px-3 py-2 text-center font-semibold">Final score {state.score}/{state.totalRounds}</p>}
        {state.phase !== "lobby" && (
          <button onClick={joReset} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">Reset to lobby</button>
        )}
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-auto bg-canvas p-4 text-ink">{children}</div>;
}
