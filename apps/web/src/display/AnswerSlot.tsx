import { AnimatePresence, motion } from "framer-motion";
import type { Answer, Question, Team } from "@ff/engine";

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
  const accent = team?.color ?? "#15131a";

  return (
    <div className="[perspective:900px]">
      <AnimatePresence mode="wait" initial={false}>
        {!answer.revealed ? (
          <motion.div
            key="hidden"
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ff-sticker flex items-center gap-3 bg-ink/90 px-4 py-3 text-concrete"
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
            className="ff-sticker flex items-center justify-between gap-3 bg-white px-4 py-3 text-ink"
            style={{ borderColor: accent }}
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
