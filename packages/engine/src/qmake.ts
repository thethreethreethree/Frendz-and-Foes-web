// Shared question builder used by the curated deck (fixtures) and the random bank.

import type { Question, RoundKind } from "./types.js";

export type RawAnswer = [text: string, surveyCount: number];

/** Build a question; answers are sorted by survey count and points assigned 8..1 by rank. */
export function makeQuestion(
  id: string,
  kind: RoundKind,
  prompt: string,
  raw: RawAnswer[],
): Question {
  const sorted = [...raw].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    id,
    kind,
    prompt,
    answers: sorted.map(([text, surveyCount], i) => ({
      id: `${id}-a${i + 1}`,
      text,
      surveyCount,
      rankPoints: 8 - i,
      revealed: false,
      awardedTeamId: null,
    })),
  };
}
