import { useState } from "react";
import { MONIKERS_ROUNDS, monikersRound } from "@ff/engine";
import { useMonikersHost } from "../store/monikersStore";
import { StatusPill } from "../net/pairing";
import { getBrand } from "../brand/theme";

// Host controller for "Encore" (Monikers). The describer holds this phone (sees the card + its
// points), describes per the current round's rule; taps got/pass. Same pile plays three times.

const TEAM_COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0ea5e9"];
const uid = () => Math.random().toString(36).slice(2, 8);

export function MonikersControl() {
  const g = useMonikersHost();
  const { state } = g;
  const label = getBrand().games.monikers?.label ?? "Encore";
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
      {state.phase === "roundover" && <RoundOver />}
      {state.phase === "ended" && <Ended />}
    </div>
  );
}

function Setup() {
  const g = useMonikersHost();
  const [teams, setTeams] = useState(() =>
    g.state.teams.length >= 2
      ? g.state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color ?? TEAM_COLORS[0] }))
      : [
          { id: uid(), name: "Red Team", color: TEAM_COLORS[0] },
          { id: uid(), name: "Blue Team", color: TEAM_COLORS[1] },
        ],
  );
  const [deckSize, setDeckSize] = useState(g.state.config.deckSize);
  const [turnSeconds, setTurnSeconds] = useState(g.state.config.turnSeconds);

  const rename = (id: string, name: string) => setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const remove = (id: string) => setTeams((ts) => (ts.length > 2 ? ts.filter((t) => t.id !== id) : ts));
  const add = () => setTeams((ts) => (ts.length < 6 ? [...ts, { id: uid(), name: `Team ${ts.length + 1}`, color: TEAM_COLORS[ts.length % TEAM_COLORS.length] }] : ts));

  const start = () => {
    g.configure({ deckSize, turnSeconds });
    g.setTeams(teams);
    g.start();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-muted">How it works</h2>
        <p className="text-sm text-muted">The same cards are played <b>3 times</b>: {MONIKERS_ROUNDS.map((r) => r.label).join(" → ")}. Teams share the clock each round.</p>
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
        <label className="block text-sm font-semibold">Cards in play: {deckSize}
          <input type="range" min={12} max={40} step={4} value={deckSize} onChange={(e) => setDeckSize(+e.target.value)} className="mt-1 w-full accent-primary" />
        </label>
        <label className="block text-sm font-semibold">Turn length: {turnSeconds}s
          <input type="range" min={30} max={120} step={15} value={turnSeconds} onChange={(e) => setTurnSeconds(+e.target.value)} className="mt-1 w-full accent-primary" />
        </label>
      </section>

      <button onClick={start} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
    </div>
  );
}

function RoundBanner() {
  const { state } = useMonikersHost();
  const r = monikersRound(state);
  return (
    <div className="rounded-xl bg-primary/10 px-3 py-2 text-center">
      <div className="font-display text-lg text-primary">Round {state.round + 1}/3 · {r.label}</div>
      <div className="text-xs text-muted">{r.rule}</div>
    </div>
  );
}

function Scoreboard() {
  const { state } = useMonikersHost();
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
  const g = useMonikersHost();
  const team = g.state.teams[g.state.activeIdx];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <RoundBanner />
      <Scoreboard />
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">Up next</div>
        <div className="ff-title text-4xl" style={{ color: team?.color }}>{team?.name}</div>
        <p className="mt-2 text-sm text-muted">{g.state.remaining.length} cards left this round. Pass the phone to your clue-giver.</p>
      </div>
      <button onClick={g.beginTurn} className="ff-sticker w-full bg-primary px-4 py-5 font-display text-3xl text-primary-ink">START TURN</button>
    </div>
  );
}

function Playing() {
  const g = useMonikersHost();
  const card = g.currentCard;
  const low = g.state.secondsLeft <= 10;
  const pts = g.state.turnLog.filter((e) => e.result === "got").reduce((n, e) => n + e.points, 0);
  return (
    <div className="flex flex-1 flex-col gap-3">
      <RoundBanner />
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-ink" style={{ border: "1px solid rgb(var(--c-line))" }}>+{pts} pts · {g.state.remaining.length} left</span>
        <span className={`font-display text-4xl tabular-nums ${low ? "text-danger" : "text-ink"}`}>{g.state.secondsLeft}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-5 text-center">
        <div className="ff-title text-4xl">{card?.word ?? "…"}</div>
        {card && <div className="mt-2 rounded-full bg-primary/10 px-3 py-0.5 text-sm font-bold text-primary">{card.points} pt{card.points > 1 ? "s" : ""}</div>}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={g.got} className="ff-sticker bg-success px-4 py-5 font-display text-2xl text-white">✓ GOT IT</button>
        <button onClick={g.pass} className="ff-sticker bg-warning px-5 py-5 font-display text-xl text-white">PASS</button>
      </div>
      <button onClick={g.endTurn} className="text-sm font-semibold text-muted">End turn early</button>
    </div>
  );
}

function ReviewList() {
  const { state } = useMonikersHost();
  return (
    <div className="flex-1 overflow-auto rounded-2xl border border-line bg-surface p-3">
      {state.lastReview.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted">No cards this turn.</div>
      ) : (
        <ul className="space-y-1">
          {state.lastReview.map((e, i) => (
            <li key={i} className="flex items-center justify-between border-b border-line py-1 last:border-0">
              <span className="font-semibold">{e.word}</span>
              <span className={e.result === "got" ? "text-success" : "text-muted"}>{e.result === "got" ? `✓ +${e.points}` : "pass"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TurnOver() {
  const g = useMonikersHost();
  const team = g.state.teams[g.state.activeIdx];
  const pts = g.state.lastReview.filter((e) => e.result === "got").reduce((n, e) => n + e.points, 0);
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="text-center">
        <div className="ff-title text-3xl">Time!</div>
        <div className="text-lg font-semibold" style={{ color: team?.color }}>{team?.name} scored {pts} · {g.state.remaining.length} cards left</div>
      </div>
      <ReviewList />
      <Scoreboard />
      <button onClick={g.nextTurn} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">NEXT TEAM →</button>
    </div>
  );
}

function RoundOver() {
  const g = useMonikersHost();
  const nextR = MONIKERS_ROUNDS[g.state.round + 1];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className="ff-title text-4xl">Round {g.state.round + 1} done!</div>
      <Scoreboard />
      {nextR && (
        <p className="max-w-xs text-sm text-muted">Same cards, new rule next: <b className="text-ink">{nextR.label}</b> — {nextR.rule}</p>
      )}
      <button onClick={g.nextRound} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START ROUND {g.state.round + 2} →</button>
    </div>
  );
}

function Ended() {
  const g = useMonikersHost();
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
