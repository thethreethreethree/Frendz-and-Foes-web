import { useState } from "react";
import { useBallpark } from "./useBallpark";
import { bpGuess, bpBet, type BpState } from "../net/ballpark";
import { AvatarNameForm, AvatarBadge } from "../net/avatars";
import { HowToPlay } from "../net/howtoplay";
import { getBrand } from "../brand/theme";

export function BallparkPlayer({ room }: { room: string }) {
  const { state, you, error, join } = useBallpark(room, "player");
  const label = getBrand().games.ballpark?.label ?? "Ballpark";
  if (!you) return <Wrap><AvatarNameForm label={label} onJoin={join} error={error} /></Wrap>;
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const me = state.players.find((p) => p.id === you.id);

  return (
    <Wrap>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span className="flex items-center gap-1.5"><AvatarBadge avatar={you.avatar} name={you.name} size={22} />{you.name}</span>
        {state.phase !== "lobby" && <span>Round {state.round}/{state.totalRounds} · {me?.score ?? 0} pts</span>}
      </div>

      {state.phase === "lobby" && <Center><div className="ff-title text-2xl">{label}</div><p className="mb-4 mt-2 text-sm text-muted">{state.players.length} in. Waiting for the host…</p><HowToPlay game="ballpark" /></Center>}
      {state.phase === "guessing" && <Guessing state={state} guessed={!!me?.guessed} />}
      {state.phase === "betting" && <Betting state={state} bet={!!me?.bet} />}
      {state.phase === "reveal" && <Reveal state={state} />}
      {state.phase === "ended" && <Center><div className="ff-title text-3xl">Game over</div><Standings state={state} /></Center>}
    </Wrap>
  );
}

function Guessing({ state, guessed }: { state: BpState; guessed: boolean }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="ff-title text-2xl" style={{ textWrap: "balance" }}>{state.question}</div>
      {guessed ? (
        <div className="ff-title text-2xl text-success">Guess locked ✓</div>
      ) : (
        <>
          <input inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d-]/g, ""))} placeholder="Your number"
            className="w-48 rounded-lg border border-line px-4 py-3 text-center text-2xl" />
          <button disabled={val === "" || val === "-"} onClick={() => bpGuess(Number(val))}
            className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40">LOCK IN</button>
        </>
      )}
    </div>
  );
}

function Betting({ state, bet }: { state: BpState; bet: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="ff-title text-center text-xl" style={{ textWrap: "balance" }}>{state.question}</div>
      <p className="text-center text-sm text-muted">{bet ? "Bet placed ✓ — waiting for the others…" : "Bet on the closest guess (without going over)"}</p>
      <div className="flex flex-col gap-1.5">
        {state.guesses.map((g) => (
          <button key={g.value} disabled={bet} onClick={() => bpBet(g.value)}
            className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-3 text-left disabled:opacity-50">
            <span className="ff-title text-2xl tabular-nums">{g.value}</span>
            <span className="text-sm text-muted">{g.by.join(", ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Reveal({ state }: { state: BpState }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="ff-title text-2xl">Answer</div>
      <div className="ff-title text-6xl text-primary tabular-nums">{state.answer}</div>
      <p className="text-sm text-muted">Closest without going over: <b>{state.winningValue}</b></p>
      <Standings state={state} />
      <p className="text-sm text-muted">Waiting for the next round…</p>
    </div>
  );
}

function Standings({ state }: { state: BpState }) {
  const rows = [...state.players].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {rows.map((p, i) => (
        <span key={p.id} className={`rounded-lg px-3 py-1 text-sm font-bold ${i === 0 ? "bg-primary text-primary-ink" : "bg-surface text-ink"}`} style={i === 0 ? {} : { border: "1px solid rgb(var(--c-line))" }}>{p.name} {p.score}</span>
      ))}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>;
}
function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-auto bg-canvas p-4 text-ink">{children}</div>;
}
