// Sample questions seeded from the original "Frendz and Foes (El Nido)" deck.
// Used by tests and as placeholder content until the full question bank is built (Phase 5).

import type { Question, RoundKind } from "./types.js";

type RawAnswer = [text: string, surveyCount: number, rankPoints: number];

function makeQuestion(id: string, kind: RoundKind, prompt: string, raw: RawAnswer[]): Question {
  return {
    id,
    kind,
    prompt,
    answers: raw
      .map(([text, surveyCount, rankPoints], i) => ({
        id: `${id}-a${i + 1}`,
        text,
        surveyCount,
        rankPoints,
        revealed: false,
        awardedTeamId: null,
      }))
      .sort((a, b) => b.rankPoints - a.rankPoints),
  };
}

export const SAMPLE_REGULAR_1: Question = makeQuestion(
  "q1",
  "regular",
  "Name something you never forget to pack for a trip to the Philippines (except your sense of adventure).",
  [
    ["Passport", 30, 8],
    ["Sunblock", 20, 7],
    ["Clothes", 15, 6],
    ["Gadgets", 10, 5],
    ["Bank Cards", 8, 4],
    ["Water Bottle", 7, 3],
    ["Bug spray", 6, 2],
    ["Flip flops", 4, 1],
  ],
);

export const SAMPLE_REGULAR_2: Question = makeQuestion(
  "q2",
  "regular",
  "Name an island in the Philippines best fitted for the saying “what happens in ___ stays in ___”.",
  [
    ["Palawan", 29, 8],
    ["Boracay", 21, 7],
    ["Cebu", 17, 6],
    ["Siargao", 13, 5],
    ["Bohol", 11, 4],
    ["Siquijor", 7, 3],
    ["Baler", 5, 2],
    ["Zambales", 3, 1],
  ],
);

export const SAMPLE_BONUS: Question = makeQuestion(
  "bonus1",
  "bonus",
  "Name a Filipino city famous for its historical sites.",
  [
    ["Vigan", 30, 8],
    ["Cebu City", 18, 8],
    ["Intramuros (Manila)", 13, 8],
  ],
);

export const SAMPLE_QUESTIONS: Question[] = [SAMPLE_REGULAR_1, SAMPLE_REGULAR_2, SAMPLE_BONUS];
