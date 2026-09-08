"""The remaining twelve PlayZoo games, in the format bible.py renders.

Murder Mystery is absent on purpose: its 305 assets already exist and are the visual reference the
house style is anchored to.

Casting comes from the twenty canonical PlayZoo animals, each matched to the game they would be
funniest at. Every prompt here is finished — no placeholders, no elided lists.
"""
from bible import bg, prop, beat, DNA, load_dares

def card(gid, kind, slug, name, ratio, text, note=None):
    d = dict(kind=kind, name=name, file=f"art/{gid}/{slug}.webp", ratio=ratio, prompt=text + "\n\n" + DNA)
    if note: d["note"] = note
    return d

def make(gid, name, accent, accent2, cast, role, rule, why, assets):
    return dict(id=gid, name=name, accent=accent, accent2=accent2, cast=cast, role=role,
                rule=rule, why=why, assets=assets)

ZERO = ("This game draws ZERO images today — every screen is text on the same flat gradient that "
        "every other game uses. Nothing below exists yet.")

# ---------------------------------------------------------------- Survey Showdown
def game_feud():
    g = "feud"
    D = "Duke, a swaggering cartoon LION in a sharp too-tight suit with an enormous mane"
    a = [bg(g, s, d, "Amber and hot-pink neon.") for s, d in [
      ("lobby","A late-night game-show stage in a neon zoo, empty: two podiums waiting, the big answer board dark and unlit, house lights low."),
      ("board","The same stage mid-round, the big answer board lit and glowing with blank panels, warm spotlights raking the podiums."),
      ("finale","The same stage at the end of the night, confetti cannons firing over the podiums, streamers hanging everywhere.")]]
    for team, cols in [("red","reds and hot pinks"),("blue","blues and teals")]:
        a.append(card(g,"Team crest",f"team-{team}",team,"1:1",
          f"A bold team crest badge for the {team.upper()} team in a party game show. A circular shield "
          f"emblem with a snarling cartoon animal mascot at its centre and two party-popper cannons "
          f"crossed behind it, rendered entirely in {cols} with a neon glow and a thick black outline.\n\n"
          f"Aspect ratio: 1:1. Transparent background (PNG). No text."))
    for s, d in [("strike-x","a giant red X stamp slamming down, the kind that lands when an answer is wrong."),
      ("reveal-panel","a single game-show answer panel flipping open, its face completely blank."),
      ("steal-token","a chunky brass token stamped with a grabbing hand, meaning the other team is stealing the board."),
      ("points-bank","an overflowing pile of coins and chips stacked into a bank."),
      ("buzzer","a big red slam-down game-show buzzer on a chrome base."),
      ("timer","a chunky retro countdown clock mid-tick.")]:
        a.append(prop(g,s,d,"amber"))
    for s, m, l, b in [
      ("answer-right","the top survey answer is revealed and the team erupts.","arms flung wide, roaring with delight","confetti in amber and hot pink."),
      ("strike","a wrong answer lands and a strike goes up.","recoiling with both paws over his eyes","smoke and sparks in amber and red."),
      ("third-strike","the third and final strike — the round is lost.","slumped, mane drooping, utterly defeated","dark smoke and falling ash in amber and red."),
      ("steal-win","the other team steals the entire board.","grinning like a thief walking out with the furniture","confetti and flying coins in amber and hot pink."),
      ("steal-fail","the steal attempt fails and the board stays put.","mid-facepalm with one eye peeking through his paw","a puff of grey smoke with amber sparks."),
      ("round-win","the round is won and the points are banked.","up on a podium with both fists raised, mane blazing","confetti and streamers in amber and hot pink.")]:
        a.append(beat(g,s,m,D,l,b))
    return make(g,"Survey Showdown","#f59e0b","#ec4899","Duke the lion","the big shot",
      "Two teams guess the most popular survey answers. Three strikes and the other team steals the board.",
      ZERO + " The strike, the steal and the reveal are the whole show, and all three are currently CSS.", a)

# ---------------------------------------------------------------- Bingo Night
def game_bingo():
    g = "bingo"
    D = "Duchess, a haughty cartoon CAT in pearls and cat-eye glasses"
    a = [bg(g, s, d, "Hot pink and amber neon, cheap chandeliers.") for s, d in [
      ("lobby","A gloriously seedy late-night bingo hall in a neon zoo, empty: formica tables, plastic chairs, the caller's ball cage dark and still."),
      ("hall","The same bingo hall mid-game, the ball cage spinning under warm lamps, tables covered in marked cards."),
      ("dare","The same hall turned towards a small stage with one hard spotlight on it, every head facing the same way.")]]
    for n in range(1, 76):
        L = "B" if n <= 15 else "I" if n <= 30 else "N" if n <= 45 else "G" if n <= 60 else "O"
        a.append(card(g,"Bingo ball",f"ball-{n}",f"{L}{n}","1:1",
          f"A single glossy bingo ball showing the number {n}, drawn as a chunky cartoon object with a "
          f"thick black outline, a bright specular highlight and a soft neon glow. The numeral {n} is "
          f"large, centred, in clean bold type, and is the ONLY text on the ball. The colour band is the "
          f"standard bingo colour for the {L} column.\n\n"
          f"Aspect ratio: 1:1. Transparent background (PNG), centred."))
    for i, d in enumerate(load_dares(), start=1):
        a.append(card(g,"Dare card",f"dare-{i}",f"dare {i}","3:4",
          f"A single dare card for an adult bingo night, drawn as a slightly battered playing card standing "
          f"upright with a torn paper edge and a thick black outline. Its face shows ONE bold cartoon "
          f"pictogram — no words at all — illustrating this dare: “{d}”. The pictogram sits over a hot "
          f"pink and violet neon pattern.\n\n"
          f"Aspect ratio: 3:4. Transparent background (PNG). NO TEXT of any kind — the picture must carry it.",
          note=d))
    for s, m, l, b in [
      ("ball-drawn","a new ball is drawn from the cage.","peering down her nose at the number","hot pink and amber sparkles."),
      ("line","someone completes a line.","visibly outraged that it was not her","confetti in hot pink and amber."),
      ("full-house","someone gets a full house.","clutching her pearls in genuine scandal","an explosion of confetti in hot pink and amber."),
      ("dare-time","the winner has to do their dare.","delighted, pointing imperiously at the stage","a spotlight burst in amber."),
      ("game-over","the night ends.","sweeping out as though she has better places to be","falling streamers in hot pink and violet.")]:
        a.append(beat(g,s,m,D,l,b))
    return make(g,"Bingo Night","#ec4899","#f59e0b","Duchess the cat","the snob",
      "Mark your card as numbers are drawn; a line wins, then you do the dare.",
      "Bingo has 3 image references today. The 75 balls and 75 dares below are the deep set — one per "
      "ball, matching the real dare list in your engine, in ball order (B1 first).", a)

# ---------------------------------------------------------------- Trivia
def game_trivia():
    g = "trivia"
    D = "Hoot, a smug cartoon OWL in a tiny bow tie and half-moon glasses"
    a = [bg(g, s, d, "Teal and violet neon.") for s, d in [
      ("lobby","An empty late-night pub-quiz room in a neon zoo: bar stools upturned on tables, the big quiz screen dark."),
      ("question","The same quiz room lit up mid-question, the big screen glowing blank and expectant, everyone leaning in."),
      ("scores","A leaderboard wall at the end of a round lit teal, its name plates blank.")]]
    for c, icon in [("music","a cracked vinyl record and a microphone"),("film","a clapperboard and a curl of film"),
      ("sport","a scuffed trophy and a whistle"),("history","a crumbling stone column and a scroll"),
      ("science","a bubbling flask and an atom"),("food","a stacked burger and a fork"),
      ("animals","a paw print and a pair of wild eyes"),("geography","a battered globe and a map pin"),
      ("tech","a chunky retro monitor and a tangled cable"),("art","a paint palette and a brush"),
      ("adult","a cocktail glass and a lipstick kiss"),("random","a question mark built out of mismatched objects")]:
        a.append(card(g,"Category emblem",f"cat-{c}",c,"1:1",
          f"A bold circular category emblem for a quiz night: {c.upper()}. One chunky cartoon icon at its "
          f"centre — {icon} — in flat cel shading with a thick black outline, ringed by a neon teal border "
          f"with small star flourishes.\n\nAspect ratio: 1:1. Transparent background (PNG). No text."))
    for s, d in [("lock-in","a big chunky button slammed down under a thumb, meaning an answer is locked in."),
      ("timer","a chunky retro countdown clock mid-tick."),
      ("streak-flame","a stylised flame with an empty centre, meaning an answer streak."),
      ("right-tick","a fat green tick stamped down with force."),
      ("wrong-cross","a fat red cross stamped down with force.")]:
        a.append(prop(g,s,d,"teal"))
    for s, m, l, b in [
      ("round-start","a new quiz round begins.","adjusting his glasses with enormous self-satisfaction","teal and violet sparks."),
      ("correct","an answer is right.","insufferably pleased, one wing raised","teal confetti."),
      ("wrong","an answer is wrong.","wincing theatrically, feathers ruffled","grey smoke with teal sparks."),
      ("fastest","someone answers fastest.","blinking, genuinely impressed for once","a streak of teal light."),
      ("streak","someone is on a streak.","fanning himself with one wing, overwhelmed","teal and violet flame."),
      ("final-scores","the final scores are in.","presenting the leaderboard like a professor","falling teal and violet confetti.")]:
        a.append(beat(g,s,m,D,l,b))
    return make(g,"Trivia","#2dd4bf","#8b5cf6","Hoot the owl","the know-it-all",
      "Three rounds, four answers, one timer. Right and fast beats slow and smug.",
      "Trivia has some art already but no sense of place, and a question arrives with no visual signal "
      "of what it is even about.", a)

# ---------------------------------------------------------------- the pattern games
def basic(g, name, a1, a2, cast, role, rule, char, colours, glow, bgs, props, beats, extra=(), why=ZERO):
    a = [bg(g, s, d, colours) for s, d in bgs]
    a += list(extra)
    a += [prop(g, s, d, glow) for s, d in props]
    a += [beat(g, s, m, char, l, b) for s, m, l, b in beats]
    return make(g, name, a1, a2, cast, role, rule, why, a)

def game_offlimits():
    g = "offlimits"
    faces = [card(g,"Card face",f"card-{s}",s,"3:4",
      f"A single upright word card for a party word game, in this state: {d}. A slightly battered card "
      f"with a thick black outline and a torn paper edge, its face patterned in lime and violet neon. The "
      f"state is shown by the card's TREATMENT alone.\n\n"
      f"Aspect ratio: 3:4. Transparent background (PNG). No readable text.")
      for s, d in [("blank","clean and untouched, waiting"),("banned","slashed through with heavy black bars"),
        ("revealed","glowing lime, face-up and lit"),("stolen","tilted and being pulled sideways out of frame"),
        ("skipped","flicked away with motion arcs behind it"),("correct","haloed in lime with a small starburst"),
        ("timeout","scorched at the edges and curling"),("final","crowned with a small laurel")]]
    return basic(g,"Off Limits","#a3e635","#8b5cf6","Pixel the parrot","the loudmouth",
      "Describe the word without the banned words. Slip up and the buzzer finds you.",
      "Pixel, a manic cartoon PARROT with wild crest feathers and a permanently open beak",
      "Lime and violet neon.","lime",
      [("lobby","A dark comedy-club stage in a neon zoo with a lone microphone on a stand."),
       ("turn","The same stage lit hot, a countdown clock glowing above it, the room tense."),
       ("buzzed","The same stage flooded in alarm-red light the instant the buzzer goes off.")],
      [("buzzer","a big red alarm buzzer mid-slam, shaking with the impact."),
       ("gag","a strip of tape stuck across a beak, meaning a banned word."),
       ("timer","a chunky retro countdown clock mid-tick."),
       ("steal-hand","a grabbing cartoon hand snatching a card sideways."),
       ("point-chip","a chunky scoring chip stamped with a star."),
       ("skip-arrow","a bent arrow curving forward, meaning skip.")],
      [("turn-start","a new turn begins and the clock starts.","inflating with anticipation, every feather up","lime sparks."),
       ("correct","the word is guessed.","shrieking with delight, wings thrown wide","lime confetti."),
       ("buzzed","a banned word is said and the buzzer fires.","frozen mid-squawk, caught red-handed","alarm-red light and lime sparks."),
       ("stolen","the other team steals the card.","outraged, chasing after it","lime and violet smoke."),
       ("time-up","the clock runs out.","deflating like a punctured balloon","falling grey ash with lime sparks."),
       ("round-win","the round is won.","strutting, chest puffed right out","lime and violet confetti.")],
      extra=faces,
      why=ZERO + " The word card IS the game, and it is currently a rounded rectangle.")

def game_headsup():
    return basic("headsup","Foreheads","#2dd4bf","#ec4899","Waddles the penguin","the try-hard",
      "The word's on your head; your team's clues are the only hope you've got.",
      "Waddles, an earnest cartoon PENGUIN in a sweatband trying far too hard",
      "Teal and pink neon.","teal",
      [("lobby","A dark living-room party set in a neon zoo: beanbags, a low table, nobody playing yet."),
       ("guessing","The same room lit hot, a huge countdown glowing on the wall, everyone shouting at once."),
       ("timeup","The same room in cold blue light with the clock at zero.")],
      [("phone-forehead","a phone held flat against a forehead, its screen facing outward."),
       ("tilt-pass","a phone tilted sharply upward with motion arcs, meaning pass."),
       ("tilt-correct","a phone tilted sharply downward with motion arcs, meaning correct."),
       ("timer","a chunky retro countdown clock mid-tick."),
       ("clue-bubble","an empty comic speech bubble bursting outward with motion lines.")],
      [("round-start","a new round begins.","flippers up, braced and ready","teal sparks."),
       ("correct","a word is guessed.","leaping with both flippers in the air","teal confetti."),
       ("pass","a word is passed.","flinging the phone forward, sweating","teal motion lines."),
       ("near-miss","the guess was agonisingly close.","clutching his head with both flippers","teal and pink sparks."),
       ("time-up","time runs out.","flat on his front, entirely spent","cold blue light with teal sparks."),
       ("round-win","the round is won.","doing a small, deeply earnest victory dance","teal and pink confetti.")],
      why=ZERO + " The phone-on-forehead gesture is the game's whole identity and is never once shown.")

def game_fullcast():
    return basic("fullcast","Full Cast","#ec4899","#8b5cf6","Trixie the flamingo","the diva",
      "The whole team acts it out at once. One guesser. Total pandemonium.",
      "Trixie, a preposterously theatrical cartoon FLAMINGO in a feather boa",
      "Hot pink and violet neon.","hot pink",
      [("lobby","A dark theatre stage in a neon zoo, velvet curtain closed, footlights off."),
       ("performance","The same stage with the curtain open and follow-spots blazing, the boards empty and waiting."),
       ("reveal","The same stage lit flat with the house lights up.")],
      [("spotlight","a single hot follow-spot beam cutting down through haze."),
       ("curtain","a swagged velvet theatre curtain, half drawn."),
       ("prompt-card","a blank cue card held up in one wing."),
       ("applause-meter","a needle gauge pinned hard into the red.")],
      [("curtain-up","the performance begins.","striking a pose mid-curtain, boa flying","hot pink glitter."),
       ("guessed","the guesser gets it.","one wing to her brow in triumphant relief","hot pink and violet confetti."),
       ("missed","nobody gets it.","aghast, staggering backwards","grey smoke with pink sparks."),
       ("overacting","someone is wildly overacting.","joining in with even more of it, delighted","glitter and feathers in hot pink."),
       ("time-up","time runs out.","frozen mid-pose as the lights drop","cold light with pink sparks."),
       ("round-win","the round is won.","taking a deep and completely unearned bow","falling roses and confetti in hot pink.")])

def game_monikers():
    g = "monikers"
    badges = [card(g,"Round badge",f"round-{s}",s,"1:1",
      f"A bold circular round badge for a party game, round {n}: {label}. Its central pictogram is {pic}. "
      f"Thick black outline, violet neon ring, small star flourishes.\n\n"
      f"Aspect ratio: 1:1. Transparent background (PNG). No text.")
      for s, n, label, pic in [
        ("describe","ONE","describe freely","an open cartoon mouth with many speech lines pouring out"),
        ("one-word","TWO","one word only","a single small lone speech bubble, deliberately tiny and isolated"),
        ("charades","THREE","silent charades","a mouth sealed with a strip of tape above a small miming figure")]]
    return basic(g,"Encore","#8b5cf6","#f59e0b","Bianca the panda","the drama queen",
      "Same deck, three rounds, each harder: describe, then one word, then charades.",
      "Bianca, a wildly dramatic cartoon PANDA with the back of one paw pressed to her forehead",
      "Violet and amber neon.","violet",
      [("lobby","A dark cabaret room in a neon zoo with a small empty stage and velvet booths."),
       ("round","The same room with the stage lit and a card deck glowing on a stand."),
       ("scores","A chalkboard wall of blank tally marks lit in violet.")],
      [("deck","a fat deck of cards with the top one lifting away."),
       ("timer","a chunky retro countdown clock mid-tick."),
       ("point-chip","a chunky scoring chip stamped with a star."),
       ("pass-arrow","a bent arrow curving forward, meaning pass.")],
      [("round-start","a new round begins.","announcing it as though it were grand opera","violet sparks."),
       ("guessed","a card is guessed.","swooning with joy into a velvet booth","violet and amber confetti."),
       ("passed","a card is passed.","flinging it aside with contempt","violet smoke."),
       ("deck-empty","the deck runs out.","staring into the empty stand, bereft","falling ash with violet sparks."),
       ("time-up","time runs out.","collapsed across the table, one paw raised","cold light with violet sparks."),
       ("round-win","the round is won.","accepting imaginary flowers from an imaginary crowd","falling bouquets in violet and amber.")],
      extra=badges,
      why=ZERO + " The three-round escalation is the entire hook of the game and it is completely invisible.")

def game_soloclue():
    g = "soloclue"
    slips = [card(g,"Clue slip",f"slip-{s}",s,"1:1",
      f"A single small torn paper clue slip: {d}. Thick black outline, a soft teal neon glow, a torn edge "
      f"and a little paper grain.\n\n"
      f"Aspect ratio: 1:1. Transparent background (PNG). NO readable text — scribbles and marks only.")
      for s, d in [("blank","clean and empty, waiting to be written on"),
        ("written","covered in scribbled illegible marks"),
        ("cancelled","struck through with one heavy black X"),
        ("survivor","glowing teal, singled out from the rest"),
        ("duplicate","two identical slips overlapping, both scribbled the same"),
        ("winning","with a small crown resting on top of it")]]
    return basic(g,"Solo Clue","#2dd4bf","#a3e635","Mo the sloth","the chill one",
      "Everyone writes one clue — matching clues cancel before the guesser sees them.",
      "Mo, an unbothered cartoon SLOTH with heavy eyelids, moving at half speed",
      "Teal and lime neon.","teal",
      [("lobby","A dark, cosy reading room in a neon zoo: deep armchairs, one low lamp, nobody sitting yet."),
       ("writing","The same room lit soft and warm, pens and torn paper scattered across a low table."),
       ("reveal","A corkboard of pinned paper notes lit teal, the notes themselves blank.")],
      [("pen","a chewed biro caught mid-scribble."),("blindfold","a folded cloth blindfold."),
       ("cancel-stamp","a rubber stamp coming down, its face a plain X."),
       ("word-card","a single blank word card standing upright."),
       ("point-chip","a chunky scoring chip stamped with a star.")],
      [("clues-in","every clue is written and handed in.","slowly stacking the slips, in no hurry whatsoever","teal sparks."),
       ("cancelled","identical clues cancel each other out.","watching two slips vanish with mild interest","teal and lime smoke."),
       ("guess-right","the guesser gets it.","offering the slowest high five ever attempted","teal confetti."),
       ("guess-wrong","the guesser misses.","shrugging with enormous economy of movement","grey smoke with teal sparks."),
       ("skipped","the card is skipped.","already asleep","a soft teal haze."),
       ("round-win","the round is won.","raising one claw roughly two inches in celebration","teal and lime confetti.")],
      extra=slips,
      why=ZERO + " The cancellation moment is the game's signature and it is plain text.")

def game_ballpark():
    g = "ballpark"
    chips = [card(g,"Chip",f"chip-{v}",v,"1:1",
      f"A single casino chip worth {v}, drawn as a chunky cartoon object with a thick black outline, edge "
      f"notches, a bright highlight and an amber neon glow. The numeral {v} is bold and centred and is the "
      f"ONLY text on the chip.\n\nAspect ratio: 1:1. Transparent background (PNG), centred.")
      for v in ["1","2","3","5","10"]]
    chips.append(card(g,"Chip","chip-all-in","all-in","1:1",
      "A toppling stack of casino chips sliding forward across felt, meaning ALL IN. A chunky cartoon "
      "object with a thick black outline, bright highlights and an amber neon glow.\n\n"
      "Aspect ratio: 1:1. Transparent background (PNG), centred. NO text or numerals."))
    return basic(g,"Ballpark","#f59e0b","#ec4899","Kip the fox","the hustler",
      "Every answer's a number. Guess it, then bet on who's closest without going over.",
      "Kip, a sharp cartoon FOX in a waistcoat with a card just visible up one sleeve",
      "Amber and hot-pink neon over green felt.","amber",
      [("lobby","A dark back-room casino in a neon zoo: an empty green felt table, chairs pushed in."),
       ("betting","The same felt table lit warm, stacks of chips and a chalk marker line drawn across it."),
       ("reveal","A spotlight falling on a blank answer board, chips scattered across the felt.")],
      [("guess-slip","a small betting slip with a scribbled mark on it."),
       ("marker-line","a chalk line drawn across felt with a small marker disc sitting on it."),
       ("closest-arrow","a bold arrow pointing straight down at a spot, meaning closest."),
       ("bust-stamp","a rubber stamp coming down, its face a broken circle, meaning bust."),
       ("payout","a croupier's rake pulling a pile of chips towards the winner.")],
      [("guesses-in","every guess is on the table.","laying them out with a card-sharp's flourish","amber sparks."),
       ("bets-placed","the bets are down.","rubbing his paws together","flying chips in amber."),
       ("reveal","the true answer is revealed.","leaning in, eyes narrowed to slits","amber and pink light."),
       ("closest","someone is closest without going over.","tipping an imaginary hat to them","amber confetti."),
       ("bust","every single guess went over.","cackling at the whole table's misfortune","grey smoke with amber sparks."),
       ("payout","the chips are paid out.","raking in a pile that is probably not his","flying chips in amber and pink.")],
      extra=chips,
      why=ZERO + " It is a betting game with no felt, no chips and no table.")

def game_quickdraw():
    return basic("quickdraw","Quick Draw","#a3e635","#8b5cf6","Otis the otter","the prankster",
      "Draw the word on your phone. Your team guesses. Your art teacher was right.",
      "Otis, a mischievous cartoon OTTER covered in paint, holding a dripping brush",
      "Lime and violet neon.","lime",
      [("lobby","A dark art studio in a neon zoo with a blank easel and canvases stacked against the wall."),
       ("drawing","The same studio lit hot, paint everywhere, the easel mid-work but its canvas blank."),
       ("reveal","A finished canvas under a gallery spotlight — the canvas itself left blank.")],
      [("brush","a fat paintbrush loaded and dripping."),
       ("palette","a wooden palette smeared with neon paint."),
       ("eraser","a chunky eraser mid-swipe with crumbs flying off it."),
       ("timer","a chunky retro countdown clock mid-tick."),
       ("canvas-frame","an empty ornate canvas frame.")],
      [("pens-down","time is up and pens go down.","flinging the brush over his shoulder","lime paint splatter."),
       ("guessed","the team guesses it.","rolling onto his back with delight","lime confetti."),
       ("wrong","the team guesses wrong.","staring at his own drawing, genuinely baffled","grey smoke with lime sparks."),
       ("masterpiece","the drawing is somehow brilliant.","presenting it like a gallery owner","lime and violet sparkle."),
       ("disaster","the drawing is a catastrophe.","hiding behind the canvas with only his eyes showing","lime paint splatter and smoke."),
       ("round-win","the round is won.","paint-covered, both arms up in triumph","lime and violet confetti.")])

def game_sketchrelay():
    return basic("sketchrelay","Sketch Relay","#8b5cf6","#a3e635","Sludge the skunk","the instigator",
      "Draw, pass, guess, repeat — telephone with pictures. It always goes wrong.",
      "Sludge, a gleeful cartoon SKUNK with his tail raised, delighted at what he has started",
      "Violet and lime neon.","violet",
      [("lobby","A dark table in a neon zoo with closed sketchbooks stacked and waiting."),
       ("relay","The same table lit, sketchbooks mid-pass with arcs of motion between them, their pages blank."),
       ("reveal","A wall of pinned blank drawings under gallery lights.")],
      [("sketchbook","a spiral sketchbook flipped open to a blank page."),
       ("pass-arrow","a bold curving arrow sweeping to the right, meaning pass it on."),
       ("pencil","a stubby pencil worn down almost to a nub."),
       ("drift-meter","a needle gauge swung hard into the red, meaning it has gone badly wrong."),
       ("reveal-pin","a push pin driven into a blank sheet of paper.")],
      [("pass","the book is passed to the next player.","shoving it along with both paws, cackling","violet motion lines."),
       ("guess","someone guesses what the drawing was meant to be.","watching with enormous anticipation","violet and lime sparks."),
       ("drifted","the meaning has drifted badly off course.","doubled over laughing, tail straight up","a faint green haze with violet sparks."),
       ("chaos","it has gone completely off the rails.","fanning the flames, thrilled with himself","green haze and violet smoke."),
       ("full-circle","the book comes back to where it started.","presenting the wreckage proudly","violet and lime confetti."),
       ("round-win","the round is over.","taking a bow he has absolutely not earned","falling confetti in violet and lime.")],
      why=ZERO + " The pass — the thing that makes the game funny — has no visual at all.")

def game_afterdark():
    g = "afterdark"
    backs = [card(g,"Card back",f"back-{s}",s,"3:4",
      f"A single card back for an adult party card game, the {s.upper()} deck: {d}. Battered card stock "
      f"with a thick black outline, a heavy hot-pink neon edge glow and a subtle repeating pattern of tiny "
      f"party icons.\n\nAspect ratio: 3:4. Transparent background (PNG). No readable text.")
      for s, d in [("prompt","darker, with a bold neon monogram shape at its centre"),
                   ("response","lighter, with a contrasting pattern and no central mark")]]
    return basic(g,"After Dark","#ec4899","#8b5cf6","Rico the toucan","the DJ",
      "18+ fill-in-the-blank. Play your filthiest card. The judge has no shame.",
      "Rico, a cartoon TOUCAN DJ in headphones and shades behind a small deck",
      "Hot pink and violet neon, deliberately moodier and more adult than the other games.","hot pink",
      [("lobby","A dark nightclub booth in a neon zoo: empty glasses, low seating, nobody playing yet."),
       ("judging","The same booth lit low with cards face down on the table, everyone waiting on the judge."),
       ("reveal","A hard spotlight on a single winning card lying on the table — the card itself blank.")],
      [("judge-crown","a slightly crooked paper crown, meaning this round's judge."),
       ("played-card","a single card face down, pushed forward across the table."),
       ("shuffle","a deck mid-riffle with cards arcing through the air."),
       ("score-token","a chunky scoring token stamped with a star."),
       ("gasp-bubble","an empty comic speech bubble shaped like a shocked gasp.")],
      [("cards-in","every card has been played.","spinning a record, entirely in his element","hot pink sparks."),
       ("judging","the judge is deciding.","holding the room on a drop, one wing raised","hot pink and violet light."),
       ("winner","a winning card is picked.","dropping the beat with both wings up","hot pink confetti."),
       ("too-far","someone's card went too far.","peering over his shades, scandalised and delighted","violet smoke."),
       ("new-judge","the crown passes to a new judge.","handing it over with mock ceremony","hot pink sparkle."),
       ("game-over","the night ends.","fading out the last track","falling confetti in hot pink and violet.")],
      extra=backs,
      why=ZERO + " The 18+ game currently looks exactly like the family ones.")

ALL = {
  "feud": game_feud, "bingo": game_bingo, "trivia": game_trivia, "offlimits": game_offlimits,
  "headsup": game_headsup, "fullcast": game_fullcast, "monikers": game_monikers,
  "soloclue": game_soloclue, "ballpark": game_ballpark, "quickdraw": game_quickdraw,
  "sketchrelay": game_sketchrelay, "afterdark": game_afterdark,
}
