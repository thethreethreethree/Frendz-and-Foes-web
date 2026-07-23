import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useMurder2 } from "./useMurder2";
import { playSfx } from "../audio/sfx";
import type { V2Announce, V2Character, V2Clue, V2Player, V2State } from "../net/murder2";

// Big-screen display for Murder v2.
export function Murder2Display({ room }: { room: string }) {
  const { state, announce } = useMurder2(room, "display");
  // Show the lobby (with the join QR) immediately, even before any player has joined — otherwise
  // players would have no QR to scan and no game state could ever start.
  if (!state || state.phase === "lobby") return <Lobby room={room} state={state} />;
  return (
    <Backdrop phase={state.phase} winner={state.winner}>
      <div className="w-full max-w-5xl">
        <Header state={state} />
        <div className="grid gap-4 md:grid-cols-2">
          <Clues state={state} />
          <RosterGrid state={state} />
        </div>
        {state.phase === "voting" && <VoteTally state={state} />}
        {state.phase === "ended" && <EndBanner state={state} />}
      </div>
      <MomentBanner announce={announce} />
    </Backdrop>
  );
}

function Lobby({ room, state }: { room: string; state: V2State | null }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    const url = `${window.location.origin}/?room=${room}&game=villagers#/play`;
    QRCode.toDataURL(url, { width: 260, margin: 1 }).then(setQr).catch(() => {});
  }, [room]);
  const picked = (state?.players ?? []).filter((p) => p.characterId);
  return (
    <Backdrop phase="lobby">
      <img src="/brand/logo-villagers.png" alt="" className="mb-2 max-h-28" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display="none";}} />
      <div className="ff-title text-5xl text-ink">MURDER MYSTERY: THE VILLAGERS</div>
      <div className="mt-6 flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="ff-sticker bg-white p-5 text-center">
          <div className="ff-title text-2xl text-pink">SCAN TO JOIN</div>
          {qr && <img src={qr} alt="join" className="mt-2" />}
          <div className="mt-1 font-display text-4xl tracking-widest text-ink">{room.split(":").pop()}</div>
        </div>
        <div className="min-w-[16rem]">
          <div className="font-display text-2xl text-ink">Villagers ({picked.length})</div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {picked.map((p) => (
              <div key={p.id} className="rounded bg-white px-2 py-1 text-sm">
                {charEmoji(state, p.characterId)} <b>{p.name}</b> · <span className="text-ink/60">{charName(state, p.characterId)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-6 text-ink/60">Host: start the game once everyone has picked a character.</p>
    </Backdrop>
  );
}

function Header({ state }: { state: V2State }) {
  const cd = useCooldown(state.cooldownUntil);
  // Dark backing pill so the header stays legible on every phase backdrop — dark text vanished on the
  // night/reveal scenes (verified by screenshot, 2026-07-23).
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl bg-ink/55 px-4 py-2 text-cream backdrop-blur-sm">
      <div className="ff-title text-3xl">THE VILLAGERS</div>
      <div className="flex items-center gap-4 font-display text-xl">
        <span className="text-pink"><Icon name="icon-kills" className="inline h-6 w-6 align-[-5px]" /> Kills {state.killCount}/{state.killTarget}</span>
        {state.hasDetective && state.phase !== "ended" && <span className="text-teal">🔍 a detective walks among you</span>}
        {state.hasDoctor && state.phase !== "ended" && <span className="text-teal">🛡️ a doctor tends the town</span>}
        {state.phase === "playing" && cd > 0 && <span className="text-cream/70"><Icon name="icon-timer" className="inline h-5 w-5 align-[-4px]" /> next kill in {cd}s</span>}
        {state.phase === "voting" && <span className="text-teal"><Icon name="icon-vote" className="inline h-6 w-6 align-[-5px]" /> TOWN MEETING</span>}
      </div>
    </div>
  );
}

function Clues({ state }: { state: V2State }) {
  return (
    <div className="ff-sticker bg-white p-4">
      <div className="font-display text-2xl text-ink"><Icon name="icon-clue" className="inline h-7 w-7 align-[-6px]" /> Clues</div>
      {state.clues.length === 0 && <p className="text-ink/50">No one has died… yet.</p>}
      {state.clues.map((c: V2Clue, i) => (
        <div key={i} className="mt-2 flex items-center gap-3 rounded-lg bg-cream px-3 py-2">
          {/* The crime-scene plate for this clue's location, then the item-set card (the deduction key). */}
          <ScenePlate location={c.weapon.location} />
          <ClueArt art={c.weapon.art} emoji={c.weapon.emoji} />
          <div>
            <b>Item Set {c.weapon.setNumber} · {c.weapon.location}</b>
            {/* F-5: `methodIndex` had no reader. Rendering all three methods with the used one
                emphasised gives it one, and shows the town what was ruled out as well as what wasn't. */}
            <div className="text-sm text-ink/60">
              {c.weapon.methods.map((m, j) => (
                <span key={j}>
                  {j > 0 && " · "}
                  <span className={j === c.methodIndex ? "font-bold text-ink" : "line-through opacity-50"}>{m}</span>
                </span>
              ))}
            </div>
            <div className="text-sm text-ink/70">points to the <b>{charName(state, c.framedCharacterId)}</b> ({playerName(state, c.framedPlayerId)})</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Deduction board: each suspect with how many revealed clues frame them (the town's reasoning aid),
// their alive/dead/cleared status, and — for the dead — their parting last words.
function RosterGrid({ state }: { state: V2State }) {
  const picked = state.players.filter((p) => p.characterId);
  const framedCount = (charId: string | null) => state.clues.filter((c) => c.framedCharacterId === charId).length;
  const max = Math.max(0, ...picked.map((p) => framedCount(p.characterId)));
  return (
    <div className="ff-sticker bg-white p-4">
      <div className="font-display text-2xl text-ink">Suspects <span className="text-base text-ink/50">— who's being framed</span></div>
      <div className="mt-2 space-y-1 text-sm">
        {picked.map((p) => {
          const n = framedCount(p.characterId);
          const hot = n > 0 && n === max; // most-framed suspect(s) — the crowd's prime lead
          return (
            <div key={p.id} className={`rounded px-2 py-1 ${!p.alive ? "bg-ink/10 opacity-70" : hot ? "bg-pink/15" : "bg-cream"}`}>
              <div>
                {!p.alive && <Icon name="icon-dead" className="inline h-4 w-4 align-[-2px]" />}{" "}
                <span className={!p.alive ? "line-through" : ""}>{charEmoji(state, p.characterId)} <b>{p.name}</b> · {charName(state, p.characterId)}</span>
                {p.cleared && <span className="text-teal"> ✓cleared</span>}
                {n > 0 && <span className={`ml-1 ${hot ? "font-bold text-pink" : "text-ink/60"}`}>🔎 framed ×{n}</span>}
              </div>
              {p.lastWords && <div className="pl-1 text-xs italic text-ink/70">💬 “{p.lastWords}”</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VoteTally({ state }: { state: V2State }) {
  const tally = state.vote?.tally || {};
  return (
    <div className="ff-sticker mt-4 bg-white p-4">
      <div className="font-display text-2xl text-pink">Votes</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(tally).map(([id, n]) => (
          <span key={id} className="rounded-lg bg-cream px-3 py-1">{playerName(state, id)}: <b>{n}</b></span>
        ))}
        {Object.keys(tally).length === 0 && <span className="text-ink/50">waiting for votes…</span>}
      </div>
    </div>
  );
}

function EndBanner({ state }: { state: V2State }) {
  const murderer = state.players.find((p) => p.id === state.murdererId);
  const detective = state.players.find((p) => p.id === state.detectiveId);
  const doctor = state.players.find((p) => p.id === state.doctorId);
  return (
    <div className="ff-sticker mt-4 bg-pink p-5 text-center text-white">
      <div className="ff-title text-4xl"><Icon name="icon-winner" className="inline h-9 w-9 align-[-8px]" /> {state.winner === "town" ? "TOWN WINS!" : "THE MURDERER WINS!"}</div>
      <div className="mt-1 text-lg"><Icon name="icon-murderer" className="inline h-6 w-6 align-[-5px]" /> It was <b>{murderer?.name}</b>, the {charName(state, murderer?.characterId)}.</div>
      {detective && <div className="mt-1 text-sm opacity-90"><Icon name="icon-detective" className="inline h-5 w-5 align-[-4px]" /> The detective was <b>{detective.name}</b>, the {charName(state, detective.characterId)}.</div>}
      {doctor && <div className="mt-1 text-sm opacity-90">🛡️ The doctor was <b>{doctor.name}</b>, the {charName(state, doctor.characterId)}.</div>}
    </div>
  );
}

// ---- helpers ----
function charName(s: V2State | null, id: string | null | undefined) { return s?.characters.find((c: V2Character) => c.id === id)?.profession || "?"; }
function charEmoji(s: V2State | null, id: string | null | undefined) { return s?.characters.find((c: V2Character) => c.id === id)?.weapon.emoji || ""; }
function playerName(s: V2State | null, id: string | null | undefined) { return s?.players.find((p: V2Player) => p.id === id)?.name || "?"; }
function useCooldown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return Math.max(0, Math.ceil((until - now) / 1000));
}
// Small status icon from /icons/<name>.png; hides itself if the file is missing.
function Icon({ name, className = "inline h-6 w-6 align-[-5px]" }: { name: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={`/icons/${name}.png`} alt="" onError={() => setOk(false)} className={className} />;
}

// The scene turns with the game: dusk in the lobby, night while the murderer works, a lit hall for
// the town meeting, a shadowed reveal at the end. Each variant is a CSS background (index.css).
function Backdrop({ children, phase, winner }: { children: React.ReactNode; phase?: string; winner?: string | null }) {
  const bg =
    phase === "lobby" ? "ff-bg-lobby"
    : phase === "playing" ? "ff-bg-night"
    : phase === "voting" ? "ff-bg-meeting"
    : phase === "ended" ? (winner === "town" ? "ff-bg-town-win" : winner === "murderers" ? "ff-bg-murderer-win" : "ff-bg-reveal")
    : "";
  return <div className={`relative ff-backdrop-villagers ${bg} grid min-h-full place-items-center p-6`}>{children}</div>;
}

// location string → allocated plate path (matches the allocation slug in villagers2.js locations).
export function locationPlate(location: string) {
  const s = location.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^the-/, "");
  return `/locations/loc-${s}.webp`;
}

// The dramatic per-moment overlay. v2 emitted seven announce types and rendered none of them — the
// whole pipeline was dead while v1 had this (A31: invisible ⇒ does not exist; A21: same concept must
// behave the same across modules). Keyed on `nonce`, not payload: two identical kills in a row must
// still fire twice, and a reconnect that replays the last announce must not.
function MomentBanner({ announce }: { announce: { a: V2Announce; nonce: number } | null }) {
  const [show, setShow] = useState<{ text: string; sub?: string; art?: string; nonce: number } | null>(null);
  useEffect(() => {
    if (!announce) return;
    const a = announce.a;
    let text = "";
    let sub: string | undefined;
    let art: string | undefined; // the event illustration behind the text
    if (a.type === "killed") {
      text = `💀 ${a.victim} was murdered!`;
      sub = a.method ? `${a.method} — left in the ${a.weapon}` : `left in the ${a.weapon}`;
      art = "/events/event-kill.webp";
      playSfx("kill");
    } else if (a.type === "start") { text = "🔪 The village sleeps…"; playSfx("heartbeat"); }
    else if (a.type === "vote-open") { text = "🔔 Town meeting — everybody vote"; art = "/events/event-vote-open.webp"; playSfx("toll"); }
    else if (a.type === "vote-wrong") { text = `❌ ${a.cleared} is innocent`; sub = "the murderer is still among you"; art = "/events/event-accuse-wrong.webp"; playSfx("buzzer"); }
    else if (a.type === "vote-none") { text = "🤷 No majority — the town moves on"; art = "/events/event-vote-tie.webp"; playSfx("swoosh"); }
    else if (a.type === "saved") { text = `🛡️ ${a.victim} was attacked — but survived!`; sub = "a healing hand intervened"; art = "/events/event-accuse-right.webp"; playSfx("reveal"); }
    else if (a.type === "end") {
      text = a.winner === "town" ? "🎉 The town wins!" : "🔪 The murderer wins!";
      sub = a.caught ? `${a.caught} was the murderer` : undefined;
      art = a.winner === "town" ? "/events/event-accuse-right.webp" : "/events/event-kill.webp";
      playSfx("gong");
      if (a.winner === "town") setTimeout(() => playSfx("applause"), 700);
    }
    if (!text) return;
    setShow({ text, sub, art, nonce: announce.nonce });
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
          <div className="ff-sticker animate-pop relative overflow-hidden bg-white text-center">
            {show.art && <img src={show.art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
            <div className="relative px-12 py-8">
              <div className="ff-title text-5xl text-pink">{show.text}</div>
              {show.sub && <div className="mt-2 text-xl text-ink/80">{show.sub}</div>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// The clue's item-set card. This is the deduction surface — players read it off a TV across a room —
// so it takes full-resolution art at h-48 (192px). Measured: at h-28 the weapon list is illegible and
// only the location label survives (screenshot, 2026-07-17). Clues are few, so the bytes are cheap.
// Native 577:650 ratio, object-contain: the header and location label are part of the clue.
function ClueArt({ art, emoji }: { art: string; emoji: string }) {
  const [ok, setOk] = useState(true);
  if (ok) return <img src={art} alt="" onError={() => setOk(false)} className="h-48 w-auto shrink-0 rounded-lg object-contain" />;
  return <span className="grid h-48 w-[170px] shrink-0 place-items-center text-6xl">{emoji}</span>;
}
// The crime-scene location plate. ~9 locations have no art yet; those simply render nothing (the
// item-set card and text still carry the clue), so a missing plate degrades cleanly.
function ScenePlate({ location }: { location: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={locationPlate(location)} alt={location} onError={() => setOk(false)} className="h-48 w-36 shrink-0 rounded-lg object-cover" />;
}
