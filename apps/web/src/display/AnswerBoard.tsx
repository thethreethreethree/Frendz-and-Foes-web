import type { GameState, Question } from "@ff/engine";
import { AnswerSlot } from "./AnswerSlot";

interface Props {
  state: GameState;
  question: Question;
}

export function AnswerBoard({ state, question }: Props) {
  const teamById = (id: string | null) =>
    id ? (state.teams.find((t) => t.id === id) ?? null) : null;

  // Up to 8 answers split into two columns (mirrors the deck). Bonus questions are short.
  const mid = Math.ceil(question.answers.length / 2);
  const columns =
    question.answers.length <= 4
      ? [question.answers]
      : [question.answers.slice(0, mid), question.answers.slice(mid)];

  let rank = 0;
  return (
    <div
      className={`grid w-full gap-4 ${columns.length === 1 ? "max-w-2xl grid-cols-1" : "grid-cols-2"}`}
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-3">
          {col.map((a) => {
            rank += 1;
            return (
              <AnswerSlot
                key={a.id}
                question={question}
                answer={a}
                rankLabel={rank}
                bonusPoints={state.config.bonusFlatPoints}
                team={teamById(a.awardedTeamId)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
