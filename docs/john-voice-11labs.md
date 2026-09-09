# John's voice — ElevenLabs pack for the promo

Everything needed to give the promo render in `tools/promo/` a voiceover in John's voice.

**John is canonical.** Every trait below is lifted from `JOHN_PERSONA` in
[apps/server/john.js](../apps/server/john.js) — the same persona the live `/api/john-chat` runs on.
Nothing here invents a character trait, so the voice you generate will match the John your backers
already talk to on `/waitlist` and `/ask-john`.

---

## 1. Voice Design prompt

Paste this into **ElevenLabs → Voice Design** (text-to-voice) to generate the voice.

> A male cartoon raccoon in his late thirties. Mid-to-low pitch with a light gravelly rasp, like
> someone who talks all day and sleeps too little. Quick, clipped, conversational delivery with a
> sly upward lilt at the end of a joke. Warm but never earnest — every line sounds like he is
> letting you in on something. Drops to a conspiratorial near-whisper on asides, then snaps back to
> full volume for a punchline. Streetwise, fast-thinking, permanently amused. Not gruff, not
> villainous, not a growl — charming, sharp, and always working an angle.

**Why this shape:** the persona calls for "sharp and cheeky, conspiratorial", a "lovable rogue",
and explicitly "SCARY SMART — never a dim con-man". A gravelly villain voice gets the rogue and
loses the charm; a smooth announcer voice gets neither. The rasp plus the speed is what reads as
clever rather than slick.

**Audition text** — paste as the preview sample; it exercises all three registers he needs:

> Listen, between you and me — I know a guy. That guy is me. Fourteen games, one zookeeper, and he
> is outnumbered. One of us is lying about that, by the way. It's me.

---

## 2. Settings

Starting points, not gospel. Generate, listen, then adjust one at a time.

| Setting | Value | Why |
|---|---|---|
| Model | **Eleven v3** if available, else Multilingual v2 | v3 reads inline emotion tags, which is most of John's performance |
| Stability | **0.35** | Low is expressive. High makes him flat and sincere, the one thing he never is |
| Similarity | **0.75** | Consistent across takes without over-fitting the sample |
| Style | **0.45** | Enough lilt to sell sarcasm; past ~0.6 it starts mangling consonants |
| Speaker boost | On | He talks fast; this keeps consonants crisp |
| Speed | **1.05** | Slightly quick. He is three moves ahead and should sound like it |

Generate **each act as its own clip**, not one 69-second take. Long generations drift in tone, and
you want to retry one bad line without re-rolling everything.

---

## 3. The script

Timecodes are the real shot boundaries of the current render (1920×1080, 68.93s), generated from
`SHOTS` in `tools/promo/build_promo.py`. **In-points are where a line should START.** The voice does
not need to hit every cut and will sound better flowing across them.

Square-bracket tags are **ElevenLabs v3 emotion tags**. On v2 they are read aloud — delete them.

### Act 1 — John hijacks the promo (0:00–0:11)

```
[0:00]  [casual] I'm John. I'll be your problem.
[0:03]  They said don't let the raccoon direct the promo.
[0:05]  [smug] So.
[0:07]  Welcome to PlayZoo. Fourteen games, zero supervision.
```

### Act 2 — what it actually is (0:11–0:27)

```
[0:11]  One screen does the thinking.
[0:14]  Everyone else plays on their phone. No app, no accounts, no excuses.
[0:18]  Fourteen games. One zookeeper. [amused] He's outnumbered.
[0:22]  That's Rex. He thinks he's in charge.
[0:25]  [conspiratorial] Meanwhile. Our star performer.
```

### Act 3 — the games (0:27–0:52)

```
[0:27]  Survey Showdown. Two teams, one buzzer, no friendships.
[0:29]  [dry] Everybody's wrong. Confidently wrong.
[0:31]  Charades. No talking, no writing, no dignity.
[0:35]  Sketch Relay. This began as a cat.
[0:37]  [deadpan] It has opinions now.
[0:39]  Cover Ops. Find your agents, avoid the assassin.
[0:42]  Murder Mystery. One of us is lying. It's me.
[0:44]  Bingo. She's cheating.
[0:46]  High rollers. The house is a gorilla, and the house wins.
[0:48]  And the eighteen-plus one. Not in front of the parrot.
[0:50]  [flat] Grand prize. Meh.
```

### Act 4 — the enclosures (0:52–0:59)

```
[0:52]  You get sorted. Four enclosures, no appeals.
[0:54]  The nice one.
[0:55]  [contempt] The insufferable one.
[0:57]  [proud] Mine. Obviously.
```

### Act 5 — the ask (0:59–1:09)

```
[0:59]  Back it. Kickstarter. Three and a half grand — [dry] modest, frankly.
[1:02]  Get in early. Backers play first.
[1:04]  [smug] I decide the rest.
[1:06]  PlayZoo dot snap-a-web dot com.
```

**158 words over 69 seconds** — about 2.3 words per second, which leaves real air for the pauses the
jokes need. A natural 69-second read tops out near 180 words, so this is deliberately under rather
than squeezed in. If a take comes back rushed, cut a line rather than speeding him up.

---

## 4. Things that will bite you

- **Write the URL phonetically.** `playzoo.snapaweb.com` gets read as letters or mangled. Use
  `PlayZoo dot snap-a-web dot com`, as written above.
- **Say the money in words.** `$3,500` is read inconsistently by every TTS. "Three and a half grand"
  is both accurate and in character. Literal alternative: "three thousand five hundred dollars".
- **Keep stage directions out of the spoken text.** John's own persona rule forbids narrating
  actions. `[sarcastic]` is a control tag, not dialogue — and on v2 it gets spoken aloud. Check
  which model you are on before pasting.
- **"Fourteen", not "14".** Digits are a coin-flip for any TTS.
- **The video is silent by design**, with no music bed, so the VO sits on top cleanly. If you add
  music, duck it ~6 dB under the voice or the dry lines disappear — and the dry lines are the jokes.

---

## 5. What this deliberately does not cover

A **voice clone** of a specific performer, and John's **trash-panda rage** — the persona's hard
trigger where he drops the smooth act entirely and goes off. That register is far louder and faster
than anything in this promo and needs its own generation at roughly 0.2 stability. Worth doing when
he gets a speaking part on the site; not for 69 seconds where he stays composed throughout.
