// Client types + emit helpers for "Cover Ops" (our Codenames). Server: apps/server/codenames.js.
import { getSocket } from "./socket";

export type CnTeam = "red" | "blue";
export type CnRole = "spymaster" | "operative";
export type CnColor = "red" | "blue" | "neutral" | "assassin";

export interface CnCard {
  i: number;
  word: string;
  revealed: boolean;
  color: CnColor | null; // null while unrevealed (secret); spymasters get the full key via CnYou
}
export interface CnPlayer {
  id: string;
  name: string;
  team: CnTeam | null;
  role: CnRole;
  connected: boolean;
}
export interface CnState {
  phase: "lobby" | "playing" | "ended";
  turn: CnTeam | null;
  startingTeam: CnTeam | null;
  winner: CnTeam | null;
  clue: { word: string; count: number; remaining: number; team: CnTeam } | null;
  board: CnCard[];
  counts: { red: number; blue: number };
  players: CnPlayer[];
  log: string[];
}
export interface CnYou {
  id: string;
  name: string;
  team: CnTeam | null;
  role: CnRole;
  rejoinToken?: string;
  key?: CnColor[]; // spymaster-only: the secret colour of every board tile, by index
}

export const cnSync = (room: string) => getSocket().emit("cn:sync", { room });
export const cnJoin = (room: string, name: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("cn:join", { room, name, playerId, rejoinToken });
export const cnSetTeam = (team: CnTeam, role: CnRole) => getSocket().emit("cn:setTeam", { team, role });
export const cnStart = () => getSocket().emit("cn:start");
export const cnClue = (word: string, count: number) => getSocket().emit("cn:clue", { word, count });
export const cnGuess = (index: number) => getSocket().emit("cn:guess", { index });
export const cnEndTurn = () => getSocket().emit("cn:endTurn");
export const cnReset = (full = false) => getSocket().emit("cn:reset", { full });

const key = (room: string) => `ff:codenames:${room}`;
export function loadCnPlayer(room: string): { id?: string; name?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveCnPlayer(room: string, v: { id?: string; name?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadCnPlayer(room), ...v })); } catch { /* ignore */ }
}
