import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../display/Logo";
import { FloatingAccents } from "../display/Icons";
import { useRexHost, RexBanner } from "../host/RexHost";
import { getBrand } from "../brand/theme";
import type { GameType } from "../net/socket";

// PlayZoo's public front door — a scrolling marketing landing that doubles as the entry to the app.
// Built on the live theme tokens + the game-picker's gradient language, so it always matches the
// active brand.

const GAME_GRADIENT: Record<string, [string, string]> = {
  feud: ["#38bdf8", "#0ea5e9"], bingo: ["#f472b6", "#db2777"], murder: ["#fb7185", "#9f1239"],
  trivia: ["#a78bfa", "#7c3aed"], taboo: ["#f87171", "#dc2626"], headsup: ["#fbbf24", "#d97706"],
  reverse: ["#6ee7b7", "#14b8a6"], monikers: ["#e879f9", "#c026d3"], codenames: ["#818cf8", "#4f46e5"],
  justone: ["#4ade80", "#16a34a"], ballpark: ["#fb923c", "#ea580c"], pictionary: ["#22d3ee", "#0891b2"],
  telestrations: ["#a3e635", "#65a30d"], afterdark: ["#8b5cf6", "#312e81"],
};
const ORDER: GameType[] = ["trivia", "murder", "codenames", "taboo", "pictionary", "bingo", "feud", "headsup", "justone", "ballpark", "telestrations", "reverse", "monikers", "afterdark"];

// Rex's animal regulars — the cutouts generated for PlayZoo. Emoji is the graceful fallback
// if an image is missing, so the strip never shows a broken frame.
const CAST: { file: string; name: string; role: string; emoji: string }[] = [
  { file: "vince",  name: "Vince",  role: "The schemer",  emoji: "🦝" },
  { file: "trixie", name: "Trixie", role: "The diva",     emoji: "🦩" },
  { file: "boomer", name: "Boomer", role: "The bouncer",  emoji: "🦍" },
  { file: "pixel",  name: "Pixel",  role: "The loudmouth", emoji: "🦜" },
  { file: "mo",     name: "Mo",     role: "The chill one", emoji: "🦥" },
];

export function HomeRoute() {
  const brand = getBrand();
  const { line, say } = useRexHost(null, "PlayZoo");
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    say("welcome");
  }, [say]);

  return (
    <div className="ff-backdrop h-full overflow-y-auto text-ink">
      <FloatingAccents />

      {/* HERO */}
      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-14 text-center sm:pt-24">
        <span className="rounded-full border border-line bg-surface/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted backdrop-blur">
          Party games with an AI host
        </span>
        <Logo className="mt-6 animate-floaty text-7xl sm:text-8xl" />
        <h1 className="ff-title mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl" style={{ textWrap: "balance" }}>
          Welcome to the zoo.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted sm:text-xl">
          14 party games. One AI zookeeper running the chaos. Play on the big screen — everyone joins from their phones.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3.5 sm:flex-row">
          <Link to="/display" className="rounded-2xl bg-gradient-to-br from-primary to-accent px-9 py-4 font-display text-2xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_18px_46px_-10px_rgb(var(--c-primary)/0.65)] transition duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95">
            Open the big screen
          </Link>
          <Link to="/control" className="rounded-2xl border border-line bg-surface/70 px-9 py-4 font-display text-2xl font-extrabold text-ink backdrop-blur transition duration-150 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95">
            Host controller
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">No app to install · works on any phone + TV browser</p>
      </section>

      {/* MEET REX */}
      <section className="relative mx-auto max-w-4xl px-6 py-14">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface/60 p-8 text-center backdrop-blur sm:flex-row sm:text-left">
          <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-primary bg-surface text-6xl shadow-lg">
            <RexAvatar />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Meet your host</div>
            <h2 className="ff-title mt-1 text-3xl font-extrabold sm:text-4xl">Rex, the AI zookeeper</h2>
            <p className="mt-2 text-muted">
              Rex MCs every game — hyping you up, roasting the loser, and calling the shots in real time. No other
              party app has a host. He's the reason it feels like a show, not a menu.
            </p>
            <div className="mt-3 inline-block rounded-2xl rounded-bl-sm border border-primary/50 bg-canvas/70 px-4 py-2 text-left font-display text-lg font-bold">
              "Settle down, you animals — winner takes the enclosure. 🦁"
            </div>
          </div>
        </div>
      </section>

      {/* MEET THE CAST */}
      <section className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="text-center">
          <h2 className="ff-title text-3xl font-extrabold sm:text-4xl">Meet the animals</h2>
          <p className="mt-2 text-muted">Rex's regulars. You'll be one of them soon enough.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CAST.map((c) => (
            <div key={c.file} className="group flex flex-col items-center rounded-2xl border border-line bg-surface/50 p-4 text-center backdrop-blur transition duration-150 hover:-translate-y-1 hover:bg-surface/70">
              <div className="grid h-28 w-28 place-items-center">
                <CastImg file={c.file} emoji={c.emoji} name={c.name} />
              </div>
              <div className="ff-title mt-2 text-lg font-bold">{c.name}</div>
              <div className="text-xs font-medium text-muted">{c.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES */}
      <section className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="text-center">
          <h2 className="ff-title text-3xl font-extrabold sm:text-4xl">14 games, one wild night</h2>
          <p className="mt-2 text-muted">Trivia, murder mystery, drawing, word games, and one strictly after dark.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ORDER.map((g) => {
            const meta = brand.games[g];
            if (!meta) return null;
            const [from, to] = GAME_GRADIENT[g] ?? ["#64748b", "#334155"];
            return (
              <a
                key={g}
                href={`/?game=${g}#/display`}
                className="group relative flex flex-col items-start overflow-hidden rounded-2xl p-4 text-left text-white transition duration-150 hover:-translate-y-1 hover:brightness-110 active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 16px 34px -18px rgb(0 0 0 / 0.7)" }}
              >
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md transition-transform duration-500 ease-out group-hover:translate-x-[400%]" />
                <span className="relative text-3xl drop-shadow-sm">{meta.icon ?? "🎲"}</span>
                <span className="relative mt-2 font-display text-xl font-extrabold leading-tight">{meta.label}</span>
                <span className="relative mt-0.5 text-xs font-medium text-white/85">{meta.tagline}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-5xl px-6 py-14">
        <h2 className="ff-title text-center text-3xl font-extrabold sm:text-4xl">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Open the big screen", d: "Load PlayZoo on any TV or laptop browser and pick a game." },
            { n: "2", t: "Everyone scans in", d: "Players join from their own phones by scanning the code — no app, no accounts." },
            { n: "3", t: "Rex runs the show", d: "Your AI host takes over: intros, banter, scores, and a champion crowned." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-line bg-surface/60 p-6 backdrop-blur">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-xl font-extrabold text-white">{s.n}</div>
              <div className="ff-title mt-3 text-xl font-bold">{s.t}</div>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MAKE IT YOURS */}
      <section className="relative mx-auto max-w-4xl px-6 py-14">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-gradient-to-br from-primary/15 to-accent/10 p-10 text-center backdrop-blur">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">White-label</div>
          <h2 className="ff-title text-3xl font-extrabold sm:text-4xl" style={{ textWrap: "balance" }}>Running an event? Make PlayZoo yours.</h2>
          <p className="max-w-xl text-muted">Your colors, your logo, your game names — a fully branded games night for a bar, a wedding, a launch, or a whole company. Set it up in minutes.</p>
          <Link to="/admin" className="mt-2 rounded-2xl bg-gradient-to-br from-primary to-accent px-8 py-3.5 font-display text-xl font-extrabold text-white shadow-[0_16px_44px_-12px_rgb(var(--c-primary)/0.6)] transition hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95">
            Create your brand
          </Link>
        </div>
      </section>

      <footer className="relative mx-auto max-w-5xl px-6 pb-12 pt-6 text-center text-sm text-muted">
        <div className="ff-title text-lg text-ink">{brand.productName}</div>
        <p className="mt-1">Party games with an AI host. Grab a screen, grab your phones, get in your enclosures.</p>
      </footer>

      <RexBanner line={line} />
    </div>
  );
}

function RexAvatar() {
  const [ok, setOk] = useState(true);
  if (!ok) return <span>🦁</span>;
  return <img src="/crew/rex-keeper.png" alt="Rex" className="h-full w-full object-cover" onError={() => setOk(false)} />;
}

// A cast portrait that falls back to its emoji if the cutout PNG hasn't been generated.
function CastImg({ file, emoji, name }: { file: string; emoji: string; name: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="text-6xl">{emoji}</span>;
  return (
    <img
      src={`/crew/${file}.png`}
      alt={name}
      className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] transition-transform duration-150 group-hover:scale-105"
      onError={() => setOk(false)}
    />
  );
}
