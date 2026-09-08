// Chat socket client for the backers' club. A dedicated Socket.IO connection (separate from the game
// relay) with credentials, so the server sees the pz_backer cookie and can authenticate the member.
// The server enforces which rooms a backer may join/post to; this is just the transport.

import { io, type Socket } from "socket.io-client";
import { serverUrl } from "./socket";

export interface ChatAuthor {
  id: string | null;
  username: string;
  avatar: string | null;
  enclosure: string | null;
}
export interface ChatMessage {
  id: string;
  at: number;
  text: string;
  rex?: boolean;
  author?: ChatAuthor;
}

let sock: Socket | null = null;
export function chatSocket(): Socket {
  if (!sock) {
    sock = io(serverUrl() || undefined, { withCredentials: true, transports: ["websocket", "polling"] });
  }
  return sock;
}

export function joinChatRoom(roomId: string): void {
  chatSocket().emit("chat:join", { roomId });
}
export function sendChat(roomId: string, text: string): void {
  chatSocket().emit("chat:send", { roomId, text });
}
