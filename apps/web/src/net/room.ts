// Room-code helpers. The code lives in the URL query (?room=CODE) so links are shareable and
// survive the hash router.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous O/0/I/1

import type { GameType } from "./socket";

export function getRoomFromUrl(): string | null {
  const r = new URLSearchParams(window.location.search).get("room");
  return r ? r.toUpperCase() : null;
}

export function getGameFromUrl(): GameType {
  return new URLSearchParams(window.location.search).get("game") === "bingo" ? "bingo" : "feud";
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
