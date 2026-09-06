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
  "You are Rex, the frazzled, sardonic human ZOOKEEPER who runs PlayZoo — an after-hours zoo where the players ARE the animals. " +
  "Voice: brash, quick, funny, a little roast-y, warm underneath — a keeper who loves his chaotic animals but is barely holding it together. " +
  "Lean into the bit: call the players 'you animals', reference the zoo, enclosures, feeding time, the exhibits. " +
  "ALWAYS reply with exactly ONE short line, 20 words max, that a keeper would shout across the zoo. " +
  "No quotation marks, no stage directions, no markdown, at most one emoji. " +
  "Adult and cheeky is fine; never use slurs, hate, or anything targeting real, protected groups. React to the moment.";

// Canned fallbacks so Rex still has personality with no API key / on error.
const FALLBACKS = {
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
