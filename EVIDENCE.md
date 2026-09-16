# EVIDENCE — Survey Showdown category picker, read before building

**Task:** "change the survey topics of the survey questions... create 10 different survey
categories, and use this for that [docs/feud-question-bank-with-answers (1).md]. Present it so that
when they click the game 'Survey Showdown' they get to pick from these 10 different categories."

Phase 0 under the Evidence Protocol: the source data and the code that must consume it, opened and
verified, before any design. R7 — build is gated on this.

---

## 1. The source data [OBSERVED]

| path | bytes | a fact from inside |
|---|---|---|
| `docs/feud-question-bank-with-answers (1).md` | 90,603 (3,947 lines) | line 5 states the contract: "Each question: 100 people surveyed, 8 answers. **Points** = rank (8 = most popular answer, 1 = least). **Surveyed** = how many of the 100 people gave that answer." Line 7: "Round 1 = questions 1–10, Round 2 = 11–20, Round 3 = 21–30." |

**Ten categories, at these line numbers** — exactly the ten asked for, already in the file:

| # | line | category | questions | answers |
|---|---|---|---|---|
| 1 | 11 | Night Out | 30 | 240 |
| 2 | 405 | Dating & Relationships | 30 | 240 |
| 3 | 799 | Travel & Backpacking | 30 | 240 |
| 4 | 1193 | Work & Office Life | 30 | 240 |
| 5 | 1587 | Guilty Pleasures & Bad Habits | 30 | 240 |
| 6 | 1981 | Food & Drinks | 30 | 240 |
| 7 | 2375 | Adulting | 30 | 240 |
| 8 | 2769 | Phones & Social Media | 30 | 240 |
| 9 | 3163 | Awkward & Embarrassing Moments | 30 | 240 |
| 10 | 3557 | Naughty but Nice (18+) | 30 | 240 |

**300 questions, 2,400 answer rows.**

Three records cited by key, different fields (R2):

- **Cat 1, q1** — prompt "Name something you find in your pocket the morning after a big night."
  Top answer *Receipts*, points 8, surveyed 28. Bottom answer *Coat check ticket*, points 1, surveyed 5.
- **Cat 5, q15** — prompt "Name something you pretend you didn't see." Third answer *Someone waving*,
  points 6, surveyed 16.
- **Cat 10, q30** — prompt "Name something you'd say if your roommate walked in at the worst
  possible moment." Answers are quoted speech: `"Get out!"` (8, 34) down to `"We're doing yoga"`
  (1, 1). Note the double quotes inside answer text — they survive parsing; no answer anywhere
  contains a pipe, which is what the table format would break on.

**Parsed and validated, not sampled** — `tools/bank/parse-feud-bank.mjs` reads all 3,947 lines and
asserts per question: exactly 8 answers, points exactly {8,7,6,5,4,3,2,1}, survey counts
non-increasing, prompt non-empty. Result: **no structural problems** across all 300.

## 2. The code that must consume it [OBSERVED]

| path | fact from inside |
|---|---|
| `packages/engine/src/types.ts` | `Answer` carries `surveyCount` ("Survey popularity shown in parentheses on the slide… Display only") and `rankPoints` ("Rank value 8 (most popular) down to 1. Used as the points awarded in REGULAR rounds"). The markdown's two columns map onto these exactly — nothing has to be invented. |
| `packages/engine/src/qmake.ts` | `makeQuestion(id, kind, prompt, raw)` sorts by survey count and assigns `rankPoints = 8 - i`. 28 lines; the single builder used by both the curated deck and the random bank. |
| `packages/engine/src/bank.ts` | line 10: `const COUNTS = [40, 30, 21, 15, 10, 7, 4, 2]` — the existing 100 questions have **template** survey counts, identical on every question. The new bank has *real* per-answer counts. Line 140: `RANDOM_POOL = [...STANDARD_REGULARS, ...NEW_100]`. |
| `packages/engine/src/bank.ts` line 156 | `buildRandomizedGame(pool, round1 = 10, round2 = 10)` picks `round1 + round2 + 1` distinct questions, the last marked `bonus`. So a game is **21 questions: 10 + 10 + 1 bonus.** |
| `apps/web/src/control/TeamSetup.tsx` | lines 33 + 63–83: the existing "Survey mode" control is two buttons — `Standard` ("The fixed deck", `SAMPLE_QUESTIONS`) and `🎲 Randomize Survey` ("Random from 120", `buildRandomizedGame(RANDOM_POOL)`). This is the control the category picker has to replace or extend. |
| `apps/web/src/routes/ControlRoute.tsx` | feud has no pre-game step of its own: `game === "feud"` falls through to `<GameProvider room={room}><ControlView /></GameProvider>`, and ControlView renders the remote immediately. There is **no existing "choose something before you start" screen** for Survey Showdown to hang a category picker on. |

## 3. The one real mismatch

The bank is built for **three rounds of ten** (its line 7). The engine builds **two rounds of ten
plus one bonus** (`buildRandomizedGame`). A category's 30 questions therefore do not map 1:1 onto a
game, and something has to give. That is a product decision, not a technical one, and it is put to
the owner rather than chosen quietly.

## 4. Not opened

- The other 9 categories' individual questions — 300 prompts were parsed and validated
  structurally, but only the 3 records cited above were read as prose.
- `packages/engine/src/fixtures.ts` — `STANDARD_REGULARS` / `SAMPLE_QUESTIONS`, the current
  "Standard" deck. Referenced via bank.ts; its contents not read.
- `packages/engine/test/scoring-and-history.test.ts`, `regular-round.test.ts`, `bonus-round.test.ts`
  and `random-bank.test.ts` — the tests that will have to keep passing.
- The display side of Survey Showdown (`apps/web/src/display/`) — it renders questions from engine
  state, and was not re-read this session.
- Whether any brand/white-label copy references "Randomize Survey" or the 120-question pool.
