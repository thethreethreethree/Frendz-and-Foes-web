import { useJustOne } from "./useJustOne";
import { PlayerRoster } from "../net/PlayerRoster";
import { joStart, joReveal, joNext, joReset , joKick} from "../net/justone";
import { RemoteShell } from "../control/shell";
import { Section } from "../control/ui";
import { getBrand } from "../brand/theme";

// Host controller for "Solo Clue". Roster + Start / Reveal (force) / Next / Reset. The guesser
// normally judges + advances from their phone; the host has the same controls as a backstop.
//
// On RemoteShell since 2026-09-16. Photographed at 390x844 it was the emptiest screen in the
// product: two elements and ~1250px of void, about 75% of the phone, with the primary action
// stranded at the top and no room code, no way back to game selection, and nothing telling the
// host how players were supposed to get in. The shell keeps identity + code + status pinned and
// docks the action into the thumb's arc.
export function JustOneHost({ room }: { room: string }) {
  const { state, error } = useJustOne(room, "host");
  const label = getBrand().games.justone?.label ?? "Solo Clue";
  if (!state) return <Connecting />;
  const guesser = state.players.find((p) => p.id === state.guesserId)?.name ?? "—";
  const written = state.players.filter((p) => p.id !== state.guesserId && p.submitted).length;
  const writers = state.players.filter((p) => p.id !== state.guesserId).length;

  const action = (
    <div className="space-y-2">
      {state.phase === "lobby" && (
        <button onClick={joStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
      )}
      {state.phase === "writing" && (
        <button onClick={joReveal} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">
          REVEAL CLUES ({written}/{writers} written)
        </button>
      )}
      {state.phase === "reveal" && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm text-muted">{guesser} is guessing — they judge on their phone.</p>
      )}
      {state.phase === "roundover" && (
        <button onClick={joNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>
      )}
      {state.phase === "ended" && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center font-semibold">Final score {state.score}/{state.totalRounds}</p>
      )}
      {state.phase !== "lobby" && (
        <button onClick={joReset} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">Reset to lobby</button>
      )}
    </div>
  );

  return (
    <RemoteShell title={label} room={room} action={action}>
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <Section title={`Players (${state.players.length})`}>
        <PlayerRoster players={state.players} onRemove={joKick} />
        {state.phase !== "lobby" && (
          <div className="mt-1 text-sm text-muted">Round {state.round}/{state.totalRounds} · Score {state.score} · Guesser: {guesser}</div>
        )}
      </Section>

      {/* Cover Ops and Sketch Relay told the host how players get in; this one handed them a Start
          button for a game nobody could enter and said nothing about what it was waiting for. */}
      {state.phase === "lobby" && (
        <p className="text-center text-xs text-muted">Players scan the display's QR to join.</p>
      )}
    </RemoteShell>
  );
}

function Connecting() {
  return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
}
