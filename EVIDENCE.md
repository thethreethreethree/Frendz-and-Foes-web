# EVIDENCE — the host controller remote, read before redesign

**Task:** "redesign the controller remote to be more user friendly and have a better graphic
interface." Phase 0 under the Evidence Protocol: every controller surface opened, one file at a
time, before any design decision. R7 — design is gated on approval of this manifest.

**Method.** Each file below was opened and read in full. Facts cited are from inside the file, by
line. Grep was used ONLY to verify a claim across files after reading them (the table in FINDING 3),
never to form one.

---

## 1. The extent of "the controller remote" [OBSERVED]

It is not one screen. `routes/ControlRoute.tsx` is a 258-line router that dispatches to **fourteen
separate controller components**, written in **two unrelated component vocabularies**, sharing a
9-file kit that only four of them use.

| # | path | bytes | a fact from inside |
|---|---|---|---|
| 1 | `apps/web/src/routes/ControlRoute.tsx` | 9440 | line 87: `if (roomInUrl && !resolved)` renders "Finding room {roomInUrl}…" — the guard added so the URL's guessed game never paints first |
| 2 | `apps/web/src/control/ui.tsx` | 2192 | the entire shared button kit is 68 lines; `CtrlButton` has 7 tones, mapped at line 50: `ink: "bg-ink text-canvas"` |
| 3 | `apps/web/src/control/ControlView.tsx` | 3377 | lines 68–79 stack **11 panels** in one scrolling column: TeamSetup, TeamJoinCodes, IncomingGuesses, BuzzInPicker, AnswerKey, ScoreOverride, TimerControls, ScreenDirector, SfxBoard, MusicControl, QuestionJump |
| 4 | `apps/web/src/control/panels.tsx` | 6802 | line 86 carries its own bug postmortem: "SFX_NAMES gained kill/toll/heartbeat/gong but this map did not, so those four buttons rendered with tone={undefined}" |
| 5 | `apps/web/src/control/TeamSetup.tsx` | 5850 | `MIN_TEAMS = 3`, `MAX_TEAMS = 12` (lines 11–12); PALETTE holds 12 hexes starting `#ff2e9a` |
| 6 | `apps/web/src/control/TeamJoinCodes.tsx` | 3471 | line 14 `useState(false)` — the team QR is collapsed behind "▸ Show QR to pair a team's answer-phone" |
| 7 | `apps/web/src/control/AnswerKey.tsx` | 5492 | line 31 sorts teams so the expected answerer is first; line 18 fuzzy-matches only `!a.revealed` answers, min 2 chars |
| 8 | `apps/web/src/control/BuzzInPicker.tsx` | 2555 | line 14 caps buzz-in at 3 teams: `else if (chosen.length < 3)` |
| 9 | `apps/web/src/control/IncomingGuesses.tsx` | 4275 | line 32 caps the guess queue at 12: `[item, ...qq].slice(0, 12)`; returns `null` when empty (line 44) |
| 10 | `apps/web/src/control/turn.ts` | 1423 | line 3 `SLOT_NAMES = ["Steady Green (1st)", "Flashing Green (2nd)", "Blue (3rd)"]` |
| 11 | `apps/web/src/control/fuzzy.ts` | 2228 | `bestMatch` default `threshold = 0.45`; `contains` scores a flat `0.85` (line 46) |
| 12 | `apps/web/src/music/MusicControl.tsx` | 7468 | line 142: the song search input is `bg-white ... text-ink` — see FINDING 1 |
| 13 | `apps/web/src/trivia/TriviaControl.tsx` | 16434 | the largest remote; line 263 "Answer key is host-only — teams don't see it until the reveal" |
| 14 | `apps/web/src/bingo/BingoControl.tsx` | 6018 | line 22 shows `{bingo.drawn.length}/75`; line 136 "Permanent code — safe to print on a poster" |
| 15 | `apps/web/src/monikers/MonikersControl.tsx` | 10982 | line 19 root is `bg-canvas p-4` with **no max-width**; deck size slider `min={12} max={40} step={4}` (line 86) |
| 16 | `apps/web/src/headsup/HeadsUpControl.tsx` | 10571 | line 21 returns full-bleed tap-zones during play: "go full-screen tap-zones (no chrome) so the holder can tap by feel"; PASS is top, GOT IT bottom (lines 151–157) |
| 17 | `apps/web/src/offlimits/OffLimitsControl.tsx` | 10406 | lines 210–211: **two buttons, one handler** — see FINDING 2 |
| 18 | `apps/web/src/pictionary/PictionaryControl.tsx` | 10003 | `PEN_COLORS` (line 13) ends `"#ffffff"`, labelled `aria-label={c === "#ffffff" ? "eraser" : "pen"}` (line 130) |
| 19 | `apps/web/src/fullcast/FullCastControl.tsx` | 9349 | line 116 instructs "Pick ONE guesser to look away" |
| 20 | `apps/web/src/murder2/Murder2Host.tsx` | 6957 | `roleComposition()` line 52 mirrors the server: `picked >= 14 ? 3 : picked >= 8 ? 2 : 1` murderers |
| 21 | `apps/web/src/codenames/CodenamesHost.tsx` | 4253 | line 31 hardcodes team hexes `#d64550` / `#3b7dd8` — outside the token system |
| 22 | `apps/web/src/justone/JustOneHost.tsx` | 3108 | line 8: "the host has the same controls as a backstop" |
| 23 | `apps/web/src/ballpark/BallparkHost.tsx` | 2771 | phases guessing → betting → reveal, each one button (lines 32–34) |
| 24 | `apps/web/src/telestrations/TelestrationsHost.tsx` | 2858 | line 26 FORCE NEXT TURN shows `({done}/{state.players.length})` |
| 25 | `apps/web/src/afterdark/AfterDarkHost.tsx` | 2993 | line 19 appends `<span className="text-danger text-sm">18+</span>` to the title |
| 26 | `apps/web/src/net/pairing.tsx` | 4570 | line 101 `ControlPairButton` pairs via `window.prompt(...)` — a native browser prompt |
| 27 | `apps/web/tailwind.config.js` | 3488 | line 35 `pink: "rgb(var(--c-primary) / <alpha-value>)"` — the legacy names are aliases onto the semantic tokens |
| 28 | `apps/web/src/index.css` | 8042 | line 12 `--c-ink: 244 247 255`; line 13 `--c-canvas: 11 15 26`; `.ff-tap` (line 71) sets `min-height: 44px` |
| 29 | `apps/web/src/brand/brand.ts` | 5921 | `defaultBrand.productName` is `"PlayZoo"`; `primary: "139 92 246"` (#8b5cf6 violet) |
| 30 | `packages/engine/src/bingo.ts` | 95 lines | `isBingoComplete()` (line 93) returns `drawn.length >= 75` — no card, no line detection |

---

## 2. FINDINGS

### FINDING 1 — white-on-white text in the music panel [OBSERVED in source; contrast is arithmetic]

`MusicControl.tsx` line 142, the song search input:

```
className="... bg-white px-3 py-2 text-base text-ink outline-none focus:border-teal"
```

`bg-white` is the literal `#ffffff`. `text-ink` resolves through `tailwind.config.js` line 19 to
`rgb(var(--c-ink))`, and `index.css` line 12 sets `--c-ink: 244 247 255` — **#f4f7ff**. Text
#f4f7ff on background #ffffff is a contrast ratio of about **1.03:1**. WCAG AA for body text is
4.5:1.

Both classes sit on the same element, so no cascade question arises: what the host types into the
music search box is invisible. Line 156 does the same to every **unselected** song row
(`border-ink/10 bg-white`, colour inherited) — [INFERRED], since that one depends on the cascade.

This panel is rendered by `ControlView.tsx` line 78 (Survey Showdown) and `BingoControl.tsx` line
80 (Bingo) — two shipped remotes.

The cause is dateable: the literal `bg-white` predates the dark default. `index.css` line 6 says
"Dark default scheme (party-app look)"; `--c-ink` was flipped to near-white for it, and every
token-based colour followed. The two literal `bg-white`s did not.

### FINDING 2 — two buttons, one behaviour [OBSERVED]

`OffLimitsControl.tsx` lines 210–211, the end-of-game screen:

```
<button onClick={g.reset} ...>REMATCH (same teams)</button>
<button onClick={g.reset} ...>New teams / rules</button>
```

Identical handler. The remote offers the host a choice it does not implement: whichever they press,
`g.reset` runs. Off Limits is the only one of the fourteen that offers the pair at all — the other
turn-based remotes ship a single "PLAY AGAIN".

### FINDING 3 — no way home from ten of fourteen remotes [OBSERVED]

`HomeButton` (`control/ui.tsx` line 8) is the only route back to game selection; it confirms first,
because leaving mints a new room. Counted across the fourteen roots, after reading each:

| | games |
|---|---|
| **has HomeButton** | Survey Showdown, Trivia, Bingo, Murder Mystery — **4** |
| **has none** | Encore, Foreheads, Off Limits, Quick Draw, Full Cast, Cover Ops, Solo Clue, Ballpark, Sketch Relay, After Dark — **10** |

Nine of those ten render `StatusPill` in the same top-right slot where the other four put Home, so
the position is occupied by something that is not a control. To change game on those ten, the host
edits the URL or force-quits the tab.

### FINDING 4 — two component vocabularies over one palette [OBSERVED]

Counted across the fourteen roots:

- **Kit dialect** — `Section` + `CtrlButton`, `max-w-md`, sticky command bar: Survey Showdown,
  Trivia, Bingo (3 files; 8 `<Section` uses in Trivia alone).
- **Hand-rolled dialect** — `ff-sticker` + literal `<section className="rounded-2xl border
  border-line bg-surface p-4">`, no max-width, no sticky bar: the other 11 (49 `ff-sticker` uses).

Worth being exact: these are **not** two palettes. `tailwind.config.js` lines 33–44 alias `pink →
primary`, `teal → secondary`, `cream`/`concrete` → `canvas`, so both dialects resolve to the same
brand variables. The divergence is component vocabulary, spacing and layout shell — not colour.

Consequence in the code: `TEAM_COLORS` (`["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed",
"#0ea5e9"]`) and `const uid = () => Math.random().toString(36).slice(2, 8)` are duplicated verbatim
in **five** files (Monikers, HeadsUp, OffLimits, Pictionary, FullCast), along with a byte-identical
`Scoreboard()`. Those six hexes are outside the token system, so a white-label tenant recolours the
app and the team chips stay red/blue/green. `CodenamesHost.tsx` line 31 hardcodes two more.

### FINDING 5 — the host's pairing flow is a `window.prompt` [OBSERVED]

`pairing.tsx` line 101: `window.prompt("Enter the room code shown on the display (or leave blank to
create one):")`. Native, unstyled, and the only pairing entry on the controller. `ui.tsx` line 13
and `TeamSetup.tsx` line 54 likewise use `window.confirm` for leaving a game and resetting one.

### FINDING 6 — a 44px tap-target rule the remote does not use [OBSERVED]

`index.css` line 71 defines `.ff-tap { min-height: 44px }`, with a comment recording a measured
sweep that found 34px and 20px targets across the phone-facing pages. Searched for `ff-tap` across
all fourteen controller roots and the nine shared kit files: **zero uses**. `CtrlButton`'s
`px-3 py-2 text-sm` computes to roughly 33–34px tall — the same number that comment was written
about. On the host's phone, mid-game, that is the Undo button, the ◀ nav, and every sound-board pad.

---

## 3. What I did NOT do

I read the source. I did **not** render a single controller in a browser this session. FINDING 1's
contrast is arithmetic over two values read in two files, not a screenshot; FINDINGS 3, 4 and 6 are
counts over files I read. Before any of this becomes a redesign, the current state should be
rendered and looked at — that is the step LAW 1 exists for, and it has not happened yet.

No image, icon or graphic asset has been opened. If the redesign touches any, LAW 1a applies: one
file, one opening, one description, no contact sheets.

## Not opened

- The **display** side of all 14 games (`apps/web/src/display/`, 11 files) — the remote's other half.
- The **player** side of all 14 games — what the guest sees while the host drives.
- `apps/web/src/store/` (9 files) — the providers every controller consumes; I read the components'
  use of them, not their contracts.
- `apps/web/src/net/` beyond `pairing.tsx` — 18 files including `socket.ts`, `room.ts`,
  `howtoplay.tsx`, `PlayerRoster.tsx`, `avatars.tsx`.
- `apps/web/src/routes/` beyond `ControlRoute.tsx` — 16 files including `GamePicker.tsx`, which the
  controller renders when no game is chosen.
- `apps/web/src/brand/theme.ts` and `resolve.ts` — how a brand is applied at runtime.
- `pictionary/PictionaryCanvas.tsx` — the draw surface the Quick Draw remote embeds.
- Any rendered screenshot of any controller, at any width, in either theme.
- The gameplay interiors named unopened in the previous audit (scoring, round transitions, win
  conditions, tie-breaks, deck exhaustion) — unchanged, still unopened.

---

# ADDENDUM — the render pass (LAW 1), 2026-09-16

Section 3 above said the remotes had not been rendered. They have now. Built fresh
(`vite build`, 639 modules), served locally on :8099, photographed at 390x844 DPR2 (iPhone-class),
real wall-clock waits. **17 frames, opened and described ONE AT A TIME per LAW 1a** — 14 remotes
plus bottom-of-scroll frames for the three that scroll.

A first run photographed the waitlist interstitial 14 times ("The zoo's not open to just anyone…")
because the local server defaults to `GAMES_OPEN=false`. Caught by printing the body text, not by
looking at file sizes. Re-run with the flag set. **The 14 frames described below are the real
remotes.**

## What rendering found that reading did not

| # | finding | where | severity |
|---|---|---|---|
| R1 | **StatusPill is near-unreadable** — white text on a pale pill (`bg-ink/80 text-white`, `--c-ink` now near-white). ~1.4:1. The room code the host reads aloud is the least legible text on screen. | `net/pairing.tsx:56`, on **10 of 14** remotes | HIGH |
| R2 | **Music song list is white-on-white** — confirmed visually, five ghost rows. My source call had the emphasis backwards: the placeholder reads fine, the 40-song list is what's invisible. | `music/MusicControl.tsx:142,156` — Survey Showdown + Bingo | HIGH |
| R3 | **The floating avatar covers content** — it is position-fixed bottom-right and lands on whatever is there. Observed covering: "End game & show champions" (Survey Showdown), rules 1-3 (Encore), START GAME + rules 2-3 (Foreheads), START GAME (Off Limits), rules line 3 (Quick Draw). | 5+ remotes | HIGH |
| R4 | **Murder Mystery has no panels and raw browser sliders** — the only remote with zero card structure; its two sliders render in Chrome's default blue because `className="w-full"` carries no `accent-primary`. "Players" is a heading over nothing. | `murder2/Murder2Host.tsx:72,75,116` | HIGH |
| R5 | **Team-name inputs are off-palette** — charcoal, not `bg-surface` navy, because the hand-rolled files set `border border-line` with no background class and fall through to the UA dark default. | Encore, Foreheads, Off Limits, Quick Draw, Full Cast | MEDIUM |
| R6 | **No sticky chrome on the 11 hand-rolled remotes** — scrolling throws away game name, room code, status and (absent) Home. The 3 kit remotes keep a pinned command bar. | 11 of 14 | MEDIUM |
| R7 | **Dead space** — Solo Clue / Ballpark / After Dark ~75% empty, Murder ~60%, Cover Ops ~55%, Trivia ~45%. The primary action floats mid-screen instead of sitting under the thumb. | 6 remotes | MEDIUM |
| R8 | **Header collision** — "Sketch Relay" and the status pill touch at 390px; a plain `justify-between` with no wrap rule. At 360px they collide. | `telestrations/TelestrationsHost.tsx:16` | MEDIUM |
| R9 | **White on lavender** — `bg-grape` (#a78bfa) with white text is ~2.1:1. "Apply teams (restart)", "End game & show champions", "Meeting bell", the Trivia selected-mode sub-lines. | Survey Showdown, Trivia | MEDIUM |
| R10 | **Inverted hierarchy** — `CtrlButton tone="ink"` paints near-white, so neutral controls (◀, Teams, Arm buzzers, Standard) are the brightest objects on screen, louder than the violet primary action. | `control/ui.tsx:51` | MEDIUM |
| R11 | **16px checkbox** — "Skips cost 1 point" (`h-4 w-4`), the smallest target in the set, against a documented 44px house rule. | `offlimits/OffLimitsControl.tsx:89` | MEDIUM |
| R12 | **Copied sliders, uncopied ranges** — the identical label "Play to: 20 points" sits hard-right on Quick Draw (`min 5 max 20`) and at 40% on its four siblings (`min 10 max 40`). | `pictionary/PictionaryControl.tsx:71` | LOW |
| R13 | **Panel order differs among the copy-paste siblings** — Off Limits puts HOW TO PLAY before START GAME; Encore, Foreheads, Full Cast, Quick Draw put it after, so the host scrolls past the button to find the rules. Off Limits has it right. | 5 remotes | LOW |
| R14 | **No join instruction** — Solo Clue, Ballpark and After Dark give the host a Start button and never say how players get in. Cover Ops and Sketch Relay carry a caption. | 3 remotes | MEDIUM |
| R15 | **The 18+ mark is the smallest text in its header** — `text-sm` beside a `text-2xl` title, on the only age-gated game. | `afterdark/AfterDarkHost.tsx:19` | LOW |

## What rendering showed was GOOD and should survive the redesign

- **Foreheads' category grid** — emoji + label tiles, correctly sized, and the only selected-state in
  the set that uses violet *on dark* instead of white *on lavender*. It passes contrast comfortably.
  This is the selection model to standardise on.
- **Bingo's "Draw next ball"** — full width, high contrast, unambiguous. The clearest primary action.
- **Trivia's panel rhythm** — three panels, one action, consistent spacing. The layout to copy.
- **Survey Showdown's "Jump to question" grid** — 21 tiles at a proper size with a ringed bonus star.
  The best-proportioned control anywhere in the remote.

## Frames on disk

`feud`, `feud-bottom`, `trivia`, `bingo`, `murder`, `monikers`, `monikers-bottom`, `headsup`,
`headsup-bottom`, `taboo`, `pictionary`, `reverse`, `codenames`, `justone`, `ballpark`,
`telestrations`, `afterdark` — captured by `tools/smoke/_shoot.tmp.mjs`.

## Not opened (render pass)

- Every remote **past its first screen**: no game was actually started, so `playing`, `turnover`,
  `roundover` and `ended` states are unrendered. Foreheads' full-bleed tap-zones, Quick Draw's
  canvas, Survey Showdown's answer key mid-question, Trivia's reveal — all unseen.
- The display and player surfaces for all 14 (unchanged from the main manifest).
- Any width other than 390px, and any theme other than the dark default.
- No brand other than `defaultBrand` was applied.
