import { useContext, useState, type ReactNode } from "react";
import { ConnectionCtx } from "../net/connection";
import { StatusPill } from "../net/pairing";

// THE HOST REMOTE SHELL — one frame for all fourteen controllers.
//
// WHY THIS EXISTS. Rendered at 390x844 on 2026-09-16, the fourteen remotes were three different
// screens wearing one product's name (see EVIDENCE.md, ADDENDUM). The specific failures this
// component is built to make impossible:
//
//   * The room code was the LEAST legible text on screen. StatusPill painted white on a pale pill
//     (bg-ink/80 + text-white, and --c-ink is near-white since the dark default) -- about 1.4:1.
//     The one string a host reads aloud to a room was the one string they could not read. Here it
//     is the largest thing in the header, on surface, at full ink.
//   * Ten of fourteen remotes had no way back to game selection; nine of them spent that exact
//     top-right slot on the unreadable pill instead. Home is now part of the frame, not per-game.
//   * Six remotes wasted 45-75% of the screen below the fold while their primary action floated
//     mid-column. The action docks to the bottom, inside the thumb's arc, safe-area aware.
//   * Scrolling any of the eleven hand-rolled remotes threw away the game name, the room code and
//     the connection state, because only three had sticky chrome. This header is always sticky.
//
// It takes no store. Murder's controller has no ConnectionCtx above it, so status is read through
// useContext directly and simply absent when there is no provider -- never a thrown error.

/** Connection state, read without requiring a provider. Null when there is none. */
function useMaybeConnection() {
  return useContext(ConnectionCtx);
}

// Leaving mints a NEW room on the next pick, orphaning the display and everyone who joined -- so
// this confirms, and says what it will cost. Kept from the original HomeButton.
function goHome() {
  if (
    window.confirm(
      "Leave this game and return to game selection? Anyone who joined will need to scan the new code to rejoin.",
    )
  ) {
    window.location.href = `${window.location.origin}/#/control`;
  }
}

/** The live dot + word. Replaces the pale pill; the code itself moved to RoomCode. */
export function RemoteStatus() {
  const c = useMaybeConnection();
  if (!c) return null;
  const displays = c.presence?.display ?? 0;
  const ok = c.connected && displays > 0;
  const label = !c.connected ? "Offline" : displays > 0 ? "On screen" : "No screen";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-success" : c.connected ? "bg-warning" : "bg-danger"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

// Tap-to-copy, because the alternative a host actually uses is reading four characters off a phone
// in a dark room and spelling them at a stranger.
function RoomCode({ room }: { room: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(room).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          },
          () => {/* clipboard blocked (http, permissions): the code is still readable on screen */},
        );
      }}
      className="ff-tap flex items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left"
      title="Copy room code"
    >
      <span className="text-[10px] font-black uppercase tracking-wider text-muted">Room</span>
      <span className="font-display text-xl leading-none tracking-[0.18em] text-ink">{room}</span>
      <span className="text-[10px] font-bold text-muted">{copied ? "copied" : "copy"}</span>
    </button>
  );
}

/**
 * The header on its own, for the remotes not yet migrated onto RemoteShell.
 *
 * Ten of the fourteen controllers had no route back to game selection at all — and nine of them
 * spent that exact top-right slot on the status pill instead. Changing game meant editing the URL
 * or killing the tab. Migrating all ten onto the full shell is a bigger job than a release can
 * wait for, but the way out is not optional, so it lands here first.
 *
 * The title also truncates: the old headers were a bare `justify-between` with nothing allowed to
 * shrink, and "Sketch Relay" was already touching the pill at 390px.
 */
export function RemoteHeader({
  title,
  badge,
  right,
}: {
  title: ReactNode;
  /** A mark that belongs to the title (18+, a deck badge). */
  badge?: ReactNode;
  /** Game-specific controls (Reset). */
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={goHome}
          className="ff-tap shrink-0 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink"
          title="Back to game selection"
        >
          ⌂
        </button>
        <h1 className="ff-title min-w-0 flex-1 truncate text-2xl leading-tight">{title}</h1>
        {badge}
      </div>
      {/* Status on its own row rather than fighting the title for the same line — that fight is
          what put "Sketch Relay" against the pill at 390px. StatusPill carries the room code. */}
      <div className="flex items-center gap-2">
        <StatusPill />
        {right && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
      </div>
    </div>
  );
}

/**
 * The frame. Header is sticky and always carries identity + room + status + Home; `action` docks
 * to the bottom; children scroll between them.
 */
export function RemoteShell({
  title,
  badge,
  room,
  headerExtra,
  action,
  children,
}: {
  /** The game's name, as the brand calls it. */
  title: ReactNode;
  /** Optional mark beside the title (deck badge, 18+, ball count). */
  badge?: ReactNode;
  /**
   * Room code, when the game has one. Bingo's is a fixed word; Trivia mints one.
   * Omit it and the shell reads the room off the connection context — most controllers never
   * receive it as a prop, and requiring one would have meant threading it through five files
   * just to display it.
   */
  room?: string | null;
  /** Game-specific header controls (Undo/Redo, Reset) — kept to the second row, never crowding the title. */
  headerExtra?: ReactNode;
  /** The single most important next thing. Docked to the bottom. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const conn = useMaybeConnection();
  const code = room ?? conn?.room ?? null;
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-canvas/95 backdrop-blur">
        <div
          className="flex items-center gap-2 px-3 pb-2"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <button
            onClick={goHome}
            className="ff-tap shrink-0 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink"
            title="Back to game selection"
          >
            ⌂
          </button>
          {/* min-w-0 + truncate: "Sketch Relay" collided with the status pill at 390px in the old
              header, which was a bare justify-between with nothing allowed to shrink. */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1 className="ff-title min-w-0 truncate text-lg leading-tight text-ink">{title}</h1>
            {badge}
          </div>
          <RemoteStatus />
        </div>

        {(code || headerExtra) && (
          <div className="flex items-center gap-2 px-3 pb-2">
            {code && <RoomCode room={code} />}
            {headerExtra && <div className="ml-auto flex items-center gap-1.5">{headerExtra}</div>}
          </div>
        )}
      </header>

      {/* ff-scroll carries the notch/home-indicator insets and stops scroll chaining on iOS.
          The inner column is min-h-full so a SHORT screen still fills the viewport: six remotes
          wasted 45-75% of the phone with their primary action stranded mid-column, and a child
          marked `mt-auto` now falls to the bottom instead. Long content still scrolls normally. */}
      <div className="ff-scroll min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-3 p-3">{children}</div>
      </div>

      {action && (
        <div
          className="shrink-0 border-t border-line bg-canvas/95 px-3 pt-2 backdrop-blur"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
