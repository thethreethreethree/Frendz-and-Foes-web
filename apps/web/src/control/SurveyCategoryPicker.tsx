import { SURVEY_CATEGORIES } from "@ff/engine";
import { getBrand } from "../brand/theme";

// The step a host takes after choosing Survey Showdown: which of the ten topics tonight is about.
//
// WHY IT IS ITS OWN SCREEN. Survey Showdown had no pre-game step at all -- ControlRoute dropped
// straight into the remote, and the deck was two buttons ("Standard" / "Randomize Survey") buried
// in the Teams & setup panel alongside team names, colours, start and reset. Ten topics will not
// fit there, and the choice deserves to be made before the room is even paired: it sets what the
// whole night is about. Trivia already works this way (deck version + mode, then the remote), so
// this is the house pattern rather than a new one.
//
// The teaser under each title is that category's FIRST REAL QUESTION, straight from the bank --
// not invented marketing copy. A host picking "Adulting" can see what they are committing the room
// to before they commit it.

const LOOK: Record<string, { icon: string; from: string; to: string }> = {
  "night-out": { icon: "🌃", from: "#c084fc", to: "#7e22ce" },
  "dating-and-relationships": { icon: "💘", from: "#fb7185", to: "#be123c" },
  "travel-and-backpacking": { icon: "🎒", from: "#2dd4bf", to: "#0d9488" },
  "work-and-office-life": { icon: "💼", from: "#818cf8", to: "#4338ca" },
  "guilty-pleasures-and-bad-habits": { icon: "🙈", from: "#fbbf24", to: "#b45309" },
  "food-and-drinks": { icon: "🍜", from: "#fb923c", to: "#c2410c" },
  adulting: { icon: "🧾", from: "#4ade80", to: "#15803d" },
  "phones-and-social-media": { icon: "📱", from: "#38bdf8", to: "#0369a1" },
  "awkward-and-embarrassing-moments": { icon: "😬", from: "#e879f9", to: "#a21caf" },
  "naughty-but-nice-18plus": { icon: "🔥", from: "#f43f5e", to: "#881337" },
};
const FALLBACK = { icon: "📊", from: "#64748b", to: "#334155" };

export function SurveyCategoryPicker({ onPick }: { onPick: (categoryId: string) => void }) {
  const label = getBrand().games.feud?.label ?? "Survey Showdown";
  return (
    <div className="ff-backdrop ff-scroll h-full text-ink">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 pb-10 pt-8">
        <div className="text-center">
          <h1 className="ff-title text-3xl leading-tight sm:text-4xl">{label}</h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">Pick a category</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            Ten topics, thirty questions each — three rounds of ten, then a wildcard bonus from
            another topic.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {SURVEY_CATEGORIES.map((c, idx) => {
            const look = LOOK[c.id] ?? FALLBACK;
            const teaser = c.questions[0]?.prompt ?? "";
            return (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                className="ff-rise group relative flex min-h-[116px] flex-col items-start justify-end overflow-hidden rounded-2xl p-3 text-left text-white transition duration-150 hover:-translate-y-1 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${look.from} 0%, ${look.to} 100%)`,
                  boxShadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 16px 34px -18px rgb(0 0 0 / 0.7)",
                  animationDelay: `${Math.min(idx * 40, 400)}ms`,
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className="pointer-events-none absolute right-2 top-2 text-2xl drop-shadow-lg" aria-hidden>
                  {look.icon}
                </span>
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-12 bg-white/20 blur-md transition-transform duration-500 ease-out group-hover:translate-x-[400%]" />
                <span className="relative pr-8 font-display text-base font-extrabold leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] sm:text-lg" style={{ textWrap: "balance" }}>
                  {c.title}
                </span>
                <span className="relative mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {teaser}
                </span>
                <span className="relative mt-1 text-[9px] font-black uppercase tracking-wider text-white/70">
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
