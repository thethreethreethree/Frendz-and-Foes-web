// Generate packages/engine/src/data/survey-categories.ts from the markdown question bank.
//
// The markdown is the source of truth. Run this whenever it changes rather than editing the
// generated file, which carries a header saying so.
import { writeFileSync } from "node:fs";
import { parseBank } from "./parse-feud-bank.mjs";

const SRC = process.argv[2] || "docs/feud-question-bank-with-answers (1).md";
const OUT = "packages/engine/src/data/survey-categories.ts";

const { cats, problems } = parseBank(SRC);
if (problems.length) {
  console.error("refusing to generate, the bank has structural problems:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

const slug = (t) =>
  t.toLowerCase()
    .replace(/\(18\+\)/g, "18plus")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const esc = (s) => JSON.stringify(s);

const out = [];
out.push("// GENERATED FILE — do not edit by hand.");
out.push("//");
out.push("// Source:    docs/feud-question-bank-with-answers (1).md");
out.push("// Generator: node tools/bank/generate.mjs");
out.push("//");
out.push("// The bank states its own contract: 100 people surveyed, 8 answers, Points = rank");
out.push("// (8 most popular .. 1 least), Surveyed = how many of the 100 gave that answer. Those two");
out.push("// columns map exactly onto Answer.rankPoints and Answer.surveyCount, so nothing here is");
out.push("// invented -- makeQuestion sorts by survey count and assigns 8..1, which reproduces the");
out.push("// bank's own Points column because its counts are already non-increasing (asserted by the");
out.push("// parser before this file is written).");
out.push("//");
out.push("// Unlike bank.ts, whose 100 questions all share one template count array, every count here");
out.push("// is the real per-answer figure from the survey.");
out.push("");
out.push('import type { Question } from "../types.js";');
out.push('import { makeQuestion } from "../qmake.js";');
out.push("");
out.push("export interface SurveyCategory {");
out.push("  id: string;");
out.push("  /** Title exactly as written in the bank. */");
out.push("  title: string;");
out.push("  /** 1-based position in the source document. */");
out.push("  index: number;");
out.push("  /** All 30, in the order the bank authored them: rounds are questions 1-10, 11-20, 21-30. */");
out.push("  questions: Question[];");
out.push("}");
out.push("");
out.push("const q = (id: string, prompt: string, a: Array<[string, number]>): Question =>");
out.push('  makeQuestion(id, "regular", prompt, a);');
out.push("");
out.push("export const SURVEY_CATEGORIES: SurveyCategory[] = [");
for (const c of cats) {
  const s = slug(c.title);
  out.push(`  {`);
  out.push(`    id: ${esc(s)},`);
  out.push(`    title: ${esc(c.title)},`);
  out.push(`    index: ${c.index},`);
  out.push(`    questions: [`);
  for (const qq of c.questions) {
    const answers = qq.answers.map((a) => `[${esc(a.text)}, ${a.surveyed}]`).join(", ");
    out.push(`      q(${esc(`${s}-q${qq.n}`)}, ${esc(qq.prompt)}, [${answers}]),`);
  }
  out.push(`    ],`);
  out.push(`  },`);
}
out.push("];");
out.push("");
out.push("export const SURVEY_CATEGORY_IDS: string[] = SURVEY_CATEGORIES.map((c) => c.id);");
out.push("");
out.push("export function surveyCategory(id: string): SurveyCategory | null {");
out.push("  return SURVEY_CATEGORIES.find((c) => c.id === id) ?? null;");
out.push("}");
out.push("");

writeFileSync(OUT, out.join("\n"));
console.log(`wrote ${OUT}`);
for (const c of cats) console.log(`  ${slug(c.title).padEnd(30)} ${c.questions.length} questions`);
