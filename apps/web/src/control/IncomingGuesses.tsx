import { useEffect, useState } from "react";
import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { getSocket, type Intent } from "../net/socket";
import { bestMatch } from "./fuzzy";
import { Section, CtrlButton } from "./ui";

// Host-side queue of guesses submitted by team answer-phones. The host stays the referee: each
// guess shows the closest board answer (via the same fuzzy matcher the Answer Key uses) and the
// host taps to credit that team, mark a miss, or dismiss. Guesses never touch the board directly.
interface Incoming {
  id: string;
  teamId: string;
  text: string;
  at: number;
}

export function IncomingGuesses() {
  const g = useGame();
  const [queue, setQueue] = useState<Incoming[]>([]);

  useEffect(() => {
    const s = getSocket();
    const onIntent = (i: Intent & { at?: number }) => {
      if (i?.kind !== "guess" || !i.text || !i.teamId) return;
      const item: Incoming = {
        id: `${i.teamId}-${i.at ?? 0}-${Math.random().toString(36).slice(2, 7)}`,
        teamId: i.teamId,
        text: i.text,
        at: i.at ?? Date.now(),
      };
      setQueue((qq) => [item, ...qq].slice(0, 12));
    };
    s.on("intent", onIntent);
    return () => {
      s.off("intent", onIntent);
    };
  }, []);

  const q = currentQuestion(g.state);
  const hidden = q ? q.answers.filter((a) => !a.revealed) : [];
  const remove = (id: string) => setQueue((qq) => qq.filter((x) => x.id !== id));

  if (queue.length === 0) return null;

  const team = (id: string) => g.state.teams.find((t) => t.id === id) ?? null;

  return (
    <Section title={`Team answers (${queue.length})`}>
      <ul className="space-y-2">
        {queue.map((item) => {
          const t = team(item.teamId);
          const match = item.text.trim().length >= 2 ? bestMatch(item.text, hidden, (a) => a.text) : null;
          return (
            <li key={item.id} className="rounded-lg border-2 border-ink/10 bg-white p-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-ink"
                  style={{ backgroundColor: t?.color ?? "#999" }}
                />
                <span className="text-xs font-black uppercase text-ink/50">{t?.name ?? "Team"}</span>
                <span className="ml-auto text-[10px] font-semibold text-ink/40">said</span>
              </div>
              <div className="mt-1 text-base font-bold text-ink">“{item.text}”</div>
              {match ? (
                <div className="mt-0.5 text-xs font-bold text-ink/60">
                  Closest: <span className="text-teal">{match.item.text}</span> ({Math.round(match.score * 100)}%)
                </div>
              ) : (
                <div className="mt-0.5 text-xs font-bold text-tang">No board match</div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <CtrlButton
                  tone="pink"
                  disabled={!match}
                  onClick={() => {
                    if (!match) return;
                    g.dispatch({ type: "AWARD", answerId: match.item.id, teamId: item.teamId });
                    g.sfx("ding");
                    remove(item.id);
                  }}
                >
                  ✓ Credit {t?.name ?? "team"}
                </CtrlButton>
                <CtrlButton
                  tone="tang"
                  onClick={() => {
                    g.dispatch({ type: "MISS", teamId: item.teamId });
                    g.sfx("buzzer");
                    remove(item.id);
                  }}
                >
                  ✕ Miss
                </CtrlButton>
                <CtrlButton tone="ink" onClick={() => remove(item.id)}>
                  Dismiss
                </CtrlButton>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => setQueue([])}
        className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink/50"
      >
        Clear all
      </button>
    </Section>
  );
}
