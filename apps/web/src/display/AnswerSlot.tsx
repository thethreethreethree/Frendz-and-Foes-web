import { AnimatePresence, motion } from "framer-motion";
import type { Answer, Question, Team } from "@ff/engine";
import { PANELS, artUrl } from "./feudArt";

interface Props {
  question: Question;
  answer: Answer;
  rankLabel: number; // 1..N position on the board
  bonusPoints: number;
  team: Team | null; // team credited, if any
}

// A single answer pill: a covered card that flips open to reveal the answer + points.
export function AnswerSlot({ question, answer, rankLabel, bonusPoints, team }: Props) {
  const points = question.kind === "bonus" ? bonusPoints : answer.rankPoints;
  const accent = team?.color ?? "rgb(var(--c-primary))";

  return (
    <div className="[perspective:900px]">
      <AnimatePresence mode="wait" initial={false}>
        {!answer.revealed ? (
          <motion.div
            key="hidden"
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ff-sticker relative flex items-center gap-3 overflow-hidden bg-ink/90 px-4 py-3 text-concrete"
            style={{
              // The dark panel face, so a covered slot looks like a game-show panel rather than a
              // grey pill. Kept behind a scrim because the number and "?" must stay legible.
              backgroundImage: `linear-gradient(rgba(11,16,32,.62), rgba(11,16,32,.62)), url("${artUrl(PANELS.hidden)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-concrete/20 font-display text-2xl">
              {rankLabel}
            </span>
            <span className="font-display text-3xl tracking-widest text-concrete/70">?</span>
          </motion.div>
        ) : (
          <motion.div
            key="shown"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="ff-sticker relative flex items-center justify-between gap-3 overflow-hidden bg-surface px-4 py-3 text-ink"
            style={{
              borderColor: accent,
              // The flipped-open panel. Its face is WHITE, so the scrim is white too -- the answer
              // text on a revealed slot is dark and would vanish over a dark wash.
              backgroundImage: `linear-gradient(rgba(255,255,255,.80), rgba(255,255,255,.80)), url("${artUrl(PANELS.open)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-2xl text-white"
                style={{ backgroundColor: accent }}
              >
                {rankLabel}
              </span>
              <span className="truncate text-2xl font-extrabold">{answer.text}</span>
            </div>
            <span
              className="grid h-10 min-w-10 shrink-0 place-items-center rounded-lg px-2 font-display text-3xl text-white shadow-pop"
              style={{ backgroundColor: accent }}
            >
              {points}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
