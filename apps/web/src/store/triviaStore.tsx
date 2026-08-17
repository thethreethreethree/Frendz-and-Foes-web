// Frendz Trivia store — host authority + follower, over the same socket/room relay as Feud/Bingo.
// The host runs the engine, records team answers arriving from answer-phones (trivia-answer
// intents), and broadcasts the whole TriviaState. Followers render it; the answerer emits intents
// directly (it does not mutate state locally — the host is the scorekeeper).

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
  triviaReducer,
  createTrivia,
  type TriviaAction,
  type TriviaState,
  type TriviaVersion,
  type TriviaMode,
} from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  type TriviaSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
  type Intent,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

export interface TriviaStore {
  trivia: TriviaState;
  dispatch: (a: TriviaAction) => void;
  configure: (cfg: { version?: TriviaVersion; mode?: TriviaMode }) => void;
  setTeams: (teams: Array<{ id: string; name: string; color?: string }>) => void;
  start: () => void;
  next: () => void;
  prev: () => void;
  revealRound: (round: number) => void;
  end: () => void;
  reset: () => void;
  joinQrVisible: boolean;
  setJoinQrVisible: (v: boolean) => void;
  sfx: (name: SfxName, variant?: number) => void;
  connection: ConnectionInfo;
}

const TriviaCtx = createContext<TriviaStore | null>(null);
const STORAGE_KEY = "ff:trivia:v1";

function loadTrivia(): TriviaState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as TriviaState;
    if (p && Array.isArray(p.teams) && typeof p.version === "string") return p;
  } catch {
    /* ignore corrupt save */
  }
  return null;
}

export function TriviaProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [trivia, setTrivia] = useState<TriviaState>(() => loadTrivia() ?? createTrivia());
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trivia));
    } catch {
      /* non-fatal */
    }
  }, [trivia]);

  const dispatch = useCallback((a: TriviaAction) => setTrivia((s) => triviaReducer(s, a)), []);

  const snapRef = useRef<TriviaSnapshot>({ trivia, joinQrVisible });
  snapRef.current = { trivia, joinQrVisible };

  useEffect(() => {
    if (!room) return;
    const s = joinRoom(room, "host");
    const onConnect = () => {
      setConnected(true);
      emitSync(room, snapRef.current);
    };
    const onDisconnect = () => setConnected(false);
    // Answer-phones send their locked A/B/C/D as a trivia-answer intent; the host records it.
    const onIntent = (i: Intent & { at?: number }) => {
      if (i?.kind !== "trivia-answer") return;
      dispatch({ type: "ANSWER", teamId: i.teamId, questionId: i.questionId, letter: i.letter });
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("presence", setPresence);
    s.on("intent", onIntent);
    setConnected(s.connected);
    if (s.connected) emitSync(room, snapRef.current);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("presence", setPresence);
      s.off("intent", onIntent);
    };
  }, [room, dispatch]);

  useEffect(() => {
    if (room) emitSync(room, { trivia, joinQrVisible });
  }, [room, trivia, joinQrVisible]);

  const sfx = useCallback(
    (name: SfxName, variant?: number) => {
      playSfx(name, variant ?? 0);
      if (room) emitPulse(room, { kind: "sfx", name, variant: variant ?? 0 });
    },
    [room],
  );

  const value = useMemo<TriviaStore>(
    () => ({
      trivia,
      dispatch,
      configure: (cfg) => dispatch({ type: "CONFIGURE", ...cfg }),
      setTeams: (teams) => dispatch({ type: "SET_TEAMS", teams }),
      start: () => dispatch({ type: "START" }),
      next: () => dispatch({ type: "NEXT" }),
      prev: () => dispatch({ type: "PREV" }),
      revealRound: (round) => dispatch({ type: "REVEAL_ROUND", round }),
      end: () => dispatch({ type: "END" }),
      reset: () => dispatch({ type: "RESET" }),
      joinQrVisible,
      setJoinQrVisible,
      sfx,
      connection: { connected, presence, room: room ?? null, role: room ? "host" : null },
    }),
    [trivia, dispatch, joinQrVisible, sfx, connected, presence, room],
  );

  return (
    <TriviaCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </TriviaCtx.Provider>
  );
}

const noop = () => {};

export function TriviaFollowerProvider({
  children,
  room,
  role = "display",
  teamId,
}: {
  children: ReactNode;
  room: string;
  role?: Role;
  teamId?: string;
}) {
  const [trivia, setTrivia] = useState<TriviaState>(() => createTrivia());
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role, teamId);
    const onSync = (snap: TriviaSnapshot) => {
      if (!snap?.trivia) return; // ignore foreign/partial snapshots (shared-room safety, see DisplayProvider)
      setTrivia(snap.trivia);
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
  }, [room, role, teamId]);

  const value = useMemo<TriviaStore>(
    () => ({
      trivia,
      dispatch: noop,
      configure: noop,
      setTeams: noop,
      start: noop,
      next: noop,
      prev: noop,
      revealRound: noop,
      end: noop,
      reset: noop,
      joinQrVisible,
      setJoinQrVisible: noop,
      sfx: playSfx,
      connection: { connected, presence, room, role },
    }),
    [trivia, joinQrVisible, connected, presence, room, role],
  );

  return (
    <TriviaCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </TriviaCtx.Provider>
  );
}

export function useTrivia(): TriviaStore {
  const v = useContext(TriviaCtx);
  if (!v) throw new Error("useTrivia must be used within a trivia provider");
  return v;
}
