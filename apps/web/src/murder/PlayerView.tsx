import { useState } from "react";
import { useMurder } from "./useMurder";
import { loadPlayer } from "../net/murder";
import { Logo } from "../display/Logo";

// The player's phone. Join by name → receive a secret role → act (murderer kills, detective
// accuses) → "you're dead" / end reveal. Never shows other players' roles until the end.
export function PlayerView({ room }: { room: string }) {
  const g = useMurder(room, "player");
  const [name, setName] = useState(loadPlayer(room).name ?? "");
  const joined = !!g.you;

  // --- Join screen ---
  if (!joined) {
    return (
      <Shell tone="bg-cream text-ink">
        <Logo className="text-4xl" />
        <p className="mt-2 font-display text-2xl text-ink/70">JOIN THE GAME</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={16}
          className="mt-6 w-full max-w-xs rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-center text-lg text-ink outline-none focus:border-teal"
        />
        <button
          disabled={!name.trim()}
          onClick={() => g.join(name.trim())}
          className="ff-sticker mt-3 bg-pink px-8 py-3 font-display text-2xl text-white disabled:opacity-40"
        >
          JOIN
        </button>
        <p className="mt-4 text-sm font-bold text-ink/40">Room {room}</p>
      </Shell>
    );
  }

  const st = g.state;
  const you = g.you!;

  // --- Ended: reveal ---
  if (st?.phase === "ended") {
    const won = st.winner === "civilians" ? you.role !== "murderer" : you.role === "murderer";
    return (
      <Shell tone={won ? "bg-buzz-green text-white" : "bg-ink text-white"}>
        <div className="ff-title text-5xl">{st.winner === "murderers" ? "MURDERERS WIN" : "CIVILIANS WIN"}</div>
        <div className="mt-4 text-xl font-bold">You were the {roleLabel(you.role)}</div>
        <div className="mt-1 text-2xl">{won ? "🎉 You won!" : "☠️ You lost"}</div>
      </Shell>
    );
  }

  // --- Lobby ---
  if (!st || st.phase === "lobby") {
    return (
      <Shell tone="bg-cream text-ink">
        <div className="ff-title text-4xl text-teal">YOU'RE IN!</div>
        <p className="mt-3 text-lg font-bold">Waiting for the host to start…</p>
        <p className="mt-6 text-sm font-bold text-ink/50">
          {st?.players.length ?? 1} player{(st?.players.length ?? 1) === 1 ? "" : "s"} in the room
        </p>
      </Shell>
    );
  }

  // --- Dead ---
  if (!you.alive) {
    return (
      <Shell tone="bg-ink text-white">
        <div className="text-7xl">💀</div>
        <div className="ff-title mt-3 text-5xl text-pink">YOU'RE DEAD</div>
        <p className="mt-3 text-lg font-bold text-white/70">Play it dramatically. Spectate the chaos.</p>
      </Shell>
    );
  }

  const others = st.players.filter((p) => p.alive && p.id !== you.id);

  // --- Murderer ---
  if (you.role === "murderer") {
    return (
      <Shell tone="bg-ink text-white" scroll>
        <div className="ff-title text-5xl text-pink">🔪 MURDERER</div>
        <p className="mt-2 text-center text-sm font-bold text-white/70">
          Wink at someone in person, then tap them here to eliminate them. Don't get caught.
        </p>
        <RoleList
          players={others}
          label="Eliminate"
          tone="bg-pink"
          onPick={(id) => g.kill(id)}
        />
      </Shell>
    );
  }

  // --- Detective ---
  if (you.role === "detective") {
    return (
      <Shell tone="bg-grape text-white" scroll>
        <div className="ff-title text-5xl text-white">🔍 DETECTIVE</div>
        <p className="mt-2 text-center text-sm font-bold text-white/80">
          Catch the murderer. Accuse carefully — a wrong guess gets YOU eliminated.
        </p>
        <RoleList
          players={others}
          label="Accuse"
          tone="bg-ink"
          confirm
          onPick={(id) => g.accuse(id)}
        />
      </Shell>
    );
  }

  // --- Civilian ---
  return (
    <Shell tone="bg-teal text-ink">
      <div className="ff-title text-5xl text-ink">🙂 CIVILIAN</div>
      <p className="mt-3 text-center text-lg font-bold">
        Mingle and survive. Watch for the murderer's wink!
      </p>
      <p className="mt-6 text-sm font-bold text-ink/60">{others.length + 1} still alive</p>
    </Shell>
  );
}

function roleLabel(r: string | null) {
  return r === "murderer" ? "Murderer" : r === "detective" ? "Detective" : "Civilian";
}

function Shell({ children, tone, scroll }: { children: React.ReactNode; tone: string; scroll?: boolean }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center ${
        scroll ? "overflow-y-auto py-8" : "justify-center"
      } px-6 text-center ${tone}`}
    >
      {children}
    </div>
  );
}

function RoleList({
  players,
  label,
  tone,
  confirm,
  onPick,
}: {
  players: { id: string; name: string }[];
  label: string;
  tone: string;
  confirm?: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mt-5 w-full max-w-xs space-y-2">
      {players.length === 0 && <div className="text-sm font-bold opacity-70">No one left.</div>}
      {players.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            if (!confirm || window.confirm(`Accuse ${p.name}? A wrong guess eliminates you.`)) onPick(p.id);
          }}
          className="flex w-full items-center justify-between rounded-lg border-2 border-white/30 bg-white/10 px-4 py-3 text-left text-lg font-bold"
        >
          <span className="truncate">{p.name}</span>
          <span className={`rounded-md ${tone} px-3 py-1 text-sm text-white`}>{label}</span>
        </button>
      ))}
    </div>
  );
}
