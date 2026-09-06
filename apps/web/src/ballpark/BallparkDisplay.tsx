import { useEffect, useRef } from "react";
import { useBallpark } from "./useBallpark";
import { useRexHost, RexBanner } from "../host/RexHost";
import { Logo } from "../display/Logo";
import { QR } from "../net/pairing";
import { ballparkJoinUrl, controllerUrl } from "../net/room";
import { getBrand } from "../brand/theme";
import type { BpState } from "../net/ballpark";

// Display (TV) for "Ballpark". Shows the question, the guess line, then the answer + who bet well.
export function BallparkDisplay({ room }: { room: string }) {
  const { state } = useBallpark(room, "display");
  const label = getBrand().games.ballpark?.label ?? "Ballpark";

  // Rex, the AI host, reacts to Ballpark moments (display only — one voice per room).
  const { line, say } = useRexHost(room, label);
  const rex = useRef({ started: false, revealRound: -1, ended: false });
  useEffect(() => {
    if (!state) return;
    const st = rex.current;
    if (state.phase === "lobby") {
      // Back in the lobby (reset/rematch, same room) — clear dedupe so Rex re-intros next game.
      rex.current = { started: false, revealRound: -1, ended: false };
      return;
    }
    if (state.phase !== "lobby" && !st.started) {
      st.started = true;
      say("intro");
    }
    if (state.phase === "reveal" && st.revealRound !== state.round) {
      st.revealRound = state.round;
      say("reveal", { answer: state.answer, closest: state.winningValue });
    }
    if (state.phase === "ended" && !st.ended) {
      st.ended = true;
      const leader = [...state.players].sort((a, b) => b.score - a.score)[0];
      if (leader) say("ended", { name: leader.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.round, say]);

  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;

  if (state.phase === "lobby") {
    return (
      <Center>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label}</div>
        <p className="mt-1 text-lg text-muted">Guess the number — or bet on who's closest. Scan to join.</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center">
            <QR text={ballparkJoinUrl(room)} size={200} />
            <div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div>
          </div>
          <div className="rounded-xl border border-line p-3 text-left" style={{ minWidth: 160 }}>
            <div className="ff-title text-xl">Players ({state.players.length})</div>
            <div className="mt-1 text-sm">{state.players.map((p) => p.name).join(", ") || "—"}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">Host: <span className="font-mono">{controllerUrl(room)}</span></p>
      </Center>
    );
  }

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center gap-4 overflow-auto p-8 text-center text-ink">
      <div className="text-sm font-semibold uppercase tracking-widest text-muted">Round {state.round}/{state.totalRounds}</div>
      <div className="ff-title max-w-3xl text-4xl" style={{ textWrap: "balance" }}>{state.question}</div>

      {state.phase === "guessing" && (
        <>
          <p className="text-lg text-muted">Everyone lock in a number…</p>
          <div className="flex flex-wrap justify-center gap-2">
            {state.players.map((p) => (
              <span key={p.id} className={`rounded-full px-3 py-1 text-sm font-semibold ${p.guessed ? "bg-success text-white" : "bg-surface text-muted"}`} style={p.guessed ? {} : { border: "1px solid rgb(var(--c-line))" }}>{p.name}{p.guessed ? " ✓" : " …"}</span>
            ))}
          </div>
        </>
      )}

      {(state.phase === "betting" || state.phase === "reveal") && (
        <div className="flex w-full max-w-3xl flex-col gap-2">
          {state.phase === "betting" && <p className="text-lg text-muted">Bet on the closest guess without going over!</p>}
          {state.phase === "reveal" && <div className="ff-title text-3xl">Answer: <span className="text-primary">{state.answer}</span></div>}
          <div className="flex flex-col gap-1.5">
            {state.guesses.map((g) => {
              const win = state.phase === "reveal" && g.value === state.winningValue;
              return (
                <div key={g.value} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: win ? "#16a34a" : "rgb(var(--c-surface))", color: win ? "#fff" : "rgb(var(--c-ink))", border: "1px solid rgb(var(--c-line))" }}>
                  <span className="ff-title text-2xl tabular-nums">{g.value}</span>
                  <span className="text-sm">{g.by.join(", ")}</span>
                  {state.phase === "reveal" && <span className="text-xs opacity-80">{g.bettors.length ? `bet: ${g.bettors.join(", ")}` : ""}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(state.phase === "reveal" || state.phase === "ended") && <Standings state={state} />}
      {state.phase === "ended" && <div className="ff-title text-5xl text-primary">Final standings</div>}

      <RexBanner line={line} />
    </div>
  );
}

function Standings({ state }: { state: BpState }) {
  const rows = [...state.players].sort((a, b) => b.score - a.score);
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-2">
      {rows.map((p, i) => (
        <span key={p.id} className={`rounded-xl px-4 py-2 font-display text-xl ${i === 0 ? "bg-primary text-primary-ink" : "bg-surface text-ink"}`} style={i === 0 ? {} : { border: "1px solid rgb(var(--c-line))" }}>
          {p.name} <span className="tabular-nums">{p.score}</span>{i === 0 ? " 👑" : ""}
        </span>
      ))}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}
