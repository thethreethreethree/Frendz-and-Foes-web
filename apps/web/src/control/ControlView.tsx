import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { turnInfo } from "./turn";
import { CtrlButton, Section } from "./ui";
import { RemoteShell } from "./shell";
import { MusicControl } from "../music/MusicControl";
import { TeamSetup } from "./TeamSetup";
import { TeamJoinCodes } from "./TeamJoinCodes";
import { IncomingGuesses } from "./IncomingGuesses";
import { BuzzInPicker } from "./BuzzInPicker";
import { AnswerKey } from "./AnswerKey";
import { getBrand } from "../brand/theme";
import {
  ScoreOverride,
  ScreenDirector,
  TimerControls,
  SfxBoard,
  QuestionJump,
} from "./panels";

// The host's phone for Survey Showdown — the reference implementation of RemoteShell.
//
// WHAT CHANGED AND WHY. The previous version stacked eleven panels in one 2867px column behind a
// two-row command bar, at 390x844 (EVIDENCE.md ADDENDUM). Three things came out of looking at it:
//
//   * ORDER IGNORED THE PHASE. Teams & setup sat first for the whole game, so the panels a host
//     needs mid-question — the guesses arriving from team phones, the answer key they judge from —
//     were a scroll away behind controls they last touched before the game began. The column is now
//     ordered by what the phase is for: setup panels lead during setup and sink afterwards.
//   * THE MOST-TAPPED CONTROL WAS THE ONE THAT SCROLLED. Prev / turn-status / Next is touched every
//     few seconds all night. It now docks to the bottom of the frame, in the thumb's arc, and the
//     once-per-game "end game" moved into a panel — the reverse of how they were weighted before.
//   * THE ROOM CODE WAS UNREADABLE (~1.4:1, white on a pale pill). RemoteShell's header owns it now.
export function ControlView() {
  const g = useGame();
  const q = currentQuestion(g.state);
  const info = turnInfo(g.state);
  const total = g.state.questions.length;
  const playing = g.state.phase === "playing";
  const label = getBrand().games.feud?.label ?? "Survey Showdown";

  return (
    <RemoteShell
      title={label}
      badge={
        <span className="shrink-0 rounded-lg bg-surface px-2 py-1 font-display text-xs leading-none text-muted">
          {playing && q
            ? q.kind === "bonus"
              ? "BONUS"
              : `Q${g.state.currentQuestionIndex + 1}/${total}`
            : g.state.phase.toUpperCase()}
        </span>
      }
      room={g.connection.room}
      headerExtra={
        <>
          <CtrlButton tone="ink" onClick={g.undo} disabled={!g.canUndo} title="Undo">
            ↶
          </CtrlButton>
          <CtrlButton tone="ink" onClick={g.redo} disabled={!g.canRedo} title="Redo">
            ↷
          </CtrlButton>
        </>
      }
      action={
        <div className="flex items-center gap-2">
          <CtrlButton tone="ink" onClick={() => g.dispatch({ type: "PREV_QUESTION" })} title="Previous question">
            ◀
          </CtrlButton>
          {/* The turn status sits BETWEEN the two navigation buttons on purpose: it is the label
              that tells the host what the next tap will mean. Green once the question is done. */}
          <div
            className={`flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-black ${
              info.complete ? "bg-buzz-green text-canvas" : "bg-surface text-ink"
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
      }
    >
      {/* PRE-GAME. Both lead while there is no game running, then sink below the judging panels. */}
      {!playing && (
        <>
          <TeamSetup />
          <TeamJoinCodes />
        </>
      )}

      {/* MID-QUESTION. Guesses land above the answer key so the host sees what a team said before
          the board they will credit it against. */}
      <IncomingGuesses />
      <BuzzInPicker />
      <AnswerKey />
      <ScoreOverride />

      {/* SHOW CONTROL. Reached deliberately, not constantly. */}
      <TimerControls />
      <ScreenDirector />
      <SfxBoard />
      <MusicControl />
      <QuestionJump />

      {playing && (
        <>
          <TeamSetup />
          <TeamJoinCodes />
        </>
      )}

      <Section title="Finish">
        <CtrlButton
          tone="grape"
          className="w-full py-3"
          onClick={() => {
            g.dispatch({ type: "END_GAME" });
            g.sfx("applause");
          }}
        >
          🏆 End game & show champions
        </CtrlButton>
      </Section>
    </RemoteShell>
  );
}
