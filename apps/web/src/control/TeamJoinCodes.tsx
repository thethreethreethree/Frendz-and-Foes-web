import { useState } from "react";
import { useGame } from "../store/gameStore";
import { QR } from "../net/pairing";
import { teamJoinUrl } from "../net/room";
import { Section } from "./ui";

// Host's join hub (replaces the shared monitor's QR): one answerer QR per team. A team rep scans
// their team's code to become the answer-phone; a green dot shows once a team has a phone linked.
export function TeamJoinCodes() {
  const g = useGame();
  const room = g.connection.room;
  const presence = g.connection.presence;
  const teams = g.state.teams;
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  // Only meaningful when networked (a room exists). Local/solo host has no team phones to pair.
  if (!room) return null;

  const selected = teams.find((t) => t.id === sel) ?? teams[0] ?? null;
  const connectedCount = (id: string) => presence?.teams?.[id]?.answerers ?? 0;

  return (
    <Section title="Team join codes">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {teams.map((t) => {
          const linked = connectedCount(t.id) > 0;
          const active = selected?.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSel(t.id)}
              className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 text-xs font-bold ${
                active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: t.color ?? "#999" }}
              />
              {t.name}
              <span className={`h-2 w-2 rounded-full ${linked ? "bg-buzz-green" : "bg-ink/20"}`} />
            </button>
          );
        })}
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-sm font-bold text-ink"
        >
          ▸ Show QR to pair a team's answer-phone
        </button>
      ) : (
        selected && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 font-display text-lg text-ink">
              <span
                className="h-4 w-4 rounded-full border border-ink"
                style={{ backgroundColor: selected.color ?? "#999" }}
              />
              {selected.name}
            </div>
            <QR text={teamJoinUrl(room, selected.id, "answerer")} size={200} />
            <p className="text-xs font-bold text-ink/60">
              One teammate scans this to become {selected.name}'s answer-phone. They can then share a
              view-only QR with the rest of the team.
            </p>
            <div className="text-xs font-black">
              {connectedCount(selected.id) > 0 ? (
                <span className="text-buzz-green">✓ Answer-phone linked</span>
              ) : (
                <span className="text-tang">Waiting for a teammate to scan…</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-ink/40 underline"
            >
              Hide
            </button>
          </div>
        )
      )}
    </Section>
  );
}
