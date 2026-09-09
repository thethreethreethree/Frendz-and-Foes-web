# Kickstarter reward tier art — image prompts

Interactive version with copy buttons and progress ticks:
<https://claude.ai/code/artifact/505657e6-538d-4514-b7b6-009b7909ffe7>

## Nothing physical is depicted, on purpose

The owner caught this on 2026-09-09: an earlier draft showed a glowing wristband, and a backer
could reasonably read that as a bracelet arriving in the post.

Auditing for it turned up worse offenders in the same draft — an enamel founder pin, a gold badge,
a golden key ring, printed game cards. Enamel pins and keyrings are *classic* Kickstarter physical
rewards, so they imply shipping harder than the wristband did.

Nothing in these tiers is physical. `PLANS` in [apps/server/subscriptions.js](../../apps/server/subscriptions.js)
grants months, a game count and custom characters — all digital, nothing posted. So every reward is
now drawn as **glowing screens and light**: game panels hanging in the air, a phone display, a
character rising out of a drawing tablet. Each prompt also carries an explicit list of banned
objects, because an image that promises a parcel on a page asking for money is a real problem, not
a cosmetic one.

## They escalate countably

5 panels, then 10, then every panel lit; 0 custom characters, then 1, then 2. That is what makes a
$50 tier look like $50 in a thumbnail, where a backer decides before reading the contents list.
Every number comes from `PLANS`, not from a prompt writer's assumption.

## The generator renders the text

The owner's call, after I recommended compositing it afterwards. The prompts are shaped to give a
generator its best odds: exact strings quoted, all caps, three lines only, one band, and a closing
sentence stating that is the complete list of words so no tagline is invented.

**Check the spelling on what comes back.** If a word is wrong, re-roll; if one keeps failing, the
band can be composited in real type with the same PIL rendering that draws the promo captions.

Generate at 3:2 — the ratio Kickstarter uses for reward and item images.

## Zoo Pass

- Save as: `kickstarter/tiers/tier-zoo-pass.webp`
- Ratio: 3:2
- Why: 6 months · 5 games. Everything is shown as glowing screens — no wristband, no cards, nothing that looks postable, because nothing is posted.

```
A Kickstarter REWARD-TIER image for the entry tier of a DIGITAL party-games product. It must show what the backer GETS, and name it.

COMPOSITION: a hero-and-inventory shot at 3:2. Upper two thirds is the scene and the rewards; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): the neon front gate of a night-time zoo turned into a party, the gates swinging OPEN. A striped raccoon in a bandit mask and a loud floral shirt stands aside, one eyebrow raised, waving someone through. Beyond the gates: warm light, festoon bulbs, confetti, silhouettes of a party already going.

THE REWARDS, shown as GLOWING SCREENS AND LIGHT, floating in a clear row across the middle:
  • A large glowing phone screen, front and centre, tilted toward the viewer, its display lit bright neon with a simple bold PAW-PRINT ICON on it — the way in.
  • EXACTLY FIVE floating luminous game panels fanned beside it, like screens hanging in the air — five and no more, clearly countable, spread apart rather than overlapping. Each panel a different neon colour showing one simple bold ICON only (question mark, paw print, lightning bolt, die, star). No words on the panels.
  • A glowing crescent-moon of light in the air behind them, made of neon rather than metal.

MOOD: getting into somewhere good. Excited, a little smug, the start of a night out.

NOTHING PHYSICAL. Every reward in this product is DIGITAL — access to games on a screen, and character artwork. Nothing is posted to anybody. So the image must contain NO merchandise and NO objects that look postable: no wristbands, no bracelets, no enamel pins, no badges, no keyrings, no printed cards, no boxes, no packaging, no stickers, no t-shirts, no physical tokens of any kind. Everything a backer receives is shown as GLOWING SCREENS AND LIGHT.


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
- Why: 12 months · 10 games · ONE custom character. The character is the reason to pick this tier, and it is artwork on a screen — not a figurine, not a print.

```
A Kickstarter REWARD-TIER image for the middle tier of a DIGITAL party-games product. It must show what the backer GETS, and name it.

COMPOSITION: a hero-and-inventory shot at 3:2. Upper two thirds is the scene and the rewards; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): a character design studio inside a neon zoo, mid-creation. A human zookeeper in a khaki safari shirt and tan pith helmet leans over a large glowing DRAWING TABLET on a lit desk, stylus in hand, tongue between his teeth, finishing a brand-new cartoon animal character on the screen. Other character designs glow on monitors on the wall behind him.

THE REWARDS, shown as GLOWING SCREENS AND LIGHT, floating in a clear row across the middle:
  • ONE brand-new custom cartoon animal character RISING OUT OF THE TABLET SCREEN — full colour, glowing, one arm already free of the display and waving, half artwork and half real. The hero: biggest, brightest, unmistakably the prize.
  • TEN floating luminous game panels fanned in an arc beside it, clearly more than a handful, each a different neon colour showing one simple bold ICON only. No words on the panels.
  • A large glowing phone screen tilted toward the viewer with a bright paw-print icon on its display.

MOOD: something made specifically for you. Warm, proud, slightly magical, still funny.

NOTHING PHYSICAL. Every reward in this product is DIGITAL — access to games on a screen, and character artwork. Nothing is posted to anybody. So the image must contain NO merchandise and NO objects that look postable: no wristbands, no bracelets, no enamel pins, no badges, no keyrings, no printed cards, no boxes, no packaging, no stickers, no t-shirts, no physical tokens of any kind. Everything a backer receives is shown as GLOWING SCREENS AND LIGHT.


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
- Why: 12 months · EVERY game · TWO custom characters. Must read as obviously bigger than tier 2 — two characters not one, every panel lit not ten — with nothing that looks like merchandise.

```
A Kickstarter REWARD-TIER image for the TOP tier of a DIGITAL party-games product. It must show what the backer GETS, name it, and look unmistakably bigger than the tiers below.

COMPOSITION: a hero-and-inventory shot at 3:2. Upper two thirds is the scene and the rewards; the lower third is a solid near-black band carrying the text.

THE SCENE (upper two thirds): the throne-room version of a neon zoo party. Centre, on a podium at the top of a short flight of steps, a triumphant anthropomorphic animal in an oversized golden pith helmet throws both arms wide, head back, roaring with delight as EVERY enclosure gate behind them swings open at once with light flooding out. Behind and below, the whole cast packed onto the steps mid-celebration — a gorilla punching the air, a pink flamingo raising a martini, a scarlet macaw with wings spread, a lavender sloth asleep on the bottom step through all of it.

THE REWARDS, shown as GLOWING SCREENS AND LIGHT, floating in a clear row across the middle:
  • TWO brand-new custom cartoon animal characters, a clearly matched PAIR, both rising out of glowing tablet screens in full colour, striking heroic poses. Obviously two, side by side — the single biggest difference from the tier below.
  • A HUGE fanned spread of floating luminous game panels behind them, filling the width, every one of them lit — far more than the tier below — each a different neon colour showing one simple bold ICON only. No words on the panels.
  • A large glowing phone screen tilted toward the viewer with a bright paw-print icon on its display.

MOOD: coronation. Maximum, over the top, the biggest of the three by an obvious margin.

NOTHING PHYSICAL. Every reward in this product is DIGITAL — access to games on a screen, and character artwork. Nothing is posted to anybody. So the image must contain NO merchandise and NO objects that look postable: no wristbands, no bracelets, no enamel pins, no badges, no keyrings, no printed cards, no boxes, no packaging, no stickers, no t-shirts, no physical tokens of any kind. Everything a backer receives is shown as GLOWING SCREENS AND LIGHT.


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
