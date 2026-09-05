import { useCodenames } from "./useCodenames";
import { cnStart, cnReset, type CnTeam } from "../net/codenames";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Cover Ops". Roster + Start/Reset. The board itself lives on the display and
// the spymasters' phones; the host just runs the room.
export function CodenamesHost({ room }: { room: string }) {
  const { state, error } = useCodenames(room, "host");
  const label = getBrand().games.codenames?.label ?? "Cover Ops";
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;

  const roster = (team: CnTeam, role: string) => state.players.filter((p) => p.team === team && p.role === role).map((p) => p.name);

  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between">
        <div className="ff-title text-2xl">{label}</div>
        <StatusPill />
      </div>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        {(["red", "blue"] as CnTeam[]).map((team) => (
          <div key={team} className="rounded-2xl border border-line bg-surface p-3">
            <div className="ff-title text-xl" style={{ color: team === "red" ? "#d64550" : "#3b7dd8" }}>{team === "red" ? "Red" : "Blue"}</div>
            <div className="mt-1 text-sm"><b>Spymaster:</b> {roster(team, "spymaster")[0] ?? "—"}</div>
            <div className="text-sm"><b>Agents:</b> {roster(team, "operative").join(", ") || "—"}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {state.phase === "lobby" ? (
          <button onClick={cnStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
        ) : (
          <>
            <p className="rounded-lg bg-cream px-3 py-2 text-center text-sm">
              {state.phase === "ended"
                ? `${state.winner === "red" ? "Red" : "Blue"} won.`
                : `In play — ${state.turn === "red" ? "Red" : "Blue"}'s turn.`}
            </p>
            <button onClick={() => cnReset(false)} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEW GAME (keep teams)</button>
            <button onClick={() => cnReset(true)} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">Reset everyone to lobby</button>
          </>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted">Players scan the display's QR to join and pick a team.</p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-auto bg-canvas p-4 text-ink">{children}</div>;
}
