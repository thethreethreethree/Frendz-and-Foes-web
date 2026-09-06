import { useEffect, useState } from "react";
import { HEADSUP_CATEGORIES } from "@ff/engine";
import { useHeadsUpHost } from "../store/headsupStore";
import { StatusPill } from "../net/pairing";
import { HowToPlay } from "../net/howtoplay";
import { getBrand } from "../brand/theme";

// Holder's device for "Foreheads". The phone goes on the holder's forehead so the group sees the
// word; the holder marks got/pass by tapping the big top/bottom zones (tilt sensors need HTTPS +
// per-OS permission, so tap zones are the reliable interaction on the current HTTP demo).

const TEAM_COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0ea5e9"];
const uid = () => Math.random().toString(36).slice(2, 8);

export function HeadsUpControl() {
  const g = useHeadsUpHost();
  const { state } = g;
  const label = getBrand().games.headsup?.label ?? "Foreheads";

  // In an active turn, go full-screen tap-zones (no chrome) so the holder can tap by feel.
  if (state.phase === "playing") return <Playing />;

  return (
    <div className="flex h-full flex-col overflow-auto bg-canvas p-4 text-ink">
      <div className="mb-3 flex items-center justify-between">
        <div className="ff-title text-2xl">{label}</div>
        <div className="flex items-center gap-2">
          <StatusPill />
          {state.phase !== "setup" && (
            <button onClick={g.reset} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted">Reset</button>
          )}
        </div>
      </div>
      {state.phase === "setup" && <Setup />}
      {state.phase === "ready" && <Ready />}
      {state.phase === "turnover" && <TurnOver />}
      {state.phase === "ended" && <Ended />}
    </div>
  );
}

function Setup() {
  const g = useHeadsUpHost();
  const [teams, setTeams] = useState(() =>
    g.state.teams.length >= 2
      ? g.state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color ?? TEAM_COLORS[0] }))
      : [
          { id: uid(), name: "Red Team", color: TEAM_COLORS[0] },
          { id: uid(), name: "Blue Team", color: TEAM_COLORS[1] },
        ],
  );
  const [turnSeconds, setTurnSeconds] = useState(g.state.config.turnSeconds);
  const [winScore, setWinScore] = useState(g.state.config.winScore);

  const rename = (id: string, name: string) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const remove = (id: string) => setTeams((ts) => (ts.length > 2 ? ts.filter((t) => t.id !== id) : ts));
  const add = () => setTeams((ts) => (ts.length < 6 ? [...ts, { id: uid(), name: `Team ${ts.length + 1}`, color: TEAM_COLORS[ts.length % TEAM_COLORS.length] }] : ts));

  const start = () => {
    g.configure({ turnSeconds, winScore, skipPenalty: 0 });
    g.setTeams(teams);
    g.start();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted">Category</h2>
        <div className="grid grid-cols-3 gap-2">
          {HEADSUP_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => g.setCategory(c.id)}
              className={`rounded-xl border p-2 text-center text-xs font-semibold ${g.category === c.id ? "border-primary bg-primary/10 text-primary" : "border-line text-ink"}`}>
              <div className="text-xl">{c.icon}</div>{c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted">Teams</h2>
        <div className="space-y-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <input value={t.name} onChange={(e) => rename(t.id, e.target.value)} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
              {teams.length > 2 && <button onClick={() => remove(t.id)} className="px-2 text-lg text-muted">×</button>}
            </div>
          ))}
        </div>
        {teams.length < 6 && <button onClick={add} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink">+ Add team</button>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted">Rules</h2>
        <label className="block text-sm font-semibold">Turn length: {turnSeconds}s
          <input type="range" min={30} max={120} step={15} value={turnSeconds} onChange={(e) => setTurnSeconds(+e.target.value)} className="mt-1 w-full accent-primary" />
        </label>
        <label className="block text-sm font-semibold">Play to: {winScore} points
          <input type="range" min={10} max={40} step={5} value={winScore} onChange={(e) => setWinScore(+e.target.value)} className="mt-1 w-full accent-primary" />
        </label>
      </section>

      <button onClick={start} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>

      <HowToPlay game="headsup" />
    </div>
  );
}

function Ready() {
  const g = useHeadsUpHost();
  const team = g.state.teams[g.state.activeIdx];
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) { g.beginTurn(); return; }
    const id = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 800);
    return () => clearTimeout(id);
  }, [count, g]);

  if (count !== null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="ff-title text-9xl text-primary">{count === 0 ? "Go!" : count}</div>
        <p className="mt-4 text-lg font-semibold text-muted">Phone on your forehead!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Scoreboard />
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Up next</div>
        <div className="ff-title text-4xl" style={{ color: team?.color }}>{team?.name}</div>
        <p className="mt-3 max-w-xs text-sm text-muted">Pick a holder. Tap start, put the phone on your forehead facing the room. Tap the <b>bottom</b> for a correct guess, the <b>top</b> to pass.</p>
      </div>
      <button onClick={() => setCount(3)} className="ff-sticker w-full bg-primary px-4 py-5 font-display text-3xl text-primary-ink">START TURN</button>
    </div>
  );
}

function Playing() {
  const g = useHeadsUpHost();
  const card = g.currentCard;
  const low = g.state.secondsLeft <= 10;
  return (
    <div className="relative flex h-full w-full flex-col select-none">
      {/* PASS zone (top) */}
      <button onClick={g.skip} className="flex flex-1 items-start justify-center bg-warning pt-6 text-white">
        <span className="font-display text-3xl">↑ PASS</span>
      </button>
      {/* GOT zone (bottom) */}
      <button onClick={g.got} className="flex flex-1 items-end justify-center bg-success pb-6 text-white">
        <span className="font-display text-3xl">✓ GOT IT</span>
      </button>
      {/* Word + timer overlay (non-interactive so taps hit the zones) */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <div className={`absolute top-2 right-3 font-display text-3xl tabular-nums ${low ? "text-white" : "text-white/80"}`}>{g.state.secondsLeft}</div>
        <div className="rounded-2xl bg-black/25 px-6 py-4">
          <div className="ff-title text-6xl text-white drop-shadow">{card?.word ?? "…"}</div>
        </div>
      </div>
    </div>
  );
}

function Scoreboard() {
  const { state } = useHeadsUpHost();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {state.teams.map((t, i) => (
        <span key={t.id} className={`rounded-full px-3 py-1 text-sm font-bold ${i === state.activeIdx ? "text-white" : "bg-surface text-ink"}`} style={i === state.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}>
          {t.name}: {t.score}
        </span>
      ))}
    </div>
  );
}

function TurnOver() {
  const g = useHeadsUpHost();
  const team = g.state.teams[g.state.activeIdx];
  const got = g.state.lastReview.filter((e) => e.result === "got").length;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="text-center">
        <div className="ff-title text-3xl">Time!</div>
        <div className="text-lg font-semibold" style={{ color: team?.color }}>{team?.name} got {got}</div>
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-line bg-surface p-3">
        {g.state.lastReview.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted">No cards this turn.</div>
        ) : (
          <ul className="space-y-1">
            {g.state.lastReview.map((e, i) => (
              <li key={i} className="flex items-center justify-between border-b border-line py-1 last:border-0">
                <span className="font-semibold">{e.word}</span>
                <span className={e.result === "got" ? "text-success" : "text-muted"}>{e.result === "got" ? "✓ got" : "pass"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Scoreboard />
      <button onClick={g.nextTurn} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">NEXT TEAM →</button>
    </div>
  );
}

function Ended() {
  const g = useHeadsUpHost();
  const winner = g.state.teams.find((t) => t.id === g.state.winner) ?? [...g.state.teams].sort((a, b) => b.score - a.score)[0];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Winner</div>
        <div className="ff-title text-5xl" style={{ color: winner?.color }}>{winner?.name} 🎉</div>
      </div>
      <Scoreboard />
      <button onClick={g.reset} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">PLAY AGAIN</button>
    </div>
  );
}
