// Client types + emit helpers for "Sketch Relay" (our Telestrations). Server: apps/server/telestrations.js.
import { getSocket } from "./socket";
import type { Stroke } from "../pictionary/PictionaryCanvas";

export interface TePlayer { id: string; name: string; avatar?: string; connected: boolean; submitted?: boolean }
export interface TeRevealEntry { type: "draw" | "text"; byName: string; value: Stroke[] | string }
export interface TeState {
  phase: "lobby" | "playing" | "reveal" | "ended";
  turn: number;
  totalTurns: number;
  players: TePlayer[];
  totalBooks?: number;
  reveal?: { bookIndex: number; ownerName: string; seed: string; shown: TeRevealEntry[]; complete: boolean } | null;
}
export interface TeYou {
  id: string; name: string; avatar?: string; rejoinToken?: string;
  phase: string;
  turn?: number;
  type?: "draw" | "text";
  prompt?: { word?: string; drawing?: Stroke[] } | null;
  submitted?: boolean;
}

export const teSync = (room: string) => getSocket().emit("te:sync", { room });
export const teJoin = (room: string, name: string, avatar?: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("te:join", { room, name, avatar, playerId, rejoinToken });
export const teStart = () => getSocket().emit("te:start");
export const teSubmitDraw = (strokes: Stroke[]) => getSocket().emit("te:submit", { strokes });
export const teSubmitText = (text: string) => getSocket().emit("te:submit", { text });
export const teForce = () => getSocket().emit("te:force");
export const teRevealNext = () => getSocket().emit("te:revealNext");
export const teReset = () => getSocket().emit("te:reset");

const key = (room: string) => `ff:telestrations:${room}`;
export function loadTePlayer(room: string): { id?: string; name?: string; avatar?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveTePlayer(room: string, v: { id?: string; name?: string; avatar?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadTePlayer(room), ...v })); } catch { /* ignore */ }
}
