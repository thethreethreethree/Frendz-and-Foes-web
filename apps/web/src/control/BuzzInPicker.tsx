import { useGame } from "../store/gameStore";
import { SLOT_META } from "../display/buzzers";
import { Section, CtrlButton } from "./ui";

// Arm the buzzers, then tap teams in the order they buzzed in (1st → 2nd → 3rd).
export function BuzzInPicker() {
  const { state, dispatch, buzzersArmed, setBuzzersArmed, sfx } = useGame();
  const turn = state.turn;
  const chosen = turn?.participants.map((p) => p.teamId) ?? [];

  const toggleTeam = (teamId: string) => {
    let next: string[];
    if (chosen.includes(teamId)) next = chosen.filter((id) => id !== teamId);
    else if (chosen.length < 3) next = [...chosen, teamId];
    else return; // already have 3
    dispatch({ type: "SET_PARTICIPANTS", teamIds: next });
    sfx("swoosh");
  };

  return (
    <Section title="Buzz-in">
      <div className="mb-2 flex items-center gap-2">
        <CtrlButton
          tone={buzzersArmed ? "green" : "ink"}
          onClick={() => setBuzzersArmed(!buzzersArmed)}
        >
          {buzzersArmed ? "● BUZZERS LIVE" : "Arm buzzers"}
        </CtrlButton>
        {chosen.length > 0 && (
          <CtrlButton tone="ink" onClick={() => dispatch({ type: "SET_PARTICIPANTS", teamIds: [] })}>
            Clear
          </CtrlButton>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {state.teams.map((t) => {
          const order = chosen.indexOf(t.id);
          const picked = order >= 0;
          const meta = picked ? SLOT_META[order] : null;
          return (
            <button
              key={t.id}
              onClick={() => toggleTeam(t.id)}
              className={`relative rounded-lg border-2 px-2 py-2 text-xs font-bold ${
                picked ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink"
              }`}
            >
              {meta && (
                <span
                  className={`absolute -left-1 -top-1 flex h-5 items-center rounded-full px-1.5 text-[9px] font-black text-white ${meta.dot}`}
                >
                  {meta.label}
                </span>
              )}
              <span className="flex items-center justify-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: t.color ?? "#999" }}
                />
                <span className="truncate">{t.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
