// "After Dark" — our take on the adult fill-in-the-blank card game. A rotating judge reads a prompt
// with a blank; everyone else plays a response card from their private hand; the judge picks the
// funniest; that player scores. True to the format and its R-rated spirit, but ALL card text is
// ORIGINAL to this project (the real game's cards are copyrighted — mechanics are not). Adult humor,
// but written to avoid slurs and punching at protected groups.
//
// AUTHORITATIVE on the server: hands are private (ca:you), submissions are anonymous until the judge
// has picked. Marked adult — brands can disable it or swap the deck via the admin later.

import { randomBytes } from "node:crypto";

// Prompts. "___" marks a blank; `pick` is how many response cards to play (default 1).
export const AD_PROMPTS = [
  { text: "Nothing ruins a first date like ___.", pick: 1 },
  { text: "My therapist says my real problem is ___.", pick: 1 },
  { text: "I got fired for ___.", pick: 1 },
  { text: "What's my secret superpower? ___.", pick: 1 },
  { text: "I can't sleep because I keep thinking about ___.", pick: 1 },
  { text: "The group chat went dead silent after someone mentioned ___.", pick: 1 },
  { text: "My new dating profile just says ___.", pick: 1 },
  { text: "The worst part of being an adult is ___.", pick: 1 },
  { text: "I'd sell my soul for ___.", pick: 1 },
  { text: "This wedding was going great until ___.", pick: 1 },
  { text: "My last functioning brain cell is dedicated to ___.", pick: 1 },
  { text: "The real reason I'm single: ___.", pick: 1 },
  { text: "Grandma found my search history, so now we need to talk about ___.", pick: 1 },
  { text: "My villain origin story began with ___.", pick: 1 },
  { text: "I'm not saying it was aliens, but ___.", pick: 1 },
  { text: "My autobiography will be titled ___.", pick: 1 },
  { text: "The meeting that could've been an email was really about ___.", pick: 1 },
  { text: "What's in the mystery Tupperware at the back of the fridge? ___.", pick: 1 },
  { text: "The cult finally recruited me with ___.", pick: 1 },
  { text: "The most cursed thing at the potluck was ___.", pick: 1 },
  { text: "My biggest red flag is ___.", pick: 1 },
  { text: "The influencer got cancelled for ___.", pick: 1 },
  { text: "What's my toxic trait? ___.", pick: 1 },
  { text: "Today my horoscope warned me about ___.", pick: 1 },
  { text: "I would walk 500 miles just to avoid ___.", pick: 1 },
  { text: "The group project fell apart because of ___.", pick: 1 },
  { text: "The gas station bathroom smelled distinctly of ___.", pick: 1 },
  { text: "Behind every great person is ___.", pick: 1 },
  { text: "My love language is ___.", pick: 1 },
  { text: "The Sunday scaries hit different when it's ___.", pick: 1 },
  { text: "A recipe for disaster: ___ and ___.", pick: 2 },
  { text: "My two-part morning routine: ___, then ___.", pick: 2 },
  { text: "The reboot nobody asked for: ___ meets ___.", pick: 2 },
  { text: "I got kicked out of the party for combining ___ with ___.", pick: 2 },
];

export const AD_RESPONSES = [
  "A deeply concerning amount of cheese.", "Crying in the Target parking lot.", "My unhinged browser history.",
  "Aggressive passive-aggression.", "One (1) remaining brain cell.", "The sheer audacity.", "Emotional damage.",
  "A haunted Roomba.", "Explaining the joke until it dies.", "Peaking in high school.", "Gas station sushi.",
  "Unsolicited advice from my uncle.", "Existential dread at 3 a.m.", "Being horny on main.", "A single sad hot dog.",
  "The ick.", "My crushing student loans.", "A group chat left on read.", "Rawdogging reality without coffee.",
  "An unpaid internship.", "Whatever's growing in the office fridge.", "Committing way too hard to the bit.",
  "A slightly damp handshake.", "Faking my own death to avoid replying.", "Chaotic bisexual energy.",
  "Buffering at the worst possible moment.", "A limited-edition midlife crisis.", "Texting 'u up?' to the wrong person.",
  "Generational trauma.", "The last slice nobody will claim.", "A Live-Laugh-Love sign in a crime scene.",
  "Aggressively normal people.", "Overthinking a two-word text for six hours.", "A raccoon with commitment issues.",
  "My cardiologist's visible disappointment.", "Screaming into a decorative pillow.", "Two espressos and zero coping skills.",
  "The friend group's designated bad decision.", "An HR violation waiting to happen.", "A suspiciously specific alibi.",
  "Emotional-support gas station snacks.", "Minor crimes.", "A cursed amount of body glitter.", "My sleep paralysis demon.",
  "Passive income from terrible decisions.", "Being the reason for the warning label.", "A gender reveal that started a wildfire.",
  "The audacity of a Monday.", "Sentient mold.", "A wine mom on the edge.", "Doing my taxes wrong out of spite.",
  "An aggressively firm handshake from a stranger.", "Whispering 'no worries if not'.", "A weaponized guilt trip.",
  "The group's one friend who's a cop now.", "Feral energy after 10 p.m.", "A haunted porta-potty.", "Manifesting, badly.",
  "A situationship with no exit.", "The smell of a middle-school locker room.", "An emotionally unavailable houseplant.",
  "Getting left on delivered.", "A cry for help disguised as a brunch order.", "My roommate's mystery meat.",
  "Peer-pressured into karaoke.", "A deeply illegal amount of glitter.", "Blacking out at a work function.",
  "Unresolved beef from 2014.", "A power move nobody asked for.", "The confidence of a mediocre man.",
  "A slow clap that never catches on.", "Pretending to read the terms and conditions.", "A haunted vending machine.",
  "My entire personality being one podcast.", "A questionable tattoo of a frog.", "Ghosting my own therapist.",
  "The vibe going absolutely nuclear.", "A dog that knows what I did.", "Being normal about a celebrity, and failing.",
  "A landlord's empty promise.", "An ex at the worst possible moment.", "A goblin-mode weekend.", "Screaming in a Costco.",
  "A trust fall with no one behind me.", "Aggressively wholesome content.", "The last brain cell filing for overtime.",
  "A cursed group Halloween costume.", "Emotional support chaos.", "A microwave burrito with a vendetta.",
  "My spotify wrapped exposing me.", "A very confident wrong answer.",
];

const HAND_SIZE = 7;
const WIN_SCORE = 5;

function ensure(rooms, code) {
  let r = rooms.get(code);
  if (!r) { r = { snapshot: null, peers: new Map() }; rooms.set(code, r); }
  if (!r.afterdark) {
    r.afterdark = {
      phase: "lobby", // lobby | submitting | judging | reveal | ended
      players: new Map(), // id -> { id, name, socketId, rejoinToken, hand:[], score }
      order: [],
      judgeIdx: 0,
      round: 0,
      promptDeck: [], promptPos: 0, prompt: null,
      responseDeck: [], responsePos: 0,
      submissions: new Map(), // playerId -> [texts]
      revealed: [], // [{ i, pid, cards }] built at judging (pid hidden until reveal)
      winner: null, // { name, cards }
      config: { handSize: HAND_SIZE, winScore: WIN_SCORE },
    };
  }
  return r.afterdark;
}

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const judgeId = (m) => m.order[m.judgeIdx] ?? null;
const nonJudges = (m) => [...m.players.values()].filter((p) => p.id !== judgeId(m));

function drawResponses(m, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    if (m.responsePos >= m.responseDeck.length) { m.responseDeck = shuffle(AD_RESPONSES); m.responsePos = 0; }
    out.push(m.responseDeck[m.responsePos++]);
  }
  return out;
}

function publicState(m) {
  const showCards = m.phase === "judging" || m.phase === "reveal";
  return {
    phase: m.phase,
    round: m.round,
    judgeId: judgeId(m),
    prompt: m.phase === "lobby" ? null : m.prompt,
    config: m.config,
    players: [...m.players.values()].map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, connected: !!p.socketId, score: p.score,
      handCount: p.hand.length, submitted: m.submissions.has(p.id), isJudge: p.id === judgeId(m),
    })),
    revealed: showCards ? m.revealed.map((r) => ({ i: r.i, cards: r.cards, by: m.phase === "reveal" ? (m.players.get(r.pid)?.name || "?") : null })) : [],
    winner: m.phase === "reveal" ? m.winner : null,
  };
}

export function afterdarkPublicState(rooms, code) { const m = rooms.get(code)?.afterdark; return m ? publicState(m) : null; }

export function registerAfterDarkHandlers(io, socket, rooms, roomKey = (r) => String(r).toUpperCase()) {
  const broadcast = (code) => io.to(code).emit("ca:state", publicState(rooms.get(code).afterdark));
  const err = (msg) => socket.emit("ca:error", msg);
  const sendYou = (m, p) => { if (p.socketId) io.to(p.socketId).emit("ca:you", { id: p.id, name: p.name, avatar: p.avatar, rejoinToken: p.rejoinToken, hand: p.hand, isJudge: p.id === judgeId(m) }); };
  const sendYouAll = (m) => { for (const p of m.players.values()) sendYou(m, p); };
  const push = (code) => { const m = rooms.get(code).afterdark; broadcast(code); sendYouAll(m); };

  socket.on("ca:sync", ({ room }) => { if (!room) return; const code = roomKey(room); socket.join(code); socket.data.caCode = code; socket.emit("ca:state", publicState(ensure(rooms, code))); });

  socket.on("ca:join", ({ room, name, avatar, playerId, rejoinToken }) => {
    if (!room || !name) return;
    const code = roomKey(room); socket.join(code); socket.data.caCode = code;
    const m = ensure(rooms, code);
    let p = playerId && m.players.get(playerId);
    if (p) { if (!p.rejoinToken || rejoinToken !== p.rejoinToken) return err("Could not restore that player."); p.socketId = socket.id; p.name = name; if (avatar) p.avatar = avatar; }
    else { const id = "a" + Math.random().toString(36).slice(2, 8); p = { id, name, avatar, socketId: socket.id, rejoinToken: randomBytes(24).toString("hex"), hand: [], score: 0 }; m.players.set(id, p); }
    socket.data.caPlayerId = p.id;
    sendYou(m, p); broadcast(code);
  });

  const hostCode = () => socket.data.caCode || socket.data.code;
  const isHost = () => socket.data.role === "host";

  function newPrompt(m) {
    if (m.promptPos >= m.promptDeck.length) { m.promptDeck = shuffle(AD_PROMPTS); m.promptPos = 0; }
    m.prompt = m.promptDeck[m.promptPos++];
    m.submissions = new Map();
    m.revealed = [];
    m.winner = null;
  }

  socket.on("ca:start", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "lobby") return;
    if (m.players.size < 3) return err("Need at least 3 players.");
    m.order = shuffle([...m.players.keys()]);
    m.responseDeck = shuffle(AD_RESPONSES); m.responsePos = 0;
    m.promptDeck = shuffle(AD_PROMPTS); m.promptPos = 0;
    m.judgeIdx = 0; m.round = 1;
    for (const p of m.players.values()) { p.score = 0; p.hand = drawResponses(m, m.config.handSize); }
    m.phase = "submitting"; newPrompt(m);
    push(code);
  });

  socket.on("ca:submit", ({ cards }) => {
    const code = socket.data.caCode; const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "submitting") return;
    const p = m.players.get(socket.data.caPlayerId);
    if (!p || p.id === judgeId(m)) return err("The judge doesn't play a card.");
    if (m.submissions.has(p.id)) return;
    if (!Array.isArray(cards) || cards.length !== m.prompt.pick) return err(`Play ${m.prompt.pick} card(s).`);
    if (!cards.every((c) => p.hand.includes(c))) return err("Play cards from your hand.");
    for (const c of cards) p.hand.splice(p.hand.indexOf(c), 1);
    m.submissions.set(p.id, cards);
    const active = nonJudges(m).filter((x) => x.socketId);
    if (active.length > 0 && active.every((x) => m.submissions.has(x.id))) {
      m.revealed = shuffle([...m.submissions.entries()].map(([pid, cs]) => ({ pid, cards: cs }))).map((r, i) => ({ i, ...r }));
      m.phase = "judging";
    }
    push(code);
  });

  socket.on("ca:pick", ({ i }) => {
    const code = socket.data.caCode; const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "judging") return;
    if (socket.data.caPlayerId !== judgeId(m) && !isHost()) return err("Only the judge picks.");
    const chosen = m.revealed.find((r) => r.i === (i | 0));
    if (!chosen) return;
    const winner = m.players.get(chosen.pid);
    if (winner) winner.score += 1;
    m.winner = { name: winner?.name || "?", cards: chosen.cards };
    // refill everyone to hand size
    for (const p of m.players.values()) { const need = m.config.handSize - p.hand.length; if (need > 0) p.hand.push(...drawResponses(m, need)); }
    m.phase = "reveal";
    push(code);
  });

  socket.on("ca:next", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m || m.phase !== "reveal") return;
    if (socket.data.caPlayerId !== judgeId(m) && !isHost()) return;
    const top = [...m.players.values()].sort((a, b) => b.score - a.score)[0];
    if (top && top.score >= m.config.winScore) { m.phase = "ended"; return push(code); }
    m.judgeIdx = (m.judgeIdx + 1) % m.order.length;
    m.round += 1;
    m.phase = "submitting";
    newPrompt(m);
    push(code);
  });

  socket.on("ca:reset", () => {
    const code = hostCode(); const m = code && rooms.get(code)?.afterdark;
    if (!m) return;
    m.phase = "lobby"; m.round = 0; m.prompt = null; m.submissions = new Map(); m.revealed = []; m.winner = null;
    for (const p of m.players.values()) { p.hand = []; p.score = 0; }
    push(code);
  });
}
