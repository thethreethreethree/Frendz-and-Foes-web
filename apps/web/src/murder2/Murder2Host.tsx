import { useState } from "react";
import { useMurder2 } from "./useMurder2";
import { m2Config, m2Start, m2OpenVote, m2CloseVote, m2Reset, type V2Player, type V2State } from "../net/murder2";

// Host controller (phone) for Murder v2 — configure + start, run town meetings, reset.
export function Murder2Host({ room }: { room: string }) {
  const { state, error } = useMurder2(room, "host");
  if (!state) return <Wrap><p className="text-ink/60">Connecting…</p></Wrap>;
  const picked = state.players.filter((p) => p.characterId).length;

  return (
    <Wrap>
      {error && <div className="mb-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="ff-title text-2xl text-ink">HOST — The Villagers</div>
      <p className="text-sm text-ink/60">{picked} of {state.players.length} joined players have picked a character.</p>

      {state.phase === "lobby" && <Config state={state} canStart={picked >= 3} />}

      {state.phase === "playing" && (
        <div className="mt-4 space-y-2">
          <p className="rounded-lg bg-cream px-3 py-2 text-sm">Kills {state.killCount}/{state.killTarget}. Let the room discuss, then call a meeting.</p>
          <button onClick={m2OpenVote} className="ff-sticker w-full bg-pink px-4 py-3 font-display text-xl text-white">OPEN TOWN MEETING</button>
        </div>
      )}

      {state.phase === "voting" && (
        <div className="mt-4 space-y-2">
          <p className="rounded-lg bg-cream px-3 py-2 text-sm">Voting open. Close it when the room has voted (or all living players vote).</p>
          <VoteList state={state} />
          <button onClick={m2CloseVote} className="ff-sticker w-full bg-teal px-4 py-3 font-display text-xl text-white">CLOSE VOTE & RESOLVE</button>
        </div>
      )}

      {state.phase === "ended" && (
        <div className="mt-4 space-y-2">
          <p className="rounded-lg bg-pink/10 px-3 py-2 font-display text-lg">{state.winner === "town" ? "Town won!" : "Murderer won!"}</p>
          <button onClick={() => m2Reset(false)} className="ff-sticker w-full bg-teal px-4 py-2 font-display text-lg text-white">PLAY AGAIN (keep players)</button>
          <button onClick={() => m2Reset(true)} className="rounded-lg border border-ink/20 px-4 py-2 text-sm">Full reset (drop players)</button>
        </div>
      )}

      <PlayerList state={state} />
    </Wrap>
  );
}

function Config({ state, canStart }: { state: V2State; canStart: boolean }) {
  const [kills, setKills] = useState(state.killTarget);
  const [cooldown, setCooldown] = useState(state.cooldownSec);
  const apply = () => m2Config({ killTarget: kills, cooldownSec: cooldown });
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-semibold text-ink/70">Kills to win: {kills}
        <input type="range" min={2} max={8} value={kills} onChange={(e) => setKills(+e.target.value)} onMouseUp={apply} onTouchEnd={apply} className="w-full" />
      </label>
      <label className="block text-sm font-semibold text-ink/70">Kill cooldown: {cooldown}s
        <input type="range" min={20} max={180} step={5} value={cooldown} onChange={(e) => setCooldown(+e.target.value)} onMouseUp={apply} onTouchEnd={apply} className="w-full" />
      </label>
      <button disabled={!canStart} onClick={m2Start} className="ff-sticker w-full bg-pink px-4 py-3 font-display text-xl text-white disabled:opacity-40">
        {canStart ? "START GAME" : "Need 3+ players with characters"}
      </button>
    </div>
  );
}

function VoteList({ state }: { state: V2State }) {
  const tally = state.vote?.tally || {};
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(tally).map(([id, n]) => (
        <span key={id} className="rounded bg-cream px-2 py-1 text-sm">{name(state, id)}: <b>{n}</b></span>
      ))}
      {Object.keys(tally).length === 0 && <span className="text-sm text-ink/50">no votes yet</span>}
    </div>
  );
}

function PlayerList({ state }: { state: V2State }) {
  return (
    <div className="mt-5">
      <div className="font-display text-lg text-ink">Players</div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
        {state.players.map((p: V2Player) => (
          <div key={p.id} className={`rounded px-2 py-1 ${p.alive ? "bg-white" : "bg-ink/10 line-through opacity-60"}`}>
            {p.name}{p.characterId ? ` · ${prof(state, p.characterId)}` : " · (choosing…)"}
          </div>
        ))}
      </div>
    </div>
  );
}

const name = (s: V2State, id: string) => s.players.find((p) => p.id === id)?.name || "?";
const prof = (s: V2State, id: string | null) => s.characters.find((c) => c.id === id)?.profession || "?";

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-auto bg-cream p-4">{children}</div>;
}
