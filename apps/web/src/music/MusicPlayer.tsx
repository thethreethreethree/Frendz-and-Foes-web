import { useEffect, useRef, useState } from "react";
import { getSocket, type MusicCmd } from "../net/socket";

// Lives on the DISPLAY. Plays whatever the host selects (relayed over the socket) through this
// screen's speakers. Shows a small "now playing" chip. Mount inside a `relative` container.
export function MusicPlayer() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onMusic = (cmd: MusicCmd) => {
      const a = ref.current;
      if (!a) return;
      switch (cmd.action) {
        case "play":
          a.src = `/music/${encodeURIComponent(cmd.file)}`;
          a.currentTime = 0;
          a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
          setNow(cmd.title);
          break;
        case "pause":
          a.pause();
          break;
        case "resume":
          a.play().catch(() => setBlocked(true));
          break;
        case "stop":
          a.pause();
          a.currentTime = 0;
          setNow(null);
          break;
        case "volume":
          a.volume = cmd.value;
          break;
      }
    };
    s.on("music", onMusic);
    return () => {
      s.off("music", onMusic);
    };
  }, []);

  // Browsers block autoplay until the display gets a gesture; one click unlocks it.
  const unlock = () => {
    const a = ref.current;
    if (a) a.play().then(() => setBlocked(false)).catch(() => {});
  };

  return (
    <>
      <audio ref={ref} />
      {now && (
        <div className="absolute bottom-3 left-3 z-30 ff-sticker bg-ink/90 px-3 py-1.5 text-sm font-bold text-white">
          🎵 {now}
        </div>
      )}
      {blocked && (
        <button
          onClick={unlock}
          className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-pink px-4 py-2 text-sm font-bold text-white shadow-pop"
        >
          🔊 Tap to enable sound on this screen
        </button>
      )}
    </>
  );
}
