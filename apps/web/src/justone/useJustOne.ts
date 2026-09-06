import { useEffect, useRef, useState } from "react";
import { getSocket } from "../net/socket";
import { loadJoPlayer, saveJoPlayer, joJoin, joSync, type JoState, type JoYou } from "../net/justone";

// Shared hook for all Solo Clue surfaces. Players join by name (auto-rejoin with stored id+token);
// host/display watch via jo:sync. `word` arrives on the private jo:word channel and is null for the
// guesser (and for everyone until a round starts), so the guesser's device never sees it.
export function useJustOne(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<JoState | null>(null);
  const [you, setYou] = useState<JoYou | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      if (role === "player") {
        const st = loadJoPlayer(room);
        if (st.name) joJoin(room, st.name, st.avatar, st.id, st.rejoinToken);
      } else {
        s.emit("join", { room, role });
        joSync(room);
      }
    };
    const onState = (st: JoState) => setState(st);
    const onYou = (y: JoYou) => setYou(y);
    const onWord = (w: string | null) => setWord(w);
    let clearTimer: ReturnType<typeof setTimeout>;
    const onError = (msg: string) => { setError(String(msg)); clearTimeout(clearTimer); clearTimer = setTimeout(() => setError(null), 3500); };
    s.on("connect", enter);
    s.on("jo:state", onState);
    s.on("jo:you", onYou);
    s.on("jo:word", onWord);
    s.on("jo:error", onError);
    if (s.connected) enter();
    return () => {
      clearTimeout(clearTimer);
      s.off("connect", enter);
      s.off("jo:state", onState);
      s.off("jo:you", onYou);
      s.off("jo:word", onWord);
      s.off("jo:error", onError);
    };
  }, [room, role]);

  const idRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (you?.id && you.id !== idRef.current) {
      idRef.current = you.id;
      saveJoPlayer(room, { id: you.id, ...(you.rejoinToken ? { rejoinToken: you.rejoinToken } : {}) });
    }
  }, [you?.id, you?.rejoinToken, room]);

  const join = (name: string, avatar?: string) => {
    saveJoPlayer(room, { name, ...(avatar ? { avatar } : {}) });
    const st = loadJoPlayer(room);
    joJoin(room, name, st.avatar, st.id, st.rejoinToken);
  };

  return { state, you, word, error, join };
}
