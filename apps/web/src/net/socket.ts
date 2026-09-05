// Thin wrapper over socket.io-client. One connection per page (the page is either the host
// controller or a display/spectator). Providers attach their own listeners.

import { io, type Socket } from "socket.io-client";
import type { GameState, BingoState, TriviaState, OffLimitsPublic, WordGamePublic, MonikersPublic } from "@ff/engine";
import type { Announcement } from "../store/gameStore";
import type { SfxName } from "../audio/sfx";

// "answerer"/"viewer" are per-team phone roles for Frendz and Foes: one answerer submits the
// team's guess (upstream, host-judged), the rest are view-only. Both carry a teamId on join.
export type Role = "host" | "display" | "spectator" | "answerer" | "viewer";
export type GameType = "feud" | "bingo" | "murder" | "trivia" | "taboo" | "headsup" | "reverse" | "monikers";

/** The authoritative Feud snapshot the host broadcasts. */
export interface Snapshot {
  state: GameState;
  buzzersArmed: boolean;
  scoresVisible: boolean;
}

/** The authoritative Bingo snapshot. `joinQrVisible` rides outside game state (like Feud's
 * buzzersArmed): when the host activates it, the display shows the join QR for everyone to scan. */
export interface BingoSnapshot {
  bingo: BingoState;
  joinQrVisible?: boolean;
}

/** The authoritative Trivia snapshot. `joinQrVisible` shows the join QR on the display (view mode). */
export interface TriviaSnapshot {
  trivia: TriviaState;
  joinQrVisible?: boolean;
}

/** The authoritative "Off Limits" snapshot. Only the PUBLIC projection travels — the current word
 * and taboo list stay on the host device and are never broadcast to the room's display. */
export interface OffLimitsSnapshot {
  offlimits: OffLimitsPublic;
  joinQrVisible?: boolean;
}

/** The authoritative "Foreheads" (Heads Up!) snapshot — public projection only, like Off Limits. */
export interface HeadsUpSnapshot {
  headsup: WordGamePublic;
  joinQrVisible?: boolean;
}

/** The authoritative "Full Cast" (Reverse Charades) snapshot — public projection only. */
export interface FullCastSnapshot {
  fullcast: WordGamePublic;
  joinQrVisible?: boolean;
}

/** The authoritative "Encore" (Monikers) snapshot — public projection only (no live card). */
export interface MonikersSnapshot {
  monikers: MonikersPublic;
  joinQrVisible?: boolean;
}

/** Live connection + presence info, shared by both games for the pairing UI. */
export interface ConnectionInfo {
  connected: boolean;
  presence: Presence | null;
  room: string | null;
  role: Role | null;
}

/** One-shot cues that are not part of game state. */
export type Pulse =
  | { kind: "sfx"; name: SfxName; variant: number }
  | { kind: "announce"; announcement: Announcement }
  | { kind: "timer-start"; seconds: number }
  | { kind: "timer-stop" };

export interface Presence {
  total: number;
  host: number;
  display: number;
  spectator: number;
  answerer: number;
  viewer: number;
  /** Per-team connection counts, so the host hub can show which teams have a phone linked. */
  teams: Record<string, { answerers: number; viewers: number }>;
}

/**
 * An upstream cue from a team answer-phone to the host (the ONLY thing a non-host may emit).
 * The relay forwards it to the host peer(s) only; the host judges + scores it. Answerers never
 * emit game state — that trust boundary is enforced server-side.
 */
export type Intent =
  | { teamId: string; kind: "guess"; text: string }
  | { teamId: string; kind: "trivia-answer"; questionId: string; letter: "A" | "B" | "C" | "D" };

export interface Song {
  id: string;
  title: string;
  file: string;
}

/** Music playback commands sent host → display. */
export type MusicCmd =
  | { action: "play"; file: string; title: string }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "stop" }
  | { action: "seek"; value: number }
  | { action: "volume"; value: number };

export function emitMusic(cmd: MusicCmd): void {
  getSocket().emit("music", cmd);
}

/** Playback progress reported display → host (so the host scrubber tracks the real audio). */
export interface MusicStatus {
  currentTime: number;
  duration: number;
  playing: boolean;
  ended: boolean;
}

export function emitMusicStatus(status: MusicStatus): void {
  getSocket().emit("musicstatus", status);
}

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  // Dev: the relay runs separately on :8787. Prod: same origin (server serves the app).
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:8787`;
  return "";
}

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(serverUrl() || undefined, { transports: ["websocket", "polling"] });
  }
  return _socket;
}

export function joinRoom(room: string, role: Role, teamId?: string): Socket {
  const s = getSocket();
  const doJoin = () => s.emit("join", { room, role, teamId });
  if (s.connected) doJoin();
  s.on("connect", doJoin); // rejoin automatically after any reconnect
  return s;
}

/** Answerer → host: submit the team's guess for the host to judge. No-op unless joined as answerer. */
export function emitIntent(intent: Intent): void {
  getSocket().emit("intent", intent);
}

export function emitSync(
  room: string,
  snapshot:
    | Snapshot
    | BingoSnapshot
    | TriviaSnapshot
    | OffLimitsSnapshot
    | HeadsUpSnapshot
    | FullCastSnapshot
    | MonikersSnapshot,
): void {
  getSocket().emit("sync", snapshot);
  // room is implied server-side by the socket's joined room, but kept in the API for clarity.
  void room;
}

export function emitPulse(room: string, pulse: Pulse): void {
  getSocket().emit("pulse", pulse);
  void room;
}
