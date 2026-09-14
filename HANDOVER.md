# HANDOVER — `GRAPHIC ASSETS/TRIVIA` — DONE

Closes the handover written 2026-09-15 by a session that inspected 6 of 26 files and stopped.

## The request, verbatim

> "PLEASE PROCESS THESE IMAGES. some needs to have their background remove, and some might be
> duplicates, please inspect all of the images and process them."

## Outcome

- **All 26 inspected**, one file at a time, each described from the pixels. `EVIDENCE.md` is the
  manifest and is the authority on what every file contains.
- **18 keyed** to real-alpha PNGs → `GRAPHIC ASSETS/TRIVIA/transparent/`, full 2048×2048 RGBA,
  with `_preview/` JPEGs and `_check/` verification sheets. Each result was opened over **both a
  white and a black ground** before being called done.
- **8 scene plates left untouched** — the six owl reaction plates, the bar lounge, and the
  leaderboard rig. Their backgrounds are real artwork, not a painted checkerboard.
- **Duplicates: there are none.** The only real candidates, the two `Quiz_night_animal_emblem_design`
  files 74 seconds apart, are different pictures — different disc colour, different eyes, different
  expression, different checker tone. Keep both. The earlier 8×8 average-hash "distance 0" result
  was the hash measuring their shared backdrop and is disproven.
- **Nothing was deleted, and no source was modified.**

## Where things are, and why

| what | where |
|---|---|
| keyed PNGs | `GRAPHIC ASSETS/TRIVIA/transparent/*.png` |
| previews | `GRAPHIC ASSETS/TRIVIA/transparent/_preview/*.jpg` |
| verification sheets (white \| black) | `GRAPHIC ASSETS/TRIVIA/transparent/_check/*.jpg` |
| the tool | `tools/assets/dekey.py` |
| the manifest | `EVIDENCE.md` |

The destination was not invented: it copies the layout already established by
`GRAPHIC ASSETS/CHARACTER GRAPHIC ASSETS/transparent/`.

**The PNGs are on disk but deliberately not committed**, for the same reason: that existing
`transparent/` folder is untracked too, and this repo consistently keeps source art out of git
(`Media Assets/` and `tools/promo/src/` are both ignored as large binaries). 18 files at 2048×2048
RGBA is 98 MB. The tool that regenerates them in about a minute is committed instead:

```
python tools/assets/dekey.py "GRAPHIC ASSETS/TRIVIA"
```

## What is still open — owner's decisions

1. **Ten emblems have nowhere to go.** `apps/web/src/trivia/assets.ts` wires **three** round badges
   (science, sports, entertainment). This folder supplies **thirteen** emblems. Whether trivia gains
   categories is a product decision nobody has made. The slot-by-slot mapping is in `EVIDENCE.md`.
2. **Five source defects, logged not fixed** — all are regeneration problems, not keying problems:
   - a **human finger** presses the buzzer in `Thumb_slamming_big_button`, in a cast of twenty
     animals. It runs off the frame edge, so it cannot be cropped out.
   - **garbled neon** reading "HEAS7"/"HEAST" in `Owl_reacting_with_speed_lines` — the same failure
     class as the known Rex "Rlay2e" badge.
   - **placeholder leaderboard text** painted into `Cartoon_owl_presenting_leaderboard`
     ("1. WINNERS / 2. RUNNERS UP / 3.—", the third row clipped by the board's own edge). The file
     cannot serve as a live leaderboard plate unless that board is covered.
   - the owl in `Owl_reacting_with_confetti` is **violet-purple**; in the other five plates it is
     **brown**.
   - the owl's **bow tie is a different colour in all six plates** and its jacket changes too. Cut
     together in one game, the host changes clothes between every reaction.
3. **The glow checker**, described below. Fixable only by repainting.

## If you touch the keyer, read this first

The two things that make this problem look easy and are both wrong:

1. **Do not fit a global checkerboard grid.** It is the obvious approach. The checker was painted by
   a generative model, not ruled: the period is stable (51.06 → 51.24 across one frame) but the
   **phase drifts**, so a single global grid is in step at one edge and half a square out elsewhere.
   It leaves a full-width band of un-keyed checkerboard across the image **while scoring "49.1%
   cleared, fit 1.20"**. The tool measures local contrast instead and never needs the phase.
2. **Do not trust any statistic.** Every defect found in this job was invisible in all of them. A
   collar of surviving checker squares hugging the Geography badge scored 38% clear, 0.11% soft.
   The only thing that caught any of it was compositing each result over white *and* black and
   looking at it. `_check/` exists for that, and the sheets are one file each, never a montage.

And one thing that looks like a defect and is not: **the pale ring around the Geography badge is
real artwork.** The source has a mint glow painted outside the rim that washes out the checker
behind it. It was nearly "fixed" away.

### Known limitation — the glow checker

On `Red_cross`, `Green_tick`, `Retro_countdown_clock` and `Thumb`, a checker texture survives inside
the broad soft glow. The generator did not let the glow *tint* the checkerboard; it drew the checker
at full strength through it. A dark square inside Red_cross's teal halo samples `[0,1,0]` — pure
background, no teal in it whatsoever. No unpremultiply recovers colour that was never painted.

Substituting the locally averaged colour there **was tried and is worse**: where the background tone
is black, "sits at a background tone" also matches every black outline in the artwork, so the repair
washes the linework out to muddy grey. Fixing this properly means repainting the glow — inpainting,
i.e. generating art rather than processing it — so it is left alone and recorded. Visible at 1:1
over black; not at game size.
