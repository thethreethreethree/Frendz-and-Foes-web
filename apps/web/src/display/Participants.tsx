import type { GameState } from "@ff/engine";
import { turnFocus } from "@ff/engine";
import { SLOT_META } from "./buzzers";

// Shows the three buzz-in teams with their buzzer colors, highlighting whose attempt is active.
export function Participants({ state }: { state: GameState }) {
  const turn = state.turn;
  if (!turn || turn.participants.length === 0) return null;
  const focus = turnFocus(state);
  const activeIndex =
    focus.stage === "participant" || focus.stage === "bonus-participant" ? focus.index : -1;

  return (
    <div className="flex items-center justify-center gap-3">
      {turn.participants.map((p) => {
        const meta = SLOT_META[p.slot];
        const team = state.teams.find((t) => t.id === p.teamId);
        const active = p.slot === activeIndex;
        return (
          <div
            key={p.slot}
            className={`ff-sticker flex items-center gap-2 bg-white px-3 py-1.5 transition ${
              active ? "scale-110 ring-4 ring-sun" : "opacity-80"
            }`}
          >
            <span className={`h-4 w-4 rounded-full ${meta.dot}`} />
            <span className="text-xs font-black text-ink/60">{meta.label}</span>
            <span className="text-base font-bold text-ink">{team?.name ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}
