# Kickstarter campaign fields

Canonical answers for the four Kickstarter form fields that were empty. Every fact is taken from
`apps/server/productKnowledge.js` and `apps/server/enclosures.js`, so the campaign, the site and John
never contradict each other. Also published as an artifact, but THIS file is the source of truth --
campaign copy must not live only in an artifact.

Title is already set on Kickstarter as **PLAY ZOO** (8/60).

---

## 1. Subtitle (135 character limit)

**Recommended -- Option A (129/135):**

> A party-game night hosted by Rex, a real AI zookeeper. 14 games on your TV, everyone plays from their phone. No app, no accounts.

Option B, leads with the games (135/135):

> An AI zookeeper hosts your party night: 14 games on the big screen, everyone plays from their own phone. No app and no accounts needed.

Option C, leads with the "never repeats" hook (129/135):

> 14 party games hosted by an AI zookeeper who never repeats a line. On your TV, played from everyone's phone. No app, no accounts.

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

### "Please explain"

```
PlayZoo uses AI in two ways: as a live product feature, and as generated artwork. We are not developing, training or fine-tuning any AI model, and we are not seeking funding to build AI technology.

THE PRODUCT FEATURE. PlayZoo is a party-games night hosted by Rex, an AI zookeeper who MCs the whole evening - intros, banter, scores and crowning a champion - on a TV while players join from their own phones. Rex, and John, who answers questions on our support page, are powered by DeepSeek's hosted chat API. We wrote the characters, their personalities, the rules they follow and the guardrails they run inside; the model performs those characters at runtime, which is why the host never reads the same line twice. It is a third-party service we call, not a technology we build, and it is deliberately swappable for another provider.

THE ARTWORK. Character portraits, game backdrops and imagery on this campaign page are AI-generated from prompts we wrote ourselves, describing our own original characters - twenty animals we created, named and gave personalities to, and fourteen games we designed. The prompts do not name, reference or imitate any living artist, studio or existing artwork, and no third party's images were supplied as input or used as training data. The game rules, the code, the character writing and the product design are our own.

WHAT THE FUNDING IS FOR. The goal is $3,500. The software already works - fourteen games, the AI host and the phone controllers all run today. The money goes to artwork, hosting and running costs. None of it funds AI development.
```

**Open point:** the block deliberately does NOT claim all campaign copy is human-written, because parts
were drafted with AI assistance. Make whatever claim is true at submission time.

---

## 3. Risks and challenges

```
THE HONEST STARTING POINT: this is not an idea looking for money. The fourteen games, the AI host, the phone controllers and the backers' club are built and running today. That is why the goal is $3,500 rather than a number that would need a team - the funding makes PlayZoo louder and better looking, it does not build it from scratch. The usual crowdfunding risk, "will they ever finish it", is genuinely smaller here. The real risks are these four, and we would rather name them than pretend they are not there.

1. WE DEPEND ON A THIRD-PARTY AI PROVIDER. Rex's personality, rules and guardrails are ours, but the model that speaks his lines is a hosted API we pay for. If its pricing changes or the service degrades, our running costs move with it. How we handle it: the host was written against a standard chat-completions interface from day one, and the provider is set by configuration rather than baked into the code, so we can move to a different model without rewriting the games. This was a deliberate design decision, not a fallback we thought of later.

2. CUSTOM CHARACTERS TAKE REAL TIME. The Founding Animal and Head Keeper tiers include one and two custom animal characters drawn for you. That work scales directly with the number of backers, and it is the part of delivery most likely to run long if the campaign does much better than the goal. How we handle it: custom characters are drawn and delivered in batches after the campaign closes, and we will publish a real schedule with batch dates rather than promise everyone the same week and quietly miss it.

3. ARTWORK IS THE BIGGEST REMAINING BUILD. Most of the games currently run on a plain background - the mechanics are finished, the visual character is not. Bringing all fourteen up to full polish is the largest single chunk of work this funding pays for, and art always takes longer than planned. How we handle it: the games are fully playable now, so art ships game by game as it is finished instead of everything landing at once. Nothing is blocked waiting on it.

4. RUNNING COSTS SCALE WITH PLAY. More game nights mean more AI calls and more hosting. The subscription tiers are what covers that once the campaign is over. If uptake is slower than we hope, we reduce what we give away for free before we touch anything a backer was promised.

WHAT WE WILL NOT DO: we will not take the money and change the deal. The prices, the tiers and what each one includes are written on this page, and they will not be quietly reduced after funding.
```

---

## 4. Frequently Asked Questions

Kickstarter adds these one pair at a time.

```
Q: Do I need to download an app?
A: No. PlayZoo runs in a browser on a TV or a laptop, and everyone else joins by scanning a QR code with their phone's camera. No app store, no installs, nothing for your guests to sign up for.

Q: How many people can play?
A: It is built for a room. One screen everybody looks at, and a phone each. The games are team and party formats, so it works with a handful of people or a full living room.

Q: What are the 14 games?
A: Survey Showdown, Bingo Night, Murder Mystery, Trivia, Off Limits, Foreheads, Full Cast, Encore, Cover Ops, Solo Clue, Ballpark, Quick Draw, Sketch Relay, and After Dark.

Q: What does "an AI host" actually mean?
A: Rex is a zookeeper who MCs your whole night - he introduces the games, reacts to what just happened, keeps the banter going, calls the scores and crowns a champion. Because he is real AI rather than a list of recorded lines, he never says the same thing twice. That is the part no other party-games app has.

Q: Is it suitable for kids?
A: Thirteen of the games are for a general room. After Dark is 18+ fill-in-the-blank and is clearly marked as such - it is a separate game you choose to open, not something that turns up mid-family-night.

Q: What is an enclosure?
A: PlayZoo's own take on sorting houses, for the backers' club. You answer a short, silly five-question quiz and Rex sorts you into one of four: The Rowdies, The Cuddle Crew, The Know-It-Owls, or The Schemers. Your answers decide it, so people who answer alike end up together. Each enclosure gets its own private group chat, plus The Watering Hole, a general room everybody shares.

Q: How do I get into the backers' club?
A: Backing here earns you a one-time backer code. That code unlocks sign-up on the site - Rex checks it, you make a profile, take the sorting quiz, and land in your enclosure's chat with the other backers. The code is your key; you can add a password afterwards. The club is backers only.

Q: Can I sign up right now without backing?
A: Not yet. PlayZoo is crowdfunding first and is not open for new public accounts. You can join the waitlist, but backing the campaign is how you jump the queue and get in early.

Q: What happens to my character?
A: At the Founding Animal tier you get one custom animal character drawn just for you, and at Head Keeper you get two. They are yours, drawn to match the twenty original PlayZoo animals.

Q: Can a bar or venue use this?
A: Yes. PlayZoo is white-label - a venue can rebrand the colours and even rename the games to suit their room. If a game name on your screen does not match the one on this page, that is why.
```

**Still missing, because only the owner knows them:** the reward DELIVERY DATE, and the
"who is behind PlayZoo / why trust us to finish this" answer.
