// Client types + emit helpers for "After Dark" (adult fill-in-the-blank). Server: apps/server/afterdark.js.
import { getSocket } from "./socket";

export interface CaPlayer { id: string; name: string; connected: boolean; score: number; handCount: number; submitted: boolean; isJudge: boolean }
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
export interface CaYou { id: string; name: string; rejoinToken?: string; hand: string[]; isJudge: boolean }

export const caSync = (room: string) => getSocket().emit("ca:sync", { room });
export const caJoin = (room: string, name: string, playerId?: string, rejoinToken?: string) =>
  getSocket().emit("ca:join", { room, name, playerId, rejoinToken });
export const caStart = () => getSocket().emit("ca:start");
export const caSubmit = (cards: string[]) => getSocket().emit("ca:submit", { cards });
export const caPick = (i: number) => getSocket().emit("ca:pick", { i });
export const caNext = () => getSocket().emit("ca:next");
export const caReset = () => getSocket().emit("ca:reset");

const key = (room: string) => `ff:afterdark:${room}`;
export function loadCaPlayer(room: string): { id?: string; name?: string; rejoinToken?: string } {
  try { return JSON.parse(localStorage.getItem(key(room)) || "{}"); } catch { return {}; }
}
export function saveCaPlayer(room: string, v: { id?: string; name?: string; rejoinToken?: string }) {
  try { localStorage.setItem(key(room), JSON.stringify({ ...loadCaPlayer(room), ...v })); } catch { /* ignore */ }
}

/** Render a prompt with its blank(s) filled by the given answer(s). */
export function fillPrompt(text: string, cards: string[]): string {
  let i = 0;
  const filled = text.replace(/___/g, () => { const c = cards[i++]; return c ? c.replace(/\.$/, "") : "___"; });
  return filled === text && cards.length ? `${text} ${cards.join(" / ")}` : filled;
}
