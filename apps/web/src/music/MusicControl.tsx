import { useEffect, useMemo, useRef, useState } from "react";
import { emitMusic, getSocket, type MusicStatus, type Song } from "../net/socket";
import { Section, CtrlButton } from "../control/ui";

const fmt = (s: number) =>
  Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

type Repeat = "off" | "all" | "one";

// Lives on the HOST. Search the library, control playback on the main screen, and scrub the
// track with a seek bar that tracks the display's real playback position.
export function MusicControl() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState("");
  const [now, setNow] = useState<string | null>(null);
  const [index, setIndex] = useState(-1);
  const [pos, setPos] = useState({ currentTime: 0, duration: 0, playing: false });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [vol, setVol] = useState(0.8);
  const seeking = useRef(false);

  useEffect(() => {
    fetch("/music/songs.json")
      .then((r) => r.json())
      .then((s: Song[]) => setSongs(Array.isArray(s) ? s : []))
      .catch(() => setSongs([]));
  }, []);

  const playAt = (i: number) => {
    const s = songs[i];
    if (!s) return;
    emitMusic({ action: "play", file: s.file, title: s.title });
    setIndex(i);
    setNow(s.title);
    setPos((p) => ({ ...p, currentTime: 0, playing: true }));
  };

  const nextIndex = () => {
    if (songs.length === 0) return -1;
    if (shuffle) return Math.floor(Math.random() * songs.length);
    const n = index + 1;
    return n < songs.length ? n : repeat === "all" ? 0 : -1;
  };

  // Display reports progress; keep the scrubber + transport in sync and auto-advance on end.
  useEffect(() => {
    const s = getSocket();
    const onStatus = (st: MusicStatus) => {
      if (st.ended) {
        if (repeat === "one") playAt(index);
        else {
          const n = nextIndex();
          if (n >= 0) playAt(n);
          else setPos((p) => ({ ...p, playing: false }));
        }
        return;
      }
      if (!seeking.current) {
        setPos({ currentTime: st.currentTime, duration: st.duration, playing: st.playing });
      }
    };
    s.on("musicstatus", onStatus);
    return () => {
      s.off("musicstatus", onStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, index, shuffle, repeat]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? songs.filter((x) => x.title.toLowerCase().includes(t)) : songs;
  }, [songs, q]);

  const playPause = () => {
    if (pos.playing) {
      emitMusic({ action: "pause" });
      setPos((p) => ({ ...p, playing: false }));
    } else if (now) {
      emitMusic({ action: "resume" });
      setPos((p) => ({ ...p, playing: true }));
    } else if (songs.length) {
      playAt(0);
    }
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  return (
    <Section title={`Music (${songs.length})`}>
      {now && (
        <div className="mb-2 rounded-lg bg-ink/5 px-3 py-2">
          <div className="mb-1 truncate text-sm font-bold">🎵 {now}</div>

          {/* Seek bar */}
          <div className="flex items-center gap-2">
            <span className="w-9 text-right text-[10px] font-bold text-ink/50">{fmt(pos.currentTime)}</span>
            <input
              type="range"
              min={0}
              max={pos.duration || 0}
              step={1}
              value={Math.min(pos.currentTime, pos.duration || 0)}
              disabled={!pos.duration}
              onPointerDown={() => (seeking.current = true)}
              onPointerUp={() => (seeking.current = false)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setPos((p) => ({ ...p, currentTime: v }));
                emitMusic({ action: "seek", value: v });
              }}
              className="flex-1 accent-pink"
            />
            <span className="w-9 text-[10px] font-bold text-ink/50">{fmt(pos.duration)}</span>
          </div>

          {/* Transport */}
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <TBtn active={shuffle} onClick={() => setShuffle((s) => !s)} title="Shuffle">🔀</TBtn>
            <TBtn onClick={() => index > 0 && playAt(index - 1)} title="Previous">⏮</TBtn>
            <button
              onClick={playPause}
              className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lg text-white shadow-pop active:translate-y-0.5"
            >
              {pos.playing ? "⏸" : "▶"}
            </button>
            <TBtn onClick={() => { const n = nextIndex(); if (n >= 0) playAt(n); }} title="Next">⏭</TBtn>
            <TBtn active={repeat !== "off"} onClick={cycleRepeat} title={`Repeat: ${repeat}`}>
              {repeat === "one" ? "🔂" : "🔁"}
            </TBtn>
            <CtrlButton tone="tang" onClick={() => { emitMusic({ action: "stop" }); setNow(null); setPos({ currentTime: 0, duration: 0, playing: false }); }}>
              ⏹
            </CtrlButton>
          </div>
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search songs…"
        className="mb-2 w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none focus:border-teal"
      />

      {songs.length === 0 ? (
        <div className="text-xs font-semibold text-ink/40">No songs found.</div>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {filtered.map((s) => {
            const i = songs.indexOf(s);
            return (
              <li key={s.id}>
                <button
                  onClick={() => playAt(i)}
                  className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm font-bold ${
                    now === s.title ? "border-teal bg-teal/15" : "border-ink/10 bg-white"
                  }`}
                >
                  <span className="shrink-0">▶</span>
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs font-bold text-ink/50">🔈</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            emitMusic({ action: "volume", value: v });
          }}
          className="flex-1 accent-ink"
        />
      </div>
    </Section>
  );
}

function TBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-lg text-sm ${
        active ? "bg-teal text-ink" : "bg-ink/10 text-ink"
      }`}
    >
      {children}
    </button>
  );
}
