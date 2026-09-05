// "Off Limits" store — host authority + follower, over the same relay as Feud/Bingo/Trivia.
//
// The HOST device is the describer's device: it runs the full engine (deck, current card, timer)
// and broadcasts only toPublic(state) so the room's display never sees the secret word. The
// FOLLOWER (display) renders the public projection.

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
  offLimitsReducer,
  createOffLimits,
  toPublic,
  currentOffLimitsCard,
  type OffLimitsState,
  type OffLimitsPublic,
  type OffLimitsConfig,
  type OffLimitsCard,
} from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  type OffLimitsSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

export interface OffLimitsHostStore {
  state: OffLimitsState;
  currentCard: OffLimitsCard | null;
  configure: (c: Partial<OffLimitsConfig>) => void;
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

export interface OffLimitsViewStore {
  pub: OffLimitsPublic;
  joinQrVisible: boolean;
  connection: ConnectionInfo;
}

const HostCtx = createContext<OffLimitsHostStore | null>(null);
const ViewCtx = createContext<OffLimitsViewStore | null>(null);
const STORAGE_KEY = "ff:offlimits:v1";

function loadState(): OffLimitsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as OffLimitsState;
    if (p && Array.isArray(p.teams) && typeof p.phase === "string") return p;
  } catch {
    /* ignore corrupt save */
  }
  return null;
}

export function OffLimitsProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [state, setState] = useState<OffLimitsState>(() => loadState() ?? createOffLimits());
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

  const dispatch = useCallback((a: Parameters<typeof offLimitsReducer>[1]) => setState((s) => offLimitsReducer(s, a)), []);

  const snapRef = useRef<OffLimitsSnapshot>({ offlimits: toPublic(state), joinQrVisible });
  snapRef.current = { offlimits: toPublic(state), joinQrVisible };

  // Relay: broadcast the PUBLIC projection only.
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
    if (room) emitSync(room, { offlimits: toPublic(state), joinQrVisible });
  }, [room, state, joinQrVisible]);

  // Turn timer: while a turn is live, tick down once a second (host owns the clock).
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

  // Cue sounds on turn end / win (buzzer + applause), driven off the phase.
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (prevPhase.current === "playing" && state.phase === "turnover") sfx("buzzer");
    if (prevPhase.current !== "ended" && state.phase === "ended") sfx("applause");
    prevPhase.current = state.phase;
  }, [state.phase, sfx]);

  const value = useMemo<OffLimitsHostStore>(
    () => ({
      state,
      currentCard: currentOffLimitsCard(state),
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

export function OffLimitsFollowerProvider({
  children,
  room,
  role = "display",
}: {
  children: ReactNode;
  room: string;
  role?: Role;
}) {
  const [pub, setPub] = useState<OffLimitsPublic>(() => toPublic(createOffLimits()));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: OffLimitsSnapshot) => {
      if (!snap?.offlimits) return; // ignore foreign/partial snapshots (shared-room safety)
      setPub(snap.offlimits);
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

  const value = useMemo<OffLimitsViewStore>(
    () => ({ pub, joinQrVisible, connection: { connected, presence, room, role } }),
    [pub, joinQrVisible, connected, presence, room, role],
  );

  return (
    <ViewCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </ViewCtx.Provider>
  );
}

export function useOffLimitsHost(): OffLimitsHostStore {
  const v = useContext(HostCtx);
  if (!v) throw new Error("useOffLimitsHost must be used within an OffLimitsProvider");
  return v;
}

export function useOffLimitsView(): OffLimitsViewStore {
  const v = useContext(ViewCtx);
  if (!v) throw new Error("useOffLimitsView must be used within an OffLimitsFollowerProvider");
  return v;
}
