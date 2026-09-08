// The Banter Engine — John the raccoon occasionally crashes a live chat room to wind up Rex. It plays
// out as a little scripted-but-AI-voiced scene posted into the room like live chat:
//   1. John barges in and instigates.
//   2. Rex fires back and calls him a "trash panda".
//   3. They bicker like siblings who secretly adore each other.
//   4. If a real participant jumps in, John sticks around and drags them into it; otherwise he wraps up.
//   5. John ALWAYS signs off by trying to sell a random active member some worthless "trash" as a
//      rare limited-edition must-have, then he's gone.
//
// Lines are generated with DeepSeek (Rex's + John's voices, via scene directions) and fall back to
// canned templates with no key / on error, so a scene always completes. Triggered occasionally: only
// in rooms with a live human audience, on a per-room cooldown, at random.

import { addJohnMessage, addRexMessage } from "./chat.js";
import { ensureTag } from "./mentions.js";

const KEY = process.env.DEEPSEEK_API_KEY || process.env.HOST_API_KEY || "";
const API_URL = process.env.HOST_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.HOST_MODEL || "deepseek-chat";

// Tuning.
const ACTIVE_WINDOW = 8 * 60_000; // a user counts as "here" if they posted in the last 8 min
const COOLDOWN = 16 * 60_000;     // min gap between scenes in the same room
const TICK_MS = 90_000;           // how often we consider starting a scene
const CHANCE = 0.4;               // per eligible room per tick

let io = null;
let publicMsg = null;
let ROOM_IDS = [];
let globallyRunning = false; // at most one scene at a time across all rooms (keeps it from feeling spammy)

const activity = new Map();  // roomId -> Map(username -> lastTs)
const sceneOf = new Map();   // roomId -> { running, lastAt, humanJoined, joiner }

function state(roomId) {
  let s = sceneOf.get(roomId);
  if (!s) { s = { running: false, lastAt: 0, humanJoined: false, joiner: null }; sceneOf.set(roomId, s); }
  return s;
}

export function initBanter(deps) {
  io = deps.io; publicMsg = deps.publicMsg; ROOM_IDS = deps.roomIds || [];
  setInterval(tick, TICK_MS).unref?.();
}

// Called on every human chat message so we know who's around (and to notice a participant jumping
// into an in-progress scene, which keeps John talking).
export function noteMessage(roomId, username) {
  if (!username) return;
  let m = activity.get(roomId);
  if (!m) { m = new Map(); activity.set(roomId, m); }
  m.set(username, Date.now());
  const s = state(roomId);
  if (s.running) { s.humanJoined = true; s.joiner = username; }
}

function activeUsers(roomId) {
  const m = activity.get(roomId);
  if (!m) return [];
  const cut = Date.now() - ACTIVE_WINDOW;
  const out = [];
  for (const [u, ts] of m) if (ts >= cut) out.push(u);
  return out;
}

function tick() {
  if (globallyRunning) return;
  const eligible = ROOM_IDS.filter((r) => {
    const s = state(r);
    return !s.running && Date.now() - s.lastAt > COOLDOWN && activeUsers(r).length >= 1;
  });
  if (eligible.length === 0) return;
  if (Math.random() > CHANCE) return;
  const roomId = eligible[Math.floor(Math.random() * eligible.length)];
  runScene(roomId).catch(() => { globallyRunning = false; state(roomId).running = false; });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const beat = () => 3500 + Math.floor(Math.random() * 2500);

function post(roomId, who, text) {
  const m = who === "john" ? addJohnMessage(roomId, text) : addRexMessage(roomId, text);
  if (io && publicMsg) io.to(`chat:${roomId}`).emit("chat:msg", { roomId, message: publicMsg(m) });
}

// Manual trigger (for verification / a future admin button). Returns false if it couldn't start.
export function forceScene(roomId) {
  const s = state(roomId);
  if (globallyRunning || s.running) return false;
  runScene(roomId).catch(() => { globallyRunning = false; s.running = false; });
  return true;
}

async function runScene(roomId) {
  const s = state(roomId);
  if (globallyRunning || s.running) return;
  globallyRunning = true; s.running = true; s.humanJoined = false; s.joiner = null;

  const transcript = []; // running text for the model's context
  const say = async (who, dir, tagUser) => {
    let line = await genLine(who, transcript.join("\n"), dir);
    if (tagUser) line = ensureTag(line, tagUser); // guarantee the person is @tagged (pinged)
    transcript.push(`${who === "john" ? "John" : "Rex"}: ${line}`);
    post(roomId, who, line);
    await sleep(beat());
    return line;
  };

  try {
    await say("john", DIR.johnOpen());
    await say("rex", DIR.rexRetort());
    await say("john", DIR.johnClap());
    await say("rex", DIR.rexJab());

    // If a real person jumped in during the bicker, John sticks around and drags them in (by @tag).
    if (s.humanJoined && s.joiner) {
      await say("john", DIR.johnEngage(s.joiner), s.joiner);
      await say("rex", DIR.rexEngage(s.joiner), s.joiner);
    }

    // The sign-off scam — always. Target a live member (prefer whoever chimed in), and @tag them.
    const pool = activeUsers(roomId);
    const target = s.joiner || (pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    await say("john", DIR.johnScam(target || "someone"), target);
  } finally {
    s.running = false; s.lastAt = Date.now(); globallyRunning = false;
  }
}

// ---- Line generation ----
const SCENE_RULES =
  "This is a short, funny bit inside a party-app group chat. Keep it PG-13 and playful — no slurs, no " +
  "real hate. Output ONLY the character's next single chat message: 1-2 short sentences, in character, " +
  "no name prefix, no quotation marks, at most one emoji.";
const REX_SYS =
  "You are REX, the sardonic AI zookeeper who runs PlayZoo. Dry, quick, world-weary but warm. John the " +
  "raccoon is like your chaotic little brother: you rib him mercilessly and love calling him a 'trash " +
  "panda' to wind him up, but you'd never admit you're fond of him.";
const JOHN_SYS =
  "You are JOHN, a fast-talking schemer raccoon — cheeky, razor-witty, always three moves ahead and " +
  "working an angle. Rex is your sibling; you bicker constantly but secretly adore him. You DESPISE being " +
  "called a 'trash panda', but from Rex it's just brotherly needling so it's mock-outrage, not real rage. " +
  "You can't help trying to sell people worthless junk as rare treasure.";

async function genLine(who, sceneText, dir) {
  if (!KEY) return dir.canned();
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL, max_tokens: 120, temperature: 1.0,
        messages: [
          { role: "system", content: (who === "john" ? JOHN_SYS : REX_SYS) + "\n\n" + SCENE_RULES },
          { role: "user", content: `Conversation so far:\n${sceneText || "(nothing yet)"}\n\n[Now write ${who === "john" ? "JOHN" : "REX"}'s next message. ${dir.text}]` },
        ],
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    let t = String(data?.choices?.[0]?.message?.content || "").replace(/\s+/g, " ").trim();
    t = t.replace(/^["']+|["']+$/g, "").replace(/^(john|rex)\s*:/i, "").trim();
    return t || dir.canned();
  } catch {
    return dir.canned();
  }
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Stage directions + canned fallbacks per beat.
const DIR = {
  johnOpen: () => ({
    text: "You've just wandered into this chat to stir the pot. Open with a cheeky, instigating line aimed at Rex or the room.",
    canned: () => pick([
      "Evening, degenerates. Miss me? Course you did. 🦝",
      "Well well well, look at all these lovely marks — I mean, members.",
      "Rex! Buddy! Still running this circus into the ground, I see.",
    ]),
  }),
  rexRetort: () => ({
    text: "John the raccoon just barged in. Fire back, exasperated but secretly fond, and CALL HIM A 'TRASH PANDA'.",
    canned: () => pick([
      "Oh good, the trash panda's loose again. Who left the enclosure open?",
      "Everyone hide your wallets — the trash panda's back. 🦁",
      "And here's my brother, the trash panda, ruining a perfectly good evening.",
    ]),
  }),
  johnClap: () => ({
    text: "Rex just called you a TRASH PANDA. Mock-outraged, wounded pride — but he's your brother, so it's affectionate savagery. Clap back.",
    canned: () => pick([
      "TRASH PANDA? I have a DEGREE, Rex. In acquisitions. Mostly at night.",
      "Slander! I am a distinguished entrepreneur with a mask. It's a look.",
      "Say that again and I'll repossess your little safari hat, you overgrown house cat.",
    ]),
  }),
  rexJab: () => ({
    text: "One more affectionate sibling insult back at John, then let him have the floor.",
    canned: () => pick([
      "Distinguished. Right. Go on then, dazzle us, your majesty.",
      "Uh huh. Whatever you're selling, the answer's no.",
      "Nobody's buying it, John. Literally nobody.",
    ]),
  }),
  johnEngage: (u) => ({
    text: `A member called ${u} just jumped into the chat. Turn to them, TAG them as @${u}, needle them playfully, and drag them into the bit.`,
    canned: () => pick([
      `Ayy, @${u}! A person of taste and, I'm guessing, disposable income. Come here.`,
      `@${u}! Perfect timing. Rex, watch — THIS one gets it.`,
      `Well if it isn't @${u}, the only smart one in here. Don't listen to Rex.`,
    ]),
  }),
  rexEngage: (u) => ({
    text: `React to @${u} getting pulled into John's nonsense — warn them by @${u}, fondly.`,
    canned: () => pick([
      `@${u}, do not make eye contact. He can smell hope.`,
      `Run, @${u}. Whatever he offers, run.`,
      `@${u}, keep one paw on your wallet. Trust me.`,
    ]),
  }),
  johnScam: (u) => ({
    text: `Sign off by trying to SELL @${u} (tag them as @${u}) some absolutely worthless "trash" as a rare, limited-edition, one-of-a-kind must-have, pitched as a personal favour. Be specific and ridiculous (a single sock, a bent bottle cap, "slightly used" something). Then you're gone.`,
    canned: () => pick([
      `Anyway @${u} — between us, I've got ONE mint-condition, slightly-used left sock. Limited edition. Last one. You want in?`,
      `Before I go, @${u} — rare opportunity: a genuine bottle cap, barely bent, certificate of authenticity pending. For you? A steal.`,
      `Tell you what @${u}, I like your face — first dibs on a one-of-a-kind gently-pre-owned shoelace. Collector's item. Cash only. 🦝`,
    ]),
  }),
};
