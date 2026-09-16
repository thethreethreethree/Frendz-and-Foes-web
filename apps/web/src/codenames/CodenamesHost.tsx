import { useCodenames } from "./useCodenames";
import { cnStart, cnReset, cnKick, type CnTeam } from "../net/codenames";
import { PlayerRoster } from "../net/PlayerRoster";
import { RemoteShell } from "../control/shell";
import { Section } from "../control/ui";
import { AvatarBadge } from "../net/avatars";
import { getBrand } from "../brand/theme";

// Host controller for "Cover Ops". Roster + Start/Reset. The board itself lives on the display and
// the spymasters' phones; the host just runs the room.
//
// On RemoteShell since 2026-09-16: it had no way back to game selection, an unreadable room code,
// and ~900px of dead screen below the caption with the primary action floating above it.

// The two team names were painted with literal hexes (#d64550 / #3b7dd8) — the only red and blue in
// the remote set that did not resolve through the token system, so a white-label tenant recoloured
// the entire app and these stayed. They now ride `danger` and `info`, which every brand defines.
const TEAM_CLASS: Record<CnTeam, string> = {
  red: "text-danger",
  blue: "text-info",
};

export function CodenamesHost({ room }: { room: string }) {
  const { state, error } = useCodenames(room, "host");
  const label = getBrand().games.codenames?.label ?? "Cover Ops";
  if (!state) return <Connecting />;

  const roster = (team: CnTeam, role: string) => state.players.filter((p) => p.team === team && p.role === role);

  const action = (
    <div className="space-y-2">
      {state.phase === "lobby" ? (
        <button onClick={cnStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>
      ) : (
        <>
          <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm text-muted">
            {state.phase === "ended"
              ? `${state.winner === "red" ? "Red" : "Blue"} won.`
              : `In play — ${state.turn === "red" ? "Red" : "Blue"}'s turn.`}
          </p>
          <button onClick={() => cnReset(false)} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEW GAME (keep teams)</button>
          <button onClick={() => cnReset(true)} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">Reset everyone to lobby</button>
        </>
      )}
    </div>
  );

  return (
    <RemoteShell title={label} room={room} action={action}>
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        {(["red", "blue"] as CnTeam[]).map((team) => {
          const sm = roster(team, "spymaster")[0];
          const agents = roster(team, "operative");
          return (
            <div key={team} className="rounded-2xl border border-line bg-surface p-3">
              <div className={`ff-title text-xl ${TEAM_CLASS[team]}`}>{team === "red" ? "Red" : "Blue"}</div>
              <div className="mt-1 flex items-center gap-1 text-sm">
                <b>Spymaster:</b>{" "}
                {sm ? (
                  <span className="inline-flex items-center gap-1"><AvatarBadge avatar={sm.avatar} name={sm.name} size={20} />{sm.name}</span>
                ) : "—"}
              </div>
              <div className="text-sm">
                <b>Agents:</b>{" "}
                {agents.length ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
                    {agents.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1"><AvatarBadge avatar={p.avatar} name={p.name} size={20} />{p.name}</span>
                    ))}
                  </span>
                ) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <Section title={`Everyone (${state.players.length})`}>
        <PlayerRoster
          players={state.players.map((p) => ({
            ...p,
            note: p.team ? `${p.team === "red" ? "Red" : "Blue"} ${p.role === "spymaster" ? "spymaster" : "agent"}` : "no team",
          }))}
          onRemove={cnKick}
          empty="Nobody has joined yet."
        />
      </Section>

      <p className="text-center text-xs text-muted">Players scan the display's QR to join and pick a team.</p>
    </RemoteShell>
  );
}

function Connecting() {
  return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
}
