import { AnimatePresence, motion } from "framer-motion";
import { BINGO_COLUMNS, BINGO_LETTERS, ballById, dareForBall } from "@ff/engine";
import { useBingo } from "../store/bingoStore";
import { BingoLogo } from "../display/Logo";

const COL: Record<string, { bg: string; text: string }> = {
  B: { bg: "#ff2e9a", text: "#fff" },
  I: { bg: "#f0612f", text: "#fff" },
  N: { bg: "#16a3a3", text: "#fff" },
  G: { bg: "#8a4bff", text: "#fff" },
  O: { bg: "#f7c948", text: "#15263f" },
};

export function BingoDisplay() {
  const { bingo } = useBingo();
  const cur = ballById(bingo.currentId);
  const drawn = new Set(bingo.drawn);

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col overflow-hidden p-6">
      <header className="flex items-center justify-between">
        <BingoLogo className="text-3xl" />
        <div className="ff-sticker bg-white px-3 py-1 text-sm font-bold text-ink">
          {bingo.drawn.length}/75 drawn
        </div>
      </header>

      <main className="flex flex-1 items-center gap-6 py-4">
        {/* Current ball + dare */}
        <div className="flex w-[34%] shrink-0 flex-col items-center">
          <AnimatePresence mode="wait">
            {cur ? (
              <motion.div
                key={cur.id}
                initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="grid h-44 w-44 place-items-center rounded-full border-[6px] border-ink shadow-sticker"
                style={{ backgroundColor: COL[cur.letter].bg, color: COL[cur.letter].text }}
              >
                <div className="-mb-2 font-display text-4xl">{cur.letter}</div>
                <div className="font-display text-7xl leading-none">{cur.number}</div>
              </motion.div>
            ) : (
              <div className="grid h-44 w-44 place-items-center rounded-full border-[6px] border-dashed border-ink/40 text-center font-display text-2xl text-ink/50">
                DRAW A BALL
              </div>
            )}
          </AnimatePresence>

          <div className="mt-5 min-h-[5rem] w-full">
            {cur && bingo.dareRevealed ? (
              <motion.div
                key={`dare-${cur.id}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="ff-sticker bg-white px-5 py-4 text-center text-2xl font-extrabold text-ink"
              >
                {dareForBall(cur.id)}
              </motion.div>
            ) : cur ? (
              <div className="ff-sticker bg-ink/90 px-5 py-4 text-center font-display text-3xl tracking-widest text-white/80">
                DARE HIDDEN
              </div>
            ) : null}
          </div>
        </div>

        {/* Caller board */}
        <div className="flex flex-1 flex-col gap-1.5">
          {BINGO_LETTERS.map((letter) => (
            <div key={letter} className="flex items-center gap-1.5">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md font-display text-2xl"
                style={{ backgroundColor: COL[letter].bg, color: COL[letter].text }}
              >
                {letter}
              </div>
              <div
                className="grid flex-1 gap-1"
                style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
              >
                {BINGO_COLUMNS[letter].map((b) => {
                  const isDrawn = drawn.has(b.id);
                  const isCurrent = b.id === bingo.currentId;
                  return (
                    <div
                      key={b.id}
                      className={`grid h-8 place-items-center rounded text-sm font-bold transition ${
                        isCurrent
                          ? "scale-110 bg-sun text-ink ring-2 ring-ink"
                          : isDrawn
                            ? "bg-ink text-white"
                            : "bg-white/70 text-ink/40"
                      }`}
                    >
                      {b.number}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
