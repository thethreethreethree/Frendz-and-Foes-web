import { useEffect, useState } from "react";
import { useMurder2 } from "./useMurder2";
import { loadPlayer2, m2Pick, m2Kill, m2Vote, type V2Character, type V2Player } from "../net/murder2";

// Player phone for Murder v2. Name → pick a character → play by role → vote.
export function Murder2Player({ room }: { room: string }) {
  const { state, you, error, join, connected } = useMurder2(room, "player");
  const [name, setName] = useState("");
  const stored = loadPlayer2(room);

  // A transient banner for server rejections (pick taken, cooldown, invalid move), shown over any view.
  const banner = error ? (
    <div className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">{error}</div>
  ) : null;

  const inner = (() => {
    if (!stored.name) {
      return (
        <Screen>
          <div className="ff-title text-3xl text-pink">JOIN THE VILLAGE</div>
          <input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus
            className="mt-4 w-56 rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-center text-xl text-ink outline-none focus:border-teal" />
          <button disabled={!name.trim()} onClick={() => join(name.trim())}
            className="ff-sticker mt-3 bg-pink px-8 py-3 font-display text-2xl text-white disabled:opacity-40">JOIN</button>
        </Screen>
      );
    }
    if (!connected || !state || !you) return <Screen><div className="ff-title text-2xl text-ink/60">Connecting…</div></Screen>;
    if (state.phase === "lobby") return <Lobby state={state} you={you} />;
    if (state.phase === "ended") return <Ended state={state} you={you} />;
    if (state.phase === "voting") return <Voting state={state} you={you} />;
    return you.role === "murderer" ? <MurdererView state={state} you={you} /> : <VillagerView state={state} you={you} />;
  })();

  return <>{banner}{inner}</>;
}

function Lobby({ state, you }: { state: ReturnType<typeof useMurder2>["state"] & object; you: any }) {
  const taken = new Set(state!.players.map((p: V2Player) => p.characterId).filter(Boolean));
  const mine = you.characterId;
  return (
    <div className="h-full overflow-auto bg-cream p-4">
      <div className="ff-title mb-1 text-center text-2xl text-ink">PICK YOUR CHARACTER</div>
      <p className="mb-3 text-center text-sm text-ink/60">{mine ? "Tap another to change." : "Tap to choose who you are."}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {state!.characters.map((c: V2Character) => {
          const isMine = c.id === mine;
          const isTaken = taken.has(c.id) && !isMine;
          return (
            <button key={c.id} disabled={isTaken} onClick={() => m2Pick(c.id)}
              className={`overflow-hidden rounded-xl border-2 transition ${isMine ? "border-teal ring-2 ring-teal" : isTaken ? "border-ink/10 opacity-40 grayscale" : "border-ink/15"}`}>
              {/* The card art already carries name, profession and blurb — show it whole rather than
                  cropping it into an avatar. Text is repeated only in the emoji fallback. */}
              <VillagerCard src={c.thumb} name={c.name} profession={c.profession} emoji={c.weapon.emoji} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MurdererView({ state, you }: { state: any; you: any }) {
  const [victim, setVictim] = useState<string | null>(null);
  const [pickedSet, setPickedSet] = useState<string | null>(null);
  const cd = useCooldown(state.cooldownUntil);
  const targets: V2Player[] = state.players.filter((p: V2Player) => p.alive && p.id !== you.id);
  const weapons = you.weapons || [];
  return (
    <div className="h-full overflow-auto bg-[#2a0e12] p-4 text-white">
      <RoleBanner src="/roles/role-murderer.webp" />
      <div className="ff-title text-3xl text-pink">YOU ARE THE MURDERER</div>
      {/* F-1: the player's own character card, full-resolution. This is the one-at-a-time surface, so
          it uses `art` (52KB) rather than `thumb` — grids stay on thumb for payload. */}
      <MyCard state={state} you={you} />
      <p className="mt-1 text-sm text-white/70">
        Your item set: <b>{you.ownWeapon?.emoji} {you.ownWeapon?.label}</b> · Kills left: <b>{you.killsRemaining}</b>
      </p>
      {cd > 0 && <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm">Cooling down… <b>{cd}s</b> until you can kill.</p>}
      {you.mustUseOwnNow && <p className="mt-2 rounded-lg bg-pink/30 px-3 py-2 text-sm">Final kill — you must use your OWN item set.</p>}

      <div className="mt-4 font-display text-lg">1. Pick your victim (wink them in real life first)</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {targets.map((p) => (
          <button key={p.id} onClick={() => setVictim(p.id)}
            className={`rounded-lg border-2 px-2 py-2 text-left text-sm ${victim === p.id ? "border-pink bg-pink/20" : "border-white/20"}`}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-4 font-display text-lg">2. Choose the item set (the clue that frames someone)</div>
      <div className="mt-2 space-y-2">
        {weapons.map((w: any) => {
          const isOwn = w.id === you.ownWeaponId;
          const blocked = w.remaining <= 0 || cd > 0 || !victim || (you.mustUseOwnNow && !isOwn);
          const open = pickedSet === w.id;
          return (
            <div key={w.id} className={`rounded-lg border-2 ${open ? "border-pink" : isOwn ? "border-amber-400" : "border-white/20"} ${blocked ? "opacity-30" : ""}`}>
              {/* Stacked, not side-by-side: at 375px the "frames …" column either clipped or squeezed
                  the card. Everything but the card reads top-down in one narrow column. */}
              <button disabled={blocked} onClick={() => setPickedSet(open ? null : w.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left">
                <VillagerAvatar art={w.thumb} emoji={w.emoji} />
                <span className="min-w-0 flex-1">
                  <b>Item Set {w.setNumber} · {w.label}</b> {isOwn && <span className="text-amber-300">(yours)</span>}
                  <span className="block text-xs text-white/50">{w.methods?.join(" · ")}</span>
                  <span className="mt-0.5 block text-xs text-white/60">frames {w.framesName} · {w.remaining} left</span>
                </span>
              </button>
              {/* Step 3 — how it was staged. The set already decided WHO is framed; this decides the
                  story the town hears. Only rendered for the open set to keep the list scannable. */}
              {open && !blocked && (
                <div className="border-t border-white/15 px-3 py-2">
                  <div className="mb-1 text-xs text-white/60">3. How did they do it?</div>
                  <div className="space-y-1">
                    {(w.methods || []).map((mth: string, i: number) => (
                      <button key={i} onClick={() => { m2Kill(victim!, w.id, i); setVictim(null); setPickedSet(null); }}
                        className="w-full rounded border border-white/20 px-2 py-1.5 text-left text-sm hover:bg-white/10">
                        {mth}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Full-width role reveal illustration at the top of a player's screen. Hides itself if the art 404s.
function RoleBanner({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt="" onError={() => setOk(false)} className="mb-3 max-h-52 w-full rounded-xl object-cover" />;
}

function VillagerView({ state, you }: { state: any; you: any }) {
  const me = state.players.find((p: V2Player) => p.id === you.id);
  return (
    <div className="h-full overflow-auto bg-cream p-4">
      {/* No villager-specific role card was drawn (the art set covers murderer/dead/accused/survivor);
          a killed villager gets the "dead" card, the living see their own character card. */}
      {!me?.alive && <RoleBanner src="/roles/role-dead.webp" />}
      <div className="ff-title text-2xl text-ink">YOU ARE A VILLAGER</div>
      <MyCard state={state} you={you} />
      <p className="text-sm text-ink/60">{me?.alive ? "Watch the clues. Catch the murderer when the town meets." : "You were killed — spectate."}</p>
      <ClueFeed state={state} />
      <Roster state={state} />
    </div>
  );
}

function Voting({ state, you }: { state: any; you: any }) {
  const me = state.players.find((p: V2Player) => p.id === you.id);
  const voted = state.vote?.votedBy?.includes(you.id);
  const suspects: V2Player[] = state.players.filter((p: V2Player) => p.alive && !p.cleared);
  return (
    <div className="h-full overflow-auto bg-cream p-4">
      <div className="ff-title text-2xl text-pink">TOWN MEETING — VOTE</div>
      {!me?.alive ? <p className="text-sm text-ink/60">The dead don't vote.</p>
        : voted ? <p className="mt-2 rounded-lg bg-teal/10 px-3 py-2 text-sm">Vote cast. Waiting for the town…</p>
        : <>
            <p className="mb-2 text-sm text-ink/60">Who is the murderer? A wrong majority clears the suspect.</p>
            <div className="grid grid-cols-2 gap-2">
              {suspects.map((p) => (
                <button key={p.id} onClick={() => m2Vote(p.id)} className="rounded-lg border-2 border-ink/20 bg-white px-2 py-3 text-sm font-semibold text-ink">
                  {p.name}
                </button>
              ))}
            </div>
          </>}
      <Roster state={state} />
    </div>
  );
}

function Ended({ state, you }: { state: any; you: any }) {
  const murderer = state.players.find((p: V2Player) => p.id === state.murdererId);
  const won = (state.winner === "murderers") === (you.role === "murderer");
  return (
    <Screen>
      <div className="ff-title text-4xl text-pink">{state.winner === "town" ? "TOWN WINS" : "MURDERER WINS"}</div>
      <p className="mt-2 text-lg text-ink">The murderer was <b>{murderer?.name}</b> ({charName(state, murderer?.characterId)}).</p>
      <p className={`mt-3 font-display text-2xl ${won ? "text-teal" : "text-ink/50"}`}>{won ? "You won!" : "You lost."}</p>
    </Screen>
  );
}

// ---- shared bits ----

// The player's own character card at full resolution — the reader that `V2Character.art` lacked
// (audit F-1: 5.7MB of cards existed on disk and no surface rendered them; A31 — invisible ⇒ does
// not exist). Also renders `setNumber`, which resolves F-4 by giving that field a reader rather than
// deleting it. One card, one player, one screen: `art` here is 52KB and grids stay on `thumb`.
function MyCard({ state, you }: { state: any; you: any }) {
  const me = state.players.find((p: V2Player) => p.id === you.id);
  const c: V2Character | undefined = state.characters.find((x: V2Character) => x.id === me?.characterId);
  const [ok, setOk] = useState(true);
  if (!c) return null;
  return (
    <div className="mt-3 flex items-center gap-3">
      {ok ? (
        <img src={c.art} alt={`${c.name} — ${c.profession}`} onError={() => setOk(false)}
          className="h-40 w-auto shrink-0 rounded-lg" />
      ) : (
        <div className="grid h-40 w-[142px] shrink-0 place-items-center rounded-lg bg-cream text-4xl">{c.weapon.emoji}</div>
      )}
      <div className="min-w-0">
        <div className="font-display text-xl leading-tight">{c.name}</div>
        <div className="text-sm opacity-70">{c.profession}</div>
        <div className="mt-1 text-xs opacity-60">Item Set {c.setNumber} · {c.weapon.location}</div>
      </div>
    </div>
  );
}

function ClueFeed({ state }: { state: any }) {
  if (!state.clues.length) return <p className="mt-3 text-sm text-ink/50">No clues yet.</p>;
  return (
    <div className="mt-3">
      <div className="font-display text-lg text-ink">Clues</div>
      {state.clues.map((c: any, i: number) => (
        <div key={i} className="mt-1 rounded-lg bg-white px-3 py-2 text-sm">
          {c.weapon.emoji} <b>Item Set {c.weapon.setNumber} · {c.weapon.location}</b>
          {c.method && <span className="text-ink/60"> — {c.method}</span>}
          {" → "}points to <b>{charName(state, c.framedCharacterId)}</b>
        </div>
      ))}
    </div>
  );
}
function Roster({ state }: { state: any }) {
  return (
    <div className="mt-4">
      <div className="font-display text-lg text-ink">Villagers</div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
        {state.players.filter((p: V2Player) => p.characterId).map((p: V2Player) => (
          <div key={p.id} className={`rounded px-2 py-1 ${p.alive ? "bg-white" : "bg-ink/10 line-through opacity-60"}`}>
            {charEmoji(state, p.characterId)} {p.name} · <span className="text-ink/60">{charName(state, p.characterId)}</span>{p.cleared && " ✓"}
          </div>
        ))}
      </div>
    </div>
  );
}
function charName(state: any, characterId: string | null | undefined) {
  const c = state.characters.find((x: V2Character) => x.id === characterId);
  return c ? c.profession : "?";
}
function charEmoji(state: any, characterId: string | null | undefined) {
  const c = state.characters.find((x: V2Character) => x.id === characterId);
  return c ? c.weapon.emoji : "";
}
// A whole character card at its native 577:650 ratio — never cropped, since the art carries the
// name and profession itself. `loading="lazy"` matters: the picker mounts 100 of these at once.
// Falls back to emoji + text if the image 404s.
function VillagerCard({ src, name, profession, emoji }: { src: string; name: string; profession: string; emoji: string }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return <img src={src} alt={`${name} — ${profession}`} loading="lazy" onError={() => setOk(false)}
      className="block aspect-[577/650] w-full bg-cream object-cover" />;
  }
  return (
    <div className="grid aspect-[577/650] w-full place-items-center bg-cream p-1 text-center">
      <div>
        <div className="text-3xl">{emoji}</div>
        <div className="font-display text-sm leading-tight text-ink">{name}</div>
        <div className="text-[10px] text-ink/60">{profession}</div>
      </div>
    </div>
  );
}
// Inline item-set card for the weapon rows. h-24 (96px) is the measured floor at which the card's
// "ITEM SET n", its three weapons and its location label are all legible on a phone — at h-12 the
// text is an unreadable smudge (verified by screenshot, 2026-07-17). Native ratio, never cropped.
function VillagerAvatar({ art, emoji }: { art: string; emoji: string }) {
  const [ok, setOk] = useState(true);
  if (ok) return <img src={art} alt="" loading="lazy" onError={() => setOk(false)} className="h-24 w-auto shrink-0 rounded object-contain" />;
  return <span className="grid h-24 w-[85px] shrink-0 place-items-center rounded bg-cream text-3xl">{emoji}</span>;
}
function useCooldown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return Math.max(0, Math.ceil((until - now) / 1000));
}
function Screen({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full place-items-center p-6"><div className="flex flex-col items-center text-center">{children}</div></div>;
}
