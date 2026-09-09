// Cover Ops art. Every asset the owner supplied and I kept is named here and given a real job on
// screen — the gate in apps/server/coveropsArt.test.mjs fails the build if any applied slug in
// tools/coverops/manifest.json is not referenced by the app, so "I wired in most of them" cannot
// pass quietly.
//
// The art id is "coverops" (what the prompt cards told the owner to save under). The source folder
// for these screens is src/codenames, which is a different name for the same game — see
// src/display/gameArt.ts for the rest of that mismatch.
//
// The props ship WITHOUT their neon bloom: it was baked over a transparency checkerboard that JPEG
// had already destroyed, so it is re-added here in CSS, where it is resolution-independent and
// tintable per state. See tools/coverops/props.py for the four approaches that did not work.

export const artUrl = (slug: string) => `/art/coverops/${slug}.webp`;

/** Backdrop per game phase. The empty room waits, the party room plays, the alarm room ends it. */
export const BACKDROPS = {
  lobby: "bg-lobby",
  playing: "bg-briefing",
  ended: "bg-alarm",
} as const;

/** John's reaction cards, one per moment the display announces. */
export const BEATS = {
  clue: "beat-clue",          // a clue lands — he taps his nose
  win: "beat-win",            // team takes the round
  shock: "beat-shock",        // wrong guess, hand over mouth
  disaster: "beat-disaster",  // it all goes wrong
  caught: "beat-caught",      // the assassin is hit
  getaway: "beat-getaway",    // game over, he walks off with the briefcase
} as const;

/** Props. Each is a cut-out with a real alpha channel; glow comes from `glow()` below. */
export const PROPS = {
  token: "prop-token",   // brass keyhole — turn marker
  badge: "prop-badge",   // enamel eye — the spymaster
  chip: "prop-chip",     // blank dark face — a number renders on top
} as const;

/** Agent portraits. `unknown` is the silhouette with the skull pin: the assassin. */
export const AGENTS = {
  salute: "agent-salute",
  sloth: "agent-sloth",
  unknown: "agent-unknown",
  mugshot: "agent-mugshot",
} as const;

/** The 22 dossier card faces, used as the backs of the 25 board tiles (three repeat). */
export const TILES = [
  "tile-01", "tile-02", "tile-03", "tile-04", "tile-05", "tile-06", "tile-07", "tile-08",
  "tile-09", "tile-10", "tile-11", "tile-12", "tile-13", "tile-14", "tile-15", "tile-16",
  "tile-17", "tile-18", "tile-19", "tile-20", "tile-21", "tile-22",
] as const;

/** Deterministic per-index tile face, so a card keeps the same dossier for the whole game. */
export const tileFace = (i: number) => artUrl(TILES[i % TILES.length]);

/** The neon bloom the props lost, re-added in CSS. */
export const glow = (colour: string, px = 14) =>
  `drop-shadow(0 0 ${px * 0.4}px ${colour}) drop-shadow(0 0 ${px}px ${colour})`;
