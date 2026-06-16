import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../store/gameStore";
import { FloatingAccents } from "./Icons";

const KIND_STYLES: Record<string, string> = {
  title: "text-pink",
  round: "text-teal",
  bonus: "text-sun",
  leaderboard: "text-grape",
  custom: "text-tang",
};

// Full-screen "screen director" overlay — the banners the host pushes (ROUND 1, BONUS, etc.).
export function Announcement() {
  const { announcement, clearAnnouncement } = useGame();

  useEffect(() => {
    if (announcement?.ttl && announcement.ttl > 0) {
      const id = setTimeout(clearAnnouncement, announcement.ttl);
      return () => clearTimeout(id);
    }
  }, [announcement, clearAnnouncement]);

  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          key={announcement.nonce}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute inset-0 z-30 grid place-items-center bg-ink/70 backdrop-blur-sm"
        >
          <FloatingAccents tone="light" />
          <div className="ff-sticker animate-pop bg-white px-12 py-10 text-center">
            <div
              className={`ff-title text-7xl ${KIND_STYLES[announcement.kind] ?? "text-ink"}`}
            >
              {announcement.title}
            </div>
            {announcement.subtitle && (
              <div className="mt-3 text-2xl font-bold text-ink/70">{announcement.subtitle}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
