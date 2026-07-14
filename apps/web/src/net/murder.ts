// Client types + emit helpers for Murder Mystery: The Villagers (server: apps/server/murder.js).
import { getSocket } from "./socket";

export interface Villager {
  id: string;
  name: string;
  job: string;
  weaponId: string;
  weapon: string;
  emoji: string;
  color: string;
  blurb: string;
}

export type MurderRole = "murderer" | "villager" | null;

export interface MurderPlayer {
  id: string;
  name: string;
  characterId: string | null;
  alive: boolean;
  cleared: boolean;
  connected: boolean;
  role?: MurderRole; // revealed only at the end
}

/** A body + the weapon it was found with — the clue that frames a character. */
export interface KillClue {
  victimName: string;
  victimCharacterId: string | null;
  weaponId: string;
  weaponName: string;
  framedCharacterId: string | null;
  framedJob: string | null;
}

export interface VoteState {
  suspectId: string;
  suspectName: string;
  byName: string;
  endsAt: number;
  yes: number;
  no: number;
  voted: string[];
}

export interface MurderState {
  phase: "lobby" | "playing" | "ended";
  config: { killsToWin: number; cooldownSec: number };
  trialsLeft: number;
  winner: null | "murderer" | "village";
  kills: number;
  players: MurderPlayer[];
  feed: KillClue[];
  vote: VoteState | null;
}

export interface MurderYou {
  id: string;
  role: MurderRole;
  alive: boolean;
  characterId: string | null;
  // murderer only:
  ownWeaponId?: string;
  kills?: number;
  killsToWin?: number;
  framesLeft?: number;
  weaponUses?: Record<string, number>;
  cooldownUntil?: number;
  allowedWeapons?: string[];
}

export type MurderAnnounce =
  | { type: "start" }
  | { type: "killed"; victim: string; weapon: string; job?: string }
  | { type: "vote"; suspect: string; by: string }
  | { type: "caught"; suspect: string }
  | { type: "wrong"; suspect: string }
  | { type: "acquitted"; suspect: string }
  | { type: "end"; winner: "murderer" | "village" };

export const mJoin = (room: string, name: string, playerId?: string) =>
  getSocket().emit("m:join", { room, name, playerId });
export const mPick = (characterId: string) => getSocket().emit("m:pick", { characterId });
export const mConfig = (cooldownSec: number, trials: number) =>
  getSocket().emit("m:config", { cooldownSec, trials });
export const mAssign = () => getSocket().emit("m:assign");
export const mKill = (targetId: string, weaponId: string) =>
  getSocket().emit("m:kill", { targetId, weaponId });
export const mNominate = (suspectId: string) => getSocket().emit("m:nominate", { suspectId });
export const mVote = (yes: boolean) => getSocket().emit("m:vote", { yes });
export const mReset = (full = false) => getSocket().emit("m:reset", { full });

// Per-room player identity (reconnect → same character + secret role).
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
