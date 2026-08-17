// Room-code helpers. The code lives in the URL query (?room=CODE) so links are shareable and
// survive the hash router.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous O/0/I/1

import type { GameType } from "./socket";

export function getRoomFromUrl(): string | null {
  const r = new URLSearchParams(window.location.search).get("room");
  return r ? r.toUpperCase() : null;
}

export function getGameFromUrl(): GameType {
  const g = new URLSearchParams(window.location.search).get("game");
  // "villagers" is a legacy alias: Murder Mystery: The Villagers is now the only murder game, so
  // links minted while it briefly had its own game type still resolve.
  if (g === "villagers") return "murder";
  return g === "bingo" || g === "murder" ? g : "feud";
}

export function setUrlGame(game: GameType): void {
  const u = new URL(window.location.href);
  u.searchParams.set("game", game);
  window.history.replaceState(null, "", u.toString());
}

export function generateRoomCode(len = 4): string {
  const rnd = crypto.getRandomValues(new Uint32Array(len));
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[rnd[i] % ALPHABET.length];
  return s;
}

export function setUrlRoom(room: string): void {
  const u = new URL(window.location.href);
  u.searchParams.set("room", room);
  window.history.replaceState(null, "", u.toString());
}

/** URL that opens the host controller already paired to this room + game. */
export function controllerUrl(room: string): string {
  return `${window.location.origin}/?room=${room}&game=${getGameFromUrl()}#/control`;
}

/** URL players scan to join a Murder game from their own phones. */
export function playerJoinUrl(room: string): string {
  return `${window.location.origin}/?room=${room}&game=murder#/play`;
}

/**
 * Frendz Bingo uses ONE FIXED room code so its join QR is permanent — printable on a poster that
 * never goes stale. Every Bingo host, display, and player shares this room (single-event model).
 * Change the code here (or set VITE_BINGO_ROOM) if you need a different fixed code.
 */
export const BINGO_ROOM = ((import.meta.env?.VITE_BINGO_ROOM as string) || "BINGO").toUpperCase();

/** URL every Bingo player scans (one QR for the whole room) to watch calls + dares on their phone. */
export function bingoJoinUrl(room: string): string {
  return `${window.location.origin}/?room=${room}&game=bingo#/play`;
}

/** The PERMANENT Bingo poster URL — encode THIS in a printed QR. Always resolves to the fixed room. */
export function bingoPosterUrl(): string {
  return bingoJoinUrl(BINGO_ROOM);
}

/** Trivia — team mode: a per-team link (one answerer phone; shareable as view-only to the team). */
export function triviaTeamJoinUrl(room: string, teamId: string, role: "answerer" | "viewer"): string {
  return `${window.location.origin}/?room=${room}&game=trivia&team=${encodeURIComponent(teamId)}&role=${role}#/play`;
}

/** Trivia — view mode: one link everyone scans to watch questions + choices (no answering). */
export function triviaViewJoinUrl(room: string): string {
  return `${window.location.origin}/?room=${room}&game=trivia#/play`;
}

/** Team + role carried in the URL for a Frendz and Foes phone (?team=…&role=answerer|viewer). */
export function getTeamFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("team");
}

export function getRoleFromUrl(): "answerer" | "viewer" | null {
  const r = new URLSearchParams(window.location.search).get("role");
  return r === "answerer" || r === "viewer" ? r : null;
}

/**
 * URL a team member scans to join a Foes team on their own phone. The host shows the `answerer`
 * link (one per team); the answerer re-shares the `viewer` link to teammates for a watch-only board.
 */
export function teamJoinUrl(room: string, teamId: string, role: "answerer" | "viewer"): string {
  return `${window.location.origin}/?room=${room}&game=feud&team=${encodeURIComponent(teamId)}&role=${role}#/play`;
}
