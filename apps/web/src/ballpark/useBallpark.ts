import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import { loadBpPlayer, saveBpPlayer, bpJoin, bpSync, type BpState, type BpYou } from "../net/ballpark";

// Shared hook for all Ballpark surfaces. Players join by name (auto-rejoin); host/display watch via
// bp:sync. The question is public; the answer + individual guesses/bets are withheld in state until
// the server reveals them in aggregate, so nothing secret is needed per-socket.
export function useBallpark(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<BpState | null>(null);
  const [you, setYou] = useState<BpYou | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      if (role === "player") {
        const st = loadBpPlayer(room);
        if (st.name) bpJoin(room, st.name, st.id, st.rejoinToken);
      } else {
        s.emit("join", { room, role });
        bpSync(room);
      }
    };
    const onState = (st: BpState) => setState(st);
    const onYou = (y: BpYou) => setYou(y);
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => { setError(String(msg)); clearTimeout(clearTimer); clearTimer = setTimeout(() => setError(null), 3500); };
    s.on("connect", enter);
    s.on("bp:state", onState);
    s.on("bp:you", onYou);
    s.on("bp:error", onError);
    if (s.connected) enter();
    return () => {
      clearTimeout(clearTimer);
      s.off("connect", enter);
      s.off("bp:state", onState);
      s.off("bp:you", onYou);
      s.off("bp:error", onError);
    };
  }, [room, role]);

  const idRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (you?.id && you.id !== idRef.current) {
      idRef.current = you.id;
      saveBpPlayer(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) });
    }
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string) => {
    saveBpPlayer(room, { name });
    const st = loadBpPlayer(room);
    bpJoin(room, name, st.id, st.rejoinToken);
  };

  return { state, you, error, join };
}
