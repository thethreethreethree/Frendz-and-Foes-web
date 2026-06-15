import { motion } from "framer-motion";
import type { GameState } from "@ff/engine";

// Bottom strip of team scores. Re-sorts by score so the leader sits first; the layout animates
// when ranks change (framer `layout`), giving a satisfying shuffle as points land.
export function Scoreboard({ state }: { state: GameState }) {
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const leader = ranked[0]?.score ?? 0;

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2">
      {ranked.map((t) => {
        const isLeader = t.score === leader && leader > 0;
        return (
          <motion.div
            layout
            key={t.id}
            className={`ff-sticker flex items-center gap-2 bg-white px-3 py-1.5 ${
              isLeader ? "ring-4 ring-sun" : ""
            }`}
          >
            <span
              className="h-4 w-4 rounded-full border-2 border-ink"
              style={{ backgroundColor: t.color ?? "#999" }}
            />
            <span className="max-w-[10rem] truncate text-base font-bold text-ink">{t.name}</span>
            <span className="font-display text-2xl text-ink">{t.score}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
