import type { ReactNode } from "react";

// Shared building blocks for the host remote, sized for a thumb and coloured for a dark ground.
//
// The tone NAMES below are unchanged on purpose: eleven files import CtrlButton and pass
// tone="pink" / "tang" / "grape" / "green". Renaming them would be a rewrite. What changed is what
// each tone PAINTS, because the rendered remotes (EVIDENCE.md ADDENDUM, R9/R10) showed two
// systematic faults:
//
//   * White text on the light accents. Measured on the default brand: white on grape #a78bfa is
//     2.7:1, on tang #fb923c 2.3:1, on success #22c55e 2.3:1. AA wants 4.5. All three now take
//     canvas (near-black) text instead, which lands at 6.8:1, 8.2:1 and 8.1:1.
//   * Inverted hierarchy. tone="ink" was `bg-ink text-canvas` — and --c-ink is near-white since the
//     dark default, so every NEUTRAL control (◀, Undo, "Arm buzzers", "Teams") rendered as the
//     brightest object on the screen, shouting louder than the violet primary action beside it.
//     "ink" is now the quiet surface+hairline treatment its call sites always meant by it.

/** Returns the host to game selection. Confirms first — leaving mints a new room and orphans anyone
 *  already joined. Kept for the four remotes that import it directly; RemoteShell has its own. */
export function HomeButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => {
        if (
          window.confirm(
            "Leave this game and return to game selection? Anyone who joined will need to scan the new code to rejoin.",
          )
        ) {
          window.location.href = `${window.location.origin}/#/control`;
        }
      }}
      title="Back to game selection"
      className={`ff-tap rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink ${className}`}
    >
      ⌂ Home
    </button>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  /** Optional control parked on the header row (a count, a toggle). */
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-muted">{title}</h2>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  // Quiet default: a surface chip with a hairline. Was a near-white slab.
  ink: "bg-surface text-ink border border-line",
  // The brand's primary. Its own token pair, used at bold 16px+ where 4.2:1 clears AA-large.
  pink: "bg-primary text-primary-ink",
  teal: "bg-secondary text-canvas",
  sun: "bg-sun text-canvas",
  // These three carried white text and failed AA on every brand tested. Dark text on the accent.
  grape: "bg-grape text-canvas",
  tang: "bg-tang text-canvas",
  green: "bg-buzz-green text-canvas",
  /** Destructive / stop. */
  danger: "bg-danger text-canvas",
  /** Borderless — for tertiary actions that should not compete at all. */
  ghost: "bg-transparent text-muted",
};

export function CtrlButton({
  children,
  onClick,
  disabled,
  tone = "ink",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "ink" | "pink" | "teal" | "sun" | "grape" | "tang" | "green" | "danger" | "ghost";
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      // ff-tap is the 44px floor documented in index.css after a sweep found 34px and 20px targets
      // across the phone pages. Every remote defined that rule and then used it nowhere.
      className={`ff-tap select-none rounded-xl px-3.5 text-sm font-bold transition-transform active:translate-y-px disabled:opacity-35 ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** The one thing to do next. Full width, docked by RemoteShell into the thumb's arc. */
export function PrimaryAction({
  children,
  onClick,
  disabled,
  tone = "pink",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "pink" | "grape" | "teal" | "green" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full select-none rounded-2xl px-4 py-4 font-display text-xl tracking-wide shadow-pop transition-transform active:translate-y-px disabled:opacity-35 ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}

/**
 * A text field that is actually on the palette.
 *
 * The five hand-rolled remotes styled their team inputs `border border-line` with NO background,
 * so the field fell through to the browser's dark-mode default — charcoal, visibly off-palette
 * against the navy surfaces beside it (EVIDENCE.md ADDENDUM, R5).
 */
export function Field({
  value,
  onChange,
  placeholder,
  maxLength,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-label={ariaLabel}
      // min-height rather than .ff-tap: that utility also sets inline-flex and justify-center,
      // which belong to a button, not to a text field or a left-aligned row.
      className={`min-h-[44px] w-full min-w-0 rounded-xl border border-line bg-canvas px-3 text-base text-ink outline-none placeholder:text-muted focus:border-primary ${className}`}
    />
  );
}

/** A checkbox with a target you can hit. The one in Off Limits was 16px square. */
export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      // Not .ff-tap — it forces justify-center, and index.css declares it AFTER @tailwind
      // utilities, so a justify-start class loses the tie and the row centres itself.
      className="flex min-h-[44px] w-full items-center justify-start gap-2.5 rounded-xl px-1 text-left text-sm font-bold text-ink"
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
          checked ? "border-primary bg-primary text-primary-ink" : "border-line bg-canvas text-transparent"
        }`}
        aria-hidden
      >
        ✓
      </span>
      {children}
    </button>
  );
}
