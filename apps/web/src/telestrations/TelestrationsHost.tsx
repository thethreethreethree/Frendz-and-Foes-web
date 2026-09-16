import { useTelestrations } from "./useTelestrations";
import { PlayerRoster } from "../net/PlayerRoster";
import { teStart, teForce, teRevealNext, teReset , teKick} from "../net/telestrations";
import { RemoteShell } from "../control/shell";
import { Section } from "../control/ui";
import { getBrand } from "../brand/theme";

// Host controller for "Sketch Relay". Start / Force-next (past a stuck turn) / Reveal-next / Reset.
// On RemoteShell since 2026-09-16. This one also had the worst header collision of the fourteen:
// "Sketch Relay" is the longest game name and the old header was a bare justify-between with
// nothing allowed to shrink, so it was already touching the status pill at 390px.
export function TelestrationsHost({ room }: { room: string }) {
  const { state, error } = useTelestrations(room, "host");
  const label = getBrand().games.telestrations?.label ?? "Sketch Relay";
  if (!state) return <Connecting />;
  const done = state.players.filter((p) => p.submitted).length;

  const action = (
    <div className="space-y-2">
      {state.phase === "lobby" && <button onClick={teStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
      {state.phase === "playing" && <button onClick={teForce} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">FORCE NEXT TURN ({done}/{state.players.length})</button>}
      {state.phase === "reveal" && <button onClick={teRevealNext} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">REVEAL NEXT →</button>}
      {state.phase === "ended" && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center font-semibold">All chains revealed!</p>}
      {state.phase !== "lobby" && <button onClick={teReset} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">Reset to lobby</button>}
    </div>
  );

  return (
    <RemoteShell title={label} room={room} action={action}>
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <Section title={`Players (${state.players.length})`}>
        <PlayerRoster players={state.players} onRemove={teKick} />
        {state.phase === "playing" && <div className="mt-1 text-sm text-muted">Turn {state.turn + 1}/{state.totalTurns} · {done}/{state.players.length} done</div>}
        {(state.phase === "reveal" || state.phase === "ended") && state.reveal && <div className="mt-1 text-sm text-muted">Revealing book {state.reveal.bookIndex + 1}/{state.totalBooks}</div>}
      </Section>

      <p className="text-center text-xs text-muted">Players draw &amp; guess on their phones; the reveal plays on the big screen.</p>
    </RemoteShell>
  );
}

function Connecting() {
  return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
}
