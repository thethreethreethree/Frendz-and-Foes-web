// Survey Showdown art. Every asset the owner supplied and I kept is named here and given a real job
// on screen — the gate in apps/server/feudArt.test.mjs fails if any applied slug in
// tools/feud/manifest.json is not referenced by the app, so "I wired in most of them" cannot pass.
//
// This file lives in display/ rather than feud/ because Survey Showdown is the ONE game with no
// special branch in DisplayRoute: it falls through to the default DisplayView, which is why
// AnswerBoard, AnswerSlot and Scoreboard live here too. display/ IS the Survey Showdown display.
//
// The props ship WITHOUT their neon bloom — it was baked over a transparency checkerboard that JPEG
// had already destroyed — so it is re-added in CSS. See tools/coverops/props.py for the four
// approaches that did not work before the one that did.

export const artUrl = (slug: string) => `/art/feud/${slug}.webp`;

/** Backdrop per phase. Empty stage waits, the board plays, the confetti ends it. */
export const BACKDROPS = {
  setup: "bg-lobby",       // two podiums, blank board, nobody here yet
  playing: "bg-board",     // contestants at podiums, eight blank panels
  finished: "bg-finale",   // confetti cannons over empty podiums
} as const;

/** A fourth stage plate, kept as atmosphere: its board is off-centre and already lit, so nothing
 *  can be rendered into it. Used behind the winner scene where no board is needed. */
export const STAGE_ALT = "bg-stage-alt";

/** Duke's reaction cards. He is the canonical Survey Showdown host — "the big shot". */
export const BEATS = {
  start: "beat-start",        // arms wide, roaring, crowd up
  win: "beat-win",            // fists up behind the podium
  strike: "beat-strike",      // giant pink X and a fireball
  facepalm: "beat-facepalm",  // paw over the face, one pained eye
  lost: "beat-lost",          // dismay, smoke and embers
  steal: "beat-steal",        // sheepish grin, coins raining
} as const;

/** Props. Each is a cut-out with a real alpha channel; the glow comes from `glow()`. */
export const PROPS = {
  buzzer: "prop-buzzer",   // big red buzzer — buzz in
  token: "prop-token",     // brass token, open hand — your turn
  pot: "prop-pot",         // coins and chips — the pot
  strike: "prop-strike",   // giant red X stamp — wrong answer
  clock: "prop-clock",     // retro clock shedding its numerals — time
} as const;

/** The answer panel, in its two states. The board hides answers and flips them open. */
export const PANELS = {
  hidden: "panel-dark",   // dark face in a pink neon frame; white text reads on it
  open: "panel-open",     // blank white face — the revealed answer
} as const;

/** Team crests. */
export const CRESTS = { red: "crest-red", blue: "crest-blue" } as const;

/** The neon bloom the props lost, re-added in CSS: resolution-independent and tintable. */
export const glow = (colour: string, px = 14) =>
  `drop-shadow(0 0 ${px * 0.4}px ${colour}) drop-shadow(0 0 ${px}px ${colour})`;
