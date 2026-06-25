// Thin wrapper over socket.io-client. One connection per page (the page is either the host
// controller or a display/spectator). Providers attach their own listeners.

import { io, type Socket } from "socket.io-client";
import type { GameState, BingoState } from "@ff/engine";
import type { Announcement } from "../store/gameStore";
import type { SfxName } from "../audio/sfx";

export type Role = "host" | "display" | "spectator";
export type GameType = "feud" | "bingo";

/** The authoritative Feud snapshot the host broadcasts. */
export interface Snapshot {
  state: GameState;
  buzzersArmed: boolean;
  scoresVisible: boolean;
}

/** The authoritative Bingo snapshot. */
export interface BingoSnapshot {
  bingo: BingoState;
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
}

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
  | { action: "volume"; value: number };

export function emitMusic(cmd: MusicCmd): void {
  getSocket().emit("music", cmd);
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

export function joinRoom(room: string, role: Role): Socket {
  const s = getSocket();
  const doJoin = () => s.emit("join", { room, role });
  if (s.connected) doJoin();
  s.on("connect", doJoin); // rejoin automatically after any reconnect
  return s;
}

export function emitSync(room: string, snapshot: Snapshot | BingoSnapshot): void {
  getSocket().emit("sync", snapshot);
  // room is implied server-side by the socket's joined room, but kept in the API for clarity.
  void room;
}

export function emitPulse(room: string, pulse: Pulse): void {
  getSocket().emit("pulse", pulse);
  void room;
}
