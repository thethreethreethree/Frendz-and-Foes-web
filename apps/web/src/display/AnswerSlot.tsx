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
  const accent = team?.color ?? "rgb(var(--c-primary))";

  return (
    <div className="[perspective:900px]">
      <AnimatePresence mode="wait" initial={false}>
        {!answer.revealed ? (
          <motion.div
            key="hidden"
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
            // text-ink, not text-concrete. In this theme `ink` is the ON-DARK foreground (244 247
            // 255) and `concrete` is the dark canvas (11 15 26) -- the two were the wrong way round
            // here and on the revealed face, so the covered number and "?" were dark-on-dark at a
            // measured 1.03:1 against WCAG's 4.5:1 floor. The panel art used to hide it by breaking
            // the background up; on a clean panel it is unmissable.
            className="ff-sticker relative flex items-center gap-3 overflow-hidden px-4 py-3 text-ink"
            style={{
              // Drawn, not photographed. The covered face used to be panel-dark.webp under a scrim,
              // which is a 3/4-perspective object -- tilting board, hinge, cog, plinth -- whose
              // centre is a TRANSPARENT HOLE, not the dark face its manifest note claimed. Covered
              // onto a pill this wide it showed a 113px band that is 77% transparent: the cog at
              // the left, a strut at the right, a void between, identical in all eight slots.
              // A gradient costs nothing, stays crisp at any width, and has no crop to get wrong.
              backgroundImage:
                "linear-gradient(180deg, rgb(28 35 56 / .96), rgb(13 18 34 / .98))",
              // The lit edge that the panel art was there to suggest, at 1px and resolution-free.
              boxShadow:
                "inset 0 0 0 1px rgb(var(--c-primary) / .45), inset 0 1px 0 rgb(255 255 255 / .07), 0 18px 40px -22px rgb(0 0 0 / .7)",
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink/15 font-display text-2xl">
              {rankLabel}
            </span>
            <span className="font-display text-3xl tracking-widest text-ink/70">?</span>
          </motion.div>
        ) : (
          <motion.div
            key="shown"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            // text-concrete (the dark canvas colour), because this face is LIGHT. It was text-ink,
            // which is the near-white on-dark foreground, so every revealed answer was white text
            // on a white panel -- measured 1.01:1.
            className="ff-sticker relative flex items-center justify-between gap-3 overflow-hidden bg-surface px-4 py-3 text-concrete"
            style={{
              borderColor: accent,
              // Same story as the hidden face: panel-open.webp has a real white face, but it is the
              // same perspective object mid-flip, so covering it onto a wide pill parked its hinge
              // and knurled knob at the left of every revealed answer -- right under the rank
              // number and the text. The gloss it was providing is drawn instead.
              backgroundImage:
                "linear-gradient(180deg, rgb(255 255 255 / .96), rgb(233 238 250 / .96))",
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
