// Client types + emit helpers for the authoritative Murder game (server: apps/server/murder.js).
import { getSocket } from "./socket";

export type MurderRole = "murderer" | "detective" | "civilian" | null;

export interface MurderPlayer {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  role?: MurderRole; // only present at the end (reveal)
}

export interface MurderState {
  phase: "lobby" | "playing" | "ended";
  config: { murderers: number; detectives: number };
  winner: null | "murderers" | "civilians";
  players: MurderPlayer[];
}

export interface MurderYou {
  id: string;
  role: MurderRole;
  alive: boolean;
}

export type MurderAnnounce =
  | { type: "start" }
  | { type: "killed"; name: string }
  | { type: "caught"; suspect: string; detective: string }
  | { type: "wrong"; suspect: string; detective: string }
  | { type: "end"; winner: "murderers" | "civilians" };

export const mJoin = (room: string, name: string, playerId?: string) =>
  getSocket().emit("m:join", { room, name, playerId });
export const mConfig = (murderers: number, detectives: number) =>
  getSocket().emit("m:config", { murderers, detectives });
export const mAssign = () => getSocket().emit("m:assign");
export const mReset = (full = false) => getSocket().emit("m:reset", { full });
export const mKill = (targetId: string) => getSocket().emit("m:kill", { targetId });
export const mAccuse = (suspectId: string) => getSocket().emit("m:accuse", { suspectId });

// Per-room player identity (for reconnect → same role).
const key = (room: string) => `ff:murder:${room}`;
export function loadPlayer(room: string): { id?: string; name?: string } {
  try {
    return JSON.parse(localStorage.getItem(key(room)) || "{}");
  } catch {
    return {};
  }
}
export function savePlayer(room: string, v: { id?: string; name?: string }) {
  try {
    localStorage.setItem(key(room), JSON.stringify({ ...loadPlayer(room), ...v }));
  } catch {
    /* ignore */
  }
}
