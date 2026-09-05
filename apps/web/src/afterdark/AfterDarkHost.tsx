import { useAfterDark } from "./useAfterDark";
import { caStart, caNext, caReset } from "../net/afterdark";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "After Dark". Start / Next / Reset. The judge picks + advances on their phone;
// the host has the same controls as a backstop.
export function AfterDarkHost({ room }: { room: string }) {
  const { state, error } = useAfterDark(room, "host");
  const label = getBrand().games.afterdark?.label ?? "After Dark";
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const judge = state.players.find((p) => p.id === state.judgeId)?.name ?? "—";
  const submitted = state.players.filter((p) => !p.isJudge && p.submitted).length;
  const nonJudge = state.players.filter((p) => !p.isJudge).length;

  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between"><div className="ff-title text-2xl">{label} <span className="text-danger text-sm">18+</span></div><StatusPill /></div>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="rounded-2xl border border-line bg-surface p-3">
        <div className="text-sm"><b>Players ({state.players.length}):</b> {state.players.map((p) => p.name).join(", ") || "—"}</div>
        {state.phase !== "lobby" && <div className="mt-1 text-sm text-muted">Round {state.round} · Judge {judge}{state.phase === "submitting" ? ` · ${submitted}/${nonJudge} played` : ""}</div>}
      </div>
      <div className="mt-4 space-y-2">
        {state.phase === "lobby" && <button onClick={caStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
        {state.phase === "submitting" && <p className="rounded-lg bg-cream px-3 py-2 text-center text-sm">Waiting on cards ({submitted}/{nonJudge})…</p>}
        {state.phase === "judging" && <p className="rounded-lg bg-cream px-3 py-2 text-center text-sm">{judge} is picking the winner on their phone.</p>}
        {state.phase === "reveal" && <button onClick={caNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>}
        {state.phase === "ended" && <p className="rounded-lg bg-cream px-3 py-2 text-center font-semibold">Game over — see the winner on the display.</p>}
        {state.phase !== "lobby" && <button onClick={caReset} className="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">Reset to lobby</button>}
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) { return <div className="h-full overflow-auto bg-canvas p-4 text-ink">{children}</div>; }
