import { useState } from "react";
import { usePictionaryHost } from "../store/pictionaryStore";
import { DrawCanvas } from "./PictionaryCanvas";
import { StatusPill } from "../net/pairing";
import { HowToPlay } from "../net/howtoplay";
import { emitPulse } from "../net/socket";
import { getBrand } from "../brand/theme";

// Host controller for "Quick Draw" — this phone is the DRAWER's canvas. Shows the secret word +
// draw surface + got/skip + timer. Strokes stream to the TV; the word never leaves this device.

const TEAM_COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0ea5e9"];
const PEN_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#ffffff"];
const uid = () => Math.random().toString(36).slice(2, 8);

export function PictionaryControl({ room }: { room: string }) {
  const g = usePictionaryHost();
  const { state } = g;
  const label = getBrand().games.pictionary?.label ?? "Quick Draw";
  if (state.phase === "playing") return <Playing room={room} />;

  return (
    <div className="flex h-full flex-col overflow-auto bg-canvas p-4 text-ink">
      <div className="mb-3 flex items-center justify-between">
        <div className="ff-title text-2xl">{label}</div>
        <div className="flex items-center gap-2">
          <StatusPill />
          {state.phase !== "setup" && <button onClick={g.reset} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted">Reset</button>}
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
  const g = usePictionaryHost();
  const [teams, setTeams] = useState(() =>
    g.state.teams.length >= 2
      ? g.state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color ?? TEAM_COLORS[0] }))
      : [{ id: uid(), name: "Red Team", color: TEAM_COLORS[0] }, { id: uid(), name: "Blue Team", color: TEAM_COLORS[1] }]);
  const [turnSeconds, setTurnSeconds] = useState(g.state.config.turnSeconds);
  const [winScore, setWinScore] = useState(g.state.config.winScore);
  const rename = (id: string, name: string) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const remove = (id: string) => setTeams((ts) => (ts.length > 2 ? ts.filter((t) => t.id !== id) : ts));
  const add = () => setTeams((ts) => (ts.length < 6 ? [...ts, { id: uid(), name: `Team ${ts.length + 1}`, color: TEAM_COLORS[ts.length % TEAM_COLORS.length] }] : ts));
  const start = () => { g.configure({ turnSeconds, winScore, skipPenalty: 0 }); g.setTeams(teams); g.start(); };
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
          <input type="range" min={30} max={120} step={15} value={turnSeconds} onChange={(e) => setTurnSeconds(+e.target.value)} className="mt-1 w-full accent-primary" /></label>
        <label className="block text-sm font-semibold">Play to: {winScore} points
          <input type="range" min={5} max={20} step={1} value={winScore} onChange={(e) => setWinScore(+e.target.value)} className="mt-1 w-full accent-primary" /></label>
      </section>
      <button onClick={start} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>

      <HowToPlay game="pictionary" />
    </div>
  );
}

function Scoreboard() {
  const { state } = usePictionaryHost();
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {state.teams.map((t, i) => (
        <span key={t.id} className={`rounded-full px-3 py-1 text-sm font-bold ${i === state.activeIdx ? "text-white" : "bg-surface text-ink"}`} style={i === state.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}>{t.name}: {t.score}</span>
      ))}
    </div>
  );
}

function Ready() {
  const g = usePictionaryHost();
  const team = g.state.teams[g.state.activeIdx];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Scoreboard />
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Up next</div>
        <div className="ff-title text-4xl" style={{ color: team?.color }}>{team?.name}</div>
        <p className="mt-3 max-w-xs text-sm text-muted">Pick a drawer, hand them this phone. You'll draw the word here — your team watches the TV and shouts guesses. No letters or words in your drawing!</p>
      </div>
      <button onClick={g.beginTurn} className="ff-sticker w-full bg-primary px-4 py-5 font-display text-3xl text-primary-ink">START TURN</button>
    </div>
  );
}

function Playing({ room }: { room: string }) {
  const g = usePictionaryHost();
  const card = g.currentCard;
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [clearNonce, setClearNonce] = useState(0);
  const got = g.state.turnLog.filter((e) => e.result === "got").length;
  const low = g.state.secondsLeft <= 10;
  const clear = () => { emitPulse(room, { kind: "clear" }); setClearNonce((n) => n + 1); };

  return (
    <div className="flex h-full flex-col gap-2 bg-canvas p-3 text-ink">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-surface px-3 py-1 text-sm font-bold" style={{ border: "1px solid rgb(var(--c-line))" }}>Draw: <span className="text-primary">{card?.word ?? "…"}</span></span>
        <span className={`font-display text-3xl tabular-nums ${low ? "text-danger" : "text-ink"}`}>{g.state.secondsLeft}</span>
      </div>

      <div className="min-h-0 flex-1">
        <DrawCanvas key={`${g.state.round}-${g.state.cursor}-${clearNonce}`} room={room} color={color} width={4} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {PEN_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="h-8 w-8 rounded-full" style={{ background: c, border: color === c ? "3px solid rgb(var(--c-primary))" : "1px solid rgb(var(--c-line))" }} aria-label={c === "#ffffff" ? "eraser" : "pen"} />
          ))}
        </div>
        <button onClick={clear} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted">Clear</button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={g.got} className="ff-sticker bg-success px-4 py-4 font-display text-2xl text-white">✓ GUESSED (+ next)</button>
        <button onClick={g.skip} className="ff-sticker bg-warning px-5 py-4 font-display text-xl text-white">SKIP</button>
      </div>
      <div className="flex items-center justify-between text-sm text-muted"><span>Got this turn: {got}</span><button onClick={g.endTurn} className="font-semibold">End turn</button></div>
    </div>
  );
}

function TurnOver() {
  const g = usePictionaryHost();
  const team = g.state.teams[g.state.activeIdx];
  const got = g.state.lastReview.filter((e) => e.result === "got").length;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="text-center"><div className="ff-title text-3xl">Time!</div><div className="text-lg font-semibold" style={{ color: team?.color }}>{team?.name} got {got}</div></div>
      <div className="flex-1 overflow-auto rounded-2xl border border-line bg-surface p-3">
        {g.state.lastReview.length === 0 ? <div className="p-4 text-center text-sm text-muted">No cards this turn.</div> : (
          <ul className="space-y-1">{g.state.lastReview.map((e, i) => (
            <li key={i} className="flex items-center justify-between border-b border-line py-1 last:border-0"><span className="font-semibold">{e.word}</span><span className={e.result === "got" ? "text-success" : "text-muted"}>{e.result === "got" ? "✓ got" : "skip"}</span></li>
          ))}</ul>)}
      </div>
      <Scoreboard />
      <button onClick={g.nextTurn} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">NEXT TEAM →</button>
    </div>
  );
}

function Ended() {
  const g = usePictionaryHost();
  const winner = g.state.teams.find((t) => t.id === g.state.winner) ?? [...g.state.teams].sort((a, b) => b.score - a.score)[0];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div><div className="text-sm font-semibold uppercase tracking-wide text-muted">Winner</div><div className="ff-title text-5xl" style={{ color: winner?.color }}>{winner?.name} 🎉</div></div>
      <Scoreboard />
      <button onClick={g.reset} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">PLAY AGAIN</button>
    </div>
  );
}
