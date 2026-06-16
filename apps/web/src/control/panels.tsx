import { useState } from "react";
import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { SFX_LABELS, SFX_NAMES, SFX_VARIANTS, type SfxName } from "../audio/sfx";
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

// Screen director — push full-screen banners to the display + toggle the scoreboard.
export function ScreenDirector() {
  const { announce, scoresVisible, setScoresVisible } = useGame();
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
      <div className="mt-2 border-t border-ink/10 pt-2">
        <CtrlButton tone={scoresVisible ? "ink" : "green"} onClick={() => setScoresVisible(!scoresVisible)}>
          {scoresVisible ? "🙈 Hide scores" : "👁 Show scores"}
        </CtrlButton>
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

const SFX_TONE: Record<SfxName, "green" | "tang" | "grape" | "sun" | "teal" | "ink"> = {
  ding: "green",
  buzzer: "tang",
  reveal: "teal",
  drumroll: "grape",
  applause: "sun",
  swoosh: "ink",
};

// Manual sound-effects board (feature D) — the host plays DJ. Each category has 10 variations;
// the chosen one is used everywhere (manual + auto sounds) and synced to the display.
export function SfxBoard() {
  const { sfx, sfxVariant, setSfxVariant } = useGame();
  const [pick, setPick] = useState(false);

  return (
    <Section title="Sound board">
      {/* Quick-play: uses each category's selected variation */}
      <div className="flex flex-wrap gap-1.5">
        {SFX_NAMES.map((name) => (
          <CtrlButton key={name} tone={SFX_TONE[name]} onClick={() => sfx(name)}>
            {SFX_LABELS[name]}
          </CtrlButton>
        ))}
      </div>

      <button
        onClick={() => setPick((p) => !p)}
        className="mt-2 text-xs font-black uppercase tracking-wide text-ink/50"
      >
        {pick ? "▾ Variations" : "▸ Variations (pick 1–10 per sound)"}
      </button>

      {pick && (
        <div className="mt-1 space-y-2">
          {SFX_NAMES.map((name) => (
            <div key={name}>
              <div className="mb-1 text-[10px] font-bold uppercase text-ink/40">
                {SFX_LABELS[name]} · #{sfxVariant[name] + 1}
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: SFX_VARIANTS }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSfxVariant(name, i);
                      sfx(name, i); // preview the choice
                    }}
                    className={`h-7 w-7 rounded-md text-xs font-bold ${
                      sfxVariant[name] === i ? "bg-ink text-white" : "bg-ink/10 text-ink"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
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
