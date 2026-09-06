// Client types + emit helpers for Murder v2 "The Villagers" (server: apps/server/murder2.js).
import { getSocket } from "./socket";

// A "weapon" IS an item set: the card art "ITEM SET <setNumber>", a location, and three methods.
// The SET is what identifies a suspect; `methods` are shared across sets and never identify anyone.
export interface V2Weapon {
  id: string; label: string; location: string; setNumber: number; methods: string[];
  emoji: string; art: string; thumb: string;
}
export interface V2Character {
  id: string; name: string; profession: string; weaponId: string; setNumber: number; blurb: string;
  art: string; thumb: string;
  weapon: V2Weapon;
}
export interface V2Player {
  id: string; name: string; avatar?: string; characterId: string | null;
  alive: boolean; connected: boolean; cleared: boolean; role?: "murderer" | "villager" | "detective" | "doctor";
  lastWords?: string | null; // a killed player's public parting message
}
export interface V2Clue {
  weaponId: string; weapon: V2Weapon; methodIndex: number; method: string | null;
  framedPlayerId: string | null;
  framedCharacterId: string | null; victimId: string; at: number;
}
export interface V2State {
  phase: "lobby" | "playing" | "voting" | "ended";
  killTarget: number; cooldownSec: number; cooldownUntil: number; killCount: number;
  winner: null | "murderers" | "town"; murdererIds?: string[]; detectiveId?: string; hasDetective?: boolean;
  doctorId?: string; hasDoctor?: boolean;
  scores?: Record<string, number>; round?: number;
  characters: V2Character[]; weapons: Record<string, V2Weapon>;
  players: V2Player[]; clues: V2Clue[];
  vote: null | { active: boolean; tally: Record<string, number>; votedBy: string[] };
}
export interface V2AvailWeapon extends V2Weapon {
  uses: number; remaining: number; framesPlayerId: string | null; framesName: string | null;
}
export interface V2Finding { suspectId: string; name: string; profession: string; isMurderer: boolean }
export interface V2You {
  id: string; role: "murderer" | "villager" | "detective" | "doctor" | null; alive: boolean; characterId: string | null;
  avatar?: string;
  // Secret proof of identity, issued once and delivered only on this private channel. Stored
  // locally and replayed on rejoin; without it the server will not hand back this player.
  rejoinToken?: string;
  ownWeaponId?: string | null; ownWeapon?: V2Weapon | null; killsRemaining?: number;
  weapons?: V2AvailWeapon[]; cooldownUntil?: number; mustUseOwnNow?: boolean;
  allies?: { id: string; name: string; alive: boolean }[]; // fellow murderers (team games)
  // Detective-only, private: investigation cooldown + the results learned so far.
  investigateUntil?: number; investigateCooldownSec?: number; findings?: V2Finding[];
  // Doctor-only, private: protect cooldown + who they're currently shielding.
  protectUntil?: number; protectCooldownSec?: number; protectingId?: string | null; protectingName?: string | null;
}
export type V2Announce =
  | { type: "start" }
  // `weapon` is the item set's location label; `method` is which of its three ways staged the kill.
  | { type: "killed"; victim: string; weapon: string; method: string | null; framesName: string }
  | { type: "vote-open" }
  | { type: "vote-wrong"; cleared: string }
  | { type: "vote-none" }
  | { type: "vote-caught"; caught: string; remaining: number }
  | { type: "saved"; victim: string }
  | { type: "end"; winner: "murderers" | "town"; caught?: string };

export const m2Join = (room: string, name: string, avatar?: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("m2:join", { room, name, avatar, playerId, rejoinToken });
export const m2Pick = (characterId: string) => getSocket().emit("m2:pick", { characterId });
export const m2Config = (cfg: { killTarget?: number; cooldownSec?: number }) => getSocket().emit("m2:config", cfg);
export const m2Start = () => getSocket().emit("m2:start");
// methodIndex picks which of the set's three methods staged the kill (narrative; not the deduction key).
export const m2Kill = (victimId: string, weaponId: string, methodIndex = 0) =>
  getSocket().emit("m2:kill", { victimId, weaponId, methodIndex });
export const m2Investigate = (suspectId: string) => getSocket().emit("m2:investigate", { suspectId });
export const m2Protect = (targetId: string) => getSocket().emit("m2:protect", { targetId });
export const m2OpenVote = () => getSocket().emit("m2:openVote");
export const m2Vote = (suspectId: string) => getSocket().emit("m2:vote", { suspectId });
export const m2LastWords = (text: string) => getSocket().emit("m2:lastWords", { text });
export const m2CloseVote = () => getSocket().emit("m2:closeVote");
export const m2Reset = (full = false) => getSocket().emit("m2:reset", { full });

const key = (room: string) => `ff:murder2:${room}`;
export function loadPlayer2(room: string): { id?: string; name?: string; avatar?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function savePlayer2(room: string, v: { id?: string; name?: string; avatar?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadPlayer2(room), ...v })); } catch { /* ignore */ }
}
