# EVIDENCE — GRAPHIC ASSETS/TRIVIA

Phase 0 manifest for the request: *"some needs to have their background remove, and some might be
duplicates, please inspect all of the images and process them."*

Source: `GRAPHIC ASSETS/TRIVIA/` · 26 files · 65.3 MB · opened 2026-09-15 (second pass).

**Status: COMPLETE. All 26 opened and described individually; 18 keyed to real-alpha PNGs and each
result inspected over both a white and a black ground; 8 scene plates deliberately untouched.**
See "Processing — what was done" at the end.

Supersedes the first-pass manifest (6 of 26). Every file below was opened as a full-frame 1000 px
preview and looked at, one at a time, per LAW 1a. No contact sheets, no group entries.

---

## Corrections to the first-pass manifest

| first pass said | actually true | how established |
|---|---|---|
| 2048×2048 ×20, 2752×1536 ×6 | **2048×2048 ×18, 2752×1536 ×8** | PIL size read over all 26; counted, not eyeballed |
| two checkerboard variants (light, dark) | **four background classes** — light checker, mid-grey checker, dark checker, flat dark field | seen by eye, then confirmed by border sampling |
| the two `Quiz_night_animal_emblem_design` files are the duplicate candidates | **they are different pictures** — different disc colour, eyes, expression, and checker tone | both opened and compared |

That first row matters more than it looks: 18 vs 8 is exactly the split between "has a painted
background to remove" and "is a real scene that must be left alone."

---

## Facts from inside the files [OBSERVED]

- Every file is **JPEG / RGB**. **Not one has an alpha channel** — JPEG cannot carry one. So every
  "transparent" background here is *painted artwork*: a checkerboard drawn as pixels.
- **No two files are byte-identical** (26 distinct md5 digests), and after opening all 26,
  **no two are the same picture either. There are no duplicates in this folder.**
- **Background classes, measured from a 24 px border frame of each square file** — hi/lo tone, their
  separation, and the checker half-pitch from an FFT of the top row:

| # | file | hi tone | lo tone | sep | half-pitch | class |
|---|---|---|---|---|---|---|
| 01 | Adult_quiz_night_emblem | 254 | 205 | 85.7 | 41.0 px | LIGHT checker |
| 02 | Burger_quiz_emblem_design | 40 | 1 | 67.9 | 51.2 px | DARK checker |
| 05 | Circular_quiz_emblem_for_art | 253 | 207 | 80.3 | 41.0 px | LIGHT checker |
| 06 | Film_quiz_emblem_icon | 250 | 202 | 84.0 | 51.2 px | LIGHT checker |
| 07 | Flame_drawn_as_isolated_object | 21,19,28 | 19,17,25 | **4.7** | — | **FLAT dark field** |
| 08 | Geography_quiz_emblem_design | 254 | 215 | 68.4 | 41.0 px | LIGHT checker |
| 09 | Green_tick_stamped_down | 141 | 94 | 81.0 | 51.2 px | **MID-GREY checker** |
| 10 | History_quiz_emblem_design | 32 | 1 | 54.7 | 51.2 px | DARK checker |
| 11 | Music_quiz_emblem_design | 3,1,13 | 1,0,7 | **5.9** | 41.0 px | DARK checker, near-invisible |
| 17 | Quiz_emblem_featuring_question_mark | 56 | 16 | 67.4 | 41.0 px | DARK checker |
| 18 | Quiz_night_animal_emblem (…044340) | 13 | 1 | 24.7 | 21.8 px | DARK checker |
| 19 | Quiz_night_animal_emblem (…044433) | 254 | 210 | 75.6 | 20.5 px | LIGHT checker |
| 21 | Red_cross_game_prop | 11 | 0 | 18.0 | 51.2 px | DARK checker |
| 22 | Retro_countdown_clock_ticking | 253 | 192 | 106.0 | 51.2 px | LIGHT checker |
| 23 | Retro_monitor_quiz_emblem | 43 | 21 | 39.1 | 51.2 px | DARK checker |
| 24 | Science_quiz_emblem_design | 246 | 170 | 132.6 | 51.2 px | LIGHT checker |
| 25 | Sport_quiz_night_emblem | 252 | 204 | 83.0 | 42.7 px | LIGHT checker |
| 26 | Thumb_slamming_big_button | 252 | 229 | **39.5** | 51.2 px | LIGHT checker, low contrast |

The measurements agree with what I saw on every one of the 18. Two entries are worth naming: **07**
has no checker at all (separation 4.7 is JPEG noise) and **11**'s checker is so faint I could only
resolve the squares in the top-left corner — a corner-sampling detector would call it "no checker"
from any other corner. **The checker pitch ranges 20.5 → 51.2 px and the tones range 254 → 0, so no
single fixed threshold and no single fixed grid keys this folder.**

---

## All 26, one line each [OBSERVED — each opened individually]

### Emblems and props — 2048×2048, painted background, TO BE KEYED (18)

| # | file | subject | text | background |
|---|---|---|---|---|
| 01 | Adult_quiz_night_emblem | Badge: black ring, double mint neon ring w/ 4 stars, purple disc. Margarita glass (mint bowl, amber liquid, lime wheel on rim) + hot-pink kiss lips lower right. | none | LIGHT checker |
| 02 | Burger_quiz_emblem_design | Badge: near-black disc, mint neon ring w/ stars. Stacked burger — purple seeded bun, pink tomato, lime lettuce, purple patty, orange cheese, 2nd pink patty, purple base — purple/orange fork stabbed through the top. | none | DARK checker. **Disc is near-black too — a naive dark key eats the emblem.** |
| 05 | Circular_quiz_emblem_for_art | Badge: dark teal-black disc, bright mint neon ring glowing past its own edge, 4 sparkles. Mauve wooden palette w/ thumb hole + magenta/violet/pink/lime/green/orange paint blobs, orange brush w/ rainbow bristles laid diagonally. | none | LIGHT checker. Glow fades into it — needs soft alpha. |
| 06 | Film_quiz_emblem_icon | Badge: deep purple disc, double mint neon ring, ring of small lime + orange stars. Open clapperboard (charcoal, white stripes, orange edge) w/ mint film strip curling behind. | none | LIGHT checker, small squares. **Clapper stripes are near-white = the same value as the checker's light tone; a brightness-only key punches holes in the subject.** |
| 07 | Flame_drawn_as_isolated_object | Flame, no badge. Violet→magenta→pink→orange→yellow body, heavy black line, glowing mint neon outline, hollow teardrop outlined inside. | none | **FLAT dark navy-charcoal field.** Inner teardrop is the same colour as the field — see Owner's calls. |
| 08 | Geography_quiz_emblem_design | Badge: near-black disc, double mint neon ring w/ glow + 6 outlined stars. Desk globe on a grey stand w/ meridian arc, lavender/teal oceans, lime/green/orange land; hot-pink map pin over Europe. | none | LIGHT checker |
| 09 | Green_tick_stamped_down | Chunky check mark, no badge. Lime top face, darker green underside, 2 white gloss streaks, black outline, strong cyan-teal glow halo. | none | MID-GREY checker. Glow bleeds well into it. |
| 10 | History_quiz_emblem_design | Badge: double mint neon ring w/ 4-point sparkles at L/R/bottom, dark navy-purple disc. Broken classical column (lavender-pink cracked capital, fluted shaft, orange-lit rubble base) + lime-to-yellow scroll w/ pink edge leaning right. | none | DARK checker. Disc is dark *purple*, not black — that narrow gap is what separates subject from background. |
| 11 | Music_quiz_emblem_design | Badge: two concentric mint neon rings w/ stars, filling nearly the frame. Cracked vinyl — violet upper-left, hot-pink lower-right, lime label, orange rim glow, a chunk broken from the upper-left edge — + microphone (violet mesh head, orange band, pink/orange handle) diagonal lower right. | none | DARK checker, **only resolvable in the top-left corner**. Ring reaches almost to the frame edge, so there is barely any background to remove. |
| 17 | Quiz_emblem_featuring_question_mark | Badge: dark navy disc, double mint neon ring w/ stars. A "?" built from props — shot glass of orange liquid mid-splash + 2 dice (the hook), key, lavender skull w/ eyepatch + lime bandana, pink-striped bowling pin (the stem), purple sunglasses, pizza slice (the dot). Pink shape behind the hook. | none — the ? is drawn from objects, not typeset | DARK checker |
| 18 | Quiz_night_animal_emblem (…044340) | Badge: black disc, single mint neon ring w/ glow, stars + flourish arcs. Violet paw, 4 hot-pink toe pads + pink palm pad; the palm carries a **scowling face — lime eyes, black pupils, furrowed brows, frowning mouth**. Orange underglow. | none | DARK checker |
| 19 | Quiz_night_animal_emblem (…044433) | Badge: black outer ring, mint neon ring w/ stars, **pink→magenta→violet gradient disc**. Much larger paw overflowing toward the ring, violet body, 4 hot-pink toe pads, orange-gold rim light down the right side. Face is **two bulging pale-mint googly eyeballs standing proud of the palm, thin worried brows, a wavy uncertain mouth** — goofy, not angry. | none | LIGHT checker |
| 21 | Red_cross_game_prop | Chunky X, no badge. Crimson faces w/ crack lines, darker bevelled sides w/ purple/lime/orange rim highlights, pink gloss streak on the upper-left arm, black outline, cyan-teal glow halo. | none | DARK checker |
| 22 | Retro_countdown_clock_ticking | Retro alarm clock. Violet→magenta→pink rounded-square body, orange plinth + top button, glowing mint face behind glass w/ visible gears + white gloss. Orange/black tick marks, **no numerals**. Pink hour hand upper-right, lime minute hand lower-right, lime hub. Motion wiggles at the right. Mint glow halo. | none | LIGHT checker |
| 23 | Retro_monitor_quiz_emblem | Badge: near-black disc, double mint neon ring w/ stars. Retro CRT — violet casing shading to pink/orange, **blank hot-pink screen** w/ 2 gloss highlights, lime bezel light, pink plinth stand, rainbow cable tangle (lime/orange/violet/yellow) beneath. | none | DARK checker |
| 24 | Science_quiz_emblem_design | Badge: very dark navy-black disc, mint neon ring w/ glow, dense ring of alternating **orange and pink** stars. Erlenmeyer flask, pale mint glass, lime liquid, violet bubbles rising and escaping the neck, crossed by 2 orbital ellipses — one hot pink w/ pink nodes, one teal w/ teal nodes. | none | LIGHT checker, largest square pitch in the folder |
| 25 | Sport_quiz_night_emblem | Badge: black outer ring, mint neon rim w/ glow + 4 compass sparkles, violet-purple disc w/ a faint paper grain. Orange-gold two-handled trophy w/ scratch marks, **lime whistle on a lime lanyard draped over the rim**, one pink sparkle. | none | LIGHT checker |
| 26 | Thumb_slamming_big_button | Arcade buzzer, no badge. Hot-pink domed button w/ gloss, chunky violet square base w/ scuffs, mint neon glow beneath. Pressed from the upper right by **a human finger — peach skin, a human fingernail and a knuckle crease** — running off the frame edge. | none | LIGHT checker, low contrast (252/229) |

### Scenes and reaction plates — 2752×1536, real backgrounds, DO NOT KEY (8)

| # | file | subject | text | background |
|---|---|---|---|---|
| 03 | Cartoon_owl_presenting_leaderboard | Brown owl, gold round specs, white shirt, olive herringbone waistcoat, teal pocket square, **teal bow tie**, gesturing left with a wing. Dark teal board w/ a neon cyan frame; yellow starburst, purple/teal/blue confetti, purple brick wall. | **YES — "1. WINNERS", "2. RUNNERS UP", and a third line "3." cut off by the board's bottom edge.** | real scene |
| 04 | Cartoon_owl_reacting_to_wrong | Brown owl facepalming, one wing over its eyes, beak wide mid-wail, specs knocked askew, other wing flung up, loose feathers popping off. **Pink bow tie, no jacket.** Grey-teal dust puff, yellow/lime radial speed lines, near-black purple ground. | none | full-bleed effect art |
| 12 | Owl_adjusting_glasses | Brown owl chest-up, smug grin, pushing its specs up with a wing-hand wearing a wristwatch. **Purple blazer, lime-and-pink chevron waistcoat, pink shirt, orange bow tie.** Pink/purple/cyan speed lines, lilac dust puff, geometric confetti. | none | full-bleed effect art |
| 13 | Owl_reacting_to_streak | Brown owl, both wings raised, eyes wide and slightly crossed, beak open grinning, specs. **Navy-purple bow tie, no jacket.** Mint + violet flames rising behind, dark radial speed lines on purple→magenta. | none | full-bleed effect art |
| 14 | Owl_reacting_with_confetti | Owl mid fist-pump, one wing raised, half-lidded satisfied eyes, specs, **orange bow tie**. Mint confetti flecks, dark radial speed lines on black/purple. **Plumage is violet-purple with a pink-cream face — not brown.** | none | full-bleed effect art |
| 15 | Owl_reacting_with_speed_lines | Brown owl, wide yellow eyes, specs, beak open, **teal-green bow tie**, a glowing cyan light streak swirling round it trailing white sparkles. Lime/pink/orange speed lines. Purple venue w/ silhouetted animal-headed audience. | **YES — two neon signs carrying garbled lettering; the upper-right reads "HEAS7"/"HEAST", the upper-left is a broken fragment. Neither is a word.** | real scene |
| 16 | Party_game_screen_leaderboard_backdrop | Teal/cyan scoreboard rig in a dark room: **5 columns, each a magenta header bar + ~9 empty slot plates**, mint neon tube edging, purple/lime indicator lights, a blank wide panel across the top. Purple doorway left, orange doorway right, dark floor w/ orange spill. | none | real scene — the slots are where scores get drawn |
| 20 | Quiz_room_waiting_for_game | Dark bar lounge staged around a **large blank white-lilac glowing projector screen**. Left: grey wolf at the frame edge, tan canine behind a booth, red fox in a black leather jacket holding a martini. Right: badger in an orange/purple floral Hawaiian shirt, scowling brown bear in a lavender-blue shirt in an armchair. Neon: magenta-framed purple animal sign, pink flamingo, cyan paw, green paw, orange dog silhouette. Foreground table, orange-lit, 2 glasses + a coaster. | none | real scene — the blank screen is the content area |

---

## The duplicate question — answered

`Quiz_night_animal_emblem_design_…044340` (#18) and `…044433` (#19) were the only genuine
candidates: same prompt stem, 74 seconds apart. **Opened both. They are not duplicates.**

| | #18 (…044340) | #19 (…044433) |
|---|---|---|
| disc | flat black | pink→magenta→violet gradient |
| paw scale | sits well inside the ring | overflows toward the ring |
| eyes | lime-green almonds, black pupils, set *into* the palm pad | bulging pale-mint eyeballs standing *proud* of the palm pad |
| brows / mouth | furrowed, downturned — angry | thin, worried; wavy mouth — anxious/goofy |
| rim light | orange under the lower edge | orange-gold down the whole right side |
| background | DARK checker, half-pitch 21.8 px | LIGHT checker, half-pitch 20.5 px |

They read as two different emotional states of the same motif. **No file in this folder duplicates
any other.** The earlier 8×8 average-hash "distance 0" matches were the hash measuring the shared
checkerboard backdrop, not the artwork — that result is disproven and must not be reused.

---

## Defects found while looking [OBSERVED]

Five, none of which any automated pass would have caught:

1. **#26 — a human finger.** The buzzer prop's hero element is a peach-skinned human digit with a
   fingernail and a knuckle crease. PlayZoo's cast is twenty animals. It cannot be cropped out; the
   finger runs to the frame edge.
2. **#15 — garbled neon text.** The upper-right sign reads "HEAS7"/"HEAST"; the upper-left is a
   broken fragment. Same failure class as the known Rex "Rlay2e" badge.
3. **#03 — placeholder leaderboard text baked into the art.** "1. WINNERS / 2. RUNNERS UP / 3.—"
   is painted onto the board, and the third row is clipped by the board's own edge. The file cannot
   serve as a live leaderboard plate unless that board is covered.
4. **#14 — the owl is the wrong colour.** Violet-purple plumage with a pink-cream face, against
   brown in #03, #04, #12, #13 and #15. Not an outfit change — a different colourway of the
   character.
5. **Owl wardrobe is inconsistent across all six plates.** Bow tie: teal (#03), pink (#04), orange
   (#12), navy-purple (#13), orange (#14), teal-green (#15). Jacket: olive herringbone waistcoat
   (#03), none (#04), purple blazer + chevron waistcoat (#12), none (#13), none (#14), none (#15).
   Cut together in one game, the host changes clothes between every reaction.

Also noted, not defects: **#22's clock hands are painted at a fixed position** (a decorative prop,
not a live countdown), and **#16's rig is a fixed 5 × ~9 grid** that any leaderboard UI must match.

---

## Disproven — do not reuse

- **The corner-sampling checkerboard detector.** Against the six files the first pass actually
  looked at it was wrong on four. Now that all 26 are open the reason is visible in the table above:
  #11's checker is invisible from three of four corners, and #02/#10/#17/#18/#21/#23 have discs as
  dark as their own backgrounds. A corner sample measures the frame, not the fill.
- **8×8 average hashing for duplicate detection here.** It reported identical hashes for visibly
  different emblems because the shared checkerboard dominates a downsampled hash.

---

## Owner's calls — decided 2026-09-15

1. **#07's hollow core → keep it filled.** The flame's inner teardrop stays opaque dark navy. It
   looks identical to a see-through core on PlayZoo's dark UI but survives a light surface too.
   This falls out of the connectivity rule for free: only background reachable from the frame edge
   is removed, and the core is enclosed.
2. **Destination → follow the precedent already set** by `GRAPHIC ASSETS/CHARACTER GRAPHIC
   ASSETS/transparent/`: keyed PNGs beside the source under `transparent/`, same stems, plus
   `_preview/` JPEGs. Nothing in `apps/web` touched.
3. **The five defects → logged, not fixed.** All five are regeneration problems; no amount of
   keying repairs a human finger or garbled neon. They are recorded above with what would need
   re-prompting, and all 18 emblems were delivered regardless.
4. **Wiring into the live game → not done, deliberately.** The request was to process the images.
   The mapping found is recorded below for a separate decision.

---

## Processing — what was done

`python tools/assets/dekey.py "GRAPHIC ASSETS/TRIVIA"` → `transparent/` (18 PNGs, RGBA, 2048×2048,
full resolution), `transparent/_preview/` (512 px JPEGs), `transparent/_check/` (verification
sheets). Verified: 18/18 carry real alpha, all 26 sources are unmodified, and none of the 8 scene
plates was keyed.

**Each of the 18 results was opened individually over both a white and a black ground.** That is not
ceremony — every defect below was invisible in every summary statistic and visible only by looking:

| result | verdict |
|---|---|
| 01 Adult, 02 Burger, 04 Film, 05 Flame, 06 Geography, 09 Music, 10 Question mark, 11 Paw-angry, 12 Paw-goofy, 15 Retro monitor, 17 Sport | clean on both grounds |
| 07 Green tick, 13 Red cross, 14 Retro clock, 18 Thumb | clean subject; **checker texture survives inside the broad glow** — see the limitation below |
| 08 History, 11 Paw-angry | faint serrated fringe at the disc edge on a WHITE ground only, where a dark purple disc meets a black checker. Invisible on the dark UI these are for. |
| 16 Science | small pale fragments at the bottom/right frame edge, where the source's own checkerboard is drawn washed out and merged |

Confirmed preserved, each of which a naive key destroys: **06's near-white clapper stripes**,
**02's near-black disc on a near-black checker**, **22's gloss highlight**, **23's blank pink
screen**, **07's filled flame core**, and **08's dark purple disc against black**.

### The limitation that is NOT fixed

In the broad soft glows the generator did not let the glow *tint* the checkerboard — it drew the
checker at full strength through it. Sampled in Red_cross, a dark square inside the teal halo is
`[0,1,0]`: pure background, no teal in it at all. No unpremultiply recovers colour that was never
painted. Substituting the locally averaged colour there was tried and is worse — where the
background tone is black, "sits at a background tone" also matches every black outline in the
artwork, so the repair washes the linework out to muddy grey. Repainting the glow would be
inpainting: generating art, not processing it. It is left alone and recorded here. Visible at 1:1
over black; not at game size.

### Two results that were wrong and were caught only by looking

1. A **global checkerboard grid fit** — the obvious approach — produced a full-width band of
   un-keyed checkerboard across the frame while scoring "49.1% cleared, fit 1.20". The checker was
   painted by a generative model, not ruled: its period is stable (51.06 → 51.24 measured across one
   frame) but its phase drifts, so one global grid is in step at one edge and half a square out
   elsewhere. Replaced with a local-contrast measurement that never needs the phase.
2. A **collar of surviving checker squares hugging the badge edge** on Geography, on a file the
   statistics called 38% clear with 0.11% soft. Caused by the smoothed hard floor blurring the
   object's influence half a window outward and inflating alpha around it.

Also worth recording: the pale ring around the Geography badge is **real artwork** — the source has
a mint glow painted outside the rim, washing out the checker behind it. It was nearly "fixed" away.

### Mapping onto the live trivia game — proposed, NOT applied

`apps/web/src/trivia/assets.ts` already wires art from `/ui/trivia/`. These map onto it:

| new file | existing slot |
|---|---|
| Green_tick_stamped_down | `stamp-correct.png` |
| Red_cross_game_prop | `stamp-miss.png` |
| Quiz_room_waiting_for_game (scene, unkeyed) | `lobby.jpg` |
| Science_quiz_emblem_design | `badge-science.png` |
| Sport_quiz_night_emblem | `badge-sports.png` |
| Music_ or Film_quiz_emblem | `badge-entertainment.png` |
| Party_game_screen_leaderboard (scene, unkeyed) | `display-bg.jpg` / `champions.png` |

**The mismatch to decide first:** the game has **three** round slots (science, sports,
entertainment) and this folder supplies **thirteen** emblems — adult, art, burger/food, film,
geography, history, music, question-mark, two paws, retro monitor, science, sport. Ten have nowhere
to go without a product decision on whether trivia gains categories.

## Not opened

none — 26 of 26 opened and described individually, and all 18 keyed results inspected over two
grounds.
