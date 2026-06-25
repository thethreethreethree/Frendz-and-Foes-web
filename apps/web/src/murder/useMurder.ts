import { useEffect, useRef, useState } from "react";
import { getSocket, type Presence } from "../net/socket";
import {
  loadPlayer,
  mAccuse,
  mAssign,
  mConfig,
  mJoin,
  mKill,
  mReset,
  savePlayer,
  type MurderAnnounce,
  type MurderState,
  type MurderYou,
} from "../net/murder";

// Shared Murder hook for all three surfaces. host/display do the generic room "join"; a player
// joins via name (and auto-rejoins with its stored id to recover its secret role).
export function useMurder(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<MurderState | null>(null);
  const [you, setYou] = useState<MurderYou | null>(null);
  const [announce, setAnnounce] = useState<{ a: MurderAnnounce; nonce: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);
  const nonce = useRef(0);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      setConnected(true);
      if (role === "player") {
        const st = loadPlayer(room);
        if (st.name) mJoin(room, st.name, st.id); // auto-rejoin
      } else {
        s.emit("join", { room, role });
      }
    };
    const onState = (st: MurderState) => setState(st);
    const onYou = (y: MurderYou) => setYou(y);
    const onAnnounce = (a: MurderAnnounce) => {
      nonce.current += 1;
      setAnnounce({ a, nonce: nonce.current });
    };
    s.on("connect", enter);
    s.on("disconnect", () => setConnected(false));
    s.on("m:state", onState);
    s.on("m:you", onYou);
    s.on("m:announce", onAnnounce);
    s.on("presence", setPresence);
    if (s.connected) enter();
    return () => {
      s.off("connect", enter);
      s.off("m:state", onState);
      s.off("m:you", onYou);
      s.off("m:announce", onAnnounce);
      s.off("presence", setPresence);
    };
  }, [room, role]);

  // Persist our player id once assigned, for reconnect.
  useEffect(() => {
    if (you?.id) savePlayer(room, { id: you.id });
  }, [you?.id, room]);

  const join = (name: string) => {
    savePlayer(room, { name });
    mJoin(room, name, loadPlayer(room).id);
  };

  return {
    state,
    you,
    announce,
    connected,
    presence,
    join,
    config: mConfig,
    assign: mAssign,
    reset: mReset,
    kill: mKill,
    accuse: mAccuse,
  };
}
