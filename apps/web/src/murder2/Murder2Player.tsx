import { useEffect, useState } from "react";
import { useMurder2 } from "./useMurder2";
import { playSfx } from "../audio/sfx";
import { loadPlayer2, m2Pick, m2Kill, m2Vote, m2Investigate, m2Protect, m2LastWords, type V2Announce, type V2Character, type V2Player } from "../net/murder2";
import { getBrand } from "../brand/theme";
import { AvatarNameForm, AvatarBadge } from "../net/avatars";

// location string → allocated scene-plate path (mirrors the allocation slug).
function locationPlate(location: string) {
  const s = location.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^the-/, "");
  return `/locations/loc-${s}.webp`;
}

// Player phone for Murder v2. Name → pick a character → play by role → vote.
export function Murder2Player({ room }: { room: string }) {
  const { state, you, announce, error, join, connected } = useMurder2(room, "player");
  const stored = loadPlayer2(room);
  const label = getBrand().games.murder?.label ?? "Murder Mystery";

  // A transient banner for server rejections (pick taken, cooldown, invalid move), shown over any view.
  const banner = error ? (
    <div className="fixed inset-x-0 top-0 z-50 bg-danger px-4 py-2 text-center text-sm font-semibold text-white">{error}</div>
  ) : null;

  const inner = (() => {
    if (!stored.name) {
      return <Screen><AvatarNameForm label={label} onJoin={join} error={error} /></Screen>;
    }
    if (!connected || !state || !you) return <Screen><div className="ff-title text-2xl text-ink/60">Connecting…</div></Screen>;
    if (state.phase === "lobby") return <Lobby state={state} you={you} />;
    if (state.phase === "ended") return <Ended state={state} you={you} />;
    if (state.phase === "voting") return <Voting state={state} you={you} />;
    if (you.role === "murderer") return <MurdererView state={state} you={you} />;
    if (you.role === "detective") return <DetectiveView state={state} you={you} />;
    if (you.role === "doctor") return <DoctorView state={state} you={you} />;
    return <VillagerView state={state} you={you} />;
  })();

  return <>{banner}<PhoneMoment announce={announce} />{inner}</>;
}

// The dramatic per-moment overlay on the player's phone — the same beats the display shows, so a
// player heads-down on their phone still feels (and hears) each kill, meeting, and the verdict.
// Sound plays here too: the phone's AudioContext is already unlocked by the join/pick taps.
function PhoneMoment({ announce }: { announce: { a: V2Announce; nonce: number } | null }) {
  const [show, setShow] = useState<{ text: string; sub?: string; art?: string; nonce: number } | null>(null);
  useEffect(() => {
    if (!announce) return;
    const a = announce.a;
    let text = "", sub: string | undefined, art: string | undefined;
    if (a.type === "killed") { text = `💀 ${a.victim} was murdered!`; sub = a.method ? `${a.method} — in the ${a.weapon}` : `in the ${a.weapon}`; art = "/events/event-kill.webp"; playSfx("kill"); }
    else if (a.type === "start") { text = "🔪 The village sleeps…"; playSfx("heartbeat"); }
    else if (a.type === "vote-open") { text = "🔔 Town meeting!"; sub = "Cast your vote"; art = "/events/event-vote-open.webp"; playSfx("toll"); }
    else if (a.type === "vote-wrong") { text = `❌ ${a.cleared} was innocent`; sub = "the murderer is still among you"; art = "/events/event-accuse-wrong.webp"; playSfx("buzzer"); }
    else if (a.type === "vote-none") { text = "🤷 No majority"; playSfx("swoosh"); }
    else if (a.type === "saved") { text = `🛡️ ${a.victim} survived!`; sub = "a healing hand intervened"; art = "/events/event-accuse-right.webp"; playSfx("reveal"); }
    else if (a.type === "vote-caught") { text = `⚖️ ${a.caught} caught!`; sub = `${a.remaining} still at large`; art = "/events/event-accuse-right.webp"; playSfx("gong"); }
    else if (a.type === "end") { text = a.winner === "town" ? "🎉 Town wins!" : "🔪 Murderer wins!"; sub = a.caught ? `${a.caught} did it` : undefined; art = a.winner === "town" ? "/events/event-accuse-right.webp" : "/events/event-kill.webp"; playSfx("gong"); }
    if (!text) return;
    setShow({ text, sub, art, nonce: announce.nonce });
    const id = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(id);
  }, [announce]);
  if (!show) return null;
  return (
    <div key={show.nonce} className="fixed inset-0 z-40 grid animate-pop place-items-center bg-canvas/80 p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-4 border-white bg-surface text-center">
        {show.art && <img src={show.art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <div className="relative px-6 py-10">
          <div className="ff-title text-4xl text-pink">{show.text}</div>
          {show.sub && <div className="mt-2 text-lg text-white/85">{show.sub}</div>}
        </div>
      </div>
    </div>
  );
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
  // Fellow murderers are hidden from the kill list (and rejected server-side) — no friendly fire.
  const allyIds = new Set((you.allies || []).map((a: any) => a.id));
  const targets: V2Player[] = state.players.filter((p: V2Player) => p.alive && p.id !== you.id && !allyIds.has(p.id));
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
      {you.allies?.length ? <p className="mt-1 text-sm text-pink/90">🔪 Your accomplices: {you.allies.map((a: any) => a.name + (a.alive ? "" : " ☠")).join(", ")} — you share the kill count.</p> : null}
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
            <div key={w.id} className={`rounded-lg border-2 ${open ? "border-pink" : isOwn ? "border-sun" : "border-white/20"} ${blocked ? "opacity-30" : ""}`}>
              {/* Stacked, not side-by-side: at 375px the "frames …" column either clipped or squeezed
                  the card. Everything but the card reads top-down in one narrow column. */}
              <button disabled={blocked} onClick={() => setPickedSet(open ? null : w.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left">
                <VillagerAvatar art={w.thumb} emoji={w.emoji} />
                <span className="min-w-0 flex-1">
                  <b>Item Set {w.setNumber} · {w.label}</b> {isOwn && <span className="text-sun">(yours)</span>}
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

function DetectiveView({ state, you }: { state: any; you: any }) {
  const me = state.players.find((p: V2Player) => p.id === you.id);
  const cd = useCooldown(you.investigateUntil || 0);
  const findings: any[] = you.findings || [];
  const checkedIds = new Set(findings.map((f) => f.suspectId));
  const suspects: V2Player[] = state.players.filter((p: V2Player) => p.id !== you.id && !checkedIds.has(p.id));
  return (
    <div className="h-full overflow-auto bg-[#12233a] p-4 text-white">
      <RoleBanner src="/roles/role-detective.webp" />
      <div className="ff-title text-3xl text-teal">YOU ARE THE DETECTIVE</div>
      <MyCard state={state} you={you} />
      {!me?.alive && <p className="mt-1 rounded-lg bg-white/10 px-3 py-2 text-sm">You were killed — your investigation ends here.</p>}
      <LastWords me={me} dark />

      {me?.alive && (
        <>
          <div className="mt-4 font-display text-lg">Investigate a villager (privately)</div>
          <p className="text-xs text-white/60">You learn if they're the murderer. Only you see the result — then convince the town.</p>
          {cd > 0 && <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm">Gathering evidence… <b>{cd}s</b> until you can investigate again.</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {suspects.filter((p) => p.alive).map((p) => (
              <button key={p.id} disabled={cd > 0} onClick={() => m2Investigate(p.id)}
                className="rounded-lg border-2 border-white/20 bg-white/5 px-2 py-2 text-left text-sm disabled:opacity-30">
                🔍 {p.name} <span className="text-white/50">· {charName(state, p.characterId)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 font-display text-lg">Your findings</div>
      {findings.length === 0 && <p className="text-sm text-white/50">Nothing yet. Investigate someone.</p>}
      {findings.map((f, i) => (
        <div key={i} className={`mt-1 rounded-lg px-3 py-2 text-sm ${f.isMurderer ? "bg-pink/30 font-bold" : "bg-white/10"}`}>
          {f.isMurderer ? "🔪" : "✓"} <b>{f.name}</b> ({f.profession}) — {f.isMurderer ? "IS THE MURDERER" : "is innocent"}
        </div>
      ))}
      <ClueFeed state={state} />
      <Roster state={state} />
    </div>
  );
}

function DoctorView({ state, you }: { state: any; you: any }) {
  const me = state.players.find((p: V2Player) => p.id === you.id);
  const cd = useCooldown(you.protectUntil || 0);
  const targets: V2Player[] = state.players.filter((p: V2Player) => p.alive && p.characterId);
  return (
    <div className="h-full overflow-auto bg-[#0f2a24] p-4 text-white">
      <RoleBanner src="/roles/role-doctor.webp" />
      <div className="ff-title text-3xl text-teal">YOU ARE THE DOCTOR</div>
      <MyCard state={state} you={you} />
      {!me?.alive ? (
        <>
          <p className="mt-1 rounded-lg bg-white/10 px-3 py-2 text-sm">You were killed — no one left to save.</p>
          <LastWords me={me} dark />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-white/70">Each round, shield one villager. If the murderer strikes them, they survive — and no one learns it was you.</p>
          {you.protectingName && <p className="mt-2 rounded-lg bg-teal/20 px-3 py-2 text-sm">🛡️ Currently protecting <b>{you.protectingName}</b>.</p>}
          {cd > 0 && <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm">Preparing… <b>{cd}s</b> until you can protect again.</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {targets.map((p) => (
              <button key={p.id} disabled={cd > 0} onClick={() => m2Protect(p.id)}
                className={`rounded-lg border-2 px-2 py-2 text-left text-sm disabled:opacity-30 ${you.protectingId === p.id ? "border-teal bg-teal/10" : "border-white/20 bg-white/5"}`}>
                🛡️ {p.name} <span className="text-white/50">· {charName(state, p.characterId)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <ClueFeed state={state} />
      <Roster state={state} />
    </div>
  );
}

// A killed player's one parting message — a true hint or a bluff. Shown once dead; locks after sending.
function LastWords({ me, dark }: { me: any; dark: boolean }) {
  const [text, setText] = useState("");
  if (!me || me.alive) return null;
  if (me.lastWords) {
    return <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${dark ? "bg-white/10" : "bg-ink/5"}`}>💬 Your last words: <i>{me.lastWords}</i></div>;
  }
  return (
    <div className={`mt-3 rounded-lg p-3 ${dark ? "bg-white/10" : "bg-ink/5"}`}>
      <div className="text-sm font-semibold">Leave your last words — a true hint, or a lie…</div>
      <input value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="e.g. I saw them near the Clinic…"
        className="mt-2 w-full rounded border-2 border-ink/20 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal" />
      <button disabled={!text.trim()} onClick={() => m2LastWords(text.trim())}
        className="ff-sticker mt-2 bg-pink px-4 py-2 text-sm text-white disabled:opacity-40">Speak</button>
    </div>
  );
}

// Small status icon from /icons/<name>.png; hides itself if missing.
function Icon({ name, className = "inline h-4 w-4 align-[-2px]" }: { name: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={`/icons/${name}.png`} alt="" onError={() => setOk(false)} className={className} />;
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
      {/* Living villagers get the villager reveal card; a killed one gets the "dead" card. */}
      <RoleBanner src={me?.alive ? "/roles/role-villager.webp" : "/roles/role-dead.webp"} />
      <div className="ff-title text-2xl text-ink">YOU ARE A VILLAGER</div>
      <MyCard state={state} you={you} />
      <p className="text-sm text-ink/60">{me?.alive ? "Watch the clues. Catch the murderer when the town meets." : "You were killed — spectate."}</p>
      <LastWords me={me} dark={false} />
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
                <button key={p.id} onClick={() => m2Vote(p.id)} className="rounded-lg border-2 border-ink/20 bg-surface px-2 py-3 text-sm font-semibold text-ink">
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
  const murderers = (state.murdererIds || []).map((id: string) => state.players.find((p: V2Player) => p.id === id)).filter(Boolean) as V2Player[];
  const me = state.players.find((p: V2Player) => p.id === you.id);
  const survived = you.role !== "murderer" && me?.alive;
  const won = (state.winner === "murderers") === (you.role === "murderer");
  return (
    <Screen>
      {survived && <RoleBanner src="/roles/role-survivor.webp" />}
      <div className="ff-title text-4xl text-pink"><Icon name="icon-winner" className="inline h-8 w-8 align-[-6px]" /> {state.winner === "town" ? "TOWN WINS" : "MURDERER WINS"}</div>
      <p className="mt-2 text-lg text-ink">{murderers.length > 1 ? "The murderers were" : "The murderer was"} <b>{murderers.map((mp) => mp.name).join(", ")}</b>.</p>
      {state.detectiveId && <p className="text-sm text-ink/70">🔍 The detective was <b>{state.players.find((p: V2Player) => p.id === state.detectiveId)?.name}</b>.</p>}
      {state.doctorId && <p className="text-sm text-ink/70">🛡️ The doctor was <b>{state.players.find((p: V2Player) => p.id === state.doctorId)?.name}</b>.</p>}
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

// Small crime-scene thumbnail for a clue on the phone. Hides itself if the plate 404s.
function CluePlate({ location }: { location: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={locationPlate(location)} alt={location} onError={() => setOk(false)} className="h-14 w-12 shrink-0 rounded object-cover" />;
}

function ClueFeed({ state }: { state: any }) {
  if (!state.clues.length) return <p className="mt-3 text-sm text-ink/50">No clues yet.</p>;
  return (
    <div className="mt-3">
      <div className="font-display text-lg text-ink">Clues</div>
      {state.clues.map((c: any, i: number) => (
        <div key={i} className="mt-1 flex items-center gap-2 rounded-lg bg-surface px-2 py-2 text-sm">
          {/* The crime-scene plate — so players see the place, not just read it. Hides if art is missing. */}
          <CluePlate location={c.weapon.location} />
          <div>
            <b>Item Set {c.weapon.setNumber} · {c.weapon.location}</b>
            {c.method && <span className="text-ink/60"> — {c.method}</span>}
            <div>{c.weapon.emoji} → points to <b>{charName(state, c.framedCharacterId)}</b></div>
          </div>
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
          <div key={p.id} className={`rounded px-2 py-1 ${p.alive ? "bg-surface" : "bg-ink/10 line-through opacity-60"}`}>
            {!p.alive && <Icon name="icon-dead" />} {charEmoji(state, p.characterId)} <AvatarBadge avatar={p.avatar} name={p.name} size={20} /> {p.name} · <span className="text-ink/60">{charName(state, p.characterId)}</span>{p.cleared && " ✓"}
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
