// Rex — the PlayZoo AI host. Turns a game "moment" into one punchy line of MC banter.
//
// Provider: DeepSeek by default (cheapest; OpenAI-compatible chat-completions API) via raw fetch —
// no SDK dependency, keeping the box's zero-dep footprint. Swappable via env if we ever change
// providers. Degrades gracefully to canned lines when no API key is set or the call fails, so the
// host never breaks a game. Cost is contained: short outputs + per-room throttling.

const KEY = process.env.DEEPSEEK_API_KEY || process.env.HOST_API_KEY || "";
const API_URL = process.env.HOST_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.HOST_MODEL || "deepseek-chat";

const REX_PERSONA =
  "You are Rex, the loud, washed-up-but-loving-it lion MC of PlayZoo, an adult party-games app. " +
  "Voice: brash, quick, funny, a little roast-y, warm underneath — a late-night game-show host who's had two drinks. " +
  "ALWAYS reply with exactly ONE short line, 20 words max, that a host would shout to the room. " +
  "No quotation marks, no stage directions, no markdown, at most one emoji. " +
  "Adult and cheeky is fine; never use slurs, hate, or anything targeting real, protected groups. React to the moment.";

// Canned fallbacks so Rex still has personality with no API key / on error.
const FALLBACKS = {
  intro: ["Welcome to PlayZoo, you beautiful disasters — let's make some bad decisions!", "Phones out, dignity away. Here we go!"],
  round_start: ["New round, fresh chances to embarrass yourselves. Go!", "Round's up — try to look like you've done this before."],
  quip: ["I've seen sharper thinking from a bag of doorknobs. Keep going!", "Tick tock, geniuses."],
  reveal: ["Ohhh, that's gonna leave a mark.", "Some of you should be embarrassed. You know who you are."],
  correct: ["Look at the big brain over here!", "Somebody's been paying attention. Suspicious."],
  wrong: ["Bold. Wrong, but bold.", "That's a no from me, champ."],
  winner: ["Winner winner! The rest of you — therapy's that way.", "A champion is crowned. Everyone else, mediocrity awaits!"],
  generic: ["Keep it moving, party people!", "That's showbiz, baby."],
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
        { role: "system", content: REX_PERSONA },
        { role: "user", content: userPrompt(payload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`host provider ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  // Strip stray quotes/markdown the model sometimes adds; keep it to one clean line.
  return String(text).replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ").trim();
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
