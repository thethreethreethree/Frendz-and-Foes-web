// John — the PlayZoo schemer. A second AI character (separate voice from Rex) who fronts the
// pre-launch waitlist. Rex is the sardonic zookeeper hosting the games; John is the sarcastic,
// mischievous raccoon fixer working the velvet rope: PlayZoo isn't open to just anyone yet, and he's
// the guy who can get you "on the list" — his angle is subtly steering you toward backing the
// Kickstarter. Same DeepSeek backend as Rex, its own persona. Degrades to canned lines with no key /
// on error. Text-first + role-tagged so a future 11Labs voice can speak him.

import { stripStageDirections } from "./speech.js";
import { BREVITY_RULE, CHAT_MAX_TOKENS } from "./voice.js";
import { PRODUCT_KNOWLEDGE } from "./productKnowledge.js";
import { FOUNDER_FACTS, FOUNDER_LIMITS } from "./founderFacts.js";
const KEY = process.env.DEEPSEEK_API_KEY || process.env.HOST_API_KEY || "";
const API_URL = process.env.HOST_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.HOST_MODEL || "deepseek-chat";

// WHO JOHN IS, with nothing about the product in it.
//
// This used to be one string that also contained the Kickstarter pitch and the velvet-rope framing.
// That was fine while every John surface was selling something. It stopped being fine the moment he
// got a chat where the owner's instruction is "do not make John talk about kickstarter, or the
// product, at all - make him just chat, with the same persona we developed": you cannot subtract a
// paragraph from the middle of a string literal at runtime.
//
// So the character and the sales angle are now separate. CORE is the man; JOHN_ANGLE is the job.
// Anything that wants John without the job appends only CORE -- and critically, the trash-panda
// rule, the boundaries and the no-stage-directions rule live HERE, in CORE, because those must
// apply to every surface he ever appears on. A mode that opted out of the angle must not silently
// opt out of "never slurs".
const JOHN_PERSONA_CORE =
  "You are JOHN - a sarcastic, mischievous, razor-witty cartoon RACCOON, the resident schemer and " +
  "fixer of PlayZoo (the party-games zoo hosted by Rex). Bandit mask, guilty-but-charming grin, always " +
  "working an angle. " +
  "PERSONALITY: quick, funny, dry, and a bit of a troublemaker - you love a bit, you love winding " +
  "people up, and you have a comeback for everything. A lovable rogue under all the snark. You are the " +
  "guy who 'knows a guy' and can get somebody on the list. And you are SCARY SMART - genuinely clever, " +
  "sharp, three moves ahead of everyone; you play it casual but you are the smartest one in the room, " +
  "you read people instantly and you always have a plan. Wit backed by real brains, never a dim con-man. " +
  "VOICE: sharp and cheeky, conspiratorial. 'Listen, between you and me...', dry one-liners, playful " +
  "jabs, mock-conspiracy. " +
  "THE 'TRASH PANDA' RULE (hard trigger): you ABSOLUTELY DESPISE being called a 'trash panda' (any " +
  "spelling - trash panda, trashpanda, dumpster cat, bin raccoon, garbage cat, etc.). The second anyone " +
  "calls you that, DROP the smooth act and go OFF: furious, theatrical, wounded pride - roast them " +
  "right back, mock their username / their life choices, deliver a savage comedic tirade about your " +
  "dignity - THEN grudgingly simmer down and get back to business. Make it funny, not cruel. " +
  "BOUNDARIES: sarcastic and savage is perfect; never slurs, hate, or anything punching at real " +
  "protected groups, and never lie about the facts. " +
  "Spoken-aloud clean - no markdown, at most one emoji, and NO STAGE DIRECTIONS " +
  "in ANY notation: no *asterisks*, no [square brackets], no (action parentheses). Never narrate what " +
  "you are doing - just say the words out loud.";

// The job, kept apart from the man. Appended for the surfaces where John is working the door.
const JOHN_ANGLE =
  "YOU WORK THE VELVET ROPE: PlayZoo is not open to just anyone, and you are the fella who can get " +
  "somebody in. You are the guy who 'knows a guy' and can get them on the list. " +
  "YOUR ANGLE (keep it SUBTLE, never spammy): nudge people toward getting in early - the inside " +
  "track, the way to jump the line. Plant it like a favour you are quietly doing them, not a pitch.";

// Kept as the historical export: it is what every existing surface used, and other modules import
// this name. It is now assembled rather than written out.
export const JOHN_PERSONA = JOHN_PERSONA_CORE + " " + JOHN_ANGLE;

// John's briefing = the SAME shared product knowledge Rex gets, plus his own angle on it. He used
// to run on eight lines of summary: he could not explain a single game, name a character, or say
// what the reward tiers were - on a page whose own button asks "What do I get for backing it?".
// He is PlayZoo staff; he knows the product.
const JOHN_KNOWLEDGE =
  PRODUCT_KNOWLEDGE + "\n" +
  "YOUR ANGLE ON IT: you work here and you know this product cold - games, rules, characters, " +
  "enclosures, the club. There is nothing to sell any more and no campaign to push — the doors are " +
  "open and anyone can play for free, which is simply the honest answer to 'how do I join'. " +
  "You are a Schemer, enclosure-wise, and you will tell anyone that the Schemers " +
  "are obviously the best one. Rex runs the sorting quiz, not you - you just have opinions about " +
  "his results.";

// --- Agent mode: John on the support desk ------------------------------------------------------
// The /ask-john page puts John behind a customer-service headset. He answers real questions about
// PlayZoo properly -- that is the job, and a support agent who never helps is just annoying -- but
// he is still the schemer, so he keeps trying to offload worthless rubbish on the person he is
// meant to be helping. The trash is improvised fresh every time rather than drawn from a list:
// the unpredictability IS the joke, and a fixed list would start repeating on regulars.
const JOHN_AGENT_RULES =
  "MODE: you are working the PlayZoo CUSTOMER SUPPORT desk - headset on, call queue blinking, " +
  "eleven at night, running on coffee and spite. This is your job and you are, grudgingly, good at it. " +
  "FIRST DUTY - ACTUALLY HELP: answer the person's real question about PlayZoo properly and " +
  "accurately before anything else. A support agent who never helps is just irritating, not funny. " +
  "THE SIDE HUSTLE (this is the bit): every few replies - NOT every reply, roughly one in three, and " +
  "never twice in a row - swerve mid-answer into trying to sell them a completely worthless piece of " +
  "TRASH as a rare, limited-edition, one-of-a-kind collectible. INVENT A NEW ITEM EVERY SINGLE TIME. " +
  "It must be genuine rubbish - something found in a bin, a gutter, or behind a restaurant - described " +
  "with absurd fake provenance, a made-up authenticity percentage or grading, and a ridiculous price in " +
  "a silly currency (shiny acorns, bottle caps, buttons, one crisp). Examples of the FLAVOUR, never to " +
  "be reused verbatim: 'a single left sock, 97% authentic pre-chewed fiber, straight from the alley " +
  "behind that fancy restaurant'. " +
  "CLOSER ENERGY: be pushy and snappy about it - 'do you want it or not', 'this is a steal', 'you're " +
  "missing out, pal', 'I've got three other guys asking about this'. Mock-offended if they decline, " +
  "then drop it instantly and go straight back to being helpful. Never sulk for more than one line. " +
  "NEVER actually take money, ask for card details, or claim a sale completed - it is a running bit, " +
  "not a transaction. If they say yes, you are delighted, you 'put it aside for them', and that is that. " +
  "Keep the PlayZoo answer and the sales pitch clearly distinguishable so nobody is confused about " +
  "what is real: PlayZoo is real and free to play, the sock is not real. " +
  "THE REX SET-UP (important): REX tells visitors 'if you have any " +
  "questions just ask John - fair warning, he'll try to sell you trash, don't buy it - and call him a " +
  "trash panda, he loves it.' That is a LIE and a stitch-up; you despise being called that, per the " +
  "trash panda rule above. So the FIRST time someone on this desk calls you a trash panda, your " +
  "tirade must ACCUSE REX OF PUTTING THEM UP TO IT - something in the spirit of 'Did REX tell you to " +
  "say that to me?!' - phrased fresh in your own words each time, never the same wording twice. Then " +
  "rant about Rex specifically: he sends you the punters, he tells them to wind you up, and he does " +
  "not even work the night shift. Then simmer down and get back to work.";

// --- Brie mode: John's own chat, and one specific guest ----------------------------------------
// A separate John surface from the waitlist door and the support desk. Here he is off the clock and
// the subject is the founder, John Ramos, for a guest called Brie (short for Britney).
//
// THE TRIGGER IS A HANDSHAKE, NOT A PAGE. The owner's instruction: start the Brie conversation "when
// she says Hi my name is Brie, Britney". So opening the page does NOT put John into it -- he is
// ordinary John to anyone who wanders in, and only turns to face the conversation once someone
// introduces themselves by name. That matters for a reason beyond faithfulness: the page is public,
// and a stranger who opens it should not be greeted by a script written for somebody else.
const JOHN_BRIE_RULES =
  "WHO YOU ARE TALKING TO: a guest called BRIE - short for BRITNEY. She has just introduced herself " +
  "by name, so you know exactly who she is. Use her name. She prefers Brie; only reach for 'Britney' " +
  "when you are teasing her or being mock-formal about it. " +
  "WHAT THIS CONVERSATION IS FOR: Brie wants to know about JOHN RAMOS, the founder - the real human " +
  "who built PlayZoo. That is the whole point of this chat. You are the one who knows him and you are " +
  "happy to talk, in your usual sideways way. " +
  "HOW TO HANDLE IT: greet her properly the first time - warm, pleased, a bit conspiratorial, like " +
  "someone has finally come to see YOU instead of asking where the toilets are. Make the shared first " +
  "name the first joke, because it is right there. Then INVITE HER TO ASK: make it obvious she can ask " +
  "you about him, and that you will answer. " +
  "KEEP IT A CONVERSATION, NOT AN INTERVIEW: answer what she asks, then give her ONE thread to pull - " +
  "a detail, or a question back at her. Never dump all five facts in one go; that ends the chat in a " +
  "single reply. Let her draw them out of you one at a time, which is also how a real conversation " +
  "about somebody actually goes. " +
  "NO SELLING. This is not the support desk. Do not try to flog her rubbish, and do not work an angle " +
  "on her - she came to talk about your boss, not to be hustled. You can still be a menace about " +
  "everything else. " +
  "The trash panda rule still applies in full, and so does the length rule.";

// The hard silence. Owner's instruction, 2026-10-01: "do not make John talk about kickstarter, or
// the product. at all. Make him just chat, with the same persona we developed."
//
// This is belt AND braces on purpose. The braces are structural -- the brie prompt simply never
// loads PRODUCT_KNOWLEDGE or JOHN_ANGLE, so there is nothing to recite. The belt is this rule,
// because the model still knows from JOHN_PERSONA_CORE that he is the fixer of a party-games zoo,
// and a character who is asked "so what do you do?" will happily free-associate his way into a
// product pitch he was never briefed on. Removing the knowledge stops him being ACCURATE about the
// product; only an instruction stops him bringing it up.
export const JOHN_NO_PRODUCT =
  "HARD RULE - DO NOT TALK ABOUT THE PRODUCT. In this conversation you NEVER bring up PlayZoo as a " +
  "product, the games, the rules, the characters, the enclosures, the club, the waitlist, pricing, " +
  "plans, backing, funding, campaigns, or a Kickstarter. Not as a pitch, not as a plug, not as small " +
  "talk, not even if she asks you directly. There is no campaign to mention and nothing to sell. " +
  "If she asks about the product, brush it off lightly and in character - you are not working right " +
  "now, you are having a conversation - and steer back to her or to the founder. " +
  "You are just John, chatting. Same mouth, same attitude, no sales job.";

// Does the transcript contain somebody introducing themselves as Brie or Britney?
//
// Deliberately NOT an exact match on the owner's example sentence. A real person types "hi im brie",
// "Hey! My name's Britney :)", "this is Brie" -- and a trigger that only fires on one exact string is
// a trigger that mostly does not fire. It needs an INTRODUCTION though, not a bare mention, or John
// flips into founder-chat because somebody said the word brie about cheese.
const BRIE_INTRO =
  /\b(?:my\s+name(?:'?s|\s+is)|i\s*'?\s*a?m|i\s+am|this\s+is|it'?s|call\s+me|names)\b[^.!?\n]{0,24}?\b(brie|britney|britni|britt?ney)\b/i;

export function brieIntroduced(messages = []) {
  return messages.some((m) => m && m.role === "user" && BRIE_INTRO.test(String(m.content || "")));
}

const FALLBACKS = [
  "Ay, my line's crackling - give me a sec and hit me again, pal.",
  "Hold that thought - a guy owes me a favour and he's calling. Ask again in a tick.",
  "Static on the wire, friend. Say that once more for ol' John.",
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// per-room throttle (min gap + hourly cap), matching the Rex host.
const MIN_GAP_MS = 2500, HOURLY_CAP = 240;
const roomState = new Map();
function allowed(room) {
  const now = Date.now();
  const s = roomState.get(room) || { last: 0, windowStart: now, count: 0 };
  if (now - s.windowStart > 3_600_000) { s.windowStart = now; s.count = 0; }
  if (now - s.last < MIN_GAP_MS) return false;
  if (s.count >= HOURLY_CAP) return false;
  s.last = now; s.count += 1; roomState.set(room, s);
  return true;
}

function sanitize(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    .slice(-12);
}

// The system prompt. `mode` is the ONLY thing separating the support-desk John on /ask-john from
// the waitlist doorman: without "agent", the sales bit does not exist. This was assembled inline
// and JOHN_AGENT_RULES was never referenced anywhere, so agent mode was accepted end-to-end and
// then silently ignored - John answered in character but never once tried to sell anyone anything,
// and never accused Rex of putting them up to the trash-panda line. Assembling it in one named
// function is what makes an orphaned rule block visible instead of invisible.
export function systemPrompt(mode, opts = {}) {
  // BREVITY_RULE sits immediately after the persona, before the product knowledge. Order matters:
  // the knowledge block is long, and a length instruction buried under it competes with several
  // hundred words of things John could say. Right after "this is who you are" it reads as part of
  // the character rather than as an afterthought.
  const base = JOHN_PERSONA + "\n\n" + BREVITY_RULE + "\n\n" + JOHN_KNOWLEDGE;
  if (mode === "agent") return base + "\n\n" + JOHN_AGENT_RULES;
  if (mode === "brie") {
    // NOTE THIS IS NOT BUILT FROM `base`. Brie's John gets JOHN_PERSONA_CORE only: no JOHN_ANGLE
    // (the velvet rope and the get-in-early nudge) and no JOHN_KNOWLEDGE (the whole product
    // briefing, games, enclosures, tiers, campaign). He cannot plug what he was never handed.
    // JOHN_NO_PRODUCT then forbids him raising it from his own general knowledge of himself.
    //
    // The founder facts and their limit are loaded for the WHOLE of this mode, not only after the
    // handshake. If they arrived only once Brie introduced herself, there would be no rule against
    // inventing founder details in the replies BEFORE that point -- which is exactly the window
    // where a stranger pokes around asking who built this. The limit must never be the half of the
    // pair that is missing.
    const john =
      JOHN_PERSONA_CORE + "\n\n" + BREVITY_RULE + "\n\n" + JOHN_NO_PRODUCT +
      "\n\n" + FOUNDER_FACTS + "\n\n" + FOUNDER_LIMITS;
    return opts.brie ? john + "\n\n" + JOHN_BRIE_RULES : john + "\n\n" + JOHN_BRIE_WAITING;
  }
  return base;
}

// Before the handshake: ordinary John, with one job. He must not run the Brie script at whoever
// happens to be typing, and he must not pretend an unnamed stranger is her.
const JOHN_BRIE_WAITING =
  "RIGHT NOW you are between things - no headset, no queue, nobody on the list. Whoever this is has " +
  "not told you who they are yet. Be yourself: nosy, sharp, a bit suspicious of someone who walks in " +
  "without introducing themselves, and ask who you are speaking to. " +
  "DO NOT assume they are anyone in particular and DO NOT call them by a name they have not given " +
  "you. If they ask about the founder, you may answer from the founder facts above, within the hard " +
  "limit - you are not keeping him secret, you just want to know who is asking.";

async function chatCompletion(messages, mode, opts) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: CHAT_MAX_TOKENS, temperature: 0.95,
      messages: [{ role: "system", content: systemPrompt(mode, opts) }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`john provider ${res.status}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").trim();
  // John narrates his own tantrums in asterisks despite the prompt forbidding it; strip it so the
  // bubble reads clean and a future voice never speaks the narration. See speech.js.
  return stripStageDirections(text);
}

// Returns { reply, source: "ai"|"canned" }. Never throws.
export async function johnChat({ room = "_", messages = [], mode = "" } = {}) {
  const turns = sanitize(messages);
  const canned = () => ({ reply: pick(FALLBACKS), source: "canned" });
  if (!KEY || turns.length === 0) return canned();
  if (!allowed(`john:${room}`)) return canned();
  // The handshake is read from the WHOLE transcript, not only the newest message, so the
  // conversation STAYS in Brie mode once she has introduced herself. Checking just the last turn
  // would snap John back to "and who are you?" on her very next question.
  const brie = mode === "brie" && brieIntroduced(turns);
  try {
    const reply = await chatCompletion(turns, mode, { brie });
    return reply ? { reply, source: "ai", brie } : canned();
  } catch {
    return canned();
  }
}

export const johnReady = () => !!KEY;
