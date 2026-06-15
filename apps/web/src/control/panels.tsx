import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { Section, CtrlButton } from "./ui";

// Manual score override — the host's final say (safety-net feature B).
export function ScoreOverride() {
  const { state, dispatch } = useGame();
  return (
    <Section title="Scores (manual override)">
      <ul className="space-y-1.5">
        {state.teams.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-ink"
              style={{ backgroundColor: t.color ?? "#999" }}
            />
            <span className="flex-1 truncate font-bold">{t.name}</span>
            <span className="w-10 text-right font-display text-2xl">{t.score}</span>
            <CtrlButton tone="ink" onClick={() => dispatch({ type: "ADJUST_SCORE", teamId: t.id, delta: -1 })}>
              −1
            </CtrlButton>
            <CtrlButton tone="ink" onClick={() => dispatch({ type: "ADJUST_SCORE", teamId: t.id, delta: 1 })}>
              +1
            </CtrlButton>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// Screen director — push full-screen banners to the display.
export function ScreenDirector() {
  const { announce } = useGame();
  const b = (kind: any, title: string) => () => announce({ kind, title, ttl: 2500 });
  return (
    <Section title="Screen director">
      <div className="flex flex-wrap gap-1.5">
        <CtrlButton tone="pink" onClick={b("title", "FRENDZ & FOES")}>Title</CtrlButton>
        <CtrlButton tone="teal" onClick={b("round", "ROUND 1")}>Round 1</CtrlButton>
        <CtrlButton tone="teal" onClick={b("round", "ROUND 2")}>Round 2</CtrlButton>
        <CtrlButton tone="sun" onClick={b("bonus", "BONUS ROUND!")}>Bonus</CtrlButton>
        <CtrlButton tone="grape" onClick={b("leaderboard", "STANDINGS")}>Standings</CtrlButton>
      </div>
    </Section>
  );
}

// Per-question countdown timer (feature D).
export function TimerControls() {
  const { startTimer, stopTimer, timerRemaining } = useGame();
  return (
    <Section title="Timer">
      <div className="flex flex-wrap items-center gap-1.5">
        {[5, 10, 15, 20, 30].map((s) => (
          <CtrlButton key={s} tone="ink" onClick={() => startTimer(s)}>
            {s}s
          </CtrlButton>
        ))}
        <CtrlButton tone="tang" onClick={stopTimer} disabled={timerRemaining == null}>
          Stop
        </CtrlButton>
        {timerRemaining != null && (
          <span className="ml-1 font-display text-2xl text-pink">{timerRemaining}</span>
        )}
      </div>
    </Section>
  );
}

// Manual sound-effects board (feature D) — the host plays DJ.
export function SfxBoard() {
  const { sfx } = useGame();
  return (
    <Section title="Sound board">
      <div className="flex flex-wrap gap-1.5">
        <CtrlButton tone="green" onClick={() => sfx("ding")}>Ding ✔</CtrlButton>
        <CtrlButton tone="tang" onClick={() => sfx("buzzer")}>Buzzer ✖</CtrlButton>
        <CtrlButton tone="grape" onClick={() => sfx("drumroll")}>Drumroll</CtrlButton>
        <CtrlButton tone="sun" onClick={() => sfx("applause")}>Applause</CtrlButton>
        <CtrlButton tone="teal" onClick={() => sfx("reveal")}>Reveal</CtrlButton>
      </div>
    </Section>
  );
}

// Jump directly to any question (feature C).
export function QuestionJump() {
  const { state, dispatch } = useGame();
  const q = currentQuestion(state);
  return (
    <Section title="Jump to question">
      <div className="flex flex-wrap gap-1.5">
        {state.questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => {
              // Move stepwise so each question gets a fresh turn (engine resets turn on nav).
              const delta = i - state.currentQuestionIndex;
              const action = delta > 0 ? "NEXT_QUESTION" : "PREV_QUESTION";
              for (let n = 0; n < Math.abs(delta); n++) dispatch({ type: action });
            }}
            className={`h-9 w-9 rounded-lg text-sm font-bold ${
              q?.id === question.id ? "bg-pink text-white" : "bg-ink/10 text-ink"
            } ${question.kind === "bonus" ? "ring-2 ring-sun" : ""}`}
          >
            {question.kind === "bonus" ? "★" : i + 1}
          </button>
        ))}
      </div>
    </Section>
  );
}
