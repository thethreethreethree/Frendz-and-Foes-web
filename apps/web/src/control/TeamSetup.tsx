import { useState } from "react";
import { buildCategoryGame, surveyCategory } from "@ff/engine";
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

// Custom team names/colors (3–12), the loaded category, plus Start / Reset. Every game-building
// action rebuilds the question set from the CHOSEN CATEGORY: 30 questions in the bank's authored
// order (three rounds of ten) plus a wildcard bonus drawn from another topic.
export function TeamSetup({ categoryId }: { categoryId: string }) {
  const { state, newGame, startNewGame } = useGame();
  const [teams, setTeams] = useState<EditTeam[]>(() =>
    state.teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color ?? PALETTE[i % PALETTE.length] })),
  );
  const [open, setOpen] = useState(state.phase === "setup");

  // The chosen category IS the deck now: 30 questions in the bank's authored order (three rounds
  // of ten) plus a wildcard bonus. The old two-button "Survey mode" -- a fixed 20-question deck or
  // 21 drawn at random from a 120 pool whose survey counts were all the same template -- is gone,
  // replaced by the category step before the remote.
  const category = surveyCategory(categoryId);
  const questions = () => buildCategoryGame(categoryId);

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
      {/* Which deck is loaded. Changing it means a different game, so it is a hard nav back to the
          category step rather than an in-place swap that would silently discard a live board. */}
      <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted">Category</div>
          <div className="truncate text-sm font-bold text-ink">{category?.title ?? categoryId}</div>
          <div className="text-[10px] font-semibold text-muted">
            {category ? `${category.questions.length} questions · 3 rounds + bonus` : "unknown deck"}
          </div>
        </div>
        <CtrlButton
          tone="ink"
          onClick={() => {
            if (
              window.confirm(
                "Change category? This starts a different game — scores and progress are cleared.",
              )
            ) {
              const u = new URL(window.location.href);
              u.searchParams.delete("cat");
              window.location.href = u.toString();
            }
          }}
        >
          Change
        </CtrlButton>
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
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border border-line bg-surface p-0.5"
                  title="Team color"
                />
                <input
                  value={t.name}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                  maxLength={20}
                  className="min-w-0 flex-1 rounded-lg border-2 border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-teal"
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
            {/* Same destructive call as resetGame above — it rebuilds the game and clears every
                score — but it shipped unguarded while its twin confirmed. Rendered at 390px it was
                also the second-loudest control on the panel, one mis-tap from wiping a live game
                mid-party. Confirmed now, and quiet: rare and destructive, not a primary action. */}
            <CtrlButton
              tone="ink"
              className="ml-auto"
              onClick={() => {
                if (
                  window.confirm(
                    "Apply these teams? The game restarts from question 1 and all scores are cleared.",
                  )
                ) {
                  newGame(cleanedTeams(), questions());
                }
              }}
            >
              Apply teams (restart)
            </CtrlButton>
          </div>
        </>
      )}
    </Section>
  );
}
