// "Quick Draw" (Pictionary) store — host authority + follower on the shared word-deck engine. Same
// as the other word-deck games for turns/timer/score; the drawing itself streams separately over
// "draw"/"clear" pulses (see PictionaryCanvas). The secret word stays on the drawer's (host) device.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import {
  createWordGame, wordGameReducer, cardAt, toPublicWordGame, pictionaryDeck,
  type WordGameState, type WordGamePublic, type WordGameConfig, type WordCard,
} from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom, emitSync, emitPulse, type PictionarySnapshot, type ConnectionInfo, type Presence, type Pulse, type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

const DECK: readonly WordCard[] = pictionaryDeck();

export interface PictionaryHostStore {
  state: WordGameState;
  currentCard: WordCard | null;
  configure: (c: Partial<WordGameConfig>) => void;
  setTeams: (teams: Array<{ id: string; name: string; color?: string }>) => void;
  start: () => void;
  beginTurn: () => void;
  got: () => void;
  skip: () => void;
  endTurn: () => void;
  nextTurn: () => void;
  reset: () => void;
  joinQrVisible: boolean;
  setJoinQrVisible: (v: boolean) => void;
  sfx: (name: SfxName, variant?: number) => void;
  connection: ConnectionInfo;
}
export interface PictionaryViewStore { pub: WordGamePublic; joinQrVisible: boolean; connection: ConnectionInfo }

const HostCtx = createContext<PictionaryHostStore | null>(null);
const ViewCtx = createContext<PictionaryViewStore | null>(null);
const STORAGE_KEY = "ff:pictionary:v1";

function loadState(): WordGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as WordGameState;
    if (p && Array.isArray(p.teams) && typeof p.phase === "string") return p;
  } catch { /* ignore */ }
  return null;
}

export function PictionaryProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [state, setState] = useState<WordGameState>(() => loadState() ?? createWordGame(DECK));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* non-fatal */ } }, [state]);

  const dispatch = useCallback((a: Parameters<typeof wordGameReducer>[2]) => setState((s) => wordGameReducer(DECK, s, a)), []);

  const snapRef = useRef<PictionarySnapshot>({ pictionary: toPublicWordGame(state), joinQrVisible });
  snapRef.current = { pictionary: toPublicWordGame(state), joinQrVisible };

  useEffect(() => {
    if (!room) return;
    const s = joinRoom(room, "host");
    const onConnect = () => { setConnected(true); emitSync(room, snapRef.current); };
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect); s.on("disconnect", onDisconnect); s.on("presence", setPresence);
    setConnected(s.connected);
    if (s.connected) emitSync(room, snapRef.current);
    return () => { s.off("connect", onConnect); s.off("disconnect", onDisconnect); s.off("presence", setPresence); };
  }, [room]);

  useEffect(() => { if (room) emitSync(room, { pictionary: toPublicWordGame(state), joinQrVisible }); }, [room, state, joinQrVisible]);

  const dispatchRef = useRef(dispatch); dispatchRef.current = dispatch;
  useEffect(() => {
    if (state.phase !== "playing") return;
    const id = setInterval(() => dispatchRef.current({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const sfx = useCallback((name: SfxName, variant?: number) => { playSfx(name, variant ?? 0); if (room) emitPulse(room, { kind: "sfx", name, variant: variant ?? 0 }); }, [room]);

  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (prevPhase.current === "playing" && state.phase === "turnover") sfx("buzzer");
    if (prevPhase.current !== "ended" && state.phase === "ended") sfx("applause");
    prevPhase.current = state.phase;
  }, [state.phase, sfx]);

  const value = useMemo<PictionaryHostStore>(() => ({
    state,
    currentCard: cardAt(DECK, state),
    configure: (c) => dispatch({ type: "CONFIGURE", config: c }),
    setTeams: (teams) => dispatch({ type: "SET_TEAMS", teams }),
    start: () => dispatch({ type: "START" }),
    beginTurn: () => { if (room) emitPulse(room, { kind: "clear" }); dispatch({ type: "BEGIN_TURN" }); },
    got: () => { sfx("ding"); dispatch({ type: "GOT" }); if (room) emitPulse(room, { kind: "clear" }); },
    skip: () => { sfx("swoosh"); dispatch({ type: "SKIP" }); if (room) emitPulse(room, { kind: "clear" }); },
    endTurn: () => dispatch({ type: "END_TURN" }),
    nextTurn: () => dispatch({ type: "NEXT_TURN" }),
    reset: () => dispatch({ type: "RESET" }),
    joinQrVisible, setJoinQrVisible, sfx,
    connection: { connected, presence, room: room ?? null, role: room ? "host" : null },
  }), [state, dispatch, joinQrVisible, sfx, connected, presence, room]);

  return <HostCtx.Provider value={value}><ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider></HostCtx.Provider>;
}

export function PictionaryFollowerProvider({ children, room, role = "display" }: { children: ReactNode; room: string; role?: Role }) {
  const [pub, setPub] = useState<WordGamePublic>(() => toPublicWordGame(createWordGame(DECK)));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: PictionarySnapshot) => { if (!snap?.pictionary) return; setPub(snap.pictionary); setJoinQrVisible(!!snap.joinQrVisible); };
    const onPulse = (p: Pulse) => { if (p.kind === "sfx") playSfx(p.name, p.variant); };
    s.on("sync", onSync); s.on("pulse", onPulse); s.on("presence", setPresence);
    s.on("connect", () => setConnected(true)); s.on("disconnect", () => setConnected(false));
    setConnected(s.connected);
    return () => { s.off("sync", onSync); s.off("pulse", onPulse); s.off("presence", setPresence); };
  }, [room, role]);

  const value = useMemo<PictionaryViewStore>(() => ({ pub, joinQrVisible, connection: { connected, presence, room, role } }), [pub, joinQrVisible, connected, presence, room, role]);
  return <ViewCtx.Provider value={value}><ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider></ViewCtx.Provider>;
}

export function usePictionaryHost(): PictionaryHostStore {
  const v = useContext(HostCtx);
  if (!v) throw new Error("usePictionaryHost must be used within a PictionaryProvider");
  return v;
}
export function usePictionaryView(): PictionaryViewStore {
  const v = useContext(ViewCtx);
  if (!v) throw new Error("usePictionaryView must be used within a PictionaryFollowerProvider");
  return v;
}
