# EVIDENCE — Bingo dares: the owner's deck, on Render only

**Task, in two parts.** First: "Please change the render version bingo game to have these dates
[dares] instead. `party-dares (1).md` — please deploy once finished changing."
Then, mid-build: **"don't add it to the playzoo.snapaweb.com system just render."**

Phase 0 under the Evidence Protocol: the source data and every consumer of it, opened and verified,
before the edit. R7 — the change is gated on this.

---

## 1. The source data [OBSERVED]

| path | bytes / lines | a fact from inside |
|---|---|---|
| `C:\Users\johns\Downloads\Murder Mystery Graphic Assets\party-dares (1).md` | 5,093 bytes, 91 lines | titled `# Bingo Dares`; five sections `## B`, `## I`, `## N`, `## G`, `## O`; entry format `- **B1.** Take a selfie with a person from another table.` |

Copied into the tree as **`docs/party-dares.md`** so the generated deck is reproducible from inside
the repo (AMD-005: the source for the work belongs in the working tree, not on a desktop).

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

- **B1** — "Take a selfie with a person from another table." The only dare in its column ending in a
  full stop; most are unpunctuated or end in `!`.
- **N31** — "Raise your cards & get a free shot!" Carries a raw `&`; survives as text, nothing in
  the render path HTML-escapes it (verified on the display, §5).
- **O66** — "Find someone who's not wearing flip flops and ask them to teach you how to say
  \"I love you\" in a different language." The longest entry at 115 chars, and one of eight carrying
  embedded double quotes (`"I'M BATMAN"`, `"Jingle Bells"`, `"Would you rather...?"`,
  `"I know what you did"`, `"Thank you!"`, `"we did it"`, `"happy birthday"`).

## 2. The code that consumes it [OBSERVED]

| path | fact from inside |
|---|---|
| `packages/engine/src/bingo.ts:84-87` | `dareForBall(id, dares = DEFAULT_DARES)` looks the dare up **positionally**: `BINGO_BALLS.findIndex(b => b.id === id)` then `dares[idx]`. **The array index IS the ball.** One missing or extra line shifts every dare after it onto the wrong ball, and nothing in the app would report it — the host would simply call the wrong dare all night. This is why the deck is generated with a validating generator, not hand-typed. |
| `packages/engine/src/bingo.ts:22` | `BINGO_BALLS` = `COLUMNS.flatMap(...)` → B1…B15, I16…I30, N31…N45, G46…G60, O61…O75. The markdown's own numbering **is already this order**, so the mapping is identity, not a guess. |
| `packages/engine/test/bingo.test.ts:17-18` | asserts `DEFAULT_DARES.length === 75` and `dareForBall("B1").length > 0`. |
| three render surfaces | `BingoControl.tsx:47` (host, host-only preview), `BingoDisplay.tsx:119` (big screen), `BingoPlayer.tsx:91` (every player's phone). `grep -rn "DARES\|bingoDares"` across `packages`, `apps`, `tools` returns only these plus gitignored `dist/` — there is no fourth consumer. |
| `apps/web/vite.config.ts:12` + `packages/engine/package.json` | `@ff/engine` resolves to `src/index.ts` by BOTH the package `exports` and an explicit Vite alias. `packages/engine/dist/` is **gitignored stale output** and is not what ships — checked, because editing `src` while the build reads a committed `dist` is how a change "lands" without reaching anyone. |
| `render.yaml:19-27` | already scopes one setting to Render alone (`GAMES_OPEN: "true"`), with the note that "the Hetzner box reads its own environment from a systemd drop-in and **never looks at this file**". This is the existing, documented seam for "Render only" — so the deck flag uses it rather than inventing a second mechanism. |

## 3. What was built, and the correction

**First pass (commit `23cfafc`, deployed):** replaced `DARES` outright. That put the new deck on
**both** hosts, because both deploy from the same `main`. The owner then said Render only.

**Second pass (this commit):**

- `packages/engine/src/bingoDares.ts` — **restored byte-for-byte from `25a4676`** (`git diff` against
  that commit is empty). The public site is back to the deck it had.
- `packages/engine/src/bingoDaresParty.ts` — the owner's deck, generated, exported as `PARTY_DARES`.
- `apps/web/src/bingo/dares.ts` — picks the deck at **build time** from `VITE_BINGO_DARES`.
- `render.yaml` — sets `VITE_BINGO_DARES=party`, Render only.
- `tools/bank/generate-dares.mjs` — refuses to emit unless all 75 are present, numbered 1…75 without
  gaps, each in its own column. Escaping is `JSON.stringify`, never hand-written.

**Why build-time and not `location.hostname`** [INFERRED, stated as reasoning not observation]: a
hostname check would put deployment policy inside render code, ship **both** decks to every visitor,
and do the wrong thing on a preview URL, a custom domain or localhost. A build flag is decided by
the host doing the deploying and is visible in the file that configures it.

## 4. Verification — the decks [OBSERVED]

| check | how | result |
|---|---|---|
| no mangled bytes | `grep -P '[\x00-\x08\x0b-\x1f]'` over the generated deck | none |
| quotes survived | `cat -A` on all 8 quote-bearing lines | `\"` intact, no stray bytes |
| text matches source | parsed the emitted array, compared all 75 to the markdown | **0 mismatches** |
| public deck restored | `git diff 25a4676 -- packages/engine/src/bingoDares.ts` | **empty** |
| test suite | `npm test` / `npm run test:engine` | **69 engine tests pass**, incl. a new one asserting the party deck is also exactly one dare per ball and is genuinely different from the default |
| typecheck | `npm run typecheck` | clean |
| **build A (public/Hetzner)** | `npm run build`, grep the bundle | old deck present (`Trust the process`), new deck **absent** (`Raise your cards` = 0, `Tequila song` = 0) — the party deck **tree-shakes out entirely** |
| **build B (Render)** | `VITE_BINGO_DARES=party npm run build`, grep the bundle | new deck **present** (`Raise your cards`, `Tequila song`, `charade` all = 1) |
| the two differ | `cmp buildA.js buildB.js` | differ |

## 5. Verification — the live render (R4) [OBSERVED]

Not a capture and not a class-name reading: the build-B bundle was served locally and **driven**
through Chrome DevTools Protocol — a real host controller at 390×844 and a real display at
1920×1080, on the real Socket.IO relay (`tools/smoke/bingodares.mjs`, kept as a guard).

All **75** balls were drawn, each dare revealed, and the display measured on each one:

| measurement | value |
|---|---|
| dares measured on the display | 75 of 75 |
| distinct texts observed | 70 |
| **clipped** (`scrollHeight > clientHeight`) | **0** |
| **off-screen** (`bottom > innerHeight`) | **0** |
| longest rendered | O66, 115 chars → **672×130px, 4 lines at 24px**, not clipped, fully on screen |
| second/third tallest | 98px / 3 lines (79ch and 92ch) |

**The thing present live and absent from every static capture (R4):** the display's own state pill
read **"BINGO · Host linked · 75/75 drawn"**, and the rendered dare for ball **I28** was
*"Show us the funniest photo you have in your camera roll!"* — which is the **party** deck's I28.
The default deck's I28 is *"Give the person to your left a compliment they didn't see coming"*.
That single DOM value is the proof the build flag reaches the render, not merely the bundle.

**The screenshot, described from opening it (LAW 1):** 1920×1080. "Bingo Night" wordmark top-left,
"Bingo" in pink and "Night" in purple. Top-right dark pill: "BINGO · Host linked · 75/75 drawn" with
a green dot. Centre: an orange circular ball reading "I" over "28". Directly beneath it a dark navy
rounded card with white bold text — the revealed dare quoted above — sitting legibly over the
painted background. Below that the full B/I/N/G/O caller board, 1–75 in five labelled rows, with 28
highlighted in orange. Bottom centre: Rex the host (pith-helmeted avatar) with a speech bubble
"Settle down, you animals!". Background is the painted bingo-balls-and-cards scene in pastels on
cream; the artwork's own "frendz Bingo Night" lettering shows through behind the dare card.

## 6. Judgement calls, stated not hidden

- **The duplicate is kept verbatim.** `I20` and `I21` are the same text in the owner's file. They
  are two different balls and two different squares, so it is harmless — and silently rewriting the
  owner's content would be the worse failure. Flagged, not fixed.
- **Render ships both decks** (~4kB): `dareForBall`'s default parameter keeps `DEFAULT_DARES`
  referenced, so it cannot tree-shake there. The public build is the one that matters and it carries
  only its own deck.
- **The first pass reached playzoo for roughly 25 minutes** before being reverted. Recorded here
  rather than quietly dropped.

## 7. Not opened

- The remaining 66 dares were parsed, length-checked and rendered, but not read as prose for tone.
- The **player phone** surface (`BingoPlayer.tsx`) was patched identically to the other two and
  typechecks, but was **not driven or photographed** — only the host controller and the display were.
- The **live Render deployment** had not finished rebuilding at the time of writing; verification
  above is against a local server running the identical build-B bundle. The post-deploy check on
  both hosts is reported separately in the turn.
- Bingo still has **no win detection** (long-standing, unrelated to this change, still open).
