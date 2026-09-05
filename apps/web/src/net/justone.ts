// Client types + emit helpers for "Solo Clue" (our Just One). Server: apps/server/justone.js.
import { getSocket } from "./socket";

export interface JoPlayer { id: string; name: string; connected: boolean; submitted: boolean }
export interface JoClue { by: string; word: string }
export interface JoState {
  phase: "lobby" | "writing" | "reveal" | "roundover" | "ended";
  round: number;
  totalRounds: number;
  score: number;
  guesserId: string | null;
  players: JoPlayer[];
  survivors: JoClue[];
  cancelled: { word: string }[];
  lastGot: boolean | null;
  word: string | null; // public only once the round is scored
}
export interface JoYou { id: string; name: string; rejoinToken?: string }

export const joSync = (room: string) => getSocket().emit("jo:sync", { room });
export const joJoin = (room: string, name: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("jo:join", { room, name, playerId, rejoinToken });
export const joStart = () => getSocket().emit("jo:start");
export const joClue = (word: string) => getSocket().emit("jo:clue", { word });
export const joReveal = () => getSocket().emit("jo:reveal");
export const joJudge = (got: boolean) => getSocket().emit("jo:judge", { got });
export const joNext = () => getSocket().emit("jo:next");
export const joReset = () => getSocket().emit("jo:reset");

const key = (room: string) => `ff:justone:${room}`;
export function loadJoPlayer(room: string): { id?: string; name?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveJoPlayer(room: string, v: { id?: string; name?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadJoPlayer(room), ...v })); } catch { /* ignore */ }
}
