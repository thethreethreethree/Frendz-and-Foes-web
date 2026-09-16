import { useState } from "react";
import { useMurder2 } from "./useMurder2";
import { Section } from "../control/ui";
import { RemoteShell } from "../control/shell";
import { m2Config, m2Start, m2OpenVote, m2CloseVote, m2Reset, type V2Player, type V2State } from "../net/murder2";

// Host controller (phone) for Murder v2 — configure + start, run town meetings, reset.
export function Murder2Host({ room }: { room: string }) {
  const { state, error } = useMurder2(room, "host");
  if (!state) return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
  const picked = state.players.filter((p) => p.characterId).length;
  const canStart = picked >= 3;

  // Docked, so the thing the host is waiting to press is under their thumb rather than stranded
  // halfway up a screen that was ~60% empty.
  const action =
    state.phase === "lobby" ? (
      <button
        disabled={!canStart}
        onClick={m2Start}
        className="ff-sticker w-full bg-primary px-4 py-4 font-display text-xl text-primary-ink disabled:opacity-35"
      >
        {canStart ? "START GAME" : "Need 3+ players with characters"}
      </button>
    ) : state.phase === "playing" ? (
      <button onClick={m2OpenVote} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">OPEN TOWN MEETING</button>
    ) : state.phase === "voting" ? (
      <button onClick={m2CloseVote} className="ff-sticker w-full bg-secondary px-4 py-3 font-display text-xl text-canvas">CLOSE VOTE &amp; RESOLVE</button>
    ) : state.phase === "ended" ? (
      <div className="space-y-2">
        <button onClick={() => m2Reset(false)} className="ff-sticker w-full bg-secondary px-4 py-3 font-display text-lg text-canvas">NEXT ROUND (keep players + scores)</button>
        <button onClick={() => m2Reset(true)} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">End tournament — full reset</button>
      </div>
    ) : undefined;

  return (
    // Murder was the only one of the fourteen with NO card structure at all: labels and raw
    // controls sitting bare on the page background, an empty "Players" heading, and two sliders
    // rendering in Chrome's default blue because their className carried no accent. Everything
    // below now lives in the same Section the rest of the product uses.
    <RemoteShell
      title="The Villagers"
      badge={
        state.round ? (
          <span className="shrink-0 rounded-lg bg-surface px-2 py-1 font-display text-xs leading-none text-muted">
            Round {state.round}
          </span>
        ) : undefined
      }
      room={room}
      action={action}
    >
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      {state.phase === "lobby" && <Config state={state} canStart={canStart} />}

      {state.phase === "playing" && (
        <Section title="Round in progress">
          <p className="text-sm text-muted">
            Kills {state.killCount}/{state.killTarget}. Let the room discuss, then call a meeting.
          </p>
        </Section>
      )}

      {state.phase === "voting" && (
        <Section title="Town meeting">
          <p className="mb-2 text-sm text-muted">Voting open. Close it when the room has voted (or all living players vote).</p>
          <VoteList state={state} />
        </Section>
      )}

      {state.phase === "ended" && (
        <Section title={state.winner === "town" ? "Town won!" : "Murderer won!"}>
          <Standings state={state} />
        </Section>
      )}

      <PlayerList state={state} picked={picked} />
    </RemoteShell>
  );
}

// Mirrors the server's auto-scaling so the host knows the game's role make-up before starting.
function roleComposition(picked: number) {
  const murderers = picked >= 14 ? 3 : picked >= 8 ? 2 : 1;
  const detective = picked >= 4 ? 1 : 0;
  const doctor = picked >= 6 ? 1 : 0;
  const villagers = Math.max(0, picked - murderers - detective - doctor);
  const parts = [`${murderers} murderer${murderers > 1 ? "s" : ""}`];
  if (detective) parts.push("a detective");
  if (doctor) parts.push("a doctor");
  parts.push(`${villagers} villager${villagers === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function Config({ state, canStart }: { state: V2State; canStart: boolean }) {
  const [kills, setKills] = useState(state.killTarget);
  const [cooldown, setCooldown] = useState(state.cooldownSec);
  const picked = state.players.filter((p) => p.characterId).length;
  const apply = () => m2Config({ killTarget: kills, cooldownSec: cooldown });
  return (
    <Section title="Setup">
      {canStart && <p className="mb-3 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-muted">This game: <b className="text-ink">{roleComposition(picked)}</b>.</p>}
      <label className="block text-sm font-semibold text-ink/70">Kills to win: {kills}
        <input type="range" min={2} max={8} value={kills} onChange={(e) => setKills(+e.target.value)} onMouseUp={apply} onTouchEnd={apply} className="mt-1 w-full accent-primary" />
      </label>
      <label className="block text-sm font-semibold text-ink/70">Kill cooldown: {cooldown}s
        <input type="range" min={20} max={180} step={5} value={cooldown} onChange={(e) => setCooldown(+e.target.value)} onMouseUp={apply} onTouchEnd={apply} className="mt-1 w-full accent-primary" />
      </label>
    </Section>
  );
}

// Running tournament standings for the host, so they can see who's ahead before starting the next round.
function Standings({ state }: { state: V2State }) {
  const scores = state.scores || {};
  const rows = state.players.filter((p) => p.characterId).map((p) => ({ name: p.name, pts: scores[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
  if (!rows.length) return null;
  const top = rows[0]?.pts ?? 0;
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-sm">
      <div className="font-semibold text-ink/70">Standings after {state.round} round{state.round === 1 ? "" : "s"}</div>
      {rows.map((r, i) => (
        <div key={i} className={`flex justify-between ${r.pts === top && top > 0 ? "font-bold" : ""}`}>
          <span>{i + 1}. {r.name}{r.pts === top && top > 0 ? " 👑" : ""}</span><span>{r.pts}</span>
        </div>
      ))}
    </div>
  );
}

function VoteList({ state }: { state: V2State }) {
  const tally = state.vote?.tally || {};
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(tally).map(([id, n]) => (
        <span key={id} className="rounded bg-surface px-2 py-1 text-sm">{name(state, id)}: <b>{n}</b></span>
      ))}
      {Object.keys(tally).length === 0 && <span className="text-sm text-ink/50">no votes yet</span>}
    </div>
  );
}

function PlayerList({ state, picked }: { state: V2State; picked: number }) {
  return (
    <Section title={`Players — ${picked} of ${state.players.length} have picked a character`}>
      {/* This heading sat over nothing at all before a single player joined — a title, then void,
          on the one remote whose controller exposes no action until people arrive. The host had no
          way to tell "waiting" from "broken". */}
      {state.players.length === 0 && (
        <p className="mt-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted">
          Nobody has joined yet. Players scan the QR on the display, then pick a character.
        </p>
      )}
      <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
        {state.players.map((p: V2Player) => (
          <div key={p.id} className={`rounded px-2 py-1 ${p.alive ? "bg-surface" : "bg-ink/10 line-through opacity-60"}`}>
            {p.name}{p.characterId ? ` · ${prof(state, p.characterId)}` : " · (choosing…)"}
          </div>
        ))}
      </div>
    </Section>
  );
}

const name = (s: V2State, id: string) => s.players.find((p) => p.id === id)?.name || "?";
const prof = (s: V2State, id: string | null) => s.characters.find((c) => c.id === id)?.profession || "?";
