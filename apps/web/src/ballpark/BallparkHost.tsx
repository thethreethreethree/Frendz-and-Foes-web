import { useBallpark } from "./useBallpark";
import { bpStart, bpAdvance, bpNext, bpReset } from "../net/ballpark";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Ballpark". Roster + Start / Advance (force past a stuck phase) / Next / Reset.
export function BallparkHost({ room }: { room: string }) {
  const { state, error } = useBallpark(room, "host");
  const label = getBrand().games.ballpark?.label ?? "Ballpark";
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const guessed = state.players.filter((p) => p.guessed).length;
  const betted = state.players.filter((p) => p.bet).length;
  const n = state.players.length;

  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between">
        <div className="ff-title text-2xl">{label}</div>
        <StatusPill />
      </div>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <div className="rounded-2xl border border-line bg-surface p-3">
        <div className="text-sm"><b>Players ({n}):</b> {state.players.map((p) => p.name).join(", ") || "—"}</div>
        {state.phase !== "lobby" && <div className="mt-1 text-sm text-muted">Round {state.round}/{state.totalRounds}</div>}
      </div>

      <div className="mt-4 space-y-2">
        {state.phase === "lobby" && <button onClick={bpStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
        {state.phase === "guessing" && <button onClick={bpAdvance} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">OPEN BETTING ({guessed}/{n} guessed)</button>}
        {state.phase === "betting" && <button onClick={bpAdvance} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">REVEAL ANSWER ({betted}/{n} bet)</button>}
        {state.phase === "reveal" && <button onClick={bpNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>}
        {state.phase === "ended" && <p className="rounded-lg bg-cream px-3 py-2 text-center font-semibold">Game over — see the standings on the display.</p>}
        {state.phase !== "lobby" && <button onClick={bpReset} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">Reset to lobby</button>}
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-auto bg-canvas p-4 text-ink">{children}</div>;
}
