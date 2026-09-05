import { usePictionaryView } from "../store/pictionaryStore";
import { ViewCanvas } from "./PictionaryCanvas";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";
import type { WordGamePublic } from "@ff/engine";

// Display (TV) for "Quick Draw". Renders the live drawing big + timer/scores. Never the word.
export function PictionaryDisplay() {
  const { pub } = usePictionaryView();
  const label = getBrand().games.pictionary?.label ?? "Quick Draw";
  const active = pub.teams[pub.activeIdx];

  if (pub.phase === "setup") {
    return (
      <div className="ff-backdrop grid h-full w-full place-items-center p-8 text-center text-ink">
        <div className="flex flex-col items-center gap-3">
          <Logo className="text-5xl" />
          <div className="ff-title text-3xl text-muted">{label}</div>
          <p className="text-lg text-muted">Set up teams on the host phone to begin.</p>
        </div>
      </div>
    );
  }

  if (pub.phase === "playing") {
    return (
      <div className="ff-backdrop flex h-full w-full flex-col gap-3 overflow-hidden p-5 text-ink">
        <div className="flex items-center justify-between">
          <div className="ff-title text-3xl" style={{ color: active?.color }}>{active?.name} is drawing</div>
          <div className="flex items-center gap-6">
            <div className="text-center"><div className="ff-title text-3xl text-success">{pub.turnGot}</div><div className="text-xs uppercase tracking-wide text-muted">Got</div></div>
            <div className={`ff-title text-6xl tabular-nums ${pub.secondsLeft <= 10 ? "animate-pulse text-danger" : "text-ink"}`}>{pub.secondsLeft}</div>
          </div>
        </div>
        <div className="min-h-0 flex-1"><ViewCanvas /></div>
        <Scoreboard pub={pub} />
      </div>
    );
  }

  // ready / turnover / ended
  return (
    <div className="ff-backdrop flex h-full w-full flex-col items-center justify-center gap-5 p-8 text-center text-ink">
      {pub.phase === "ready" && (<><div className="text-lg font-semibold uppercase tracking-widest text-muted">Get ready</div><div className="ff-title text-7xl" style={{ color: active?.color }}>{active?.name}</div><p className="text-lg text-muted">Pick a drawer — watch the screen and shout guesses!</p></>)}
      {pub.phase === "turnover" && (<><div className="ff-title text-6xl">Time!</div><div className="text-2xl font-semibold" style={{ color: active?.color }}>{active?.name} got {pub.lastReview.filter((e) => e.result === "got").length}</div>
        {pub.lastReview.length > 0 && <div className="flex flex-wrap justify-center gap-2">{pub.lastReview.map((e, i) => <span key={i} className={`rounded-full px-3 py-1 text-lg font-semibold ${e.result === "got" ? "bg-success text-white" : "bg-surface text-muted line-through"}`} style={e.result === "got" ? {} : { border: "1px solid rgb(var(--c-line))" }}>{e.word}</span>)}</div>}</>)}
      {pub.phase === "ended" && (<><div className="text-xl font-semibold uppercase tracking-widest text-muted">Winner</div><div className="ff-title text-8xl" style={{ color: winnerOf(pub)?.color }}>{winnerOf(pub)?.name} 🎉</div></>)}
      <Scoreboard pub={pub} />
    </div>
  );
}

function Scoreboard({ pub }: { pub: WordGamePublic }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {pub.teams.map((t, i) => (
        <span key={t.id} className={`rounded-xl px-4 py-2 font-display text-2xl ${i === pub.activeIdx ? "text-white" : "bg-surface text-ink"}`} style={i === pub.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}>{t.name} <span className="tabular-nums">{t.score}</span></span>
      ))}
      <span className="self-center text-sm font-semibold text-muted">first to {pub.config.winScore}</span>
    </div>
  );
}

function winnerOf(pub: WordGamePublic) {
  return pub.teams.find((t) => t.id === pub.winner) ?? [...pub.teams].sort((a, b) => b.score - a.score)[0];
}
