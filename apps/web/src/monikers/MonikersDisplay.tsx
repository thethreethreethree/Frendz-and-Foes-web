import { MONIKERS_ROUNDS } from "@ff/engine";
import { useMonikersView } from "../store/monikersStore";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";
import type { MonikersPublic } from "@ff/engine";

// Display (TV) for "Encore". Round rule + timer + scores + post-turn review. Never the live card.

export function MonikersDisplay() {
  const { pub } = useMonikersView();
  const label = getBrand().games.monikers?.label ?? "Encore";
  const active = pub.teams[pub.activeIdx];
  const round = MONIKERS_ROUNDS[pub.round] ?? MONIKERS_ROUNDS[0];

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-8 text-center text-ink">
      {pub.phase === "setup" && (
        <div className="flex flex-col items-center gap-4">
          <Logo className="text-5xl" />
          <div className="ff-title text-3xl text-muted">{label}</div>
          <p className="text-lg text-muted">Set up teams on the host phone to begin.</p>
        </div>
      )}

      {(pub.phase === "ready" || pub.phase === "playing" || pub.phase === "turnover") && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-4">
          <div className="rounded-2xl bg-primary/10 px-5 py-2">
            <div className="font-display text-2xl text-primary">Round {pub.round + 1} of 3 · {round.label}</div>
            <div className="text-sm text-muted">{round.rule}</div>
          </div>

          {pub.phase === "ready" && (
            <>
              <div className="ff-title text-6xl" style={{ color: active?.color }}>{active?.name}</div>
              <p className="text-lg text-muted">{pub.remainingCount} cards left this round</p>
            </>
          )}

          {pub.phase === "playing" && (
            <>
              <div className="ff-title text-3xl" style={{ color: active?.color }}>{active?.name}</div>
              <div className={`ff-title tabular-nums leading-none ${pub.secondsLeft <= 10 ? "animate-pulse text-danger" : "text-ink"}`} style={{ fontSize: "clamp(5rem, 22vw, 13rem)" }}>
                {pub.secondsLeft}
              </div>
              <div className="flex items-center gap-8">
                <Stat value={`+${pub.turnPoints}`} label="this turn" />
                <Stat value={String(pub.remainingCount)} label="cards left" />
              </div>
            </>
          )}

          {pub.phase === "turnover" && (
            <>
              <div className="ff-title text-5xl">Time!</div>
              <div className="text-xl font-semibold" style={{ color: active?.color }}>
                {active?.name} scored {pub.lastReview.filter((e) => e.result === "got").reduce((n, e) => n + e.points, 0)}
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
            </>
          )}

          <Scoreboard />
        </div>
      )}

      {pub.phase === "roundover" && (
        <div className="flex flex-col items-center gap-5">
          <div className="ff-title text-6xl">Round {pub.round + 1} done!</div>
          <Scoreboard />
          {MONIKERS_ROUNDS[pub.round + 1] && (
            <p className="text-lg text-muted">Next up: <b className="text-ink">{MONIKERS_ROUNDS[pub.round + 1].label}</b></p>
          )}
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="ff-title text-5xl text-success">{value}</span>
      <span className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

function Scoreboard() {
  const { pub } = useMonikersView();
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      {pub.teams.map((t, i) => (
        <span key={t.id} className={`rounded-xl px-4 py-2 font-display text-2xl ${i === pub.activeIdx ? "text-white" : "bg-surface text-ink"}`} style={i === pub.activeIdx ? { backgroundColor: t.color } : { border: "1px solid rgb(var(--c-line))" }}>
          {t.name} <span className="tabular-nums">{t.score}</span>
        </span>
      ))}
    </div>
  );
}

function winnerOf(pub: MonikersPublic) {
  return pub.teams.find((t) => t.id === pub.winner) ?? [...pub.teams].sort((a, b) => b.score - a.score)[0];
}
