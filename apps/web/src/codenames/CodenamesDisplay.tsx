import { useCodenames } from "./useCodenames";
import { CodenamesBoard } from "./CodenamesBoard";
import { Logo } from "../display/Logo";
import { QR } from "../net/pairing";
import { codenamesJoinUrl, controllerUrl } from "../net/room";
import { getBrand } from "../brand/theme";
import type { CnState, CnTeam } from "../net/codenames";

// Display (TV) for "Cover Ops". Public board only — the secret key never reaches this screen.
export function CodenamesDisplay({ room }: { room: string }) {
  const { state } = useCodenames(room, "display");
  const label = getBrand().games.codenames?.label ?? "Cover Ops";
  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;

  if (state.phase === "lobby") {
    return (
      <Center>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label}</div>
        <p className="mt-1 text-lg text-muted">Scan to join, pick a team, then the host starts.</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center">
            <QR text={codenamesJoinUrl(room)} size={200} />
            <div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div>
          </div>
          <Roster state={state} />
        </div>
        <p className="mt-4 text-sm text-muted">Host controller: <span className="font-mono">{controllerUrl(room)}</span></p>
      </Center>
    );
  }

  return (
    <div className="ff-backdrop flex h-full w-full flex-col items-center gap-3 overflow-hidden p-4 text-ink">
      {/* Top bar: turn + clue + counts */}
      <div className="flex w-full max-w-4xl items-center justify-between gap-3">
        <TeamCount label="Red" n={state.counts.red} color="#d64550" active={state.turn === "red"} />
        <div className="flex-1 text-center">
          {state.phase === "ended" ? (
            <div className="ff-title text-3xl" style={{ color: state.winner === "red" ? "#d64550" : "#3b7dd8" }}>
              {state.winner === "red" ? "Red" : "Blue"} wins! 🎉
            </div>
          ) : state.clue ? (
            <div>
              <div className="ff-title text-4xl" style={{ color: state.clue.team === "red" ? "#d64550" : "#3b7dd8" }}>
                {state.clue.word.toUpperCase()} · {state.clue.count}
              </div>
              <div className="text-sm font-semibold text-muted">{state.clue.remaining} guess{state.clue.remaining === 1 ? "" : "es"} left</div>
            </div>
          ) : (
            <div className="ff-title text-3xl" style={{ color: state.turn === "red" ? "#d64550" : "#3b7dd8" }}>
              {state.turn === "red" ? "Red" : "Blue"} spymaster is thinking…
            </div>
          )}
        </div>
        <TeamCount label="Blue" n={state.counts.blue} color="#3b7dd8" active={state.turn === "blue"} />
      </div>

      <div className="w-full max-w-3xl">
        <CodenamesBoard cards={state.board} />
      </div>

      {state.log.length > 0 && (
        <div className="max-w-3xl text-center text-sm text-muted">{state.log[state.log.length - 1]}</div>
      )}
    </div>
  );
}

function TeamCount({ label, n, color, active }: { label: string; n: number; color: string; active: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-2 text-center ${active ? "ring-2" : ""}`} style={{ background: `${color}22`, boxShadow: active ? `0 0 0 2px ${color}` : "none" }}>
      <div className="ff-title text-4xl tabular-nums" style={{ color }}>{n}</div>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</div>
    </div>
  );
}

function Roster({ state }: { state: CnState }) {
  const by = (team: CnTeam, role: string) => state.players.filter((p) => p.team === team && p.role === role).map((p) => p.name);
  return (
    <div className="grid grid-cols-2 gap-4 text-left">
      {(["red", "blue"] as CnTeam[]).map((team) => (
        <div key={team} className="rounded-xl border border-line p-3" style={{ minWidth: 140 }}>
          <div className="ff-title text-xl" style={{ color: team === "red" ? "#d64550" : "#3b7dd8" }}>{team === "red" ? "Red" : "Blue"}</div>
          <div className="mt-1 text-sm"><b>Spymaster:</b> {by(team, "spymaster")[0] ?? "—"}</div>
          <div className="text-sm"><b>Agents:</b> {by(team, "operative").join(", ") || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}
