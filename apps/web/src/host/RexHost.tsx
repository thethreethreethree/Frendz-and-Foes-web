import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { askHost, type HostPayload } from "../net/host";

// Rex, the PlayZoo AI host, as a display overlay. `say()` fetches a line for a game moment and shows
// it in a speech bubble for a few seconds. Only the DISPLAY should drive this (one voice per room).
// Rex's avatar uses /crew/rex-keeper.png once that art exists; until then it falls back to an emoji.

export function useRexHost(room: string | null | undefined, game: string) {
  const [line, setLine] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const say = useCallback(
    async (moment: string, detail?: HostPayload["detail"]) => {
      const text = await askHost({ room: room ?? undefined, game, moment, detail });
      if (!text) return;
      setLine(text);
      clearTimeout(hideTimer.current);
      // Longer lines linger a little longer.
      hideTimer.current = setTimeout(() => setLine(null), Math.min(9000, 4000 + text.length * 55));
    },
    [room, game],
  );

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  return { line, say };
}

export function RexBanner({ line }: { line: string | null }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <AnimatePresence>
        {line && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="flex max-w-2xl items-end gap-3"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-surface text-3xl shadow-lg">
              {imgOk ? (
                <img src="/crew/rex-keeper.png" alt="Rex" className="h-full w-full object-cover" onError={() => setImgOk(false)} />
              ) : (
                <span>🦁</span>
              )}
            </div>
            <div className="relative rounded-2xl rounded-bl-sm border border-primary/60 bg-surface/95 px-5 py-3 shadow-xl backdrop-blur">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-primary">Rex · your host</div>
              <div className="mt-0.5 font-display text-xl font-extrabold leading-snug text-ink" style={{ textWrap: "balance" }}>{line}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
