import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BINGO_COLUMNS, BINGO_LETTERS, ballById, dareForBall } from "@ff/engine";
import { useBingo } from "../store/bingoStore";
import { useRexHost, RexBanner } from "../host/RexHost";
import { BingoLogo } from "../display/Logo";
import { MusicPlayer } from "../music/MusicPlayer";
import { QR } from "../net/pairing";
import { bingoJoinUrl } from "../net/room";

const COL: Record<string, { bg: string; text: string }> = {
  B: { bg: "#ff2e9a", text: "#fff" },
  I: { bg: "#f0612f", text: "#fff" },
  N: { bg: "#16a3a3", text: "#fff" },
  G: { bg: "#8a4bff", text: "#fff" },
  O: { bg: "#f7c948", text: "#15263f" },
};

export function BingoDisplay() {
  const { bingo, joinQrVisible, connection } = useBingo();
  const cur = ballById(bingo.currentId);
  const drawn = new Set(bingo.drawn);

  // Rex, the AI host, reacts to Bingo moments (display only — one voice per room).
  const { line, say } = useRexHost(connection.room, "Bingo Night");
  const rex = useRef({ introduced: false, lastBallId: "", callCount: 0, won: false });
  useEffect(() => {
    const st = rex.current;
    if (bingo.currentId && bingo.currentId !== st.lastBallId) {
      st.lastBallId = bingo.currentId;
      const ball = ballById(bingo.currentId);
      if (!st.introduced) {
        st.introduced = true;
        say("intro");
      } else {
        // Throttle: only chime in every few balls, not all 75.
        st.callCount += 1;
        if (st.callCount % 5 === 0 && ball) {
          say("ball_called", { ball: `${ball.letter}${ball.number}` });
        }
      }
    }
    if (bingo.drawn.length >= 75 && !st.won) {
      st.won = true;
      say("bingo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingo.currentId, bingo.drawn.length, say]);

  return (
    <div className="ff-backdrop-bingo relative flex h-full w-full flex-col overflow-hidden p-6">
      <MusicPlayer />

      {/* Host-activated player-join QR: large, for the whole room to scan. */}
      {joinQrVisible && connection.room && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 grid place-items-center bg-canvas/90 backdrop-blur"
        >
          <div className="ff-sticker flex flex-col items-center gap-4 bg-surface px-12 py-10 text-center text-ink">
            <BingoLogo className="text-3xl" />
            <div className="font-display text-4xl text-grape">SCAN TO JOIN</div>
            <QR text={bingoJoinUrl(connection.room)} size={360} />
            <div className="font-display text-2xl tracking-widest text-ink/70">
              Room {connection.room}
            </div>
            <p className="max-w-md text-lg font-bold text-ink/60">
              Follow every call and dare on your own phone.
            </p>
          </div>
        </motion.div>
      )}
      <header className="flex items-center justify-between">
        <BingoLogo className="text-3xl" />
        <div className="ff-sticker bg-surface px-3 py-1 text-sm font-bold text-ink">
          {bingo.drawn.length}/75 drawn
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col items-center justify-center gap-6 py-4">
        {/* Current ball + dare (centered) */}
        <div className="flex flex-col items-center">
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

          <div className="mt-4 min-h-[5rem] w-full max-w-2xl">
            {cur && bingo.dareRevealed ? (
              <motion.div
                key={`dare-${cur.id}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="ff-sticker bg-surface px-5 py-4 text-center text-2xl font-extrabold text-ink"
              >
                {dareForBall(cur.id)}
              </motion.div>
            ) : cur ? (
              <div className="ff-sticker bg-surface px-5 py-4 text-center font-display text-3xl tracking-widest text-ink/70">
                DARE HIDDEN
              </div>
            ) : null}
          </div>
        </div>

        {/* Caller board (centered, below the ball) */}
        <div className="flex w-full flex-col gap-1.5">
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
                          ? "scale-110 bg-sun text-canvas ring-2 ring-ink"
                          : isDrawn
                            ? "bg-ink text-canvas"
                            : "bg-surface text-ink/40"
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

      <RexBanner line={line} />
    </div>
  );
}
