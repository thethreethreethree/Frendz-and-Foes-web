// Parse docs/feud-question-bank-with-answers (1).md into the engine's Question shape.
//
// The markdown is the SOURCE OF TRUTH for Survey Showdown's content. This script is the only thing
// that reads it, so the generated TypeScript can be regenerated whenever the bank is edited rather
// than hand-maintained in two places.
//
// Shape of the source, verified against records in categories 1, 5 and 10:
//   ## 1. Night Out
//   **1. Name something you find in your pocket the morning after a big night.**
//   | Points | Answer | Surveyed |
//   |:-:|---|:-:|
//   | 8 | Receipts | 28 |
//
// Points are the rank (8 most popular .. 1 least) and Surveyed is the count out of 100 — which maps
// exactly onto Answer.rankPoints and Answer.surveyCount, so nothing has to be invented.
import { readFileSync } from "node:fs";

export function parseBank(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const cats = [];
  let cat = null, q = null;
  const problems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const mCat = /^##\s+(\d+)\.\s+(.+?)\s*$/.exec(line);
    if (mCat) {
      if (q && cat) cat.questions.push(q);
      q = null;
      cat = { index: +mCat[1], title: mCat[2], questions: [] };
      cats.push(cat);
      continue;
    }

    const mQ = /^\*\*(\d+)\.\s+(.+?)\*\*\s*$/.exec(line);
    if (mQ) {
      if (q && cat) cat.questions.push(q);
      q = { n: +mQ[1], prompt: mQ[2].trim(), answers: [] };
      continue;
    }

    // | 8 | Receipts | 28 |
    const mA = /^\|\s*(\d)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*$/.exec(line);
    if (mA && q) {
      q.answers.push({ points: +mA[1], text: mA[2].trim(), surveyed: +mA[3] });
    }
  }
  if (q && cat) cat.questions.push(q);

  // Validate rather than assume. Anything that does not fit is reported, never silently dropped.
  for (const c of cats) {
    if (c.questions.length !== 30) problems.push(`${c.title}: ${c.questions.length} questions (expected 30)`);
    for (const qq of c.questions) {
      if (qq.answers.length !== 8) problems.push(`${c.title} q${qq.n}: ${qq.answers.length} answers (expected 8)`);
      const pts = qq.answers.map((a) => a.points).sort((a, b) => b - a);
      if (pts.join(",") !== "8,7,6,5,4,3,2,1") problems.push(`${c.title} q${qq.n}: points ${pts.join(",")}`);
      const desc = qq.answers.every((a, i, arr) => i === 0 || arr[i - 1].surveyed >= a.surveyed);
      if (!desc) problems.push(`${c.title} q${qq.n}: surveyed counts not descending`);
      if (!qq.prompt) problems.push(`${c.title} q${qq.n}: empty prompt`);
    }
  }
  return { cats, problems };
}

// Always runs as a CLI. No import.meta path comparison: building one needs a backslash
// escape, and this session already lost an hour to a regex whose escapes became control bytes.
{
  const { cats, problems } = parseBank(process.argv[2] || "docs/feud-question-bank-with-answers (1).md");
  console.log(`categories: ${cats.length}`);
  for (const c of cats) {
    const ans = c.questions.reduce((n, q) => n + q.answers.length, 0);
    console.log(`  ${String(c.index).padStart(2)}. ${c.title.padEnd(34)} ${c.questions.length} questions, ${ans} answers`);
  }
  console.log(`\ntotal questions: ${cats.reduce((n, c) => n + c.questions.length, 0)}`);
  console.log(`total answers:   ${cats.reduce((n, c) => n + c.questions.reduce((m, q) => m + q.answers.length, 0), 0)}`);
  console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n  ` + problems.slice(0, 20).join("\n  ") : "\nno structural problems");
}
