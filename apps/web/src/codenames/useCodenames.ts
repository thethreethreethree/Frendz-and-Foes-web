import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import { loadCnPlayer, saveCnPlayer, forgetCNPlayer, cnJoin, cnSync, type CnState, type CnYou } from "../net/codenames";
import { resolveSlug } from "../brand/resolve";

// Shared hook for all Cover Ops surfaces. host/display watch via cn:sync (+ generic join so the host
// gets the host role); a player joins by name and auto-rejoins with its stored id + token to recover
// its role (and, if spymaster, its secret key).
export function useCodenames(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<CnState | null>(null);
  const [you, setYou] = useState<CnYou | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      setConnected(true);
      if (role === "player") {
        const st = loadCnPlayer(room);
        if (st.name) cnJoin(room, st.name, st.avatar, st.id, st.rejoinToken);
      } else {
        s.emit("join", { room, role, game: "codenames", brand: resolveSlug() }); // sets host/display role + joins the room
        cnSync(room);
      }
    };
    const onState = (st: CnState) => setState(st);
    const onYou = (y: CnYou) => setYou(y);
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => {
      setError(String(msg));
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setError(null), 3500);
    };
    // The host removed us. Forget the stored identity FIRST: `enter` re-joins on every reconnect,
    // so without this the phone walks straight back into the game it was removed from.
    const onKicked = () => { forgetCNPlayer(room); setRemoved(true); setYou(null); };
    s.on("connect", enter);
    s.on("disconnect", () => setConnected(false));
    s.on("cn:state", onState);
    s.on("cn:you", onYou);
    s.on("cn:error", onError);
    s.on("cn:kicked", onKicked);
    if (s.connected) enter();
    return () => {
      clearTimeout(clearTimer);
      s.off("connect", enter);
      s.off("cn:state", onState);
      s.off("cn:you", onYou);
      s.off("cn:error", onError); s.off("cn:kicked", onKicked);
    };
  }, [room, role]);

  const idRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (you?.id && you.id !== idRef.current) {
      idRef.current = you.id;
      saveCnPlayer(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) });
    }
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string, avatar?: string) => {
    setRemoved(false); saveCnPlayer(room, { name, ...(avatar ? { avatar } : {}) });
    const st = loadCnPlayer(room);
    cnJoin(room, name, st.avatar, st.id, st.rejoinToken);
  };

  return { state, you, error, removed, connected, join };
}
