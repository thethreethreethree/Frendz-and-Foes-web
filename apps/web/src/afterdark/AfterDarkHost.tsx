import { useAfterDark } from "./useAfterDark";
import { caStart, caNext, caReset, caKick } from "../net/afterdark";
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
        <div className="text-sm"><b>Players ({state.players.length})</b></div>
        {state.players.length === 0 ? (
          <div className="mt-1 text-sm text-muted">Nobody yet.</div>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {state.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                {/* Offline is the tell the host needs: it marks who has already walked out. */}
                <span className={`h-2 w-2 flex-none rounded-full ${p.connected ? "bg-buzz-green" : "bg-tang"}`} />
                <span className="min-w-0 flex-1 truncate">{p.name}{p.isJudge ? " · judge" : ""}{p.connected ? "" : " · offline"}</span>
                <button
                  onClick={() => { if (confirm(`Remove ${p.name} from the game?`)) caKick(p.id); }}
                  className="ff-tap flex-none rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted"
                  aria-label={`Remove ${p.name}`}
                >Remove</button>
              </li>
            ))}
          </ul>
        )}
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
