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

// The full PlayZoo cast — all 20 animal cutouts (full-body, transparent, in /cast). Ordered so no
// two darker-silhouette figures (penguin, panda, gorilla, otter, bear, sloth, cat) sit adjacent in
// the parade. Emoji is the graceful fallback if an image is missing, so the strip never breaks.
const CAST: { slug: string; emoji: string; name: string; role: string }[] = [
  { slug: "toucan", emoji: "🐦", name: "Rico", role: "The DJ" },
  { slug: "penguin", emoji: "🐧", name: "Waddles", role: "The try-hard" },
  { slug: "flamingo", emoji: "🦩", name: "Trixie", role: "The diva" },
  { slug: "panda", emoji: "🐼", name: "Bianca", role: "The drama queen" },
  { slug: "crocodile", emoji: "🐊", name: "Chomp", role: "The competitor" },
  { slug: "otter", emoji: "🦦", name: "Otis", role: "The prankster" },
  { slug: "zebra", emoji: "🦓", name: "Zara", role: "The party starter" },
  { slug: "gorilla", emoji: "🦍", name: "Boomer", role: "The bouncer" },
  { slug: "parrot", emoji: "🦜", name: "Pixel", role: "The loudmouth" },
  { slug: "bear", emoji: "🐻", name: "Bruno", role: "The bruiser" },
  { slug: "chameleon", emoji: "🦎", name: "Kai", role: "The two-face" },
  { slug: "sloth", emoji: "🦥", name: "Mo", role: "The chill one" },
  { slug: "lion", emoji: "🦁", name: "Duke", role: "The big shot" },
  { slug: "cat", emoji: "🐱", name: "Duchess", role: "The snob" },
  { slug: "rhino", emoji: "🦏", name: "Tank", role: "The muscle" },
  { slug: "owl", emoji: "🦉", name: "Hoot", role: "The know-it-all" },
  { slug: "raccoon", emoji: "🦝", name: "John", role: "The schemer" },
  { slug: "hippo", emoji: "🦛", name: "Hank", role: "The heavyweight" },
  { slug: "fox", emoji: "🦊", name: "Kip", role: "The hustler" },
  { slug: "skunk", emoji: "🦨", name: "Sludge", role: "The instigator" },
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
    <div
      className="relative h-full overflow-y-auto text-ink"
      style={{
        // Night-zoo backdrop as the page's OWN background (children paint over it, so hero text +
        // cards sit on top). Dark scrim gradient keeps text readable; canvas colour is the fallback
        // if the image 404s. Fixed attachment so the scene stays put while content scrolls.
        backgroundColor: "rgb(var(--c-canvas))",
        backgroundImage: "linear-gradient(rgba(6,9,18,0.45), rgba(6,9,18,0.72)), url(/bg/home.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      <FloatingAccents />

      {/* Kickstarter badge — anchored to the viewport's right edge (clear of the centred hero text at
          any width), sits beside the call-to-action, bobs + glows, links to /kickstarter. */}
      <style>{`
        @keyframes ks-badge-bob { 0%,100%{transform:translateY(0) rotate(-2.5deg)} 50%{transform:translateY(-10px) rotate(2.5deg)} }
        @keyframes ks-badge-glow { 0%,100%{filter:drop-shadow(0 8px 18px rgba(0,0,0,.55)) drop-shadow(0 0 6px rgba(236,72,153,.35))} 50%{filter:drop-shadow(0 12px 26px rgba(0,0,0,.6)) drop-shadow(0 0 20px rgba(236,72,153,.8))} }
        .ks-badge img{ animation: ks-badge-bob 4.5s ease-in-out infinite, ks-badge-glow 2.8s ease-in-out infinite; }
        .ks-badge:hover img{ animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce){ .ks-badge img{ animation: none } }
      `}</style>
      <a
        href="/kickstarter"
        aria-label="Back PlayZoo on Kickstarter"
        className="ks-badge absolute right-3 top-24 z-20 block w-24 transition-transform duration-300 hover:scale-110 active:scale-95 sm:right-8 sm:top-40 sm:w-48 lg:right-16 lg:top-44 lg:w-60 xl:right-28 xl:w-64"
      >
        <img src="/ui/kickstarter-badge.png" alt="Back PlayZoo on Kickstarter" className="w-full" />
      </a>

      {/* Top-right header slot — where sign-in/up will live once we launch. For now it's the waitlist. */}
      <Link
        to="/waitlist"
        className="absolute right-3 top-3 z-30 whitespace-nowrap rounded-full border border-line bg-surface/85 px-4 py-2 font-display text-sm font-extrabold text-ink shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-primary hover:text-primary sm:right-5 sm:top-4 sm:px-5 sm:py-2.5 sm:text-base"
      >
        Join the waitlist →
      </Link>

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
            <p className="mt-3 text-sm font-semibold text-primary">💬 Tap Rex in the corner to chat with him — on any screen.</p>
          </div>
        </div>
      </section>

      {/* MEET THE ANIMALS — a full-bleed parade that scrolls the whole cast left→right on a
          seamless loop. The track holds two copies of CAST and slides from -50%→0, so the wrap is
          invisible; hovering the strip pauses it, and reduced-motion users get a static row. */}
      <section className="relative py-12">
        <div className="px-6 text-center">
          <h2 className="ff-title text-3xl font-extrabold sm:text-4xl">Meet the animals</h2>
          <p className="mt-2 text-muted">Twenty goons roam the zoo. You'll join one of their teams soon enough.</p>
        </div>

        <style>{`@keyframes pz-parade { from { transform: translateX(-50%); } to { transform: translateX(0); } }`}</style>

        <div className="group relative mt-8 overflow-hidden">
          {/* edge fades so figures slide in/out of view instead of popping at the borders */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-canvas to-transparent sm:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-canvas to-transparent sm:w-28" />
          <ul
            className="flex w-max items-end gap-7 pr-7 hover:[animation-play-state:paused] motion-reduce:animate-none sm:gap-9 sm:pr-9"
            style={{ animation: "pz-parade 55s linear infinite" }}
          >
            {[...CAST, ...CAST].map((c, i) => (
              <li key={`${c.slug}-${i}`} className="flex shrink-0 flex-col items-center">
                <div className="relative flex items-end justify-center">
                  {/* soft under-glow lifts the darker silhouettes off the dark backdrop */}
                  <span
                    className="pointer-events-none absolute bottom-3 left-1/2 h-16 w-24 -translate-x-1/2 rounded-full bg-white/10 blur-2xl"
                    aria-hidden
                  />
                  <ParadeImg slug={c.slug} emoji={c.emoji} />
                </div>
                {/* fixed-height caption band so named and un-named figures keep the row even */}
                <div className="mt-2 h-9 text-center">
                  {c.name && (
                    <>
                      <div className="ff-title text-base font-bold leading-tight text-ink">{c.name}</div>
                      {c.role && <div className="text-[11px] font-medium text-muted">{c.role}</div>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
                className="group relative flex aspect-[4/3] flex-col items-start justify-end overflow-hidden rounded-2xl p-4 text-left text-white transition duration-150 hover:-translate-y-1 hover:brightness-110 active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 16px 34px -18px rgb(0 0 0 / 0.7)" }}
              >
                <TileArt game={g} icon={meta.icon} />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md transition-transform duration-500 ease-out group-hover:translate-x-[400%]" />
                <span className="relative font-display text-xl font-extrabold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">{meta.label}</span>
                <span className="relative mt-0.5 text-xs font-medium text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{meta.tagline}</span>
              </a>
            );
          })}
          {/* The roster keeps growing — a placeholder tile in the empty slot. Uses
              /tiles/coming-soon.jpg once that art exists, with a dashed neon gradient + ✨ until then. */}
          <div
            className="ff-rise relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/35 p-4 text-center text-white"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 16px 34px -18px rgb(0 0 0 / 0.7)" }}
            aria-label="More games coming soon — not available yet"
          >
            {/* Art dimmed under a veil so the tile clearly reads as not-yet-available (locked). */}
            <TileArt game="coming-soon" icon="✨" />
            <span className="pointer-events-none absolute inset-0 bg-black/55" />
            <span className="relative font-display text-2xl font-extrabold leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">More coming soon</span>
            <span className="relative mt-1 text-xs font-semibold uppercase tracking-wide text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">New games drop in regularly</span>
          </div>
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

// Per-game scene key art (in /tiles), with an emoji fallback if the art file is missing.
function TileArt({ game, icon }: { game: string; icon?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="pointer-events-none absolute inset-0 grid place-items-center text-5xl opacity-90 drop-shadow-lg">{icon ?? "🎲"}</span>;
  return (
    <img
      src={`/tiles/${game}.jpg`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setOk(false)}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
    />
  );
}

// One full-body cast figure in the parade. Falls back to its emoji if the /cast cutout is missing,
// so the strip never shows a broken frame. Hovering a figure lifts it slightly above the line.
function ParadeImg({ slug, emoji }: { slug: string; emoji: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="grid h-32 w-24 place-items-end pb-2 text-6xl sm:h-44">{emoji}</span>;
  return (
    <img
      src={`/cast/${slug}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setOk(false)}
      className="relative h-32 w-auto object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:-translate-y-2 hover:scale-105 sm:h-44"
    />
  );
}
