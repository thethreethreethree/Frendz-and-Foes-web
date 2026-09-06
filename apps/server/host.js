// Rex — the PlayZoo AI host. Turns a game "moment" into one punchy line of MC banter via the
// Claude Messages API (raw fetch; no SDK dependency to keep the box's zero-dep footprint). Degrades
// gracefully to canned lines when ANTHROPIC_API_KEY is unset or the call fails, so the host never
// breaks a game. Cost is contained: short outputs, a cheap default model, and per-room throttling.

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
// Cheap + fast is the right default for high-volume one-liners; override with HOST_MODEL if desired.
const MODEL = process.env.HOST_MODEL || "claude-haiku-4-5";

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

async function callClaude(payload) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 80,
      system: REX_PERSONA,
      messages: [{ role: "user", content: userPrompt(payload) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  const text = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
  // Strip stray quotes/markdown the model sometimes adds; keep it to one clean line.
  return text.replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ").trim();
}

// Returns { line, source: "ai"|"canned" }. Never throws.
export async function hostLine(payload = {}) {
  const room = String(payload.room || "_");
  if (!API_KEY) return { line: fallbackFor(payload.moment), source: "canned" };
  if (!allowed(room)) return { line: fallbackFor(payload.moment), source: "canned" };
  try {
    const line = await callClaude(payload);
    return line ? { line, source: "ai" } : { line: fallbackFor(payload.moment), source: "canned" };
  } catch {
    return { line: fallbackFor(payload.moment), source: "canned" };
  }
}

export const hostReady = () => !!API_KEY;
