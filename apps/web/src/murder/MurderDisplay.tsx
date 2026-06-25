import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMurder } from "./useMurder";
import { QR } from "../net/pairing";
import { controllerUrl, playerJoinUrl } from "../net/room";
import { Logo } from "../display/Logo";
import { MusicPlayer } from "../music/MusicPlayer";
import type { MurderAnnounce } from "../net/murder";

// Big-screen view for Murder. Public only — never shows roles until the end reveal.
export function MurderDisplay({ room }: { room: string }) {
  const g = useMurder(room, "display");
  const st = g.state;

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col overflow-hidden p-6">
      <MusicPlayer />
      <Banner announce={g.announce} />

      <header className="flex items-center justify-between">
        <Logo className="text-3xl" />
        <div className="ff-sticker bg-ink px-4 py-1.5 font-display text-2xl tracking-widest text-white">
          MURDER
        </div>
      </header>

      {/* Small host-controls QR so the game master can open the controller. */}
      {(!st || st.phase === "lobby") && (
        <div className="absolute right-4 top-20 z-20 flex flex-col items-center">
          <QR text={controllerUrl(room)} size={84} />
          <span className="mt-1 text-[10px] font-black uppercase text-ink/50">Host</span>
        </div>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
        {(!st || st.phase === "lobby") && (
          <div className="flex flex-col items-center text-center">
            <div className="ff-title text-4xl text-pink">SCAN TO JOIN</div>
            <div className="mt-4">
              <QR text={playerJoinUrl(room)} size={200} />
            </div>
            <div className="mt-2 ff-title text-5xl tracking-[0.3em] text-ink">{room}</div>
            <Roster players={st?.players ?? []} />
          </div>
        )}

        {st && st.phase === "playing" && (
          <>
            <div className="ff-title text-4xl text-ink">WHO IS THE MURDERER?</div>
            <Roster players={st.players} big />
          </>
        )}

        {st && st.phase === "ended" && (
          <div className="text-center">
            <div className="ff-title text-6xl text-pink">
              {st.winner === "murderers" ? "MURDERERS WIN" : "CIVILIANS WIN"}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {st.players.map((p) => (
                <div key={p.id} className="ff-sticker bg-white px-3 py-1.5 text-ink">
                  <span className="font-bold">{p.name}</span>{" "}
                  <span className="text-xs font-black uppercase text-ink/50">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Roster({ players, big }: { players: { id: string; name: string; alive: boolean }[]; big?: boolean }) {
  if (players.length === 0)
    return <div className="mt-4 text-lg font-bold text-ink/40">Waiting for players…</div>;
  return (
    <div className="mt-5 flex max-w-4xl flex-wrap justify-center gap-2">
      {players.map((p) => (
        <div
          key={p.id}
          className={`ff-sticker flex items-center gap-2 px-3 py-1.5 ${big ? "text-xl" : "text-base"} ${
            p.alive ? "bg-white text-ink" : "bg-ink/80 text-white/60 line-through"
          }`}
        >
          {!p.alive && <span>💀</span>}
          <span className="font-bold">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

// Dramatic kill/accusation overlay.
function Banner({ announce }: { announce: { a: MurderAnnounce; nonce: number } | null }) {
  const [show, setShow] = useState<{ text: string; nonce: number } | null>(null);
  useEffect(() => {
    if (!announce) return;
    const a = announce.a;
    let text = "";
    if (a.type === "killed") text = `💀 ${a.name} was murdered!`;
    else if (a.type === "caught") text = `🔍 ${a.detective} caught ${a.suspect}!`;
    else if (a.type === "wrong") text = `❌ ${a.detective} accused wrong!`;
    else if (a.type === "start") text = "🔪 The game begins…";
    if (!text) return;
    setShow({ text, nonce: announce.nonce });
    const id = setTimeout(() => setShow(null), 2800);
    return () => clearTimeout(id);
  }, [announce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={show.nonce}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 grid place-items-center bg-ink/70 backdrop-blur-sm"
        >
          <div className="ff-sticker animate-pop bg-white px-12 py-8 text-center ff-title text-5xl text-pink">
            {show.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
