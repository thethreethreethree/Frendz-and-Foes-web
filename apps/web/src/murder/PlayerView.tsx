import { useEffect, useState } from "react";
import { useMurder } from "./useMurder";
import { loadPlayer, type Villager } from "../net/murder";
import { Logo } from "../display/Logo";

// The player's phone: pick a villager → get a secret role → deduce (or murder). Everything the
// murderer needs to frame someone lives here; everything the village needs to deduce (roster +
// clues) is public.
export function PlayerView({ room }: { room: string }) {
  const g = useMurder(room, "player");
  const [name, setName] = useState(loadPlayer(room).name ?? "");
  const [now, setNow] = useState(Date.now());
  const [target, setTarget] = useState<string | null>(null);
  const [weapon, setWeapon] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const st = g.state;
  const you = g.you;

  // --- Join ---
  if (!you) {
    return (
      <Shell tone="bg-cream text-ink">
        <Logo className="text-4xl" />
        <p className="mt-2 font-display text-2xl text-ink/70">MURDER MYSTERY</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={16}
          className="mt-6 w-full max-w-xs rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-center text-lg outline-none focus:border-teal"
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

  // --- Pick your villager ---
  if (!you.characterId && (!st || st.phase === "lobby")) {
    const taken = new Set((st?.players ?? []).map((p) => p.characterId).filter(Boolean) as string[]);
    return (
      <div className="h-full overflow-y-auto bg-cream px-4 py-6 text-ink">
        <div className="text-center ff-title text-3xl text-pink">CHOOSE YOUR VILLAGER</div>
        <p className="mt-1 text-center text-xs font-bold text-ink/50">
          Everyone can see who you are — and your signature weapon.
        </p>
        {g.error && <Toast msg={g.error} />}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {g.characters.map((c) => (
            <button
              key={c.id}
              disabled={taken.has(c.id)}
              onClick={() => g.pick(c.id)}
              className="ff-sticker flex flex-col items-start bg-white p-3 text-left disabled:opacity-30"
              style={{ borderColor: c.color }}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-display text-xl">{c.name}</span>
                <span className="text-xl">{c.emoji}</span>
              </div>
              <span className="text-[11px] font-black uppercase text-ink/50">{c.job}</span>
              <span className="mt-1 text-[11px] font-bold text-ink/70">{c.weapon}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const me = g.byId.get(you.characterId ?? "");

  // --- Ended ---
  if (st?.phase === "ended") {
    const iWon = st.winner === "murderer" ? you.role === "murderer" : you.role !== "murderer";
    const killer = st.players.find((p) => p.role === "murderer");
    return (
      <Shell tone={iWon ? "bg-buzz-green text-white" : "bg-ink text-white"}>
        <div className="ff-title text-5xl">
          {st.winner === "murderer" ? "MURDERER WINS" : "VILLAGE WINS"}
        </div>
        <div className="mt-4 text-lg font-bold">
          The murderer was {killer?.name} ({g.byId.get(killer?.characterId ?? "")?.job})
        </div>
        <div className="mt-2 text-2xl">{iWon ? "🎉 You won!" : "☠️ You lost"}</div>
      </Shell>
    );
  }

  // --- Lobby (character chosen) ---
  if (!st || st.phase === "lobby") {
    return (
      <Shell tone="bg-cream text-ink">
        <div className="text-5xl">{me?.emoji}</div>
        <div className="ff-title mt-1 text-4xl text-teal">{me?.name}</div>
        <div className="text-sm font-black uppercase text-ink/50">{me?.job}</div>
        <div className="mt-2 text-sm font-bold">Your weapon: {me?.weapon}</div>
        <p className="mt-6 text-lg font-bold">Waiting for the host to start…</p>
        <p className="mt-1 text-sm font-bold text-ink/50">{st?.players.length ?? 1} villagers</p>
      </Shell>
    );
  }

  // --- Playing ---
  const isMurderer = you.role === "murderer";
  const cooldown = Math.max(0, Math.ceil(((you.cooldownUntil ?? 0) - now) / 1000));
  const alivePlayers = st.players.filter((p) => p.alive);
  const canAct = you.alive;
  const voteOpen = !!st.vote;
  const iVoted = st.vote?.voted.includes(you.id);

  return (
    <div className={`h-full overflow-y-auto px-4 py-4 ${isMurderer ? "bg-ink text-white" : "bg-cream text-ink"}`}>
      {g.error && <Toast msg={g.error} />}

      {/* Who you are */}
      <div className={`ff-sticker flex items-center gap-3 p-3 ${isMurderer ? "bg-pink text-white" : "bg-white text-ink"}`}>
        <span className="text-3xl">{me?.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl leading-none">{me?.name}</div>
          <div className="text-[11px] font-black uppercase opacity-70">
            {me?.job} · {me?.weapon}
          </div>
        </div>
        <div className="ff-title text-xl">{isMurderer ? "🔪 MURDERER" : "🙂 VILLAGER"}</div>
      </div>

      {!you.alive && (
        <div className="ff-sticker mt-3 bg-ink/90 p-3 text-center font-display text-2xl text-white">
          💀 YOU'RE DEAD — spectate
        </div>
      )}

      {/* Active trial */}
      {voteOpen && (
        <div className="ff-sticker mt-3 bg-sun p-3 text-ink">
          <div className="font-display text-xl">⚖️ TRIAL: {st.vote!.suspectName}</div>
          <div className="text-[11px] font-bold opacity-70">
            accused by {st.vote!.byName} · {Math.max(0, Math.ceil((st.vote!.endsAt - now) / 1000))}s ·{" "}
            {st.vote!.yes} guilty / {st.vote!.no} innocent
          </div>
          {canAct && !iVoted && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => g.vote(true)} className="flex-1 rounded-lg bg-ink py-2 font-bold text-white">
                Guilty
              </button>
              <button onClick={() => g.vote(false)} className="flex-1 rounded-lg bg-white py-2 font-bold text-ink">
                Innocent
              </button>
            </div>
          )}
          {iVoted && <div className="mt-1 text-xs font-bold">Vote cast.</div>}
        </div>
      )}

      {/* Murderer kill panel */}
      {isMurderer && you.alive && (
        <div className="ff-sticker mt-3 bg-white/10 p-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-xl text-pink">PLAN A MURDER</span>
            <span className="text-[11px] font-bold opacity-70">
              {you.kills}/{you.killsToWin} kills · {you.framesLeft} frames left
            </span>
          </div>

          {cooldown > 0 ? (
            <div className="mt-2 rounded-lg bg-white/10 p-3 text-center font-bold">
              Cooling down… {cooldown}s
            </div>
          ) : (
            <>
              <div className="mt-2 text-[11px] font-black uppercase opacity-60">1. Wink at them, then pick your victim</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {alivePlayers
                  .filter((p) => p.id !== you.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTarget(p.id)}
                      className={`rounded-lg border-2 px-2 py-1 text-sm font-bold ${
                        target === p.id ? "border-pink bg-pink text-white" : "border-white/30"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>

              <div className="mt-3 text-[11px] font-black uppercase opacity-60">
                2. Pick a weapon — it will frame its owner
              </div>
              <div className="mt-1 space-y-1">
                {(you.allowedWeapons ?? []).map((w) => {
                  const owner = g.weaponById.get(w);
                  const isOwn = w === you.ownWeaponId;
                  const uses = you.weaponUses?.[w] ?? 0;
                  return (
                    <button
                      key={w}
                      onClick={() => setWeapon(w)}
                      className={`flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm ${
                        weapon === w ? "border-pink bg-pink/30" : "border-white/20"
                      }`}
                    >
                      <span className="font-bold">
                        {owner?.emoji} {owner?.weapon}
                      </span>
                      <span className="text-[10px] font-black uppercase opacity-70">
                        {isOwn ? "⚠️ YOURS" : `frames ${owner?.job}`} · {uses}/2
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!target || !weapon}
                onClick={() => {
                  g.kill(target!, weapon!);
                  setTarget(null);
                  setWeapon(null);
                }}
                className="ff-sticker mt-3 w-full bg-pink py-3 font-display text-2xl text-white disabled:opacity-40"
              >
                🔪 COMMIT MURDER
              </button>
            </>
          )}
        </div>
      )}

      {/* Clues */}
      <div className="ff-sticker mt-3 bg-white p-3 text-ink">
        <div className="font-display text-xl">🔎 CLUES ({st.feed.length})</div>
        {st.feed.length === 0 ? (
          <div className="text-xs font-bold text-ink/40">No bodies yet…</div>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {st.feed.map((c, i) => (
              <li key={i} className="font-bold">
                💀 {c.victimName} — found with the{" "}
                <span className="text-pink">{c.weaponName}</span>{" "}
                <span className="text-xs font-black uppercase text-ink/50">({c.framedJob}'s)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Roster + accuse */}
      <div className="ff-sticker mt-3 bg-white p-3 text-ink">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl">THE VILLAGERS</span>
          <span className="text-[11px] font-black uppercase text-ink/50">⚖️ {st.trialsLeft} trials left</span>
        </div>
        <ul className="mt-1 space-y-1">
          {st.players.map((p) => {
            const c = g.byId.get(p.characterId ?? "");
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span>{c?.emoji}</span>
                <span className={`flex-1 truncate font-bold ${p.alive ? "" : "text-ink/40 line-through"}`}>
                  {p.name} <span className="text-[10px] font-black uppercase text-ink/40">{c?.job}</span>
                </span>
                <span className="text-[10px] font-bold text-ink/40">{c?.weapon}</span>
                {p.cleared && <span className="text-[10px] font-black text-buzz-green">CLEARED</span>}
                {canAct && !voteOpen && st.trialsLeft > 0 && p.alive && !p.cleared && p.id !== you.id && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Accuse ${p.name}? This spends a trial.`)) g.nominate(p.id);
                    }}
                    className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold text-white"
                  >
                    Accuse
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Shell({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center px-6 text-center ${tone}`}>
      {children}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-lg bg-tang px-3 py-2 text-sm font-bold text-white shadow-pop">
      {msg}
    </div>
  );
}
