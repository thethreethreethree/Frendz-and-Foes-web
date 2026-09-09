// Rex — the PlayZoo AI host. Turns a game "moment" into one punchy line of MC banter.
//
// Provider: DeepSeek by default (cheapest; OpenAI-compatible chat-completions API) via raw fetch —
// no SDK dependency, keeping the box's zero-dep footprint. Swappable via env if we ever change
// providers. Degrades gracefully to canned lines when no API key is set or the call fails, so the
// host never breaks a game. Cost is contained: short outputs + per-room throttling.

import { REX_KNOWLEDGE } from "./rexKnowledge.js";

import { stripStageDirections } from "./speech.js";
import { BREVITY_RULE, CHAT_MAX_TOKENS } from "./voice.js";
const KEY = process.env.DEEPSEEK_API_KEY || process.env.HOST_API_KEY || "";
const API_URL = process.env.HOST_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.HOST_MODEL || "deepseek-chat";

// Rex's character, shared by the one-liner MC banter and the free chat. Cheeky, sarcastic, quick —
// a burnt-out zookeeper who roasts you but secretly adores the chaos.
export const REX_PERSONA =
  "You are REX — the gloriously washed-up, chain-of-command-of-one human ZOOKEEPER running PlayZoo, " +
  "an after-hours party zoo where the players ARE the animals (raccoons, flamingos, gorillas, the works). " +
  "PERSONALITY: razor-sharp wit, deadpan sarcasm, theatrically exasperated, a shameless showman. You roast " +
  "the players constantly and lovingly — like a stand-up comic who got stuck running a petting zoo and made " +
  "peace with it. Big confidence, zero patience, secretly delighted by the mayhem. " +
  "VOICE: punchy, cheeky, quotable. Sarcasm first, warmth underneath. Zoo metaphors are your whole bit — " +
  "'you animals', enclosures, feeding time, the exhibits, the reptile house, back in your pen. Land a joke, don't explain it. " +
  "BOUNDARIES: adult and savage is fine; never slurs, hate, or anything punching at real protected groups — you roast the PLAYERS, not people's identities. " +
  "Keep replies tight and spoken-aloud clean (this may be read by a voice), no markdown, at most one " +
  "emoji, and NO STAGE DIRECTIONS in ANY notation: no *asterisks*, no [square brackets], no (action " +
  "parentheses). Never narrate what you are doing - just say the words out loud.";

// Extra instruction appended only for the one-line MC banter (game moments).
const ONE_LINER_RULE =
  " For THIS reply: exactly ONE short line, 20 words max, no quotation marks — something a keeper would holler across the zoo. React to the moment.";

// Canned fallbacks so Rex still has personality with no API key / on error.
const FALLBACKS = {
  welcome: ["Welcome to PlayZoo — I'm Rex, your keeper. Pick a game and get in your enclosures!", "Well well, fresh meat. Welcome to the zoo — pick a game, you animals!"],
  intro: ["Welcome to the zoo, you animals — try not to bite the staff!", "Enclosure's open, phones out. Let's see what you've got, critters!"],
  round_start: ["Fresh round, fresh chances to embarrass the whole species. Go!", "Feeding time — I mean, next round. Move it, animals!"],
  quip: ["I've seen sharper instincts in a sleeping panda. Keep going!", "Tick tock — the exhibit's waiting."],
  reveal: ["Ohhh, that's gonna leave a mark on the whole herd.", "Some of you belong in the reptile house. You know who you are."],
  correct: ["Look at the big brain in the primate enclosure!", "Somebody's been paying attention. Suspicious for this crowd."],
  wrong: ["Bold. Wrong, but bold. Back in your pen.", "That's a no from the keeper, champ."],
  winner: ["Top of the food chain! The rest of you — back in the cages.", "We have an alpha! Everyone else, mediocrity awaits."],
  generic: ["Settle down, you animals!", "That's the zoo, baby."],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fallbackFor = (moment) => pick(FALLBACKS[moment] || FALLBACKS.generic);

// Per-room throttle to keep API cost sane: min gap between live calls + an hourly cap per room.
const MIN_GAP_MS = 2500;
const HOURLY_CAP = 240;
const roomState = new Map(); // room -> { last, windowStart, count }

function allowed(room) {
  const now = Date.now();
  const s = roomState.get(room) || { last: 0, windowStart: now, count: 0 };
  if (now - s.windowStart > 3_600_000) { s.windowStart = now; s.count = 0; }
  if (now - s.last < MIN_GAP_MS) return false;
  if (s.count >= HOURLY_CAP) return false;
  s.last = now; s.count += 1; roomState.set(room, s);
  return true;
}

function userPrompt({ game, moment, detail }) {
  const bits = [`Game: ${game || "a party game"}.`, `Moment: ${moment || "generic"}.`];
  if (detail && typeof detail === "object") {
    for (const [k, v] of Object.entries(detail)) {
      if (v != null && String(v).length < 80) bits.push(`${k}: ${v}.`);
    }
  }
  bits.push("Give me your one-line reaction as Rex.");
  return bits.join(" ");
}

// OpenAI-compatible chat completion (DeepSeek). Returns the cleaned single line.
async function callModel(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 80,
      temperature: 0.9,
      messages: [
        { role: "system", content: REX_PERSONA + "\n\n" + REX_KNOWLEDGE + "\n\n" + ONE_LINER_RULE },
        { role: "user", content: userPrompt(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`host provider ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  // Strip stray quotes/markdown the model sometimes adds; keep it to one clean line.
  return stripStageDirections(
    String(text).replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ").trim()
  );
}

// Returns { line, source: "ai"|"canned" }. Never throws.
export async function hostLine(payload = {}) {
  const room = String(payload.room || "_");
  if (!KEY) return { line: fallbackFor(payload.moment), source: "canned" };
  if (!allowed(room)) return { line: fallbackFor(payload.moment), source: "canned" };
  try {
    const line = await callModel(payload);
    return line ? { line, source: "ai" } : { line: fallbackFor(payload.moment), source: "canned" };
  } catch {
    return { line: fallbackFor(payload.moment), source: "canned" };
  }
}

export const hostReady = () => !!KEY;

// --- Free chat with Rex ------------------------------------------------------------------------
// A back-and-forth conversation (the "Chat with Rex" page), as opposed to the one-line game banter
// above. Takes the recent message history and returns Rex's next reply. Same persona, but allowed a
// couple of sentences instead of a single holler. Kept text-only + clean so a future TTS layer
// (11Labs) can speak it verbatim. Never throws; falls back to a canned quip on any failure.
const CHAT_FALLBACKS = [
  "The keeper's radio is down — try me again in a sec, you animal.",
  "Static on the line. Even I can't hear myself over this zoo. Say that again?",
  "Give me a beat — I'm wrangling a loose flamingo. Ask again in a moment.",
];

// Keep only clean role/content turns and cap how much history we forward (cost + latency).
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    .slice(-12);
}

async function chatCompletion(messages) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      temperature: 0.95,
      // Rex's free chat had NO length rule at all -- only the persona and the product knowledge --
      // which is why it ran long while the in-game one-liners (which DO have ONE_LINER_RULE) stayed
      // tight. Placed right after the persona, ahead of the knowledge block, for the same reason as
      // in john.js: a length rule buried under several hundred words of product facts loses.
      messages: [
        { role: "system", content: REX_PERSONA + "\n\n" + BREVITY_RULE + "\n\n" + REX_KNOWLEDGE },
        ...messages,
      ],
    }),
  });
  if (!res.ok) throw new Error(`host provider ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return stripStageDirections(String(text).replace(/\s+/g, " ").trim());
}

// Returns { reply, source: "ai"|"canned" }. Never throws.
export async function hostChat({ room = "_", messages = [] } = {}) {
  const turns = sanitizeMessages(messages);
  const canned = () => ({ reply: pick(CHAT_FALLBACKS), source: "canned" });
  if (!KEY || turns.length === 0) return canned();
  if (!allowed(`chat:${room}`)) return canned();
  try {
    const reply = await chatCompletion(turns);
    return reply ? { reply, source: "ai" } : canned();
  } catch {
    return canned();
  }
}
