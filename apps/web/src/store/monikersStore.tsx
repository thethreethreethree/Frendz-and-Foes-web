// "Encore" (Monikers) store — host authority + follower. Its own engine (persistent per-round
// pile, point scoring, 3 rounds). Secret-safe: the current card stays on the host device; only the
// public projection (counts + post-turn review) is broadcast.

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
  monikersReducer,
  createMonikers,
  currentMonikersCard,
  toPublicMonikers,
  type MonikersState,
  type MonikersPublic,
  type MonikersConfig,
  type MonikersCard,
} from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  type MonikersSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

export interface MonikersHostStore {
  state: MonikersState;
  currentCard: MonikersCard | null;
  configure: (c: Partial<MonikersConfig>) => void;
  setTeams: (teams: Array<{ id: string; name: string; color?: string }>) => void;
  start: () => void;
  beginTurn: () => void;
  got: () => void;
  pass: () => void;
  endTurn: () => void;
  nextTurn: () => void;
  nextRound: () => void;
  reset: () => void;
  joinQrVisible: boolean;
  setJoinQrVisible: (v: boolean) => void;
  sfx: (name: SfxName, variant?: number) => void;
  connection: ConnectionInfo;
}

export interface MonikersViewStore {
  pub: MonikersPublic;
  joinQrVisible: boolean;
  connection: ConnectionInfo;
}

const HostCtx = createContext<MonikersHostStore | null>(null);
const ViewCtx = createContext<MonikersViewStore | null>(null);
const STORAGE_KEY = "ff:monikers:v1";

function loadState(): MonikersState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as MonikersState;
    if (p && Array.isArray(p.teams) && typeof p.phase === "string") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function MonikersProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [state, setState] = useState<MonikersState>(() => loadState() ?? createMonikers());
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

  const dispatch = useCallback((a: Parameters<typeof monikersReducer>[1]) => setState((s) => monikersReducer(s, a)), []);

  const snapRef = useRef<MonikersSnapshot>({ monikers: toPublicMonikers(state), joinQrVisible });
  snapRef.current = { monikers: toPublicMonikers(state), joinQrVisible };

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
    if (room) emitSync(room, { monikers: toPublicMonikers(state), joinQrVisible });
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
    if (prevPhase.current === "playing" && state.phase === "roundover") sfx("gong");
    if (prevPhase.current !== "ended" && state.phase === "ended") sfx("applause");
    prevPhase.current = state.phase;
  }, [state.phase, sfx]);

  const value = useMemo<MonikersHostStore>(
    () => ({
      state,
      currentCard: currentMonikersCard(state),
      configure: (c) => dispatch({ type: "CONFIGURE", config: c }),
      setTeams: (teams) => dispatch({ type: "SET_TEAMS", teams }),
      start: () => dispatch({ type: "START" }),
      beginTurn: () => dispatch({ type: "BEGIN_TURN" }),
      got: () => { sfx("ding"); dispatch({ type: "GOT" }); },
      pass: () => { sfx("swoosh"); dispatch({ type: "PASS" }); },
      endTurn: () => dispatch({ type: "END_TURN" }),
      nextTurn: () => dispatch({ type: "NEXT_TURN" }),
      nextRound: () => dispatch({ type: "NEXT_ROUND" }),
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

export function MonikersFollowerProvider({ children, room, role = "display" }: { children: ReactNode; room: string; role?: Role }) {
  const [pub, setPub] = useState<MonikersPublic>(() => toPublicMonikers(createMonikers()));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: MonikersSnapshot) => {
      if (!snap?.monikers) return; // ignore foreign/partial snapshots (shared-room safety)
      setPub(snap.monikers);
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

  const value = useMemo<MonikersViewStore>(
    () => ({ pub, joinQrVisible, connection: { connected, presence, room, role } }),
    [pub, joinQrVisible, connected, presence, room, role],
  );

  return (
    <ViewCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </ViewCtx.Provider>
  );
}

export function useMonikersHost(): MonikersHostStore {
  const v = useContext(HostCtx);
  if (!v) throw new Error("useMonikersHost must be used within a MonikersProvider");
  return v;
}

export function useMonikersView(): MonikersViewStore {
  const v = useContext(ViewCtx);
  if (!v) throw new Error("useMonikersView must be used within a MonikersFollowerProvider");
  return v;
}
