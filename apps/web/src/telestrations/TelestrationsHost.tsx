import { useTelestrations } from "./useTelestrations";
import { teStart, teForce, teRevealNext, teReset } from "../net/telestrations";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Sketch Relay". Start / Force-next (past a stuck turn) / Reveal-next / Reset.
export function TelestrationsHost({ room }: { room: string }) {
  const { state, error } = useTelestrations(room, "host");
  const label = getBrand().games.telestrations?.label ?? "Sketch Relay";
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const done = state.players.filter((p) => p.submitted).length;

  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between"><div className="ff-title text-2xl">{label}</div><StatusPill /></div>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="rounded-2xl border border-line bg-surface p-3">
        <div className="text-sm"><b>Players ({state.players.length}):</b> {state.players.map((p) => p.name).join(", ") || "—"}</div>
        {state.phase === "playing" && <div className="mt-1 text-sm text-muted">Turn {state.turn + 1}/{state.totalTurns} · {done}/{state.players.length} done</div>}
        {(state.phase === "reveal" || state.phase === "ended") && state.reveal && <div className="mt-1 text-sm text-muted">Revealing book {state.reveal.bookIndex + 1}/{state.totalBooks}</div>}
      </div>
      <div className="mt-4 space-y-2">
        {state.phase === "lobby" && <button onClick={teStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
        {state.phase === "playing" && <button onClick={teForce} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">FORCE NEXT TURN ({done}/{state.players.length})</button>}
        {state.phase === "reveal" && <button onClick={teRevealNext} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">REVEAL NEXT →</button>}
        {state.phase === "ended" && <p className="rounded-lg bg-cream px-3 py-2 text-center font-semibold">All chains revealed!</p>}
        {state.phase !== "lobby" && <button onClick={teReset} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">Reset to lobby</button>}
      </div>
      <p className="mt-3 text-center text-xs text-muted">Players draw &amp; guess on their phones; the reveal plays on the big screen.</p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) { return <div className="h-full overflow-auto bg-canvas p-4 text-ink">{children}</div>; }
