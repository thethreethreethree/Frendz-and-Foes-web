import { useState } from "react";
import { buildRandomizedGame, RANDOM_POOL, SAMPLE_QUESTIONS } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { Section, CtrlButton } from "./ui";

const PALETTE = [
  "#ff2e9a", "#ff6b35", "#1fd1c6", "#8a4bff", "#ffd23f", "#22c55e",
  "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#a855f7", "#84cc16",
];

const MIN_TEAMS = 3;
const MAX_TEAMS = 12;

type Mode = "standard" | "randomize";

interface EditTeam {
  id: string;
  name: string;
  color: string;
}

// Custom team names/colors (3–12), survey mode, plus Start / Reset. Each game-building action
// rebuilds the question set from the chosen mode — Standard = the fixed deck, Randomize Survey =
// a fresh random draw from the 120-question pool.
export function TeamSetup() {
  const { state, newGame, startNewGame } = useGame();
  const [teams, setTeams] = useState<EditTeam[]>(() =>
    state.teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color ?? PALETTE[i % PALETTE.length] })),
  );
  const [mode, setMode] = useState<Mode>("standard");
  const [open, setOpen] = useState(state.phase === "setup");

  const questions = () => (mode === "randomize" ? buildRandomizedGame(RANDOM_POOL) : SAMPLE_QUESTIONS);

  const cleanedTeams = () =>
    teams.map((t, i) => ({ id: t.id, name: t.name.trim() || `Team ${i + 1}`, color: t.color }));

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

  const resetGame = () => {
    if (window.confirm("Reset the game? Scores are cleared and you return to the start screen. Teams are kept.")) {
      newGame(state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })), questions());
    }
  };

  return (
    <Section title="Teams & setup">
      {/* Survey mode */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] font-black uppercase text-ink/50">Survey mode</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setMode("standard")}
            className={`rounded-lg border-2 px-2 py-2 text-xs font-bold ${
              mode === "standard" ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink"
            }`}
          >
            Standard
            <span className="block text-[9px] font-semibold opacity-70">The fixed deck</span>
          </button>
          <button
            onClick={() => setMode("randomize")}
            className={`rounded-lg border-2 px-2 py-2 text-xs font-bold ${
              mode === "randomize" ? "border-grape bg-grape text-white" : "border-ink/15 bg-white text-ink"
            }`}
          >
            🎲 Randomize Survey
            <span className="block text-[9px] font-semibold opacity-70">Random from 120</span>
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <CtrlButton tone="ink" onClick={() => setOpen((o) => !o)}>
          {open ? "▾ Teams" : `▸ Teams (${state.teams.length})`}
        </CtrlButton>
        {state.phase === "setup" ? (
          <CtrlButton tone="pink" onClick={() => startNewGame(cleanedTeams(), questions())}>
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
            <CtrlButton tone="grape" onClick={() => newGame(cleanedTeams(), questions())} className="ml-auto">
              Apply teams (restart)
            </CtrlButton>
          </div>
        </>
      )}
    </Section>
  );
}
