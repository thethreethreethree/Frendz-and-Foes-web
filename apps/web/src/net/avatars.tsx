// Shared player-avatar picker + badge, used by the named-player games (Solo Clue, Ballpark,
// After Dark, Cover Ops, Murder, Sketch Relay). The 12 animal cutouts live in /avatars.
// Team-based games don't have per-person players, so they don't use this.
import { useState } from "react";

export const AVATARS = [
  "lion", "raccoon", "flamingo", "gorilla", "parrot", "sloth",
  "fox", "zebra", "panda", "toucan", "hippo", "cat",
] as const;
export type Avatar = (typeof AVATARS)[number];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

// A round avatar chip that falls back to the player's initial if the image is missing or the
// player never picked one (older sessions, team games).
export function AvatarBadge({
  avatar,
  name,
  size = 28,
  className = "",
}: {
  avatar?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (avatar && ok) {
    return (
      <img
        src={`/avatars/${avatar}.png`}
        alt=""
        aria-hidden
        onError={() => setOk(false)}
        style={dim}
        className={`inline-block shrink-0 rounded-full object-cover align-middle ${className}`}
      />
    );
  }
  return (
    <span
      style={dim}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-surface align-middle text-xs font-bold text-muted ${className}`}
    >
      {(name?.trim()?.[0] ?? "?").toUpperCase()}
    </span>
  );
}

// Name + animal picker used on the join screen. Renders the centered column only; callers wrap it
// in their own full-screen container (each game keeps its own <Wrap> with the canvas background).
export function AvatarNameForm({
  label,
  onJoin,
  error,
}: {
  label: string;
  onJoin: (name: string, avatar: string) => void;
  error?: string | null;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(() => randomAvatar());
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
      <div className="ff-title text-3xl">{label}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={16}
        className="w-56 rounded-lg border border-line px-4 py-3 text-center text-lg"
      />
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pick your animal</div>
      <div className="grid grid-cols-4 gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAvatar(a)}
            aria-label={a}
            aria-pressed={avatar === a}
            className={`rounded-full p-0.5 transition ${
              avatar === a ? "ring-4 ring-primary" : "opacity-70 hover:opacity-100"
            }`}
          >
            <img src={`/avatars/${a}.png`} alt={a} className="h-12 w-12 rounded-full object-cover" />
          </button>
        ))}
      </div>
      <button
        disabled={!name.trim()}
        onClick={() => onJoin(name.trim(), avatar)}
        className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40"
      >
        JOIN
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
