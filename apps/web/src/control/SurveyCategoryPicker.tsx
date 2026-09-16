import { useState } from "react";
import { SURVEY_CATEGORIES } from "@ff/engine";
import { Logo } from "../display/Logo";
import { getBrand } from "../brand/theme";

// The step a host takes after choosing Survey Showdown: which of the ten topics tonight is about.
//
// WHY IT IS ITS OWN SCREEN. Survey Showdown had no pre-game step -- ControlRoute dropped straight
// into the remote and the deck was two buttons buried in the Teams & setup panel, beside team
// names, colours, start and reset. Ten topics will not fit there, and the choice sets what the
// whole night is about. Trivia already works this way, so this is the house pattern.
//
// WHY IT LOOKS LIKE THIS. The first version used flat CSS gradients with one emoji per card, and
// the owner's verdict was that it "looks boring and doesn't match the rest of the brand style".
// That was fair, and obvious the moment it sits next to GamePicker: every other tile wall in this
// product -- the home page, the game picker -- is full-bleed painted art with the animal cast under
// a dark scrim in the display font. An emoji on a gradient reads as a placeholder beside that.
//
// There is no per-category scene art and none can be invented here, so this uses the most on-brand
// assets that DO exist: the 20 full-body cast cutouts in /cast. Each topic gets the castmember
// whose canonical role actually fits it -- Zara the party starter for Night Out, Waddles the
// try-hard for Work, Pixel the loudmouth for Social Media, Hank the heavyweight for Food -- so the
// wall reads as PlayZoo's own characters presenting the topics rather than as a settings list.

interface Look {
  /** Cast slug in /cast, chosen by that character's canonical role. */
  cast: string;
  /** Emoji fallback, so a missing cutout never leaves an empty card. */
  emoji: string;
  from: string;
  to: string;
}

const LOOK: Record<string, Look> = {
  // Zara, the party starter
  "night-out": { cast: "zebra", emoji: "\u{1F993}", from: "#a855f7", to: "#4c1d95" },
  // Trixie, the diva
  "dating-and-relationships": { cast: "flamingo", emoji: "\u{1F9A9}", from: "#fb7185", to: "#831843" },
  // Mo, the chill one
  "travel-and-backpacking": { cast: "sloth", emoji: "\u{1F9A5}", from: "#2dd4bf", to: "#134e4a" },
  // Waddles, the try-hard
  "work-and-office-life": { cast: "penguin", emoji: "\u{1F427}", from: "#818cf8", to: "#312e81" },
  // Sludge, the instigator
  "guilty-pleasures-and-bad-habits": { cast: "skunk", emoji: "\u{1F9A8}", from: "#fbbf24", to: "#78350f" },
  // Hank, the heavyweight
  "food-and-drinks": { cast: "hippo", emoji: "\u{1F99B}", from: "#fb923c", to: "#7c2d12" },
  // Hoot, the know-it-all
  adulting: { cast: "owl", emoji: "\u{1F989}", from: "#4ade80", to: "#14532d" },
  // Pixel, the loudmouth
  "phones-and-social-media": { cast: "parrot", emoji: "\u{1F99C}", from: "#38bdf8", to: "#0c4a6e" },
  // Kai, the two-face
  "awkward-and-embarrassing-moments": { cast: "chameleon", emoji: "\u{1F98E}", from: "#e879f9", to: "#701a75" },
  // Kip, the hustler
  "naughty-but-nice-18plus": { cast: "fox", emoji: "\u{1F98A}", from: "#f43f5e", to: "#4c0519" },
};
const FALLBACK: Look = { cast: "raccoon", emoji: "\u{1F4CA}", from: "#64748b", to: "#1e293b" };

// Same failure behaviour as the home page's cast parade: if a cutout is missing the card still
// reads, falling back to the emoji rather than showing a broken image.
function CastFigure({ slug, emoji }: { slug: string; emoji: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <span className="pointer-events-none absolute bottom-2 right-2 text-5xl opacity-90 drop-shadow-lg" aria-hidden>
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`/cast/${slug}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setOk(false)}
      className="pointer-events-none absolute -right-3 bottom-0 h-[78%] w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-105"
    />
  );
}

export function SurveyCategoryPicker({
  onPick,
  onBack,
}: {
  onPick: (categoryId: string) => void;
  onBack?: () => void;
}) {
  const label = getBrand().games.feud?.label ?? "Survey Showdown";
  return (
    <div className="ff-backdrop ff-scroll h-full text-ink">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-10 pt-6">
        {/* A way back out. The first version was a dead end -- no Home, no back, browser only. */}
        {onBack && (
          <button
            onClick={onBack}
            className="ff-tap self-start rounded-xl border border-line bg-surface/70 px-3 text-sm font-bold text-ink"
          >
            ← Games
          </button>
        )}

        <div className="mt-4 flex flex-col items-center text-center">
          <Logo className="text-3xl" />
          <h1 className="ff-title mt-3 text-2xl leading-tight sm:text-3xl">{label}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Pick a category</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted">
            Ten topics, thirty questions each — three rounds of ten, then a wildcard bonus.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SURVEY_CATEGORIES.map((c, idx) => {
            const look = LOOK[c.id] ?? FALLBACK;
            const teaser = c.questions[0]?.prompt ?? "";
            return (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                className="ff-rise group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl p-3 text-left text-white transition duration-150 hover:-translate-y-1 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(150deg, ${look.from} 0%, ${look.to} 100%)`,
                  boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 18px 38px -20px rgb(0 0 0 / 0.75)",
                  animationDelay: `${Math.min(idx * 45, 450)}ms`,
                }}
              >
                {/* A soft spotlight behind the character, so the figure sits IN the card rather than
                    on it -- the depth the game tiles get for free from their painted scenes. */}
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(120% 80% at 75% 20%, rgba(255,255,255,0.22), transparent 60%)" }}
                />
                <CastFigure slug={look.cast} emoji={look.emoji} />
                {/* Scrim, matching the game tiles: from-black/90 up through /35 to transparent. */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md transition-transform duration-500 ease-out group-hover:translate-x-[400%]" />

                <span
                  className="relative font-display text-sm font-extrabold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] sm:text-base"
                  style={{ textWrap: "balance" }}
                >
                  {c.title}
                </span>
                <span className="relative mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                  {teaser}
                </span>
                <span className="relative mt-1.5 inline-flex w-fit items-center rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/90 backdrop-blur-sm">
                  {c.questions.length} questions
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
