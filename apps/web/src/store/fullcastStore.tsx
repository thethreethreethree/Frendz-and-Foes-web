// "Full Cast" (Reverse Charades) store — host authority + follower on the shared word-deck engine.
// Same secret-safety as Off Limits/Foreheads: the acting team's phone shows the phrase; only the
// public projection is broadcast, so the guesser can watch the TV without seeing the phrase.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createWordGame,
  wordGameReducer,
  cardAt,
  toPublicWordGame,
  fullCastDeck,
  type WordGameState,
  type WordGamePublic,
  type WordGameConfig,
  type WordCard,
} from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  type FullCastSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

const DECK: readonly WordCard[] = fullCastDeck();

export interface FullCastHostStore {
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

export interface FullCastViewStore {
  pub: WordGamePublic;
  joinQrVisible: boolean;
  connection: ConnectionInfo;
}

const HostCtx = createContext<FullCastHostStore | null>(null);
const ViewCtx = createContext<FullCastViewStore | null>(null);
const STORAGE_KEY = "ff:fullcast:v1";

function loadState(): WordGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as WordGameState;
    if (p && Array.isArray(p.teams) && typeof p.phase === "string") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function FullCastProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [state, setState] = useState<WordGameState>(() => loadState() ?? createWordGame(DECK));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* non-fatal */
    }
  }, [state]);

  const dispatch = useCallback((a: Parameters<typeof wordGameReducer>[2]) => setState((s) => wordGameReducer(DECK, s, a)), []);

  const snapRef = useRef<FullCastSnapshot>({ fullcast: toPublicWordGame(state), joinQrVisible });
  snapRef.current = { fullcast: toPublicWordGame(state), joinQrVisible };

  useEffect(() => {
    if (!room) return;
    const s = joinRoom(room, "host");
    const onConnect = () => {
      setConnected(true);
      emitSync(room, snapRef.current);
    };
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("presence", setPresence);
    setConnected(s.connected);
    if (s.connected) emitSync(room, snapRef.current);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("presence", setPresence);
    };
  }, [room]);

  useEffect(() => {
    if (room) emitSync(room, { fullcast: toPublicWordGame(state), joinQrVisible });
  }, [room, state, joinQrVisible]);

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  useEffect(() => {
    if (state.phase !== "playing") return;
    const id = setInterval(() => dispatchRef.current({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const sfx = useCallback(
    (name: SfxName, variant?: number) => {
      playSfx(name, variant ?? 0);
      if (room) emitPulse(room, { kind: "sfx", name, variant: variant ?? 0 });
    },
    [room],
  );

  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (prevPhase.current === "playing" && state.phase === "turnover") sfx("buzzer");
    if (prevPhase.current !== "ended" && state.phase === "ended") sfx("applause");
    prevPhase.current = state.phase;
  }, [state.phase, sfx]);

  const value = useMemo<FullCastHostStore>(
    () => ({
      state,
      currentCard: cardAt(DECK, state),
      configure: (c) => dispatch({ type: "CONFIGURE", config: c }),
      setTeams: (teams) => dispatch({ type: "SET_TEAMS", teams }),
      start: () => dispatch({ type: "START" }),
      beginTurn: () => dispatch({ type: "BEGIN_TURN" }),
      got: () => { sfx("ding"); dispatch({ type: "GOT" }); },
      skip: () => { sfx("swoosh"); dispatch({ type: "SKIP" }); },
      endTurn: () => dispatch({ type: "END_TURN" }),
      nextTurn: () => dispatch({ type: "NEXT_TURN" }),
      reset: () => dispatch({ type: "RESET" }),
      joinQrVisible,
      setJoinQrVisible,
      sfx,
      connection: { connected, presence, room: room ?? null, role: room ? "host" : null },
    }),
    [state, dispatch, joinQrVisible, sfx, connected, presence, room],
  );

  return (
    <HostCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </HostCtx.Provider>
  );
}

export function FullCastFollowerProvider({ children, room, role = "display" }: { children: ReactNode; room: string; role?: Role }) {
  const [pub, setPub] = useState<WordGamePublic>(() => toPublicWordGame(createWordGame(DECK)));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: FullCastSnapshot) => {
      if (!snap?.fullcast) return; // ignore foreign/partial snapshots (shared-room safety)
      setPub(snap.fullcast);
      setJoinQrVisible(!!snap.joinQrVisible);
    };
    const onPulse = (p: Pulse) => {
      if (p.kind === "sfx") playSfx(p.name, p.variant);
    };
    s.on("sync", onSync);
    s.on("pulse", onPulse);
    s.on("presence", setPresence);
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    setConnected(s.connected);
    return () => {
      s.off("sync", onSync);
      s.off("pulse", onPulse);
      s.off("presence", setPresence);
    };
  }, [room, role]);

  const value = useMemo<FullCastViewStore>(
    () => ({ pub, joinQrVisible, connection: { connected, presence, room, role } }),
    [pub, joinQrVisible, connected, presence, room, role],
  );

  return (
    <ViewCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </ViewCtx.Provider>
  );
}

export function useFullCastHost(): FullCastHostStore {
  const v = useContext(HostCtx);
  if (!v) throw new Error("useFullCastHost must be used within a FullCastProvider");
  return v;
}

export function useFullCastView(): FullCastViewStore {
  const v = useContext(ViewCtx);
  if (!v) throw new Error("useFullCastView must be used within a FullCastFollowerProvider");
  return v;
}
