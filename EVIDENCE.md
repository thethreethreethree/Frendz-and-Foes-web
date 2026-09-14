# EVIDENCE — GRAPHIC ASSETS/TRIVIA

Phase 0 manifest for the request: *"some needs to have their background remove, and some might be
duplicates, please inspect all of the images and process them."*

Source: `GRAPHIC ASSETS/TRIVIA/` · 26 files · 65.3 MB total · opened 2026-09-15.

**Status: INCOMPLETE. 6 of 26 opened. Processing has NOT begun and must not begin on this manifest.**

---

## Facts from inside the files (all 26) [OBSERVED — pixel/metadata read, not visual inspection]

| fact | value |
|---|---|
| Container | every file is **JPEG**, mode **RGB** — *no alpha channel exists in any of them* |
| Size class A | **2048×2048**, 20 files — emblems, icons, props |
| Size class B | **2752×1536** (16:9), 6 files — scenes and owl reactions |
| Exact duplicates | **none** — all 26 md5 digests differ |
| Same-stem pair | `Quiz_night_animal_emblem_design_2K_…044340` and `…044433` — identical prompt stem, 74 seconds apart, different md5 (2.37 MB vs 2.31 MB) |

Because JPEG cannot carry transparency, **any "transparent" background in these files is painted
artwork** — a literal grey-and-white or black-and-charcoal checkerboard drawn as pixels. That is the
thing to key out, and it is why "remove the background" is the right description of the job.

---

## Files I have actually opened and looked at (6)

| # | file | subject | text | background |
|---|---|---|---|---|
| 20 | `Quiz_room_waiting_for_game` | Dark neon bar lounge. Wolf + second canine at left, fox in leather jacket holding a martini, badger in an orange floral Hawaiian shirt, scowling brown bear in blue shirt. Large **blank white projector screen** centre. Neon: pink flamingo, cyan paw, green paw, orange dog, magenta cat. Two glasses on a warm-lit table. | none | **Real scene.** No checkerboard. The white screen is a content area to composite into. |
| 16 | `Party_game_screen_leaderboard_ba…` | Teal scoreboard rig, five columns of **empty leaderboard slots**, magenta header bar per column. Cyan/magenta neon tubes, purple doorway left, orange doorway right, orange floor light. | none | **Real scene.** No checkerboard. Slots are deliberately blank for names/scores. |
| 11 | `Music_quiz_emblem_design` | Cracked vinyl record — purple upper-left, hot pink lower-right, lime centre label, orange rim — with a microphone (purple mesh head, pink/orange body) at right. Two concentric mint neon rings with stars. | none | **DARK checkerboard**, faint, visible top-left. |
| 06 | `Film_quiz_emblem_icon` | Circular badge: deep purple disc, double mint neon ring, film clapperboard (dark grey, white stripes, orange edge), mint film strip curling around it, ring of small lime + orange stars. | none | **LIGHT checkerboard**, grey/white, full frame. |
| 25 | `Sport_quiz_night_emblem` | Circular badge: purple disc, mint neon rim, four sparkles at compass points. Orange trophy with scratch marks, lime whistle on a lime lanyard draped over it, one pink sparkle. | none | **LIGHT checkerboard**, grey/white, full frame. |
| 10 | `History_quiz_emblem_design` | Broken classical column — lavender, pink neon edge, cracked capital, fluted shaft, rubble base lit orange — with a rolled parchment scroll (lime-to-yellow, pink edge) leaning right. Mint double neon ring, sparkles left/right/bottom. | none | **DARK checkerboard**, black/charcoal. |

**None of the six carries any text.** That matters: these can be reused under any brand without
re-lettering, and nothing needs translating or redrawing.

---

## Why I stopped rather than continued

An automated checkerboard detector was written and run over all 26. **It is wrong, and I can prove
it** — it disagrees with direct observation on four of the six files above:

| file | detector said | I saw |
|---|---|---|
| 10 History | none | dark checkerboard |
| 11 Music | none | dark checkerboard |
| 16 Party_game_screen | DARK checker | real neon room, no checker |
| 20 Quiz_room | DARK checker | real bar interior, no checker |

Two false negatives and two false positives in six. Its verdict on the other 20 files is therefore
worthless as a basis for processing: acting on it would key the background out of a scene plate and
leave a painted checkerboard inside an emblem. That is precisely the failure LAW 1 exists to stop —
the background of a 2048px emblem is mostly flat, so a corner sample measures the *frame*, not the
*fill*. (The same defect made an 8×8 average hash report `d=0` between three visibly different
emblems: it was measuring their shared backdrop, not their subjects.)

**Blocker.** The API caps every image in a conversation at 2000 px once it holds many. The six above
were read at their native 2048 px, which retroactively trips that ceiling, so further image reads are
refused in this session — including 1000 px downscales. This is a context limit, not a file problem.

One related near-miss worth recording: my first preview pass wrote filenames truncated to 40
characters, which silently collapsed the two `Quiz_night_animal_emblem_design` files onto each other
— 26 in, 25 out. Those are the exact pair I need in order to judge the duplicate question. Caught by
counting the output, not by the code reporting success.

---

## Not opened (20)

`Adult_quiz_night_emblem` · `Burger_quiz_emblem_design` · `Cartoon_owl_presenting_leaderboa…` ·
`Cartoon_owl_reacting_to_wrong` · `Circular_quiz_emblem_for_art` · `Flame_drawn_as_isolated_object` ·
`Geography_quiz_emblem_design` · `Green_tick_stamped_down` · `Owl_adjusting_glasses` ·
`Owl_reacting_to_streak` · `Owl_reacting_with_confetti` · `Owl_reacting_with_speed_lines` ·
`Quiz_emblem_featuring_question_mark` · `Quiz_night_animal_emblem_design_…044340` ·
`Quiz_night_animal_emblem_design_…044433` · `Red_cross_game_prop` · `Retro_countdown_clock_ticking` ·
`Retro_monitor_quiz_emblem` · `Science_quiz_emblem_design` · `Thumb_slamming_big_button`

The duplicate question cannot be answered until the two `Quiz_night_animal_emblem_design` files are
seen side by side. Their md5s differ, so they are not byte-identical; whether they are the *same
picture* is a question only looking can settle.
