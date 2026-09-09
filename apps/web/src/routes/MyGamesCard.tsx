// "Any five games you choose" — the card where a backer actually chooses.
//
// NAMED MyGamesCard, not GamePicker: routes/GamePicker.tsx already exists and is the HOST's grid of
// game tiles for starting a night. Two different things, and I overwrote the wrong one first.
//
// The promise is printed on the reward card, and the server enforces it. Without this the choice
// still happens, just by accident: canPlay() claims a backer's first five games as they play them.
// That is deliberate (nobody who has paid should hit a settings screen before their first game) but
// it is not choosing, and the card says choosing.
//
// The allowance is NOT computed here. The server reads it from the backer's plan on every request,
// so an upgrade is reflected the moment it happens and this component can never disagree with the
// thing doing the enforcing.
import { useEffect, useState } from "react";
import { myGames, setGamePick } from "../net/backer";
import type { PickState } from "../net/backer";
import { HOW_TO_PLAY } from "../net/howtoplay";
import { getBrand } from "../brand/theme";

// Titles come from the BRAND, which is where every other screen gets them — so a white-label venue
// that renames a game sees its own name here too, and a game can never appear under a title it has
// nowhere else. (HOW_TO_PLAY has no name field; it carries the summary and the steps.)
//
// A slug with no entry still renders, as itself: a game silently missing from the chooser is worse
// than an ugly label, because the backer simply cannot pick it.
const titleOf = (slug: string) => getBrand().games[slug]?.label ?? slug;
const blurbOf = (slug: string) => HOW_TO_PLAY[slug]?.summary ?? "";

export function MyGamesCard() {
  const [st, setSt] = useState<PickState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await myGames();
      if ("error" in r) { setErr(r.error); return; }
      setSt(r);
    })();
  }, []);

  async function toggle(slug: string, next: boolean) {
    setBusy(slug);
    const r = await setGamePick(slug, next);
    setBusy(null);
    if ("error" in r) { setErr(r.error); return; }
    setErr(null);
    setSt(r);
  }

  if (err && !st) {
    return (
      <div className="rounded-2xl border border-line bg-surface/60 p-5 text-sm text-muted backdrop-blur">
        {err}
      </div>
    );
  }
  if (!st) return null;

  // Nothing to choose on the top tier, and saying so is better than an empty grid or a hidden card.
  if (st.allGames) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-surface/60 p-5 backdrop-blur">
        <div className="ff-title text-lg font-extrabold">Every game, unlocked</div>
        <p className="mt-1 text-sm text-muted">
          Head Keeper covers all fourteen. There is nothing to choose — just go and play.
        </p>
      </div>
    );
  }

  if (!st.active) {
    return (
      <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        <div className="ff-title text-lg font-extrabold">Your games</div>
        <p className="mt-1 text-sm text-muted">
          Once your plan is active you can pick which games it covers.
        </p>
      </div>
    );
  }

  const remaining = typeof st.remaining === "number" ? st.remaining : 0;
  const allowance = typeof st.allowance === "number" ? st.allowance : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className="ff-title text-lg font-extrabold">Your games</div>
        <div className="text-sm text-muted">
          {st.chosen.length} of {allowance} chosen
          {remaining > 0 && ` · ${remaining} left`}
        </div>
      </div>

      {/* Over-allowance happens without anyone cheating: a plan can shrink while the picks stay.
          Said plainly, because the alternative is a backer quietly losing games they chose. */}
      {st.overAllowance && (
        <p className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          You have more games than your current plan covers. Nothing has been taken away — but if you
          drop one, you will not be able to add it back until you are under {allowance}.
        </p>
      )}

      {remaining === 0 && !st.overAllowance && (
        <p className="mt-2 text-sm text-muted">
          That is your {allowance}. To swap one out, remove it first.
        </p>
      )}

      {err && <p className="mt-2 text-sm font-semibold text-danger">{err}</p>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {st.games.map((slug) => {
          const picked = st.chosen.includes(slug);
          const locked = !picked && remaining === 0;
          return (
            <button
              key={slug}
              onClick={() => void toggle(slug, !picked)}
              disabled={busy === slug || locked}
              aria-pressed={picked}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                picked
                  ? "border-primary bg-primary/10"
                  : locked
                    ? "border-line opacity-40"
                    : "border-line hover:border-primary"
              } ${busy === slug ? "opacity-50" : ""}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs font-black ${
                  picked ? "border-primary bg-primary text-white" : "border-line"
                }`}
              >
                {picked ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{titleOf(slug)}</span>
                {blurbOf(slug) && (
                  <span className="mt-0.5 block text-xs text-muted">{blurbOf(slug)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">
        Change these whenever you like. If you just start playing something, we count it as one of
        your picks so your first night is never a settings screen.
      </p>
    </div>
  );
}
