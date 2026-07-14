import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket, type Presence } from "../net/socket";
import {
  loadPlayer,
  mAssign,
  mConfig,
  mJoin,
  mKill,
  mNominate,
  mPick,
  mReset,
  mVote,
  savePlayer,
  type MurderAnnounce,
  type MurderState,
  type MurderYou,
  type Villager,
} from "../net/murder";

// Shared hook for all three Murder surfaces. host/display do the generic room "join"; a player
// joins by name (auto-rejoining with its stored id to recover its character + secret role).
export function useMurder(room: string, role: "host" | "display" | "player") {
  const [state, setState] = useState<MurderState | null>(null);
  const [you, setYou] = useState<MurderYou | null>(null);
  const [announce, setAnnounce] = useState<{ a: MurderAnnounce; nonce: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [characters, setCharacters] = useState<Villager[]>([]);
  const nonce = useRef(0);

  // The villager roster comes from the server (single source of truth).
  useEffect(() => {
    fetch("/murder/characters")
      .then((r) => r.json())
      .then((v: Villager[]) => setCharacters(Array.isArray(v) ? v : []))
      .catch(() => setCharacters([]));
  }, []);

  useEffect(() => {
    const s = getSocket();
    const enter = () => {
      setConnected(true);
      if (role === "player") {
        const st = loadPlayer(room);
        if (st.name) mJoin(room, st.name, st.id);
      } else {
        s.emit("join", { room, role });
      }
    };
    const onState = (st: MurderState) => setState(st);
    const onYou = (y: MurderYou) => setYou(y);
    const onErr = (e: string) => {
      setError(e);
      setTimeout(() => setError(null), 2500);
    };
    const onAnnounce = (a: MurderAnnounce) => {
      nonce.current += 1;
      setAnnounce({ a, nonce: nonce.current });
    };
    s.on("connect", enter);
    s.on("disconnect", () => setConnected(false));
    s.on("m:state", onState);
    s.on("m:you", onYou);
    s.on("m:error", onErr);
    s.on("m:announce", onAnnounce);
    s.on("presence", setPresence);
    if (s.connected) enter();
    return () => {
      s.off("connect", enter);
      s.off("m:state", onState);
      s.off("m:you", onYou);
      s.off("m:error", onErr);
      s.off("m:announce", onAnnounce);
      s.off("presence", setPresence);
    };
  }, [room, role]);

  useEffect(() => {
    if (you?.id) savePlayer(room, { id: you.id });
  }, [you?.id, room]);

  const byId = useMemo(() => {
    const map = new Map<string, Villager>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  const weaponById = useMemo(() => {
    const map = new Map<string, Villager>();
    characters.forEach((c) => map.set(c.weaponId, c));
    return map;
  }, [characters]);

  return {
    state,
    you,
    announce,
    error,
    connected,
    presence,
    characters,
    /** villager by character id */
    byId,
    /** the villager who owns a given weapon (i.e. who a clue points at) */
    weaponById,
    join: (name: string) => {
      savePlayer(room, { name });
      mJoin(room, name, loadPlayer(room).id);
    },
    pick: mPick,
    config: mConfig,
    assign: mAssign,
    reset: mReset,
    kill: mKill,
    nominate: mNominate,
    vote: mVote,
  };
}
