// Client types + emit helpers for "Ballpark" (our Wits & Wagers). Server: apps/server/ballpark.js.
import { getSocket } from "./socket";

export interface BpPlayer { id: string; name: string; avatar?: string; connected: boolean; score: number; guessed: boolean; bet: boolean }
export interface BpGuess { value: number; by: string[]; bettors: string[] }
export interface BpState {
  phase: "lobby" | "guessing" | "betting" | "reveal" | "ended";
  round: number;
  totalRounds: number;
  question: string | null;
  answer: number | null;
  winningValue: number | null;
  players: BpPlayer[];
  guesses: BpGuess[];
}
export interface BpYou { id: string; name: string; avatar?: string; rejoinToken?: string }

export const bpSync = (room: string) => getSocket().emit("bp:sync", { room });
export const bpJoin = (room: string, name: string, avatar?: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("bp:join", { room, name, avatar, playerId, rejoinToken });
export const bpStart = () => getSocket().emit("bp:start");
export const bpGuess = (value: number) => getSocket().emit("bp:guess", { value });
export const bpBet = (value: number) => getSocket().emit("bp:bet", { value });
export const bpAdvance = () => getSocket().emit("bp:advance");
export const bpNext = () => getSocket().emit("bp:next");
export const bpReset = () => getSocket().emit("bp:reset");

const key = (room: string) => `ff:ballpark:${room}`;
export function loadBpPlayer(room: string): { id?: string; name?: string; avatar?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveBpPlayer(room: string, v: { id?: string; name?: string; avatar?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadBpPlayer(room), ...v })); } catch { /* ignore */ }
}
