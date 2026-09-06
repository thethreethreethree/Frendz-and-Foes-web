import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import {
  loadPlayer2, savePlayer2, m2Join,
  type V2State, type V2You, type V2Announce,
} from "../net/murder2";

// Shared hook for all three Murder v2 surfaces. host/display join the generic room; a player joins
// by name and auto-rejoins with its stored id to recover its secret role.
export function useMurder2(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<V2State | null>(null);
  const [you, setYou] = useState<V2You | null>(null);
  const [announce, setAnnounce] = useState<{ a: V2Announce; nonce: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const nonce = useRef(0);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      setConnected(true);
      if (role === "player") {
        const st = loadPlayer2(room);
        if (st.name) m2Join(room, st.name, st.avatar, st.id, st.rejoinToken);
      } else {
        s.emit("join", { room, role });
      }
    };
    const onState = (st: V2State) => setState(st);
    const onYou = (y: V2You) => setYou(y);
    const onAnnounce = (a: V2Announce) => { nonce.current += 1; setAnnounce({ a, nonce: nonce.current }); };
    // Surface server rejections (pick taken, kill on cooldown, invalid move) — auto-clears.
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => {
      setError(String(msg));
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setError(null), 3500);
    };
    s.on("connect", enter);
    s.on("disconnect", () => setConnected(false));
    s.on("m2:state", onState);
    s.on("m2:you", onYou);
    s.on("m2:announce", onAnnounce);
    s.on("m2:error", onError);
    if (s.connected) enter();
    return () => {
      clearTimeout(clearTimer);
      s.off("connect", enter);
      s.off("m2:state", onState);
      s.off("m2:you", onYou);
      s.off("m2:announce", onAnnounce);
      s.off("m2:error", onError);
    };
  }, [room, role]);

  // Persist the id AND its proof: on reload the id alone is no longer enough to reclaim the player.
  useEffect(() => {
    if (you?.id) savePlayer2(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) });
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string, avatar?: string) => {
    savePlayer2(room, { name, ...(avatar ? { avatar } : {}) });
    const st = loadPlayer2(room);
    m2Join(room, name, st.avatar, st.id, st.rejoinToken);
  };
  return { state, you, announce, error, connected, join };
}
