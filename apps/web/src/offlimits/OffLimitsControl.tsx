import { useState } from "react";
import { useOffLimitsHost } from "../store/offlimitsStore";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Off Limits" — this phone IS the describer's device. It shows the secret
// word + taboo list (which never leave this device), the timer, and the got/skip controls. The
// room watches the display for the timer + scores.

const TEAM_COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0ea5e9"];
const uid = () => Math.random().toString(36).slice(2, 8);

export function OffLimitsControl() {
  const g = useOffLimitsHost();
  const { state } = g;
  const label = getBrand().games.taboo?.label ?? "Off Limits";

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
      {state.phase === "playing" && <Playing />}
      {state.phase === "turnover" && <TurnOver />}
      {state.phase === "ended" && <Ended />}
    </div>
  );
}

function Setup() {
  const g = useOffLimitsHost();
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
  const [penalize, setPenalize] = useState(g.state.config.skipPenalty > 0);

  const rename = (id: string, name: string) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const remove = (id: string) => setTeams((ts) => (ts.length > 2 ? ts.filter((t) => t.id !== id) : ts));
  const add = () => setTeams((ts) => (ts.length < 6 ? [...ts, { id: uid(), name: `Team ${ts.length + 1}`, color: TEAM_COLORS[ts.length % TEAM_COLORS.length] }] : ts));

  const start = () => {
    g.configure({ turnSeconds, winScore, skipPenalty: penalize ? 1 : 0 });
    g.setTeams(teams);
    g.start();
  };

  return (
    <div className="space-y-5">
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
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={penalize} onChange={(e) => setPenalize(e.target.checked)} className="h-4 w-4 accent-primary" />
          Skips cost 1 point
        </label>
      </section>

      <button onClick={start} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
    </div>
  );
}

function Scoreboard() {
  const { state } = useOffLimitsHost();
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

function Ready() {
  const g = useOffLimitsHost();
  const team = g.state.teams[g.state.activeIdx];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Scoreboard />
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Up next</div>
        <div className="ff-title text-4xl" style={{ color: team?.color }}>{team?.name}</div>
        <p className="mt-3 max-w-xs text-sm text-muted">Hand this phone to your describer. Everyone else — no peeking! Tap start when ready.</p>
      </div>
      <button onClick={g.beginTurn} className="ff-sticker w-full bg-primary px-4 py-5 font-display text-3xl text-primary-ink">START TURN</button>
    </div>
  );
}

function Playing() {
  const g = useOffLimitsHost();
  const card = g.currentCard;
  const got = g.state.turnLog.filter((e) => e.result === "got").length;
  const low = g.state.secondsLeft <= 10;
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-ink" style={{ border: "1px solid rgb(var(--c-line))" }}>Got: {got}</span>
        <span className={`font-display text-4xl tabular-nums ${low ? "text-danger" : "text-ink"}`}>{g.state.secondsLeft}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-5 text-center">
        {card ? (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Get them to say</div>
            <div className="ff-title mt-1 text-5xl">{card.word}</div>
            <div className="mt-5 w-full">
              <div className="text-xs font-semibold uppercase tracking-wide text-danger">Don't say</div>
              <ul className="mt-1 space-y-0.5">
                {card.taboo.map((w) => <li key={w} className="text-lg font-semibold text-danger">{w}</li>)}
              </ul>
            </div>
          </>
        ) : (
          <div className="text-muted">Loading card…</div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={g.got} className="ff-sticker bg-success px-4 py-5 font-display text-2xl text-white">✓ GOT IT</button>
        <button onClick={g.skip} className="ff-sticker bg-warning px-5 py-5 font-display text-xl text-white">SKIP</button>
      </div>
      <button onClick={g.endTurn} className="text-sm font-semibold text-muted">End turn early</button>
    </div>
  );
}

function TurnOver() {
  const g = useOffLimitsHost();
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
                <span className={e.result === "got" ? "text-success" : "text-muted"}>{e.result === "got" ? "✓ got" : "skip"}</span>
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
  const g = useOffLimitsHost();
  const winner = g.state.teams.find((t) => t.id === g.state.winner) ?? [...g.state.teams].sort((a, b) => b.score - a.score)[0];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Winner</div>
        <div className="ff-title text-5xl" style={{ color: winner?.color }}>{winner?.name} 🎉</div>
      </div>
      <Scoreboard />
      <div className="flex w-full flex-col gap-2">
        <button onClick={g.reset} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">REMATCH (same teams)</button>
        <button onClick={g.reset} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted">New teams / rules</button>
      </div>
    </div>
  );
}
