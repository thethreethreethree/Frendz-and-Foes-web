import { useBallpark } from "./useBallpark";
import { PlayerRoster } from "../net/PlayerRoster";
import { bpStart, bpAdvance, bpNext, bpReset , bpKick} from "../net/ballpark";
import { RemoteShell } from "../control/shell";
import { Section } from "../control/ui";
import { getBrand } from "../brand/theme";

// Host controller for "Ballpark". Roster + Start / Advance (force past a stuck phase) / Next / Reset.
// On RemoteShell since 2026-09-16 — see JustOneHost for what the old shape cost.
export function BallparkHost({ room }: { room: string }) {
  const { state, error } = useBallpark(room, "host");
  const label = getBrand().games.ballpark?.label ?? "Ballpark";
  if (!state) return <Connecting />;
  const guessed = state.players.filter((p) => p.guessed).length;
  const betted = state.players.filter((p) => p.bet).length;
  const n = state.players.length;

  const action = (
    <div className="space-y-2">
      {state.phase === "lobby" && <button onClick={bpStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
      {state.phase === "guessing" && <button onClick={bpAdvance} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">OPEN BETTING ({guessed}/{n} guessed)</button>}
      {state.phase === "betting" && <button onClick={bpAdvance} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">REVEAL ANSWER ({betted}/{n} bet)</button>}
      {state.phase === "reveal" && <button onClick={bpNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>}
      {state.phase === "ended" && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center font-semibold">Game over — see the standings on the display.</p>}
      {state.phase !== "lobby" && <button onClick={bpReset} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">Reset to lobby</button>}
    </div>
  );

  return (
    <RemoteShell title={label} room={room} action={action}>
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <Section title={`Players (${n})`}>
        <PlayerRoster players={state.players} onRemove={bpKick} />
        {state.phase !== "lobby" && <div className="mt-1 text-sm text-muted">Round {state.round}/{state.totalRounds}</div>}
      </Section>

      {/* See JustOneHost: a Start button for a game nobody could enter, with nothing saying how. */}
      {state.phase === "lobby" && (
        <p className="text-center text-xs text-muted">Players scan the display's QR to join.</p>
      )}
    </RemoteShell>
  );
}

function Connecting() {
  return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
}
