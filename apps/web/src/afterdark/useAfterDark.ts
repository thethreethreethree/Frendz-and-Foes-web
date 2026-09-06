import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import { loadCaPlayer, saveCaPlayer, caJoin, caSync, type CaState, type CaYou } from "../net/afterdark";

// Shared hook for all After Dark surfaces. Players join by name (auto-rejoin); host/display watch via
// ca:sync. ca:you carries the player's private hand + whether they're the judge this round.
export function useAfterDark(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<CaState | null>(null);
  const [you, setYou] = useState<CaYou | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      if (role === "player") { const st = loadCaPlayer(room); if (st.name) caJoin(room, st.name, st.avatar, st.id, st.rejoinToken); }
      else { s.emit("join", { room, role }); caSync(room); }
    };
    const onState = (st: CaState) => setState(st);
    const onYou = (y: CaYou) => setYou(y);
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => { setError(String(msg)); clearTimeout(clearTimer); clearTimer = setTimeout(() => setError(null), 3500); };
    s.on("connect", enter);
    s.on("ca:state", onState);
    s.on("ca:you", onYou);
    s.on("ca:error", onError);
    if (s.connected) enter();
    return () => { clearTimeout(clearTimer); s.off("connect", enter); s.off("ca:state", onState); s.off("ca:you", onYou); s.off("ca:error", onError); };
  }, [room, role]);

  const idRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (you?.id && you.id !== idRef.current) { idRef.current = you.id; saveCaPlayer(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) }); }
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string, avatar?: string) => { saveCaPlayer(room, { name, ...(avatar ? { avatar } : {}) }); const st = loadCaPlayer(room); caJoin(room, name, st.avatar, st.id, st.rejoinToken); };
  return { state, you, error, join };
}
