import { motion } from "framer-motion";
import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { Logo } from "./Logo";
import { FloatingAccents } from "./Icons";
import { AnswerBoard } from "./AnswerBoard";
import { Scoreboard } from "./Scoreboard";
import { Participants } from "./Participants";
import { Announcement } from "./Announcement";

export function DisplayView() {
  const { state, timerRemaining, buzzersArmed } = useGame();
  const question = currentQuestion(state);

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col overflow-hidden p-6">
      <Announcement />

      {/* Top bar */}
      <header className="flex items-center justify-between">
        <Logo className="text-4xl" />
        <div className="flex items-center gap-3">
          {timerRemaining != null && (
            <div
              className={`ff-sticker grid h-14 w-14 place-items-center font-display text-4xl ${
                timerRemaining <= 3 ? "bg-pink text-white" : "bg-white text-ink"
              }`}
            >
              {timerRemaining}
            </div>
          )}
          {state.phase === "playing" && question && (
            <div className="ff-sticker bg-white px-4 py-1.5 font-display text-2xl tracking-wide text-ink">
              {question.kind === "bonus" ? "BONUS ROUND" : "QUESTION"}
            </div>
          )}
        </div>
      </header>

      {buzzersArmed && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2">
          <div className="ff-sticker animate-pop bg-buzz-green px-8 py-2 font-display text-4xl tracking-widest text-white">
            BUZZERS LIVE
          </div>
        </div>
      )}

      {state.phase === "setup" && <FloatingAccents />}

      {/* Center stage */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
        {state.phase === "setup" && <TitleScene />}

        {state.phase === "playing" && question && (
          <>
            <motion.h1
              key={question.id}
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="ff-sticker max-w-5xl bg-ink px-6 py-4 text-center text-3xl font-extrabold text-white"
            >
              {question.prompt}
            </motion.h1>
            <Participants state={state} />
            <AnswerBoard state={state} question={question} />
          </>
        )}

        {state.phase === "finished" && <WinnerScene />}
      </main>

      {/* Bottom scoreboard */}
      <footer className="pt-2">
        <Scoreboard state={state} />
      </footer>
    </div>
  );
}

function TitleScene() {
  return (
    <div className="flex animate-floaty flex-col items-center text-center">
      <Logo className="text-7xl md:text-8xl" />
      <p className="mt-4 font-display text-4xl tracking-wide text-ink/80">GET READY!</p>
    </div>
  );
}

function WinnerScene() {
  const { state } = useGame();
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  return (
    <div className="text-center">
      <div className="ff-title text-5xl text-grape">CHAMPIONS</div>
      {winner && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="ff-sticker mx-auto mt-6 inline-flex items-center gap-4 bg-white px-10 py-6"
        >
          <span
            className="h-10 w-10 rounded-full border-4 border-ink"
            style={{ backgroundColor: winner.color ?? "#999" }}
          />
          <span className="text-5xl font-black text-ink">{winner.name}</span>
          <span className="font-display text-6xl text-pink">{winner.score}</span>
        </motion.div>
      )}
    </div>
  );
}
