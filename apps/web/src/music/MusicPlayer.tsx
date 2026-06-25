import { useEffect, useRef, useState } from "react";
import { emitMusicStatus, getSocket, type MusicCmd } from "../net/socket";

// Lives on the DISPLAY. Plays whatever the host selects, handles seek, and reports playback
// progress back so the host's scrubber stays in sync. Mount inside a `relative` container.
export function MusicPlayer() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const lastEmit = useRef(0);
  const [now, setNow] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const status = (ended = false) =>
      emitMusicStatus({
        currentTime: a.currentTime || 0,
        duration: Number.isFinite(a.duration) ? a.duration : 0,
        playing: !a.paused && !a.ended,
        ended,
      });
    const onTime = () => {
      const t = Date.now();
      if (t - lastEmit.current > 400) {
        lastEmit.current = t;
        status();
      }
    };
    const onMeta = () => status();
    const onPlay = () => status();
    const onPause = () => status();
    const onEnded = () => status(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

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
        case "seek":
          if (Number.isFinite(cmd.value)) a.currentTime = cmd.value;
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
