# Kickstarter reward tier art — image prompts

Three prompts, one per reward tier. Interactive version (copy buttons, progress ticks):
<https://claude.ai/code/artifact/505657e6-538d-4514-b7b6-009b7909ffe7>

Committed here too, because a prompt that exists only in an artifact is not in the project.

## What these do differently

They escalate **countably**, not by vibe: 5 cards to 10 cards to a full deck, and 0 to 1 to 2
custom characters. That is what makes a $50 tier look like $50 in a thumbnail, where a backer
decides before reading the contents list.

Tier facts come from `PLANS` in [apps/server/subscriptions.js](../../apps/server/subscriptions.js)
and are not invented here: Zoo Pass is 6 months and 5 games, Founding Animal 12 months, 10 games
and 1 custom character, Head Keeper 12 months, every game and 2 custom characters.

## Why they ask for NO text

The owner asked for the reward information to appear on the image. These prompts show it as
OBJECTS — the wristband, the countable cards, the characters — and deliberately forbid words,
reserving a clean band along the bottom instead.

Image generators reliably produce garbled, misspelled text, and a reward card with a typo in the
tier name is worse than one with no text. The band is composited afterwards in real type using the
same PIL text rendering that draws the promo captions, so it is crisp and spelled correctly. Card
faces are specified as icons for the same reason: a card that tries to spell TRIVIA returns TRVIAI.

Generate at 3:2 — the ratio Kickstarter uses for reward and item images.

## Zoo Pass

- Save as: `kickstarter/tiers/tier-zoo-pass.webp`
- Ratio: 3:2
- Why: 6 months · 5 games. The cheapest tier must still look like a real win. The reward is shown as objects, not described — a backer decides from the picture before they read the list.

```
A Kickstarter REWARD-TIER image for the entry tier of a party-games product. It must show what the backer actually GETS, laid out clearly, not just a mood.

COMPOSITION: a hero-and-inventory product shot. Upper two thirds is the scene; the lower quarter is a clean, empty, near-black band with nothing in it — a caption is added there afterwards, so leave it completely clear.

THE SCENE (upper two thirds): the neon front gate of a night-time zoo turned into a party. A striped raccoon in a bandit mask and a loud floral shirt works the velvet rope as doorman, one eyebrow raised, holding the rope aside. Behind the gate: warm light, festoon bulbs, confetti, the silhouettes of a party already going.

THE REWARD ITEMS, arranged across the middle as a clear floating row, evenly spaced, each object distinct and readable, lit like merchandise:
  • ONE glowing entry wristband, the biggest and brightest object, front and centre.
  • EXACTLY FIVE game cards fanned out beside it — five and no more, each card a different neon colour with a simple bold ICON on its face (a question mark, a paw print, a lightning bolt, a die, a star). Icons only, never words.
  • A crescent-moon token beside them standing for a limited run of months.

The five cards must be countable at a glance — clearly five separate cards, spread apart, not overlapping into a blur.

MOOD: getting into somewhere good. Excited, a little smug, the start of a night out.

Aspect ratio: 3:2, landscape. Solid background, not transparent. NO text, letters, numbers or words anywhere in the image — icons and objects only. Leave the lower quarter as clean empty dark space for a caption.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```

## Founding Animal

- Save as: `kickstarter/tiers/tier-founding-animal.webp`
- Ratio: 3:2
- Why: 12 months · 10 games · ONE custom character. The custom character is the reason anyone picks this tier, so it has to be the loudest object in the frame.

```
A Kickstarter REWARD-TIER image for the middle tier of a party-games product. It must show what the backer actually GETS, laid out clearly, not just a mood.

COMPOSITION: a hero-and-inventory product shot. Upper two thirds is the scene; the lower quarter is a clean, empty, near-black band with nothing in it — a caption is added there afterwards, so leave it completely clear.

THE SCENE (upper two thirds): a character design studio inside a neon zoo, mid-creation. At a lit drafting table a human zookeeper in a khaki safari shirt and tan pith helmet leans over a large sheet, tongue between his teeth, inking the final line on a brand-new cartoon animal character. Pinned character sheets of other animals on the wall behind, jars of pens, crumpled rejected sketches on the floor.

THE REWARD ITEMS, arranged across the middle as a clear floating row, evenly spaced, each object distinct and readable, lit like merchandise:
  • ONE brand-new custom cartoon animal character LIFTING OFF ITS OWN PAGE — full colour, glowing, one arm already free of the paper and waving, half drawing and half real. This is the hero object: biggest, brightest, unmistakably the prize.
  • TEN game cards fanned in an arc beside it — noticeably more cards than a small handful, each a different neon colour with a simple bold ICON on its face (question mark, paw print, lightning bolt, die, star, mask, bell, cup, note, crown). Icons only, never words.
  • A glowing entry wristband and a small enamel founder pin shaped like a paw print.
  • A full circular sun-and-moon token standing for a whole year.

MOOD: something made specifically for you. Warm, proud, slightly magical, still funny.

Aspect ratio: 3:2, landscape. Solid background, not transparent. NO text, letters, numbers or words anywhere in the image — icons and objects only. Leave the lower quarter as clean empty dark space for a caption.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```

## Head Keeper

- Save as: `kickstarter/tiers/tier-head-keeper.webp`
- Ratio: 3:2
- Why: 12 months · EVERY game · TWO custom characters. It has to read as obviously bigger than tier 2 from the thumbnail: two characters not one, every card not ten, and the keys to the whole place.

```
A Kickstarter REWARD-TIER image for the TOP tier of a party-games product. It must show what the backer actually GETS, laid out clearly, and must look unmistakably bigger than the tiers below it.

COMPOSITION: a hero-and-inventory product shot. Upper two thirds is the scene; the lower quarter is a clean, empty, near-black band with nothing in it — a caption is added there afterwards, so leave it completely clear.

THE SCENE (upper two thirds): the throne-room version of a neon zoo party. Centre, on a podium at the top of a short flight of steps, a triumphant anthropomorphic animal in an oversized golden pith helmet holds up an enormous ring of glowing keys, arms wide, head back, roaring with delight. Behind and below, the whole cast of party animals packed onto the steps mid-celebration — a gorilla punching the air, a pink flamingo raising a martini, a scarlet macaw with wings spread, a lavender sloth asleep on the bottom step through all of it. Every enclosure gate in the background stands wide open with light pouring out.

THE REWARD ITEMS, arranged across the middle as a clear floating row, evenly spaced, each object distinct and readable, lit like merchandise:
  • TWO brand-new custom cartoon animal characters, a clearly matched PAIR, both lifting off their own pages in full colour and glowing, striking heroic poses. Two of them, obviously two, side by side — the single biggest difference from the tier below.
  • A HUGE fanned spread of game cards behind them, many more than a handful, filling the width like a full deck — each a different neon colour with a simple bold ICON on its face. Icons only, never words.
  • The enormous golden key ring, a glowing wristband, and a gold enamel head-keeper badge shaped like a pith helmet.
  • A full circular sun-and-moon token standing for a whole year.

MOOD: coronation. Maximum, over the top, the biggest of the three by an obvious margin. It should read as MORE at thumbnail size without anyone reading a word.

Aspect ratio: 3:2, landscape. Solid background, not transparent. NO text, letters, numbers or words anywhere in the image — icons and objects only. Leave the lower quarter as clean empty dark space for a caption.

STYLE: bold adult animated-sitcom art â the PlayZoo house look. Thick, confident, slightly uneven black outlines of varying weight; flat cel shading with one soft highlight and one shadow tone; a saturated neon palette that pops on a near-black screen (violet #8b5cf6, hot pink #ec4899, teal #2dd4bf, lime #a3e635, amber #f59e0b); subtle paper grain; clean vector-like finish. Irreverent, comedic, grown-up energy â prime-time adult cartoon, NOT for children, and never cute.

Any animal is an anthropomorphic party guest, not a pet: expressive face, real attitude, dressed like a person on a late night out. Lighting is nightclub-meets-zoo â neon rim light on the edges, warm key from below.

Avoid: watermarks, signatures, gibberish or misspelled text, random letters, kids' picture-book style, cutesy chibi, photorealistic, 3D render, CGI, claymation, muddy or desaturated colours, harsh white background, cluttered composition, extra fingers, deformed hands, THREE ARMS, extra limbs, gore, blood, nudity, explicit sexual content.
```
