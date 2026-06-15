import { useState } from "react";
import { useGame } from "../store/gameStore";
import { Section, CtrlButton } from "./ui";

const PALETTE = [
  "#ff2e9a", "#ff6b35", "#1fd1c6", "#8a4bff", "#ffd23f", "#22c55e",
  "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#a855f7", "#84cc16",
];

const MIN_TEAMS = 3;
const MAX_TEAMS = 12;

interface EditTeam {
  id: string;
  name: string;
  color: string;
}

// Custom team names/colors (3–12), plus Start / Reset. Editing teams or resetting restarts the
// game via the engine's newGame (scores cleared, back to the title screen).
export function TeamSetup() {
  const { state, newGame, dispatch } = useGame();
  const [teams, setTeams] = useState<EditTeam[]>(() =>
    state.teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color ?? PALETTE[i % PALETTE.length] })),
  );
  const [open, setOpen] = useState(state.phase === "setup");

  const update = (id: string, patch: Partial<EditTeam>) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const addTeam = () => {
    if (teams.length >= MAX_TEAMS) return;
    const i = teams.length;
    setTeams((ts) => [
      ...ts,
      { id: crypto.randomUUID(), name: `Team ${i + 1}`, color: PALETTE[i % PALETTE.length] },
    ]);
  };

  const removeTeam = (id: string) =>
    setTeams((ts) => (ts.length > MIN_TEAMS ? ts.filter((t) => t.id !== id) : ts));

  const applyTeams = () => {
    const cleaned = teams.map((t, i) => ({
      id: t.id,
      name: t.name.trim() || `Team ${i + 1}`,
      color: t.color,
    }));
    newGame(cleaned);
  };

  const resetGame = () => {
    if (window.confirm("Reset the game? Scores are cleared and you return to the start screen. Teams are kept.")) {
      newGame(state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })));
    }
  };

  return (
    <Section title="Teams & setup">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <CtrlButton tone="ink" onClick={() => setOpen((o) => !o)}>
          {open ? "▾ Teams" : `▸ Teams (${state.teams.length})`}
        </CtrlButton>
        {state.phase === "setup" ? (
          <CtrlButton tone="pink" onClick={() => dispatch({ type: "START_GAME" })}>
            ▶ Start game
          </CtrlButton>
        ) : (
          <CtrlButton tone="tang" onClick={resetGame}>
            ↺ Reset game
          </CtrlButton>
        )}
      </div>

      {open && (
        <>
          <ul className="space-y-1.5">
            {teams.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-black text-ink/40">{i + 1}</span>
                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => update(t.id, { color: e.target.value })}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-ink/20 bg-white p-0.5"
                  title="Team color"
                />
                <input
                  value={t.name}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                  maxLength={20}
                  className="min-w-0 flex-1 rounded-lg border-2 border-ink/15 bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-teal"
                />
                <button
                  onClick={() => removeTeam(t.id)}
                  disabled={teams.length <= MIN_TEAMS}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/10 font-bold text-ink disabled:opacity-30"
                  title="Remove team"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CtrlButton tone="teal" onClick={addTeam} disabled={teams.length >= MAX_TEAMS}>
              + Add team
            </CtrlButton>
            <span className="text-xs font-semibold text-ink/40">
              {teams.length}/{MAX_TEAMS} (min {MIN_TEAMS})
            </span>
            <CtrlButton tone="grape" onClick={applyTeams} className="ml-auto">
              Apply teams (restart)
            </CtrlButton>
          </div>
        </>
      )}
    </Section>
  );
}
