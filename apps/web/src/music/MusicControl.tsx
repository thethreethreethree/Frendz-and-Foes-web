import { useEffect, useMemo, useState } from "react";
import { emitMusic, type Song } from "../net/socket";
import { Section, CtrlButton } from "../control/ui";

// Lives on the HOST. Search the local music library and trigger playback on the main screen.
export function MusicControl() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState("");
  const [now, setNow] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.8);

  useEffect(() => {
    fetch("/music/songs.json")
      .then((r) => r.json())
      .then((s: Song[]) => setSongs(Array.isArray(s) ? s : []))
      .catch(() => setSongs([]));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? songs.filter((s) => s.title.toLowerCase().includes(t)) : songs;
  }, [songs, q]);

  const play = (s: Song) => {
    emitMusic({ action: "play", file: s.file, title: s.title });
    setNow(s.title);
    setPlaying(true);
  };

  return (
    <Section title={`Music (${songs.length})`}>
      {now && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-ink/5 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-bold">🎵 {now}</span>
          {playing ? (
            <CtrlButton tone="ink" onClick={() => { emitMusic({ action: "pause" }); setPlaying(false); }}>
              ⏸
            </CtrlButton>
          ) : (
            <CtrlButton tone="green" onClick={() => { emitMusic({ action: "resume" }); setPlaying(true); }}>
              ▶
            </CtrlButton>
          )}
          <CtrlButton tone="tang" onClick={() => { emitMusic({ action: "stop" }); setNow(null); setPlaying(false); }}>
            ⏹
          </CtrlButton>
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search songs…"
        className="mb-2 w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none focus:border-teal"
      />

      {songs.length === 0 ? (
        <div className="text-xs font-semibold text-ink/40">
          No songs found. Run the app locally (npm start) with mp3s in apps/server/music.
        </div>
      ) : (
        <ul className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => play(s)}
                className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm font-bold ${
                  now === s.title ? "border-teal bg-teal/15" : "border-ink/10 bg-white"
                }`}
              >
                <span className="shrink-0">▶</span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
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
          className="flex-1"
        />
      </div>
    </Section>
  );
}
