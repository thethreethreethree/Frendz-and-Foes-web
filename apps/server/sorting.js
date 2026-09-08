// The Sorting — Rex's 5 silly questions that drop a backer into one of the four enclosures. It is
// NOT random: each answer is a vote for one enclosure, and the most-voted enclosure wins (with a
// fixed tiebreak), so people who answer alike land together. The answer->enclosure mapping lives
// here on the server and the enclosure is computed here, so nobody can hand-pick their own house.
// Owner-approved question set, 2026-09-08.

import { ENCLOSURE_IDS } from "./enclosures.js";

// Each question: 4 answers, one leaning to each enclosure. `enc` is the vote; `quip` is Rex's snappy
// comeback shown right after the pick. Answer order is display order (not tied to enclosure order).
const QUESTIONS = [
  {
    q: "Pineapple on pizza?",
    answers: [
      { text: "Yes — and I'll die on this hill.", enc: "rowdies", quip: "A zealot. I respect the commitment, even if you're wrong." },
      { text: "If the group's getting it, I'm in.", enc: "cuddle-crew", quip: "A team player. Or a pushover. We'll find out." },
      { text: "A fruit on a savory base — defensible.", enc: "know-it-owls", quip: "Ugh. You're going to be insufferable, aren't you." },
      { text: "I'll say no, then eat yours.", enc: "schemers", quip: "...I'm going to have to count my slices around you." },
    ],
  },
  {
    q: "The group can't pick a restaurant. You…",
    answers: [
      { text: "Pick loudly and start walking.", enc: "rowdies", quip: "Leadership, or a hostage situation. Bold." },
      { text: "Find what everyone's feeling.", enc: "cuddle-crew", quip: "Aw. You'd last about four minutes in the wild." },
      { text: "Pull up the reviews and optimize.", enc: "know-it-owls", quip: "Of course you have a spreadsheet for dinner." },
      { text: "Suggest my place — I know a guy.", enc: "schemers", quip: "You 'know a guy.' You always know a guy." },
    ],
  },
  {
    q: "There's one slice of cake left…",
    answers: [
      { text: "Call it. Loudest claim wins.", enc: "rowdies", quip: "Volume as a survival strategy. Classic." },
      { text: "Split it, obviously.", enc: "cuddle-crew", quip: "You'd halve a single grape, wouldn't you." },
      { text: "Whoever's had the least should take it.", enc: "know-it-owls", quip: "Fairness math. Nerd." },
      { text: "What cake? It's already gone.", enc: "schemers", quip: "The cake was never real. I'm watching you." },
    ],
  },
  {
    q: "Board-game night. Your move?",
    answers: [
      { text: "Go for the win. No mercy.", enc: "rowdies", quip: "Someone's flipping the table tonight. Good." },
      { text: "Make sure everyone's having fun.", enc: "cuddle-crew", quip: "You're why game night doesn't end in tears. Sweet." },
      { text: "Read the rulebook cover to cover first.", enc: "know-it-owls", quip: "You've already memorized the errata, haven't you." },
      { text: "Bend a rule when nobody's looking.", enc: "schemers", quip: "Cheating? In MY zoo? …go on." },
    ],
  },
  {
    q: "Ideal Friday night?",
    answers: [
      { text: "Front row, first on the dancefloor.", enc: "rowdies", quip: "Of course. Sit down. (No you won't.)" },
      { text: "Couch pile with the crew and snacks.", enc: "cuddle-crew", quip: "Warm, cozy, deeply un-dramatic. Refreshing." },
      { text: "A pub quiz I fully intend to win.", enc: "know-it-owls", quip: "'Intend.' Bold, for someone about to argue with the quizmaster." },
      { text: "Somewhere I shouldn't be, with a plan.", enc: "schemers", quip: "There's always a plan. That's what worries me." },
    ],
  },
];

export const SORT_LEN = QUESTIONS.length;

// Display payload for the client — question text + answer text + Rex's quips (safe to expose; the
// vote mapping is included so the reveal can explain nothing, but the RESULT is still computed here).
export function sortQuestions() {
  return QUESTIONS.map((it) => ({
    q: it.q,
    answers: it.answers.map((a) => ({ text: a.text, quip: a.quip })),
  }));
}

// Compute the enclosure from an array of chosen answer indices (one per question). Tally votes;
// highest wins; ties break by the canonical enclosure order. Returns an enclosure id, or null if
// the answers are malformed.
export function sortInto(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) return null;
  const votes = Object.fromEntries(ENCLOSURE_IDS.map((id) => [id, 0]));
  for (let i = 0; i < QUESTIONS.length; i++) {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0 || a >= QUESTIONS[i].answers.length) return null;
    votes[QUESTIONS[i].answers[a].enc]++;
  }
  // Highest vote count; tiebreak by ENCLOSURE_IDS order (stable + deterministic).
  let winner = ENCLOSURE_IDS[0];
  for (const id of ENCLOSURE_IDS) if (votes[id] > votes[winner]) winner = id;
  return winner;
}
