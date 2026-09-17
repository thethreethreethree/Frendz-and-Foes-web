# EVIDENCE — Bingo dares replaced from the owner's party-dares file

**Task:** "Please change the render version bingo game to have these dates [dares] instead.
`C:\Users\johns\Downloads\Murder Mystery Graphic Assets\party-dares (1).md` please deploy once
finished changing."

Phase 0 under the Evidence Protocol: the source data and every consumer of it, opened and verified,
before the edit. R7 — the change is gated on this.

---

## 1. The source data [OBSERVED]

| path | bytes / lines | a fact from inside |
|---|---|---|
| `C:\Users\johns\Downloads\Murder Mystery Graphic Assets\party-dares (1).md` | 5,093 bytes, 91 lines | titled `# Bingo Dares`; five sections `## B`, `## I`, `## N`, `## G`, `## O`; entry format `- **B1.** Take a selfie with a person from another table.` |

Copied into the tree as **`docs/party-dares.md`** so the generated file is reproducible from inside
the repo (AMD-005: the source for the work must be in the working tree, not on a desktop).

**Counted, not sampled** — every `- **X<n>.**` line parsed:

| check | result |
|---|---|
| total dares | **75** |
| per column | B 15, I 15, N 15, G 15, O 15 |
| numbering | 1…75, contiguous, in order, no gaps |
| column boundaries | B1–B15, I16–I30, N31–N45, G46–G60, O61–O75 |
| distinct texts | **74 of 75** — `I20` and `I21` are both "Spell your name with your butt!" |
| longest / average | 115 chars / 55 chars (previous deck: 95 / 70) |

Three records cited by key, different fields (R2):

- **B1** — "Take a selfie with a person from another table." The only dare ending in a full stop in
  its column; most are unpunctuated or end in `!`.
- **N31** — "Raise your cards & get a free shot!" Contains a raw `&` — survives as text, nothing in
  the path HTML-escapes it.
- **O66** — "Find someone who's not wearing flip flops and ask them to teach you how to say
  \"I love you\" in a different language." The longest entry at 115 chars, and one of eight carrying
  embedded double quotes (`"I'M BATMAN"`, `"Jingle Bells"`, `"Would you rather...?"`,
  `"I know what you did"`, `"Thank you!"`, `"we did it"`, `"happy birthday"`).

## 2. The code that consumes it [OBSERVED]

| path | fact from inside |
|---|---|
| `packages/engine/src/bingoDares.ts` | previously 80 lines / 5,969 bytes, `export const DARES: string[]`, 75 entries, header said "Sourced from BINGO_INSTRUCTION.docx". |
| `packages/engine/src/bingo.ts:36` | `export const DEFAULT_DARES: string[] = DARES;` — the only re-export. |
| `packages/engine/src/bingo.ts:84-87` | `dareForBall(id, dares = DEFAULT_DARES)` looks the dare up **positionally**: `BINGO_BALLS.findIndex(b => b.id === id)` then `dares[idx]`. **The array index IS the ball.** One missing or extra line shifts every dare after it onto the wrong ball, and nothing in the app would report an error — it would just call the wrong dare all night. This is why the generator validates before it emits. |
| `packages/engine/src/bingo.ts:22` | `BINGO_BALLS` is `COLUMNS.flatMap(...)` → B1…B15, I16…I30, N31…N45, G46…G60, O61…O75. The markdown's own numbering is **already this order**, so the mapping is identity, not a guess. |
| `packages/engine/test/bingo.test.ts:17-18` | asserts `DEFAULT_DARES.length === 75` and `dareForBall("B1").length > 0`. |
| three render surfaces | `BingoControl.tsx:46` (host, host-only preview), `BingoDisplay.tsx:118` (big screen), `BingoPlayer.tsx:90` (every player's phone) — all call `dareForBall(cur.id)`. No fourth consumer: `grep -rn "DARES\|bingoDares"` across `packages`, `apps`, `tools` returns only these plus gitignored `dist/`. |
| `apps/web/vite.config.ts:12` + `packages/engine/package.json` | `@ff/engine` resolves to `src/index.ts` by BOTH the package `exports` and an explicit Vite alias. `packages/engine/dist/` is **gitignored stale output** and is not what ships — checked, because editing `src` while the build reads a committed `dist` is exactly how a change "lands" without reaching anyone. |

## 3. How the change was made

`tools/bank/generate-dares.mjs` (new) parses `docs/party-dares.md` and emits `bingoDares.ts`.
It **refuses to write** unless all 75 are present, contiguously numbered 1…75, and each lands in
the column its number belongs to. Escaping is `JSON.stringify`, never hand-written — a hand-escaped
heredoc is what silently turned `\b` into a literal `0x08` byte earlier in this same session and
disabled a server route for hours.

## 4. Verification [OBSERVED, post-change]

| check | how | result |
|---|---|---|
| no mangled bytes | `grep -P '[\x00-\x08\x0b-\x1f]'` over the generated file | none |
| quotes survived | `cat -A` on all 8 quote-bearing lines | `\"` intact, no stray bytes |
| text matches source | parsed the emitted array, compared all 75 against the markdown | **0 mismatches** |
| mapping through the real engine | imported `@ff/engine`, called `dareForBall` for B1/B15/I16/N31/N45/G46/G60/O61/O75 | each returns its own numbered dare; **0 balls** with a missing dare |
| test suite | `npm test` | **113 pass, 0 fail** (incl. `bingo.test.ts`, 4 tests) |
| build | `npm run build` | clean, 643 modules, 990.38 kB → 279.16 kB gzip |
| **reached the bundle** | `grep` the built `assets/index-*.js` | new dares "Raise your cards", "Act out a charade" **present**; old dares "Do 5 push-ups. Yes, here", "Switch seats with the person to your right - no explanation" **absent** |

## 5. Judgement calls, stated not hidden

- **The duplicate is kept verbatim.** `I20` and `I21` are the same text in the owner's file. They
  are two different balls and two different squares, so it is harmless — and silently rewriting the
  owner's content would be a worse failure than reporting it. Flagged, not fixed.
- **"the render version"** — both hosts (playzoo.snapaweb.com and the Render mirror) deploy from the
  same `main`, so one commit changes both. Verified against playzoo.snapaweb.com per the standing
  instruction that it is the one that matters.

## 6. Not opened

- The remaining 66 dares were parsed and length-checked but not read as prose for tone.
- `BingoDisplay.tsx` rendering was read at the dare block only (`min-h-[5rem]`, `max-w-2xl`,
  `text-2xl`, so longer text wraps and the container grows) — the rest of the display was not
  re-read this session, and **no live screenshot of a 115-char dare on the display was taken.**
- Bingo still has **no win detection** (long-standing, unrelated to this change, still open).
