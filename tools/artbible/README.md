# Game Art Bible generators

One artifact per game, each a page of **complete, standalone Nanobanana2 prompts** — one card per
image. Built after the first attempt shipped `{SLOT}` templates with elided item lists and a counter
that promised 338 images over 49 templates.

    python bible.py coverops          # one game
    python -c "import bible, games;   [bible.GAMES.__setitem__(k,v) or bible.build(k) for k,v in games.ALL.items()]"

`bible.py` holds the house style block, the prompt builders and the page template.
`games.py` holds the twelve remaining games. Murder Mystery is absent on purpose: its 305 assets
already exist and are the visual reference everything else is anchored to.

## Why this is in the repo

The prompts and the CASTING are canonical content. Which animal fronts which game is a brand
decision, and it must not live only inside an ephemeral artifact.

## Casting

| Game | Fronted by | Why |
|---|---|---|
| Survey Showdown | Duke the lion | the big shot, game-show energy |
| Bingo Night | Duchess the cat | the snob, grande dame of the bingo hall |
| Trivia | Hoot the owl | the know-it-all |
| Off Limits | Pixel the parrot | the loudmouth who cannot stop saying the word |
| Foreheads | Waddles the penguin | the try-hard |
| Full Cast | Trixie the flamingo | the diva |
| Encore | Bianca the panda | the drama queen, three rounds of performance |
| Cover Ops | John the raccoon | the schemer, a natural spymaster |
| Solo Clue | Mo the sloth | the chill one, one word is plenty |
| Ballpark | Kip the fox | the hustler, it is a betting game |
| Quick Draw | Otis the otter | the prankster |
| Sketch Relay | Sludge the skunk | the instigator, he starts the chaos |
| After Dark | Rico the toucan | the DJ, it is the 18+ nightclub game |

## The measurement behind it

A scan of every game's front-end found 41 image references in Murder Mystery, 34 in Trivia, 3 in
Bingo, and **zero in the other eleven** — those screens are text on a shared gradient.

## Real content, not invented

The 75 Bingo dare cards use the actual dare text from `packages/engine/src/bingoDares.ts`
(sourced from BINGO_INSTRUCTION.docx), in ball order, B1 first.
