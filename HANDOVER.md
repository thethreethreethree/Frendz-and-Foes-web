# HANDOVER — process `GRAPHIC ASSETS/TRIVIA`

For the next agent. Written 2026-09-15 at the end of a session that could not finish the job.

## The request, verbatim

> "PLEASE PROCESS THESE IMAGES. some needs to have their background remove, and some might be
> duplicates, please inspect all of the images and process them."

Folder: `GRAPHIC ASSETS/TRIVIA/` — 26 files, 65.3 MB, untracked (not in git).

## State: 6 of 26 inspected. Nothing processed. Nothing altered.

`EVIDENCE.md` at the repo root is the Phase 0 manifest and is the thing to continue, not restart.
It already holds full descriptions of six files and the hard facts for all 26.

---

## Read this before you open anything

**1. Downscale BEFORE you read any image at native size.**
Once a conversation holds several images, the API caps *every* image in it at 2000 px on the longest
edge. The emblems are 2048 px square. Reading six at native size retroactively blocked every further
image read in the last session — including 1000 px previews. It cannot be undone mid-session.

Do this first, then only ever open the previews:

```
python tools/assets/previews.py "GRAPHIC ASSETS/TRIVIA" <outdir> 1000
```

Full frames, never crops — a crop hides the corner that carries the painted checkerboard. The script
asserts its output count, because an earlier version truncated names to 40 characters and silently
collapsed `Quiz_night_animal_emblem_design_…044340` and `…044433` onto each other: 26 in, 25 out,
nothing errored, and the missing pair was the exact duplicate question under investigation.

**2. Do not trust any automated background detector. One was written and it is wrong.**
Measured against the six files that were actually looked at, it got four wrong:

| file | detector | truth (observed) |
|---|---|---|
| History_quiz_emblem_design | none | DARK checkerboard |
| Music_quiz_emblem_design | none | DARK checkerboard |
| Party_game_screen_leaderboard | DARK checker | real neon room, no checker |
| Quiz_room_waiting_for_game | DARK checker | real bar interior, no checker |

Acting on it would key the background out of a scene plate and leave a checkerboard baked inside an
emblem. On a mostly-flat 2048 px image a corner sample measures the *frame*, not the *fill*. The same
defect made an 8×8 average hash report distance 0 between three visibly different emblems — it was
comparing their shared backdrop. **Eyes decide. Measurements are hints.**

**3. LAW 1a is in force.** 26 files means 26 openings and 26 written descriptions. No contact sheets,
no montages, no group entries, no describing from a filename. The Evidence Protocol adds R5: every
report ends with a `Not opened:` list, or the word none.

---

## What the job actually is

**Every file is JPEG/RGB. Not one has an alpha channel** — JPEG cannot carry one. So every
"transparent" background in this folder is *painted artwork*: a literal checkerboard drawn as pixels.
"Remove the background" means **key that checkerboard out and write a PNG with real alpha.**

Two checkerboard variants exist, confirmed by eye:
- **LIGHT** — grey/white squares (e.g. `Film_quiz_emblem_icon`, `Sport_quiz_night_emblem`)
- **DARK** — black/charcoal squares (e.g. `History_quiz_emblem_design`, `Music_quiz_emblem_design`)

A keyer tuned only for light grey will silently pass over every dark one. Handle both, and verify by
compositing each result over BOTH a white and a black ground — a halo or a surviving checker square
is invisible against one and obvious against the other.

**Do not key the scene plates.** Two are confirmed real backgrounds and must be left whole:
- `Quiz_room_waiting_for_game` — bar lounge; the blank white projector screen is a content area
- `Party_game_screen_leaderboard_ba…` — leaderboard rig; the empty slots are where scores get drawn

The four 2752×1536 owl files are almost certainly scenes too, but **they have not been opened** —
confirm before deciding.

## The duplicate question

No two files are byte-identical; all 26 md5 digests differ. The only genuine candidates are
`Quiz_night_animal_emblem_design_2K_20260915044340.jpeg` (2.37 MB) and `…044433.jpeg` (2.31 MB) —
same prompt stem, 74 seconds apart. Whether they are the *same picture* is a question only looking
can settle. Open both, side by side in sequence, and say plainly which to keep and why. Other
apparent matches from hashing are backdrop artefacts, not duplicates.

## Still undecided — ask, do not assume

- **Where processed files go.** Not chosen. `apps/web/public/` is where game art lives, but the
  naming scheme and whether these replace or supplement existing trivia art is the owner's call.
- **Whether to keep the source JPEGs.** They are untracked; nothing is committed.
- **What the emblems are for.** Eight category emblems were seen or implied (music, film, sport,
  history, science, geography, food/burger, adult). Whether trivia gains categories is a product
  decision nobody has made.

## Useful things already true

- **No file contains any text.** Six confirmed by eye, and it matters: these reuse under any brand
  with no re-lettering, which suits the white-label venue feature.
- Size classes: **2048×2048** ×20 (emblems, icons, props), **2752×1536** ×6 (scenes, owl reactions).
- Art style matches the existing PlayZoo look — neon on dark, heavy black outlines, mint/purple/pink.

## Definition of done

1. `EVIDENCE.md` lists all 26 with subject, text, and background — one line per file, ending in a
   `Not opened:` line reading `none`.
2. A keep/discard call on the `Quiz_night_animal_emblem_design` pair, with the reason.
3. PNGs with real alpha for every emblem that carries a painted checkerboard, each checked over both
   white and black.
4. Scene plates untouched.
5. Nothing deleted from `GRAPHIC ASSETS/TRIVIA/` without the owner saying so.
