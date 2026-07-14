import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMurder } from "./useMurder";
import { QR } from "../net/pairing";
import { controllerUrl, playerJoinUrl } from "../net/room";
import { Logo } from "../display/Logo";
import { MusicPlayer } from "../music/MusicPlayer";
import type { MurderAnnounce } from "../net/murder";

// The big screen. Public information only — the roster (who is which villager + their signature
// weapon) and the clue feed. Roles stay secret until the reveal.
export function MurderDisplay({ room }: { room: string }) {
  const g = useMurder(room, "display");
  const st = g.state;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col overflow-hidden p-6">
      <MusicPlayer />
      <Banner announce={g.announce} />

      <header className="flex items-center justify-between">
        <Logo className="text-3xl" />
        <div className="flex items-center gap-2">
          {st && st.phase === "playing" && (
            <>
              <div className="ff-sticker bg-white px-3 py-1 text-sm font-bold text-ink">
                💀 {st.kills}/{st.config.killsToWin}
              </div>
              <div className="ff-sticker bg-white px-3 py-1 text-sm font-bold text-ink">
                ⚖️ {st.trialsLeft} trials
              </div>
            </>
          )}
          <div className="ff-sticker bg-ink px-4 py-1.5 font-display text-2xl tracking-widest text-white">
            MURDER MYSTERY
          </div>
        </div>
      </header>

      {(!st || st.phase === "lobby") && (
        <div className="absolute right-4 top-20 z-20 flex flex-col items-center">
          <QR text={controllerUrl(room)} size={84} />
          <span className="mt-1 text-[10px] font-black uppercase text-ink/50">Host</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col items-center justify-center gap-6 py-4">
        {/* Lobby: scan to join */}
        {(!st || st.phase === "lobby") && (
          <div className="flex flex-col items-center text-center">
            <div className="ff-title text-4xl text-pink">SCAN TO JOIN THE VILLAGE</div>
            <div className="mt-4">
              <QR text={playerJoinUrl(room)} size={190} />
            </div>
            <div className="ff-title mt-2 text-5xl tracking-[0.3em] text-ink">{room}</div>
            <Roster g={g} />
          </div>
        )}

        {/* Playing */}
        {st && st.phase === "playing" && (
          <>
            {st.vote ? (
              <div className="ff-sticker bg-sun px-8 py-4 text-center text-ink">
                <div className="ff-title text-4xl">⚖️ TRIAL: {st.vote.suspectName}</div>
                <div className="text-sm font-bold">
                  accused by {st.vote.byName} · {Math.max(0, Math.ceil((st.vote.endsAt - now) / 1000))}s ·{" "}
                  {st.vote.yes} guilty / {st.vote.no} innocent
                </div>
              </div>
            ) : (
              <div className="ff-title text-4xl text-ink">WHO IS THE MURDERER?</div>
            )}

            <div className="flex w-full items-start justify-center gap-8">
              <Roster g={g} big />
              <Clues g={g} />
            </div>
          </>
        )}

        {/* Reveal */}
        {st && st.phase === "ended" && <Reveal g={g} />}
      </main>
    </div>
  );
}

function Roster({ g, big }: { g: ReturnType<typeof useMurder>; big?: boolean }) {
  const players = g.state?.players ?? [];
  if (players.length === 0)
    return <div className="mt-5 text-lg font-bold text-ink/40">Waiting for villagers…</div>;
  return (
    <div className={`mt-4 flex ${big ? "max-w-3xl" : "max-w-4xl"} flex-wrap justify-center gap-2`}>
      {players.map((p) => {
        const c = g.byId.get(p.characterId ?? "");
        return (
          <div
            key={p.id}
            className={`ff-sticker flex items-center gap-2 px-3 py-1.5 ${
              p.alive ? "bg-white text-ink" : "bg-ink/80 text-white/50"
            }`}
            style={p.alive && c ? { borderColor: c.color } : undefined}
          >
            <span className="text-xl">{p.alive ? c?.emoji : "💀"}</span>
            <div className="text-left leading-tight">
              <div className={`font-bold ${p.alive ? "" : "line-through"}`}>{p.name}</div>
              <div className="text-[10px] font-black uppercase opacity-60">
                {c?.job} · {c?.weapon}
              </div>
            </div>
            {p.cleared && <span className="text-[10px] font-black text-buzz-green">CLEARED</span>}
          </div>
        );
      })}
    </div>
  );
}

function Clues({ g }: { g: ReturnType<typeof useMurder> }) {
  const feed = g.state?.feed ?? [];
  return (
    <div className="ff-sticker min-w-[22rem] bg-white p-4 text-ink">
      <div className="ff-title text-2xl text-pink">🔎 CLUES</div>
      {feed.length === 0 ? (
        <div className="text-sm font-bold text-ink/40">No bodies yet…</div>
      ) : (
        <ul className="mt-2 space-y-2">
          {feed.map((c, i) => (
            <motion.li
              key={i}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-base font-bold"
            >
              💀 {c.victimName} — found with the{" "}
              <span className="text-pink">{c.weaponName}</span>
              <div className="text-[11px] font-black uppercase text-ink/50">
                that's the {c.framedJob}'s weapon…
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Reveal({ g }: { g: ReturnType<typeof useMurder> }) {
  const st = g.state!;
  const killer = st.players.find((p) => p.role === "murderer");
  const c = g.byId.get(killer?.characterId ?? "");
  return (
    <div className="text-center">
      <div className="ff-title text-6xl text-pink">
        {st.winner === "murderer" ? "THE MURDERER WINS" : "THE VILLAGE WINS"}
      </div>
      <div className="ff-sticker mx-auto mt-6 inline-flex items-center gap-4 bg-white px-10 py-6 text-ink">
        <span className="text-5xl">{c?.emoji}</span>
        <div className="text-left">
          <div className="text-4xl font-black">{killer?.name}</div>
          <div className="text-sm font-black uppercase text-ink/50">
            {c?.job} · {c?.weapon}
          </div>
        </div>
        <span className="ff-title text-3xl text-pink">was the murderer</span>
      </div>
    </div>
  );
}

function Banner({ announce }: { announce: { a: MurderAnnounce; nonce: number } | null }) {
  const [show, setShow] = useState<{ text: string; nonce: number } | null>(null);
  useEffect(() => {
    if (!announce) return;
    const a = announce.a;
    let text = "";
    if (a.type === "killed") text = `💀 ${a.victim} was murdered — with the ${a.weapon}!`;
    else if (a.type === "vote") text = `⚖️ ${a.by} accuses ${a.suspect}!`;
    else if (a.type === "caught") text = `🔍 ${a.suspect} was the murderer — VILLAGE WINS!`;
    else if (a.type === "wrong") text = `❌ ${a.suspect} was innocent!`;
    else if (a.type === "acquitted") text = `🤷 ${a.suspect} walks free…`;
    else if (a.type === "start") text = "🔪 There is a murderer among you…";
    if (!text) return;
    setShow({ text, nonce: announce.nonce });
    const id = setTimeout(() => setShow(null), 3200);
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
          className="absolute inset-0 z-30 grid place-items-center bg-ink/75 backdrop-blur-sm"
        >
          <div className="ff-sticker animate-pop max-w-4xl bg-white px-12 py-8 text-center ff-title text-4xl text-pink">
            {show.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
