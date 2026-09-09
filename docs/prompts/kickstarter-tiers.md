# Kickstarter reward tier art — image prompts

Interactive version with copy buttons and progress ticks:
<https://claude.ai/code/artifact/505657e6-538d-4514-b7b6-009b7909ffe7>

Committed here too, because a prompt that exists only in an artifact is not in the project.

## What these do differently

They escalate **countably**, not by vibe: 5 cards, then 10, then a full deck; 0 custom characters,
then 1, then 2. That is what makes a $50 tier look like $50 in a thumbnail, where a backer decides
before reading any contents list.

Every number is taken from `PLANS` in [apps/server/subscriptions.js](../../apps/server/subscriptions.js)
and none is invented, so the reward cards state what the code actually grants.

## The text is rendered by the generator

The owner's call, 2026-09-09, after I recommended compositing it afterwards instead.

The risk is real — generators garble text, and a reward card misspelling its own tier name is on a
page asking people for money. So the prompts are shaped to minimise it: exact strings quoted, all
caps, only three lines, one band, and a closing sentence saying that is the complete list of words
so no tagline gets invented. Card faces are icons-only for the same reason.

**Check the spelling on the returned images.** If a word is wrong, re-roll; if one keeps failing,
the band can be composited in real type with the same PIL rendering that draws the promo captions.

Generate at 3:2 — the ratio Kickstarter uses for reward and item images.

## Zoo Pass

- Save as: `kickstarter/tiers/tier-zoo-pass.webp`
- Ratio: 3:2
- Why: 6 months · 5 games. Only four short strings of text — the fewer the words, the better any generator spells them.

```
A Kickstarter REWARD-TIER image for the entry tier of a party-games product. It must show what the backer GETS, and name it.

COMPOSITION: a hero-and-inventory product shot at 3:2. Upper two thirds is the scene and the items; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): the neon front gate of a night-time zoo turned into a party. A striped raccoon in a bandit mask and a loud floral shirt works the velvet rope as doorman, one eyebrow raised, holding the rope aside. Behind the gate: warm light, festoon bulbs, confetti, silhouettes of a party already going.

THE REWARD ITEMS, in a clear floating row across the middle, evenly spaced, each distinct and lit like merchandise:
  • ONE glowing entry wristband, the biggest and brightest object, front and centre.
  • EXACTLY FIVE game cards fanned beside it — five and no more, clearly countable, spread apart rather than overlapping. Each card a different neon colour showing a simple bold ICON only (question mark, paw print, lightning bolt, die, star). No words on the cards.

MOOD: getting into somewhere good. Excited, a little smug, the start of a night out.

TEXT IN THE IMAGE — render these words EXACTLY as written, spelled correctly, in a bold clean uppercase sans-serif with a heavy black outline so they read on the dark ground. Do not add any other words, captions, taglines or logos anywhere in the image.
  • Large across the band: ZOO PASS
  • Large beside it, in hot pink: $15
  • Smaller underneath, on one line: 6 MONTHS · 5 GAMES

That is the complete list of words in this image. Nothing else is written anywhere.

Aspect ratio: 3:2, landscape. Solid background, not transparent.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```

## Founding Animal

- Save as: `kickstarter/tiers/tier-founding-animal.webp`
- Ratio: 3:2
- Why: 12 months · 10 games · ONE custom character. The character is why anyone picks this tier, so it is the loudest object AND the last line of text.

```
A Kickstarter REWARD-TIER image for the middle tier of a party-games product. It must show what the backer GETS, and name it.

COMPOSITION: a hero-and-inventory product shot at 3:2. Upper two thirds is the scene and the items; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): a character design studio inside a neon zoo, mid-creation. At a lit drafting table a human zookeeper in a khaki safari shirt and tan pith helmet leans over a large sheet, tongue between his teeth, inking the final line on a brand-new cartoon animal character. Pinned character sheets on the wall behind, jars of pens, crumpled rejected sketches on the floor.

THE REWARD ITEMS, in a clear floating row across the middle, evenly spaced, each distinct and lit like merchandise:
  • ONE brand-new custom cartoon animal character LIFTING OFF ITS OWN PAGE — full colour, glowing, one arm already free of the paper and waving, half drawing and half real. The hero object: biggest, brightest, unmistakably the prize.
  • TEN game cards fanned in an arc beside it, clearly more than a handful, each a different neon colour showing a simple bold ICON only. No words on the cards.
  • A glowing entry wristband and a small enamel founder pin shaped like a paw print.

MOOD: something made specifically for you. Warm, proud, slightly magical, still funny.

TEXT IN THE IMAGE — render these words EXACTLY as written, spelled correctly, in a bold clean uppercase sans-serif with a heavy black outline so they read on the dark ground. Do not add any other words, captions, taglines or logos anywhere in the image.
  • Large across the band: FOUNDING ANIMAL
  • Large beside it, in hot pink: $30
  • Smaller underneath, on one line: 12 MONTHS · 10 GAMES · 1 CUSTOM CHARACTER

That is the complete list of words in this image. Nothing else is written anywhere.

Aspect ratio: 3:2, landscape. Solid background, not transparent.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```

## Head Keeper

- Save as: `kickstarter/tiers/tier-head-keeper.webp`
- Ratio: 3:2
- Why: 12 months · EVERY game · TWO custom characters. Must read as obviously bigger than tier 2 from the thumbnail: two characters not one, a full deck not ten.

```
A Kickstarter REWARD-TIER image for the TOP tier of a party-games product. It must show what the backer GETS, name it, and look unmistakably bigger than the tiers below.

COMPOSITION: a hero-and-inventory product shot at 3:2. Upper two thirds is the scene and the items; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): the throne-room version of a neon zoo party. Centre, on a podium at the top of a short flight of steps, a triumphant anthropomorphic animal in an oversized golden pith helmet holds up an enormous ring of glowing keys, arms wide, head back, roaring with delight. Behind and below, the whole cast packed onto the steps mid-celebration — a gorilla punching the air, a pink flamingo raising a martini, a scarlet macaw with wings spread, a lavender sloth asleep on the bottom step through all of it. Every enclosure gate behind stands wide open with light pouring out.

THE REWARD ITEMS, in a clear floating row across the middle, evenly spaced, each distinct and lit like merchandise:
  • TWO brand-new custom cartoon animal characters, a clearly matched PAIR, both lifting off their own pages in full colour and glowing, striking heroic poses. Obviously two, side by side — the single biggest difference from the tier below.
  • A HUGE fanned spread of game cards behind them, filling the width like a full deck, each a different neon colour showing a simple bold ICON only. No words on the cards.
  • The enormous golden key ring, a glowing wristband, and a gold enamel badge shaped like a pith helmet.

MOOD: coronation. Maximum, over the top, the biggest of the three by an obvious margin.

TEXT IN THE IMAGE — render these words EXACTLY as written, spelled correctly, in a bold clean uppercase sans-serif with a heavy black outline so they read on the dark ground. Do not add any other words, captions, taglines or logos anywhere in the image.
  • Large across the band: HEAD KEEPER
  • Large beside it, in hot pink: $50
  • Smaller underneath, on one line: 12 MONTHS · EVERY GAME · 2 CUSTOM CHARACTERS

That is the complete list of words in this image. Nothing else is written anywhere.

Aspect ratio: 3:2, landscape. Solid background, not transparent.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```
