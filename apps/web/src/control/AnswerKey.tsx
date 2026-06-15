import { useMemo, useState } from "react";
import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { turnInfo } from "./turn";
import { bestMatch } from "./fuzzy";
import { Section, CtrlButton } from "./ui";

// The host's private judge layer: every answer (revealed or not) with its points + survey
// count, a fuzzy-match box to find what a team said, and tap-to-reveal-and-credit.
export function AnswerKey() {
  const g = useGame();
  const q = currentQuestion(g.state);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null); // answerId awaiting a team
  const info = turnInfo(g.state);

  const hiddenAnswers = useMemo(() => (q ? q.answers.filter((a) => !a.revealed) : []), [q]);
  const match = query.trim().length >= 2 ? bestMatch(query, hiddenAnswers, (a) => a.text) : null;
  const matchId = match?.item.id ?? null;

  if (!q) return null;

  const credit = (answerId: string, teamId: string) => {
    g.dispatch({ type: "AWARD", answerId, teamId });
    g.sfx("ding");
    setPending(null);
    setQuery("");
  };

  // Sort teams so the team expected to answer is first (fastest credit).
  const orderedTeams = [...g.state.teams].sort((a, b) =>
    a.id === info.activeTeamId ? -1 : b.id === info.activeTeamId ? 1 : 0,
  );

  return (
    <Section title="Answer key (host only)">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type what they said…"
        className="mb-2 w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 text-base text-ink outline-none focus:border-teal"
      />
      {match && (
        <div className="mb-2 text-xs font-bold text-ink/60">
          Closest: <span className="text-teal">{match.item.text}</span> ({Math.round(match.score * 100)}%)
        </div>
      )}

      <ul className="space-y-1.5">
        {q.answers.map((a, i) => {
          const points = q.kind === "bonus" ? g.state.config.bonusFlatPoints : a.rankPoints;
          const team = a.awardedTeamId
            ? g.state.teams.find((t) => t.id === a.awardedTeamId)
            : null;
          const isMatch = a.id === matchId;
          return (
            <li key={a.id}>
              <button
                disabled={a.revealed}
                onClick={() => setPending(pending === a.id ? null : a.id)}
                className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 text-left ${
                  a.revealed
                    ? "border-transparent bg-ink/5 text-ink/40"
                    : isMatch
                      ? "border-teal bg-teal/15"
                      : "border-ink/10 bg-white"
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/80 font-display text-lg text-white">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-bold">{a.text}</span>
                <span className="text-[10px] font-semibold text-ink/40">({a.surveyCount})</span>
                <span className="grid h-7 min-w-7 place-items-center rounded bg-ink px-1 font-display text-lg text-white">
                  {points}
                </span>
                {team && (
                  <span
                    className="h-4 w-4 rounded-full border border-ink"
                    style={{ backgroundColor: team.color ?? "#999" }}
                    title={team.name}
                  />
                )}
              </button>

              {pending === a.id && (
                <div className="mt-1 rounded-lg bg-ink/5 p-2">
                  <div className="mb-1 text-[10px] font-black uppercase text-ink/50">
                    Credit to which team?
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {orderedTeams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => credit(a.id, t.id)}
                        className="flex items-center gap-1 rounded-lg border-2 border-ink/15 bg-white px-2 py-1 text-xs font-bold"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color ?? "#999" }}
                        />
                        {t.name}
                        {t.id === info.activeTeamId && <span className="text-sun">★</span>}
                      </button>
                    ))}
                    <CtrlButton tone="ink" onClick={() => setPending(null)}>
                      Cancel
                    </CtrlButton>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex gap-2">
        <CtrlButton
          tone="tang"
          onClick={() => {
            g.dispatch({ type: "MISS", teamId: info.activeTeamId ?? undefined });
            g.sfx("buzzer");
          }}
          disabled={info.complete || info.idle}
        >
          Mark miss ✕
        </CtrlButton>
        <CtrlButton tone="ink" onClick={() => g.dispatch({ type: "REVEAL_REMAINING" })}>
          Reveal all
        </CtrlButton>
      </div>
    </Section>
  );
}
