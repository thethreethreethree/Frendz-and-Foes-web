import { useState } from "react";
import { useCodenames } from "./useCodenames";
import { CodenamesBoard } from "./CodenamesBoard";
import { cnSetTeam, cnClue, cnGuess, cnEndTurn, type CnTeam, type CnRole } from "../net/codenames";
import { getBrand } from "../brand/theme";

export function CodenamesPlayer({ room }: { room: string }) {
  const { state, you, error, join } = useCodenames(room, "player");
  const label = getBrand().games.codenames?.label ?? "Cover Ops";

  if (!you) return <NameForm label={label} onJoin={join} error={error} />;
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;

  return (
    <Wrap>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      {state.phase === "lobby" && <Lobby you={you} state={state} />}
      {state.phase !== "lobby" && (you.role === "spymaster" ? <Spymaster you={you} state={state} /> : <Operative you={you} state={state} />)}
    </Wrap>
  );
}

function NameForm({ label, onJoin, error }: { label: string; onJoin: (n: string) => void; error: string | null }) {
  const [name, setName] = useState("");
  return (
    <Wrap>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="ff-title text-3xl">{label}</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={16}
          className="w-56 rounded-lg border border-line px-4 py-3 text-center text-lg" />
        <button disabled={!name.trim()} onClick={() => onJoin(name.trim())}
          className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40">JOIN</button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Wrap>
  );
}

function Lobby({ you, state }: { you: { team: CnTeam | null; role: CnRole }; state: { players: { name: string; team: CnTeam | null; role: CnRole }[] } }) {
  const opts: { team: CnTeam; role: CnRole; label: string; color: string }[] = [
    { team: "red", role: "spymaster", label: "Red Spymaster", color: "#d64550" },
    { team: "red", role: "operative", label: "Red Agent", color: "#d64550" },
    { team: "blue", role: "spymaster", label: "Blue Spymaster", color: "#3b7dd8" },
    { team: "blue", role: "operative", label: "Blue Agent", color: "#3b7dd8" },
  ];
  const takenSpymaster = (team: CnTeam) => state.players.some((p) => p.team === team && p.role === "spymaster");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-semibold text-muted">Pick your team &amp; role</p>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => {
          const selected = you.team === o.team && you.role === o.role;
          const disabled = o.role === "spymaster" && takenSpymaster(o.team) && !selected;
          return (
            <button key={o.label} disabled={disabled} onClick={() => cnSetTeam(o.team, o.role)}
              className="rounded-xl border-2 px-3 py-4 text-center font-semibold disabled:opacity-30"
              style={{ borderColor: o.color, background: selected ? o.color : "transparent", color: selected ? "#fff" : "rgb(var(--c-ink))" }}>
              {o.label}{disabled ? " (taken)" : ""}
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted">Waiting for the host to start…</p>
    </div>
  );
}

function ClueBanner({ state }: { state: { clue: { word: string; count: number; remaining: number; team: CnTeam } | null; turn: CnTeam | null } }) {
  if (!state.clue) return <p className="text-center text-sm text-muted">Waiting for a clue…</p>;
  return (
    <div className="rounded-xl px-3 py-2 text-center" style={{ background: (state.clue.team === "red" ? "#d64550" : "#3b7dd8") + "22" }}>
      <span className="ff-title text-2xl" style={{ color: state.clue.team === "red" ? "#d64550" : "#3b7dd8" }}>{state.clue.word.toUpperCase()} · {state.clue.count}</span>
      <span className="ml-2 text-sm font-semibold text-muted">{state.clue.remaining} left</span>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Spymaster({ you, state }: { you: any; state: any }) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState(2);
  const myTurn = you.team === state.turn;
  const canClue = state.phase === "playing" && myTurn && !state.clue;

  return (
    <div className="flex flex-col gap-3">
      <Header you={you} state={state} />
      {state.phase === "ended" ? (
        <Ended state={state} />
      ) : canClue ? (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="text-sm font-semibold text-muted">Give a one-word clue + a number</div>
          <div className="mt-2 flex gap-2">
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Clue" maxLength={24}
              className="flex-1 rounded-lg border border-line px-3 py-2" />
            <select value={count} onChange={(e) => setCount(+e.target.value)} className="rounded-lg border border-line px-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button disabled={!word.trim()} onClick={() => { cnClue(word.trim(), count); setWord(""); }}
              className="ff-sticker bg-primary px-4 font-display text-lg text-primary-ink disabled:opacity-40">Give</button>
          </div>
        </div>
      ) : (
        <ClueBanner state={state} />
      )}
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">You see the key — don't say it out loud!</p>
      <CodenamesBoard cards={state.board} keyColors={you.key} />
    </div>
  );
}

function Operative({ you, state }: { you: any; state: any }) {
  const myTurn = you.team === state.turn;
  const canGuess = state.phase === "playing" && myTurn && !!state.clue;
  return (
    <div className="flex flex-col gap-3">
      <Header you={you} state={state} />
      {state.phase === "ended" ? <Ended state={state} /> : <ClueBanner state={state} />}
      {canGuess && (
        <button onClick={cnEndTurn} className="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold text-muted">End turn</button>
      )}
      <CodenamesBoard cards={state.board} onGuess={canGuess ? cnGuess : undefined} />
      {state.phase === "playing" && !myTurn && <p className="text-center text-sm text-muted">Other team's turn — watch and plot.</p>}
    </div>
  );
}

function Header({ you, state }: { you: any; state: any }) {
  const color = you.team === "red" ? "#d64550" : "#3b7dd8";
  return (
    <div className="flex items-center justify-between">
      <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: color }}>
        {you.team === "red" ? "Red" : "Blue"} {you.role}
      </span>
      <span className="text-sm font-semibold text-muted">Red {state.counts.red} · Blue {state.counts.blue}</span>
    </div>
  );
}

function Ended({ state }: { state: any }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center">
      <span className="ff-title text-2xl" style={{ color: state.winner === "red" ? "#d64550" : "#3b7dd8" }}>
        {state.winner === "red" ? "Red" : "Blue"} wins! 🎉
      </span>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-auto bg-canvas p-3 text-ink">{children}</div>;
}
