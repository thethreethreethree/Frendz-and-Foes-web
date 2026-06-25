import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { turnInfo } from "./turn";
import { CtrlButton } from "./ui";
import { ControlPairButton } from "../net/pairing";
import { MusicControl } from "../music/MusicControl";
import { TeamSetup } from "./TeamSetup";
import { BuzzInPicker } from "./BuzzInPicker";
import { AnswerKey } from "./AnswerKey";
import {
  ScoreOverride,
  ScreenDirector,
  TimerControls,
  SfxBoard,
  QuestionJump,
} from "./panels";

// The host's phone "brain". Single scrollable column, thumb-friendly, with a sticky command
// bar (navigation + undo/redo) always within reach.
export function ControlView() {
  const g = useGame();
  const q = currentQuestion(g.state);
  const info = turnInfo(g.state);
  const total = g.state.questions.length;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overflow-x-hidden bg-concrete/40 text-ink">
      {/* Sticky command bar */}
      <div className="sticky top-0 z-10 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-xl text-ink">
            {g.state.phase === "playing" && q
              ? `${q.kind === "bonus" ? "BONUS" : `Q ${g.state.currentQuestionIndex + 1}/${total}`}`
              : g.state.phase.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <ControlPairButton />
            <CtrlButton tone="ink" onClick={g.undo} disabled={!g.canUndo}>↶ Undo</CtrlButton>
            <CtrlButton tone="ink" onClick={g.redo} disabled={!g.canRedo}>↷</CtrlButton>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <CtrlButton tone="ink" onClick={() => g.dispatch({ type: "PREV_QUESTION" })}>◀</CtrlButton>
          <div
            className={`flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-black ${
              info.complete ? "bg-buzz-green text-white" : "bg-sun text-ink"
            }`}
          >
            {info.label}
          </div>
          <CtrlButton
            tone="pink"
            onClick={() => {
              g.dispatch({ type: "NEXT_QUESTION" });
              g.sfx("swoosh");
            }}
          >
            Next ▶
          </CtrlButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-3">
        <TeamSetup />
        <BuzzInPicker />
        <AnswerKey />
        <ScoreOverride />
        <TimerControls />
        <ScreenDirector />
        <SfxBoard />
        <MusicControl />
        <QuestionJump />

        <CtrlButton
          tone="grape"
          className="py-3"
          onClick={() => {
            g.dispatch({ type: "END_GAME" });
            g.sfx("applause");
          }}
        >
          🏆 End game & show champions
        </CtrlButton>
      </div>
    </div>
  );
}
