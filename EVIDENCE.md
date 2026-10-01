# EVIDENCE — a separate John chat, for Brie, about the founder

**Task:** "create a separate chat system for John the Racoon, just for John… and I want you to program
it to have a conversation with a person with the name Brie, short for Britney (the goal is to talk to
Brie, regarding questions, about me the founder)." Founder facts supplied: John Ramos, owns a
software development company, currently living in the Philippines, 3 sisters and a half brother,
favourite colour Red, loves to ride and build motorcycles.
Follow-up: **"just trigger the conversation with Brie/Britney when she says Hi my name is Brie,
Britney."**

Phase 0: what already exists, opened, before any new code. R7 — the build is gated on this.

---

## 1. There is already a John chat system. Three of them, sharing one engine. [OBSERVED]

| path | bytes | a fact from inside |
|---|---|---|
| `apps/server/john.js` | 11,114 | `johnChat({ room, messages, mode })` → `{ reply, source: "ai"\|"canned" }`, "Never throws". `systemPrompt(mode)` composes `JOHN_PERSONA + BREVITY_RULE + JOHN_KNOWLEDGE`, and appends `JOHN_AGENT_RULES` **only** when `mode === "agent"`. Temperature `0.95`. |
| `apps/server/voice.js` | — | `BREVITY_RULE`: "Reply in ONE or TWO short sentences. Under 40 words, almost always." `CHAT_MAX_TOKENS = 130`, with the comment that this is "Headroom above a compliant reply, NOT a brake" — lowering it to force brevity truncates mid-word. |
| `apps/server/productKnowledge.js` | 10,803 | the shared briefing. `CHARACTERS[0]` is `["John", "raccoon", "the schemer"]` — John is cast member #1 of a canonical 20, and the file says "never invent a 21st". |
| `apps/web/src/routes/AskJohnRoute.tsx` | — | the surface pattern: `ROOM = "ask-john"`, a greeting that is stripped before sending ("it's page furniture, not something John 'said'"), chat box at `h-[min(30rem,65dvh)] min-h-[20rem]` because a flat `30rem` pushed the composer off a phone screen. |
| `apps/server/index.js:289` | — | `app.post("/api/john-chat")` passes `{ room, messages, mode }` straight through to `johnChat`. |
| `apps/web/src/net/host.ts:61-64` | — | `chatWithJohn(messages, room?, mode?)` — and `mode` is typed **`"agent"` only**, so a third mode will not compile until that type is widened. This is the one real code obstacle. |
| `apps/web/src/main.tsx:33-44` | — | `createHashRouter`. `/ask-john` is registered with the comment "Public on purpose". A new page must be added here or it is unreachable. |

**Three modes exist today, not two** (R2 — the handover summary says two):
1. `mode` absent → the **waitlist doorman** ("Name's John — I run the list around here").
2. `mode: "agent"` → the **support desk** on `/ask-john`.
3. Rex is a separate character entirely (`apps/server/host.js`), not a John mode.

**The persona's hard rules I must not break:** the trash-panda trigger (he "ABSOLUTELY DESPISES" it);
"never lie about the facts"; "NO STAGE DIRECTIONS in ANY notation"; and `stripStageDirections()` runs
on the output path anyway because, per the handover, "DeepSeek ignored it".

**A trap recorded in the handover, verified still live in `speech.js`:** do not "simplify"
stage-direction stripping into deleting everything in asterisks — that turned `I have a *business*
degree` into `I have a degree`. Narration is removed; emphasis is unwrapped and the words kept.

## 2. Images, opened one at a time (LAW 1 / R3)

- **`apps/web/public/avatars/raccoon.png`** — 131,460 bytes. Cartoon raccoon head-and-shoulders in a
  circular badge with a thick black ring. **No text.** Grey-charcoal fur, dark bandit mask, cream
  muzzle and brow, black nose, one eyebrow cocked in a sly side-eye, asymmetric grin with a visible
  fang; a sliver of teal/purple clothing bottom-right. Background inside the circle is flat **hot
  magenta**. Renders at 44px beside chat bubbles on the near-black canvas (`--c-canvas: 11 15 26`);
  magenta on near-black is high contrast and there is **no white area**, so no vanishing-on-light risk.
- **`apps/web/public/crew/john-agent.png`** — 659,864 bytes. John at a call-centre desk inside a heavy
  **gold/brass ring frame with rivets** — baked into the PNG, *not* a borderless cut-out (the handover
  flags that an older description got this wrong; confirmed wrong by looking). Headset with boom mic,
  hands steepled, sly grin, one eye wide one narrowed, sweat bead; dark tee under a neon
  magenta/cyan/orange flame-print shirt. Behind: monitor reading **"Call Queue"**, board reading
  **"TARGET"**, desk phone, cup labelled **"Java"**. In front: ashtray of butts, loose cigarettes, a
  pack reading **"RACCOON REDS"**. At 96–128px the desk detail is illegible — it works as a portrait,
  not a scene, which is how `/ask-john` already uses it. Per the handover the cigarettes ship **on the
  owner's explicit call**.

## 3. The decision this task forces, stated rather than taken quietly

The founder is a **real living person**. A chat character answering questions about him will be asked
things the five supplied facts do not cover — where in the Philippines, sisters' names, which
motorcycles, is he married, how much does he earn. A model at `temperature: 0.95` whose persona says
he is "three moves ahead" will **happily invent** all of it, in a confident voice, about a real man.

So the founder block is written as a **closed set with an explicit refusal rule**: these are the
facts; anything else about John Ramos is not known and must be deflected in character, never guessed.
This is the one place where John's own persona rule — "never lie about the facts" — has to outrank
his improvisation, and it is why the facts are a separate module with its own test rather than a
paragraph inside the persona string.

## 4. Not opened

- `apps/server/chat.js` (9,127 bytes) and `apps/server/banter.js` — a different chat surface (backer
  chat) that also mentions John; not read, and not touched by this work.
- `apps/server/moderation.js`, `mentions.js` — referenced from the chat path, not read.
- `apps/server/host.js` — Rex's persona. Not read this session; Rex is not being changed.
- The live `DEEPSEEK_API_KEY` is **not present in this working tree**, so John's real replies cannot
  be generated locally — `johnChat` returns its canned fallbacks without a key. Prompt assembly and
  the trigger are therefore tested directly, and the live reply quality is [UNVERIFIED] until it runs
  on a host that has the key.
- `apps/web/public/bg/john-desk.jpg` — used by `/ask-john`; **not opened**, and deliberately not
  reused on the new page.
