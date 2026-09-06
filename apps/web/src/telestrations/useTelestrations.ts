import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import { loadTePlayer, saveTePlayer, teJoin, teSync, type TeState, type TeYou } from "../net/telestrations";

// Shared hook for all Sketch Relay surfaces. Players join by name (auto-rejoin); host/display watch
// via te:sync. te:you carries the player's private prompt for the current turn.
export function useTelestrations(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<TeState | null>(null);
  const [you, setYou] = useState<TeYou | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      if (role === "player") { const st = loadTePlayer(room); if (st.name) teJoin(room, st.name, st.avatar, st.id, st.rejoinToken); }
      else { s.emit("join", { room, role }); teSync(room); }
    };
    const onState = (st: TeState) => setState(st);
    const onYou = (y: TeYou) => setYou(y);
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => { setError(String(msg)); clearTimeout(clearTimer); clearTimer = setTimeout(() => setError(null), 3500); };
    s.on("connect", enter);
    s.on("te:state", onState);
    s.on("te:you", onYou);
    s.on("te:error", onError);
    if (s.connected) enter();
    return () => { clearTimeout(clearTimer); s.off("connect", enter); s.off("te:state", onState); s.off("te:you", onYou); s.off("te:error", onError); };
  }, [room, role]);

  const idRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (you?.id && you.id !== idRef.current) { idRef.current = you.id; saveTePlayer(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) }); }
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string, avatar?: string) => { saveTePlayer(room, { name, ...(avatar ? { avatar } : {}) }); const st = loadTePlayer(room); teJoin(room, name, st.avatar, st.id, st.rejoinToken); };
  return { state, you, error, join };
}
