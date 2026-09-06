import { useEffect, useRef } from "react";
import { useFullCastView } from "../store/fullcastStore";
import { useRexHost, RexBanner } from "../host/RexHost";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";
import type { WordGamePublic } from "@ff/engine";

// Display (TV) for "Full Cast". Timer + scores + post-turn review only — never the phrase (the
// guesser might watch the TV).

export function FullCastDisplay() {
  const { pub, connection } = useFullCastView();
  const label = getBrand().games.reverse?.label ?? "Full Cast";
  const active = pub.teams[pub.activeIdx];

  // Rex, the AI host, reacts to a few high-impact moments (display only — one voice per room).
  const { line, say } = useRexHost(connection.room, "Full Cast");
  const rex = useRef({ started: false, lastTurn: "", won: false });
  useEffect(() => {
    const st = rex.current;
    if ((pub.phase === "ready" || pub.phase === "playing") && !st.started) {
      st.started = true;
      say("game_start");
    }
    if (pub.phase === "turnover") {
      const key = `${pub.round}:${pub.activeIdx}`;
      if (st.lastTurn !== key) {
        st.lastTurn = key;
        say("turnover", { team: pub.teams[pub.activeIdx]?.name, got: pub.turnGot });
      }
    }
    if (pub.phase === "ended" && !st.won) {
      st.won = true;
      const w = winnerOf(pub);
      if (w) say("winner", { team: w.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub.phase, pub.round, pub.activeIdx, say]);

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-8 text-center text-ink">
      {pub.phase === "setup" && (
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-5xl" />
          <div className="ff-title text-3xl text-muted">{label}</div>
          <p className="text-lg text-muted">Set up teams on the host phone to begin.</p>
        </div>
      )}

      {pub.phase === "ready" && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-lg font-semibold uppercase tracking-widest text-muted">Get ready</div>
          <div className="ff-title text-7xl" style={{ color: active?.color }}>{active?.name}</div>
          <p className="text-lg text-muted">Whole team acts — one guesser looks away!</p>
          <Scoreboard />
        </div>
      )}

      {pub.phase === "playing" && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-6">
          <div className="ff-title text-4xl" style={{ color: active?.color }}>{active?.name} is acting</div>
          <div className={`ff-title tabular-nums leading-none ${pub.secondsLeft <= 10 ? "animate-pulse text-danger" : "text-ink"}`} style={{ fontSize: "clamp(6rem, 26vw, 16rem)" }}>
            {pub.secondsLeft}
          </div>
          <div className="flex flex-col items-center">
            <span className="ff-title text-5xl text-success">{pub.turnGot}</span>
            <span className="text-sm font-semibold uppercase tracking-wide text-muted">Guessed</span>
          </div>
          <Scoreboard />
        </div>
      )}

      {pub.phase === "turnover" && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          <div className="ff-title text-6xl">Time!</div>
          <div className="text-2xl font-semibold" style={{ color: active?.color }}>
            {active?.name} got {pub.lastReview.filter((e) => e.result === "got").length}
          </div>
          {pub.lastReview.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {pub.lastReview.map((e, i) => (
                <span key={i} className={`rounded-full px-3 py-1 text-lg font-semibold ${e.result === "got" ? "bg-success text-white" : "bg-surface text-muted line-through"}`} style={e.result === "got" ? {} : { border: "1px solid rgb(var(--c-line))" }}>
                  {e.word}
                </span>
              ))}
            </div>
          )}
          <Scoreboard />
        </div>
      )}

      {pub.phase === "ended" && (
        <div className="flex flex-col items-center gap-6">
          <div className="text-xl font-semibold uppercase tracking-widest text-muted">Winner</div>
          <div className="ff-title text-8xl" style={{ color: winnerOf(pub)?.color }}>{winnerOf(pub)?.name} 🎉</div>
          <Scoreboard />
        </div>
      )}

      <RexBanner line={line} />
    </div>
  );
}

function Scoreboard() {
  const { pub } = useFullCastView();
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      {pub.teams.map((t, i) => (
        <span key={t.id} className={`rounded-xl px-4 py-2 font-display text-2xl ${i === pub.activeIdx ? "text-white" : "bg-surface text-ink"}`} style={i === pub.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}>
          {t.name} <span className="tabular-nums">{t.score}</span>
        </span>
      ))}
      <span className="self-center text-sm font-semibold text-muted">first to {pub.config.winScore}</span>
    </div>
  );
}

function winnerOf(pub: WordGamePublic) {
  return pub.teams.find((t) => t.id === pub.winner) ?? [...pub.teams].sort((a, b) => b.score - a.score)[0];
}
