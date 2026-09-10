import { useEffect, useMemo, useState } from "react";
import { ConnectionCtx } from "./connection";
import { getSocket, type Presence, type Role } from "./socket";

// Supplies ConnectionCtx for the games that have NO store.
//
// WHY THIS EXISTS: every store (gameStore, bingoStore, triviaStore, ...) ends its provider with
// <ConnectionCtx.Provider>, so any surface rendered under one can use StatusPill. The five
// server-authoritative games -- After Dark, Sketch Relay, Ballpark, Solo Clue, Cover Ops -- are
// built on plain hooks instead of a store, so nothing supplied that context. Their host
// controllers still rendered StatusPill, and useConnection THROWS when the context is missing,
// so all five crashed to "Unexpected Application Error! useConnection must be used within a
// provider" the instant the host opened them. Five of fourteen games had an unusable host.
//
// Nothing caught it because the crash needs the CONTROLLER route specifically: the display and
// player surfaces only import QR, which reads no context, so those looked fine. The game logic was
// never at fault -- a full After Dark round plays through against the live server.
//
// This gives those games the same connection facts a store would, read straight off the socket.
export function SocketConnectionProvider({
  room,
  role = "host",
  children,
}: {
  room: string | null | undefined;
  role?: Role;
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("presence", setPresence);
    // The socket is usually already up by the time this mounts, and then no "connect" fires.
    setConnected(s.connected);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("presence", setPresence);
    };
  }, []);

  const value = useMemo(
    () => ({ connected, presence, room: room ?? null, role: role ?? null }),
    [connected, presence, room, role],
  );

  return <ConnectionCtx.Provider value={value}>{children}</ConnectionCtx.Provider>;
}
