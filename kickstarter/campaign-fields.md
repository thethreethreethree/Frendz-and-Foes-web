# Kickstarter campaign fields

Canonical answers for the four Kickstarter form fields that were empty, **written in John's voice**
(`apps/server/john.js` -- sarcastic, conspiratorial, working the velvet rope, never lying about the
facts). Every figure under the swagger comes from `apps/server/productKnowledge.js` and
`apps/server/enclosures.js`, so the campaign, the site and John himself cannot drift apart.
Also published as an artifact, but THIS file is the source of truth -- campaign copy must not live
only in an artifact.

Title is already set on Kickstarter as **PLAY ZOO** (8/60).

Owner decisions recorded here: rewards deliver **within one month** of the campaign closing, and the
creator answer is **"a small independent team"** with no names and no roles.

---

## 1. Subtitle (135 character limit)

All four measured, not estimated.

**Recommended -- Option A (130/135):**

> Fourteen party games, an AI zookeeper with a mouth on him, and everybody playing off their own phone. No app, no accounts. Get in.

Option B, full conspiratorial John (130/135):

> Listen. Fourteen games, one AI host who never repeats himself, everyone on their own phone. No app, no accounts, no catch. Mostly.

Option C, safest but still his (132/135):

> Party games hosted by an AI zookeeper with opinions. Fourteen of them, on your TV, played off everyone's phone. No app, no accounts.

Option D, leads with the talking-back (132/135):

> Fourteen party games and an AI zookeeper who talks back. It's on your telly, you play off your phone. No app, no accounts, no queue.

---

## 2. Use of AI

**The reference PDF's tick boxes are WRONG for PlayZoo, on both counts.** That screenshot is from
Zwaptz, a different project. It ticks *seeks funding for AI technology* and leaves *AI-generated
content* unticked. For PlayZoo the truth is the exact opposite.

| Answer | Question | Why |
|---|---|---|
| **YES** | Will your project involve the development of AI technology or use AI content? | You use AI content and an AI feature. |
| **leave off** | My project seeks funding for AI technology. | You do not develop, train or fine-tune a model -- you call a third party's API. Ticking it invites scrutiny for something untrue, and drags in three consent/credit sub-boxes. |
| **TICK** | I plan to use AI-generated content in my project. | Character art, game backdrops and campaign imagery are AI-generated. The reference leaves this off; for PlayZoo it is the important one. |
| **TICK** | I am incorporating AI in my project in another way. | Rex and John are a live product feature, not just artwork. |

This field is read by **Kickstarter's reviewers, not backers** -- it is a compliance declaration, and a
reviewer deciding whether the project may launch is the one audience that does not want a character
bit. Both versions are kept below. **Recommendation: the straight version for this field only**, and
John everywhere else.

### Straight version (recommended for this field)

```
PlayZoo uses AI in two ways: as a live product feature, and as generated artwork. We are not developing, training or fine-tuning any AI model, and we are not seeking funding to build AI technology.

THE PRODUCT FEATURE. PlayZoo is a party-games night hosted by Rex, an AI zookeeper who MCs the whole evening - intros, banter, scores and crowning a champion - on a TV while players join from their own phones. Rex, and John, who answers questions on our support page, are powered by DeepSeek's hosted chat API. We wrote the characters, their personalities, the rules they follow and the guardrails they run inside; the model performs those characters at runtime, which is why the host never reads the same line twice. It is a third-party service we call, not a technology we build, and it is deliberately swappable for another provider.

THE ARTWORK. Character portraits, game backdrops and imagery on this campaign page are AI-generated from prompts we wrote ourselves, describing our own original characters - twenty animals we created, named and gave personalities to, and fourteen games we designed. The prompts do not name, reference or imitate any living artist, studio or existing artwork, and no third party's images were supplied as input or used as training data. The game rules, the code, the character writing and the product design are our own.

WHAT THE FUNDING IS FOR. The goal is $3,500, and it funds finishing PlayZoo and releasing version one. Fourteen games are built and the rules work, but the games are not open to the public and most still run on a plain background. The money pays for the art across all fourteen, Rex's voice, and the system development left to finish version one. None of it funds AI development, and none of it covers running costs.
```

### John's version

```
Straight answer, because this is the bit where being clever gets you nowhere. Yes, there's AI in PlayZoo. Two kinds, and we'll show you both.

THE ONE THAT TALKS. Rex is our AI zookeeper. He hosts the whole night - does the intros, calls the scores, winds up whoever's losing, crowns a champion - on the telly while everybody plays off their phones. And me, John, I'm on the support desk answering questions. Rex and I run on DeepSeek's hosted chat API. We wrote us: the personalities, the rules, the lines we're not allowed to cross. The model just performs it, which is why Rex never says the same thing twice all night. We rent the brain. We didn't build it, we're not training it, and we could swap the provider tomorrow without touching a single game.

THE ONE THAT'S DRAWN. The character portraits, the game backdrops, the artwork on this page - AI-generated, from prompts we wrote ourselves, describing our own animals. Twenty of them. We made them up, named them, gave them their personality problems. The prompts don't name, copy or imitate any living artist, any studio, or anybody's existing work, and we didn't feed anyone else's images in as reference or training data. The games, the rules, the code and the writing are ours.

WHERE THE MONEY GOES. Three thousand five hundred dollars. That's it. Fourteen games are built and the rules work - what is missing is the finishing. The money buys the art across all fourteen games, Rex's actual speaking voice, and the system development that turns fourteen built games into a finished version one. It does not pay our running costs; subscriptions do that after launch. Not one cent goes to building AI - we rent that model like everyone else, and we would rather say so plainly than have you find out later.
```

Neither version claims all campaign copy is human-written, because parts were drafted with AI
assistance. Make whatever claim is true at submission time.

---

## 3. Risks and challenges

Written in a plain professional register, deliberately. Every other field on this page keeps Rex's
and John's voice, because that voice is what sells the project to backers and it was never what
Kickstarter objected to. This field is the exception: it is the one a reviewer assesses first, this
project is being submitted after a sister project was rejected, and a risk disclosure written in a
cartoon character's voice reads as not taking the review seriously. Owner's instruction 2026-09-10,
scoped to this field alone.

It leads with the development stage for the compliance reason recorded in
[apps/server/ksCompliance.test.mjs](../apps/server/ksCompliance.test.mjs). Point 5 declares that
Rex's 11Labs speaking voice is not shipped, which block 04 of `kickstarter/body.html` advertises as
on the way -- worth declaring rather than leaving for a backer to discover.

```
PlayZoo is in development. It is not open to the public, it is not trading, and this campaign is not raising money to cover the costs of an existing operation. The funding pays for a specific, finite piece of work: completing version one and releasing it.

What is already built: fourteen games, with their rules complete and working; Rex, the in-product AI host; the phone controllers players use; and the backers' club. What remains is the finishing work - the artwork across all fourteen games, Rex's speaking voice, and the development needed to package the whole thing as a release. That is what the $3,500 pays for, and it is why the goal is $3,500 rather than a figure that would imply we are starting from nothing.

The games are not open to the public yet. Backers get in first when the campaign closes.

If you would like to confirm there are real people behind this before pledging, our support assistant is available on the project page now and will answer questions directly.

The five risks we consider material, and what we have done about each:

1. WE DEPEND ON A THIRD-PARTY AI PROVIDER. Rex's personality and every rule he follows are ours, but the language model that generates his lines is a third-party service billed by usage. If that provider's pricing or reliability changes, what it costs us to operate PlayZoo after launch changes with it, and we have no control over that. Mitigation: Rex was built against a standard provider interface from the outset, and the provider is a configuration setting rather than something embedded in the code. We can move to a different model without rewriting any game.

2. THE CUSTOM CHARACTERS ARE THE REWARD MOST LIKELY TO SLIP. Founding Animal includes one custom animal character drawn for the backer; Head Keeper includes two. We have committed to delivering everything within one month of the campaign closing. That work scales directly with the number of backers, so if the campaign substantially exceeds its goal, this delivery date is the first commitment to come under pressure. Mitigation: character work is drawn in batches throughout the month rather than accumulating at the end, and it is prioritised ahead of general artwork. No backer's reward waits behind a background illustration.

3. THE ARTWORK IS THE LARGEST REMAINING TASK. Most of the games currently run on a plain background. The rules are complete; the visual design is not. Bringing all fourteen games to a finished standard is the single largest piece of work this funding covers, and art schedules are difficult to estimate accurately. Mitigation: the games are playable, so artwork is added game by game as it is completed rather than all at once. No finished game waits on an unfinished one.

4. RUNNING COSTS ARE REAL, AND THIS CAMPAIGN DOES NOT FUND THEM. After launch, every game night generates AI usage and hosting costs. Those are ongoing operational costs and they are funded by subscription revenue, not by pledges. A pledge completes the build and pays for the rewards promised to that backer. If subscription uptake is lower than we expect, we will reduce what we offer free of charge. We will not reduce anything a backer was promised.

5. REX'S SPEAKING VOICE IS NOT YET IMPLEMENTED. This page describes Rex gaining an actual speaking voice. He does not have one yet; he currently hosts in text. That is why the voice is deliberately excluded from every reward tier. If it is delivered, all backers receive it. If the voice service proves unworkable, no backer loses anything they paid for.

WHAT WE WILL NOT DO: alter the offer after funding. The prices, the tiers, and the contents of each tier are stated on this page and will not be reduced once the campaign closes.
```

---

## 4. Frequently Asked Questions

Twelve pairs. Kickstarter adds these one at a time.

```
Q: When do I get my stuff?
A: Within a month of the campaign closing. Your backer code and your access go out as soon as it ends - the games are built, so getting you in is not the part that takes time. The custom animals for Founding Animal and Head Keeper get drawn and delivered inside that same month. I'll be personally insufferable about it if we're running late.

Q: Who's actually behind this?
A: A small independent team, and no, you're not getting our names on a poster. Judge us on the thing instead - it's more use to you than a bio. PlayZoo isn't a concept or a mock-up - the fourteen games, the host and the phone controllers are built and working. What's missing is the artwork and my voice, which is what this campaign finishes. The games themselves open to backers first when it closes. Go and talk to me on the support page right now if you want to check there are real people here. That's also why we're asking for $3,500 and not something that sounds like we're building it from scratch. We're not. We're finishing it.

Q: Do I have to download an app?
A: No, and I'd be offended if you thought we'd do that to you. It runs in a browser on your telly or a laptop, everyone else points their phone camera at a QR code, done. No app store, no installs, nothing for your mates to sign up for while the pizza goes cold.

Q: How many people can play?
A: It's built for a room. One screen everybody stares at, a phone each. Works with a handful of you or a full front room. Team games, party games - the more of you there are, the worse the behaviour, which is rather the point.

Q: What are the fourteen games?
A: Survey Showdown, Bingo Night, Murder Mystery, Trivia, Off Limits, Foreheads, Full Cast, Encore, Cover Ops, Solo Clue, Ballpark, Quick Draw, Sketch Relay, and After Dark. Fourteen. I counted twice.

Q: What does "an AI host" actually mean? Is it just recorded lines?
A: It is not, and this is the bit nobody else has. Rex introduces the games, reacts to what just happened in your room, keeps the banter going, calls the scores and crowns a champion. Because he's real AI and not a soundboard, he never says the same thing twice. Play the same game three nights running and he'll find three different ways to be rude about it.

Q: Is it alright for kids?
A: Thirteen of them, yes. After Dark is 18+ fill-in-the-blank and it's labelled as such - it's a separate game you have to go and open on purpose. It is not going to ambush you halfway through family night. We thought about that.

Q: What's an enclosure?
A: Our version of sorting houses, for the backers' club. You answer five short and frankly silly questions, and Rex sorts you into one of four: The Rowdies, The Cuddle Crew, The Know-It-Owls, or The Schemers. Your answers decide it, so people who think alike end up in together. Each one gets its own private group chat, plus The Watering Hole where everybody mixes. For the record, I'm a Schemer, and the Schemers are obviously the best one. Rex runs the quiz, not me. I just have opinions about his results.

Q: How do I get into the backers' club?
A: Backing here gets you a one-time code. That code is your way in - Rex checks it, you make a profile, take the quiz, and you're in your enclosure's chat with the rest of the backers. The code's your key; stick a password on afterwards if you like. Backers only. That's rather the whole idea of a velvet rope.

Q: Can I just sign up now without backing?
A: You cannot, and I say that with genuine sympathy. We're crowdfunding first and we're not open for public accounts yet. You can sit on the waitlist like everybody else, or you can back the campaign and walk straight past the queue. Between you and me, one of those is quicker.

Q: What happens with my custom character?
A: Founding Animal gets you one animal drawn just for you. Head Keeper gets you two. They're yours, drawn to sit alongside the twenty originals - same world, same style, your character.

Q: Can a bar or a venue run this?
A: Yes. PlayZoo is white-label, so a venue can rebrand the colours and even rename the games to suit the room. So if a game on your screen has a different name to the one on this page, that's why, and no, you haven't been sold a knock-off.
```

---

## 6. Refund policy

Kickstarter asks for this, and it is one of the two fields the reviewer quoted back on the sister
project -- the other being Risks. It does two jobs: it keeps the compliant framing (a pledge buys
named things, never general support for a business), and it states what happens after funding.

**Owner's decision, 2026-09-10: no commitment beyond Kickstarter's own terms.** Asked whether to
promise a replacement-or-direct-refund if something can't be delivered, the owner chose to promise
nothing the platform does not already provide. So this policy says plainly that collected pledges
are not refundable, rather than implying a safety net that would then have to be honoured by hand.
Do not soften this later into "we'll sort you out" -- an informal promise is the same liability as a
formal one, with none of the clarity.

The trap it still avoids: language like "your support keeps us going" or "helps cover our costs"
turns a reward pledge into general business support, which is the exact framing that got the sister
project pulled. A pledge here buys named things, and the policy says so in its first line.

```
WHAT YOUR PLEDGE IS. You are pre-ordering specific, named things: access to PlayZoo for a set number of months, a set number of games, a backer code, a place in the backers-only club, and - at Founding Animal and Head Keeper - custom animal characters drawn for you. It is not a donation and it is not general support for a business. Everything you are owed is listed on your reward, and the list does not shrink after funding.

BEFORE THE CAMPAIGN ENDS. You can change or cancel your pledge yourself, any time before the campaign closes, straight from Kickstarter. You do not need our permission and you do not need to explain yourself. Nothing is charged until the campaign successfully funds.

IF THE CAMPAIGN DOESN'T FUND. Nobody is charged a penny. Kickstarter is all-or-nothing, so if we miss $3,500 the pledges simply never collect and there is nothing to refund.

AFTER IT FUNDS. Once the funds collect, pledges are not refundable. Kickstarter has no refund button and we are not offering one alongside it. We would rather tell you that straight than imply a safety net that isn't there. What you have instead is a list on your reward that does not change after funding, and updates that tell you honestly where the work has got to - including when it is going slower than we said.

TWO THINGS WORTH KNOWING BEFORE YOU PLEDGE. Rex's speaking voice is deliberately not part of any reward tier, precisely because it is the piece most likely to slip - so nobody is paying for something that might not arrive. And if delivery runs late, you will hear it from us in a project update rather than work it out from the silence.

HOW TO REACH A HUMAN. Kickstarter messages, or the support desk on the project page. A real person reads both.
```

---

## Open risk on the record

The one-month delivery date is a public promise. Access and backer codes are the easy half -- the
software is built. The half that can slip is the custom characters, because that work scales with
backer count; a campaign that lands far past $3,500 puts that date under pressure first, and missing a
stated delivery date in month one is the most damaging thing a campaign can do. Flagged before launch,
owner's call to keep it.

---

## 5. Reward tiers — titles, descriptions and items

Paste-ready for Kickstarter's reward form. Every number here comes from `PLANS` in
[apps/server/subscriptions.js](../apps/server/subscriptions.js); the headline sentences match
`TIERS` in [kickstarter/build.py](build.py) and `productKnowledge.js` word for word, so the reward
card, the campaign page and what Rex and John tell people can never disagree.

**Shipping on all three: none.** Every reward is digital — access and artwork. Nothing is posted, so
set no shipping and collect no addresses.

**Estimated delivery on all three: one month after the campaign ends.** Access and backer codes go
out the moment it closes; the custom animals are drawn inside that same month. That promise is
already made in the FAQ above, so the reward form must not say anything looser or tighter.

### $15 — Zoo Pass

**Title:** Zoo Pass

**Description:**

> Six months of PlayZoo and any five games you choose to lose at — a cheap date with your own public humiliation.
>
> It all runs in a browser. Put PlayZoo on the big screen, your guests scan a code, and Rex — the AI
> zookeeper — runs the night. Nobody downloads anything and nobody makes an account.
>
> You also get into the backers-only club, where you are sorted into one of the four enclosures and
> are not permitted to leave.

**Items:**
- PlayZoo access — 6 months
- Any 5 games, your pick
- Backer code
- Backers-only club and enclosure

### $30 — Founding Animal

**Title:** Founding Animal

**Description:**

> A full year of PlayZoo, any ten games you choose, and one custom animal drawn just for you — immortalised, and
> frankly better-looking than the original.
>
> Everything in the Zoo Pass, twice the year and twice the games — and again, you pick which. Then we draw you into the cast: one
> animal, your call on what it is, done in the PlayZoo house style and yours to keep.
>
> The custom animals are the part with a real deadline attached — they are drawn in batches through
> the month after the campaign closes, ahead of the general artwork.

**Items:**
- PlayZoo access — 12 months
- Any 10 games, your pick
- 1 custom animal character, drawn for you
- Backer code
- Backers-only club and enclosure

### $50 — Head Keeper

**Title:** Head Keeper

**Description:**

> A full year with EVERY game unlocked, plus TWO custom characters made just for you. You basically
> own a wing of the zoo.
>
> All fourteen games, nothing held back, for a full year — Survey Showdown, Murder Mystery, Cover
> Ops, Sketch Relay, Bingo Night, Trivia, Foreheads, Quick Draw, Solo Clue, Ballpark, Full Cast,
> Encore, Off Limits and the strictly-after-dark one.
>
> And two custom animals rather than one, so you can put someone else in the zoo as well. Whether
> that is a gift or a threat is between you and them.

**Items:**
- PlayZoo access — 12 months
- All 14 games unlocked
- 2 custom animal characters, drawn for you
- Backer code
- Backers-only club and enclosure

### DECIDED — the backer picks

Answered by the owner on 2026-09-09: **any five, and any ten, chosen by the backer.**

No list to argue with, nobody buys a tier and finds their favourite game missing, and it cannot age
badly as the fourteen games get better. The COUNT is the product. Only $50 needed no answer, because
"every game" needs no list.

Recorded in `PLANS` in [apps/server/subscriptions.js](../apps/server/subscriptions.js), and the
blurbs in `productKnowledge.js` and [build.py](build.py) were updated in the same commit — those
three must never disagree, because Rex and John answer from `productKnowledge` while the backer is
reading the page built from `build.py`.

**Not enforced yet, and the reward copy now promises it.** `hostEntitled()` in `index.js` checks only
that a plan is ACTIVE — it never looks at which game is being hosted, so today any active plan can
host all fourteen. Making the count real needs a stored per-backer list of chosen games, a screen to
choose them, and a check at join time.

Why that is not a fire: `ENFORCE_ENTITLEMENTS` defaults off, every game is behind `GAMES_OPEN` until
the campaign finishes, and nobody holds a paid plan yet. It becomes urgent the day games open — which
is also the first day the promise is testable by a backer.
