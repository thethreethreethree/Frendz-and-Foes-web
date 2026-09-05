import { useOffLimitsView } from "../store/offlimitsStore";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";

// Display (TV) for "Off Limits". Shows the timer, the active team, a running got-tally and the
// scoreboard — but never the current word (the room can see this screen). After each turn it
// shows the review of words that were played.

export function OffLimitsDisplay() {
  const { pub } = useOffLimitsView();
  const label = getBrand().games.taboo?.label ?? "Off Limits";
  const active = pub.teams[pub.activeIdx];

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
          <Scoreboard />
        </div>
      )}

      {pub.phase === "playing" && <Playing />}

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
    </div>
  );
}

function Playing() {
  const { pub } = useOffLimitsView();
  const active = pub.teams[pub.activeIdx];
  const low = pub.secondsLeft <= 10;
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <div className="ff-title text-4xl" style={{ color: active?.color }}>{active?.name}</div>
      <div className={`ff-title tabular-nums leading-none ${low ? "animate-pulse text-danger" : "text-ink"}`} style={{ fontSize: "clamp(6rem, 26vw, 16rem)" }}>
        {pub.secondsLeft}
      </div>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="ff-title text-5xl text-success">{pub.turnGot}</span>
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">Got</span>
        </div>
        {pub.config.skipPenalty > 0 && (
          <div className="flex flex-col items-center">
            <span className="ff-title text-5xl text-muted">{pub.turnSkip}</span>
            <span className="text-sm font-semibold uppercase tracking-wide text-muted">Skips</span>
          </div>
        )}
      </div>
      <Scoreboard />
    </div>
  );
}

function Scoreboard() {
  const { pub } = useOffLimitsView();
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      {pub.teams.map((t, i) => (
        <span
          key={t.id}
          className={`rounded-xl px-4 py-2 font-display text-2xl ${i === pub.activeIdx ? "text-white" : "bg-surface text-ink"}`}
          style={i === pub.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}
        >
          {t.name} <span className="tabular-nums">{t.score}</span>
        </span>
      ))}
      <span className="self-center text-sm font-semibold text-muted">first to {pub.config.winScore}</span>
    </div>
  );
}

function winnerOf(pub: ReturnType<typeof useOffLimitsView>["pub"]) {
  return pub.teams.find((t) => t.id === pub.winner) ?? [...pub.teams].sort((a, b) => b.score - a.score)[0];
}
