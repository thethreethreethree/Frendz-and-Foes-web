import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BINGO_COLUMNS, BINGO_LETTERS, ballById, dareForBall } from "@ff/engine";
import { BingoDisplayProvider, useBingo } from "../store/bingoStore";

// A Bingo PLAYER's phone. Players hold a physical card; this screen is a pure follower of the
// host — it shows the current call and (once the host reveals it) its dare, and nothing updates
// until the host acts. A button opens the full B/I/N/G/O grid of everything called so far, so a
// player can check their card. Watch-only: it never sends anything to the host.
export function BingoPlayer({ room }: { room: string }) {
  return (
    <BingoDisplayProvider room={room} role="spectator">
      <BingoPlayerView />
    </BingoDisplayProvider>
  );
}

// Column colours mirror the display so a player's phone matches the room's look.
const COL: Record<string, { bg: string; text: string }> = {
  B: { bg: "#ff2e9a", text: "#fff" },
  I: { bg: "#f0612f", text: "#fff" },
  N: { bg: "#16a3a3", text: "#fff" },
  G: { bg: "#8a4bff", text: "#fff" },
  O: { bg: "#f7c948", text: "#15263f" },
};

function BingoPlayerView() {
  const { bingo, connection } = useBingo();
  const cur = ballById(bingo.currentId);
  const hostLinked = (connection.presence?.host ?? 0) > 0;
  const [showAll, setShowAll] = useState(false);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden text-ink"
      style={{
        backgroundColor: "#0b0f1a", // dark canvas fallback before the bg art loads / if it 404s
        backgroundImage: "url(/ui/bingo-player-bg-2.jpg)", // v2: corrected "BINGO" spelling
        backgroundSize: "cover",
        backgroundPosition: "center top", // anchor to the top so the title stays at top-center
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Header — the background art already carries the title, so only the functional bits here. */}
      <div className="flex items-center justify-end px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="ff-sticker bg-surface px-2.5 py-1 text-xs font-bold text-ink">
            {bingo.drawn.length}/75
          </span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${hostLinked ? "bg-buzz-green" : "bg-tang"}`}
            title={hostLinked ? "Host linked" : "Waiting for host"}
          />
        </div>
      </div>

      {/* Current call + dare */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-4">
        <AnimatePresence mode="wait">
          {cur ? (
            <motion.div
              key={cur.id}
              initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 15 }}
              className="grid h-52 w-52 place-items-center rounded-full border-[7px] border-ink shadow-sticker"
              style={{ backgroundColor: COL[cur.letter].bg, color: COL[cur.letter].text }}
            >
              <div className="-mb-3 font-display text-5xl">{cur.letter}</div>
              <div className="font-display text-8xl leading-none">{cur.number}</div>
            </motion.div>
          ) : (
            <div className="grid h-52 w-52 place-items-center rounded-full border-[7px] border-dashed border-ink/40 text-center font-display text-2xl text-ink/50">
              WAITING FOR<br />THE FIRST CALL
            </div>
          )}
        </AnimatePresence>

        {/* Dare — appears only when the host reveals it. */}
        <div className="min-h-[6rem] w-full max-w-md">
          {cur && bingo.dareRevealed ? (
            <motion.div
              key={`dare-${cur.id}`}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="ff-sticker bg-surface px-5 py-4 text-center text-xl font-extrabold text-ink"
            >
              {dareForBall(cur.id)}
            </motion.div>
          ) : cur ? (
            <div className="ff-sticker bg-surface px-5 py-4 text-center font-display text-2xl tracking-widest text-ink/70">
              WAITING FOR THE DARE…
            </div>
          ) : null}
        </div>
      </div>

      {/* See all called numbers */}
      <div className="px-5 pb-6">
        <button
          onClick={() => setShowAll(true)}
          className="ff-sticker w-full bg-ink px-4 py-3 font-display text-xl text-canvas"
        >
          See all called numbers ({bingo.drawn.length})
        </button>
      </div>

      <AnimatePresence>
        {showAll && <AllNumbers bingo={bingo} onClose={() => setShowAll(false)} />}
      </AnimatePresence>
    </div>
  );
}

// Full-screen B/I/N/G/O grid so a player can scan their physical card. Called numbers are lit;
// the current call is highlighted. Sorted into columns (not draw order) to match the card layout.
function AllNumbers({
  bingo,
  onClose,
}: {
  bingo: ReturnType<typeof useBingo>["bingo"];
  onClose: () => void;
}) {
  const drawn = new Set(bingo.drawn);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-canvas/95 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between pb-3">
        <div className="font-display text-2xl text-white">Called numbers · {bingo.drawn.length}/75</div>
        <button
          onClick={onClose}
          className="ff-sticker bg-surface px-4 py-2 font-display text-lg text-ink"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2">
        {BINGO_LETTERS.map((letter) => (
          <div key={letter} className="flex items-center gap-2">
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
                    className={`grid aspect-square place-items-center rounded text-[11px] font-bold ${
                      isCurrent
                        ? "scale-110 bg-sun text-canvas ring-2 ring-white"
                        : isDrawn
                          ? "bg-ink text-canvas"
                          : "bg-white/10 text-white/30"
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

      <p className="pt-3 text-center text-xs font-bold text-white/50">
        Lit tiles are called. Check them against your card.
      </p>
    </motion.div>
  );
}
