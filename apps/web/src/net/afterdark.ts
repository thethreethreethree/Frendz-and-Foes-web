// Client types + emit helpers for "After Dark" (adult fill-in-the-blank). Server: apps/server/afterdark.js.
import { getSocket } from "./socket";

export interface CaPlayer { id: string; name: string; avatar?: string; connected: boolean; score: number; handCount: number; submitted: boolean; isJudge: boolean }
export interface CaRevealed { i: number; cards: string[]; by: string | null }
export interface CaState {
  phase: "lobby" | "submitting" | "judging" | "reveal" | "ended";
  round: number;
  judgeId: string | null;
  prompt: { text: string; pick: number } | null;
  config: { handSize: number; winScore: number };
  players: CaPlayer[];
  revealed: CaRevealed[];
  winner: { name: string; cards: string[] } | null;
}
export interface CaYou { id: string; name: string; avatar?: string; rejoinToken?: string; hand: string[]; isJudge: boolean }

export const caSync = (room: string) => getSocket().emit("ca:sync", { room });
export const caJoin = (room: string, name: string, avatar?: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("ca:join", { room, name, avatar, playerId, rejoinToken });
export const caStart = () => getSocket().emit("ca:start");
export const caSubmit = (cards: string[]) => getSocket().emit("ca:submit", { cards });
export const caPick = (i: number) => getSocket().emit("ca:pick", { i });
export const caNext = () => getSocket().emit("ca:next");
export const caReset = () => getSocket().emit("ca:reset");
/** Host removes a player who has left the room. */
export const caKick = (id: string) => getSocket().emit("ca:kick", { id });

const key = (room: string) => `ff:afterdark:${room}`;
export function loadCaPlayer(room: string): { id?: string; name?: string; avatar?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveCaPlayer(room: string, v: { id?: string; name?: string; avatar?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadCaPlayer(room), ...v })); } catch { /* ignore */ }
}

/** Drop the stored identity so a removed player's phone does not auto-rejoin on reconnect. */
export function forgetCaPlayer(room: string) {
  try { localStorage.removeItem(key(room)); } catch { /* ignore */ }
}

/** Render a prompt with its blank(s) filled by the given answer(s). */
export function fillPrompt(text: string, cards: string[]): string {
  let i = 0;
  // `_{3,}`, not `___`: the deck the owner supplied writes its blank as five underscores, and a
  // fixed three-underscore match would have eaten three and left "__" showing in every prompt.
  // Matching a RUN means any future deck's blank width just works.
  const filled = text.replace(/_{3,}/g, () => { const c = cards[i++]; return c ? c.replace(/\.$/, "") : "___"; });
  return filled === text && cards.length ? `${text} ${cards.join(" / ")}` : filled;
}
