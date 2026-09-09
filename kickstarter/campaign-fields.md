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

WHAT THE FUNDING IS FOR. The goal is $3,500. The software already works - fourteen games, the AI host and the phone controllers all run today. The money goes to artwork, hosting and running costs. None of it funds AI development.
```

### John's version

```
Straight answer, because this is the bit where being clever gets you nowhere. Yes, there's AI in PlayZoo. Two kinds, and we'll show you both.

THE ONE THAT TALKS. Rex is our AI zookeeper. He hosts the whole night - does the intros, calls the scores, winds up whoever's losing, crowns a champion - on the telly while everybody plays off their phones. And me, John, I'm on the support desk answering questions. Rex and I run on DeepSeek's hosted chat API. We wrote us: the personalities, the rules, the lines we're not allowed to cross. The model just performs it, which is why Rex never says the same thing twice all night. We rent the brain. We didn't build it, we're not training it, and we could swap the provider tomorrow without touching a single game.

THE ONE THAT'S DRAWN. The character portraits, the game backdrops, the artwork on this page - AI-generated, from prompts we wrote ourselves, describing our own animals. Twenty of them. We made them up, named them, gave them their personality problems. The prompts don't name, copy or imitate any living artist, any studio, or anybody's existing work, and we didn't feed anyone else's images in as reference or training data. The games, the rules, the code and the writing are ours.

WHERE THE MONEY GOES. Three thousand five hundred dollars. That's it. The thing already runs - fourteen games, the host, the phones, all of it works today. The money buys artwork, hosting, and the bill for keeping Rex talking. Not one cent of it goes to building AI. We're renting, not inventing, and we'd rather say so plainly than have you find out later.
```

Neither version claims all campaign copy is human-written, because parts were drafted with AI
assistance. Make whatever claim is true at submission time.

---

## 3. Risks and challenges

Five risks, each with a mitigation that is true of the actual build. Point 5 covers Rex's 11Labs
speaking voice, which block 04 of `kickstarter/body.html` advertises as on the way and which is not
shipped -- worth declaring rather than leaving for a backer to notice.

```
Right. This is the part where I'm meant to look you in the eye and tell you what could go wrong. Fine by me - I'd rather you heard it from me than found it out later.

But first, the thing that actually matters, and I want you to sit with it for a second: this is not a drawing on a napkin. The fourteen games work. Rex works. The phones work. The backers' club works. You can go and prod the whole thing right now and see for yourself - that's not a promise, it's a link. Which is exactly why we're asking for three and a half grand instead of eighty. We're not building PlayZoo. We're finishing it. So the question that sinks most campaigns - "will these people ever deliver anything" - is a much smaller question here than you're used to asking.

Now. You asked what could bite us. Four things, and one bonus.

1. WE RENT THE BRAIN. Rex's personality is ours - we wrote every rule he follows. But the model that actually speaks his lines is somebody else's service, and we pay for it by the word. If their prices jump or their service goes wobbly, our running costs move and we don't get a vote. What we did about it: we built Rex against a standard interface from day one, and the provider is a setting, not something welded into the code. We can move him to a different model without rewriting a single game. That was a deliberate decision made early, not a clever answer invented for this paragraph.

2. THE CUSTOM CHARACTERS ARE THE BIT THAT COULD SLIP. Founding Animal gets you one custom animal drawn for you, Head Keeper gets you two, and we've said everything lands within a month of the campaign closing. Here's the honest maths: that work scales with how many of you there are. If this campaign goes far past its goal - lovely problem, still a problem - that one-month date is the first thing under pressure. What we're doing about it: characters get drawn in batches right through the month instead of piling up at the end, and character work goes to the front of the queue ahead of the general artwork. Your reward never waits behind a background.

3. THE ARTWORK IS THE REAL JOB. Most of the games currently run on a plain background. The rules are finished; the look isn't. Bringing all fourteen up to properly finished is the single biggest chunk of work this money pays for, and anyone who tells you art comes in on schedule has never commissioned any. What we're doing about it: the games are fully playable right now, so art ships game by game as it's done. Nothing is sat waiting for everything.

4. MORE PLAYING COSTS MORE MONEY. Every game night is more AI calls and more hosting. The subscriptions are what pays for that once the campaign's over. If fewer people stick around than we hope, we cut back what we hand out for free - we do not touch anything a backer was promised.

5. AND THE BONUS ONE, BECAUSE IT'S ON THIS PAGE. We've said Rex is getting an actual speaking voice. He hasn't got one yet. He hosts in writing today, and the voice is genuinely still to come. That's precisely why it isn't part of any reward tier - if it lands, everybody gets it and it's a nice surprise. If the voice service doesn't work out, nobody loses a thing they paid for.

WHAT WE WILL NOT DO: take your money and quietly change the deal. The prices, the tiers, and exactly what's in each one are written on this page. They don't shrink after funding. I'll sell you a bottle cap and call it a collectible - I won't do that.
```

---

## 4. Frequently Asked Questions

Twelve pairs. Kickstarter adds these one at a time.

```
Q: When do I get my stuff?
A: Within a month of the campaign closing. Your backer code and your access go out the moment it ends - there's nothing to build first, the thing already runs. The custom animals for Founding Animal and Head Keeper get drawn and delivered inside that same month. I'll be personally insufferable about it if we're running late.

Q: Who's actually behind this?
A: A small independent team, and no, you're not getting our names on a poster. Judge us on the thing instead - it's more use to you than a bio. PlayZoo isn't a concept or a mock-up, it's running software: fourteen games, the host, the phones, the club, all working today. Go and talk to me on the support page right now if you want to check. That's also why we're asking for $3,500 and not something that sounds like we're building it from scratch. We're not. We're finishing it.

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

## Open risk on the record

The one-month delivery date is a public promise. Access and backer codes are the easy half -- the
software already runs. The half that can slip is the custom characters, because that work scales with
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

> Six months of PlayZoo and five games to lose at — a cheap date with your own public humiliation.
>
> It all runs in a browser. Put PlayZoo on the big screen, your guests scan a code, and Rex — the AI
> zookeeper — runs the night. Nobody downloads anything and nobody makes an account.
>
> You also get into the backers-only club, where you are sorted into one of the four enclosures and
> are not permitted to leave.

**Items:**
- PlayZoo access — 6 months
- 5 games unlocked
- Backer code
- Backers-only club and enclosure

### $30 — Founding Animal

**Title:** Founding Animal

**Description:**

> A full year of PlayZoo, ten games, and one custom animal drawn just for you — immortalised, and
> frankly better-looking than the original.
>
> Everything in the Zoo Pass, twice the year and twice the games. Then we draw you into the cast: one
> animal, your call on what it is, done in the PlayZoo house style and yours to keep.
>
> The custom animals are the part with a real deadline attached — they are drawn in batches through
> the month after the campaign closes, ahead of the general artwork.

**Items:**
- PlayZoo access — 12 months
- 10 games unlocked
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

### OPEN DECISION — which five, and which ten?

`subscriptions.js` states it plainly: `games` is a COUNT, not a list, because **which** five games a
Zoo Pass unlocks has never been decided. This copy therefore says "5 games" and "10 games" and names
none of them.

That will not survive contact with backers. "Which five?" is the first comment under the $15 tier,
and answering it publicly after people have pledged means either disappointing someone or quietly
changing the deal — which the risks section on this page explicitly promises not to do.

Three ways to close it, none of which the code prevents:

1. **Name them.** Pick five and ten and write them into the reward items. Clearest for a backer, and
   the tiers stop being a mystery box.
2. **Let the backer choose.** "Any five games you like." Generous, and it makes the count the
   product rather than a curated list.
3. **Say it is not decided yet, on the page.** Honest, keeps the option open, and is much better
   received before a pledge than after one.

Only $50 is safe as written, because "every game" needs no list.
