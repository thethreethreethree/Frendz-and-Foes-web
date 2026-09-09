import { motion } from "framer-motion";
import type { GameState } from "@ff/engine";
import { CRESTS, PROPS, artUrl, glow } from "./feudArt";

// Bottom strip of team scores. Re-sorts by score so the leader sits first; the layout animates
// when ranks change (framer `layout`), giving a satisfying shuffle as points land.
export function Scoreboard({ state }: { state: GameState }) {
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const leader = ranked[0]?.score ?? 0;
  // The crests are a matched pair, so they go to the first two teams by rank. A game with more
  // teams than crests simply falls back to the colour dot, which is what shipped before.
  const crest = [CRESTS.red, CRESTS.blue];

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2">
      {ranked.map((t) => {
        const isLeader = t.score === leader && leader > 0;
        return (
          <motion.div
            layout
            key={t.id}
            className={`ff-sticker flex items-center gap-2 bg-surface px-3 py-1.5 ${
              isLeader ? "ring-4 ring-sun" : ""
            }`}
          >
            {crest[ranked.indexOf(t)] ? (
              <img src={artUrl(crest[ranked.indexOf(t)])} alt="" aria-hidden
                   className="h-7 w-auto shrink-0"
                   style={{ filter: glow(t.color ?? "#999", 8) }} />
            ) : (
              <span className="h-4 w-4 rounded-full border-2 border-ink"
                    style={{ backgroundColor: t.color ?? "#999" }} />
            )}
            <span className="max-w-[10rem] truncate text-base font-bold text-ink">{t.name}</span>
            <span className="font-display text-2xl text-ink">{t.score}</span>
            {isLeader && (
              <img src={artUrl(PROPS.pot)} alt="" aria-hidden title="Leading"
                   className="h-6 w-auto shrink-0" style={{ filter: glow("#f59e0b", 8) }} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
