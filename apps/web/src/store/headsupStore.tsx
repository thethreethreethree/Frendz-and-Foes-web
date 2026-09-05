// "Foreheads" (Heads Up!) store — host authority + follower over the relay, on the shared
// word-deck engine. Same secret-safety as Off Limits: the live word stays on the holder's device;
// only the public projection is broadcast (the room's display must not show the word — the holder
// could glance at it). The deck is the chosen category's word list.

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
  headsUpDeck,
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
  type HeadsUpSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

export interface HeadsUpHostStore {
  state: WordGameState;
  currentCard: WordCard | null;
  category: string;
  setCategory: (id: string) => void;
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

export interface HeadsUpViewStore {
  pub: WordGamePublic;
  joinQrVisible: boolean;
  connection: ConnectionInfo;
}

const HostCtx = createContext<HeadsUpHostStore | null>(null);
const ViewCtx = createContext<HeadsUpViewStore | null>(null);
const STORAGE_KEY = "ff:headsup:v1";

function load(): { category: string; state: WordGameState } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.state && typeof p.category === "string" && Array.isArray(p.state.teams)) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function HeadsUpProvider({ children, room }: { children: ReactNode; room?: string }) {
  const saved = load();
  const [category, setCategoryState] = useState<string>(saved?.category ?? "animals");
  const [state, setState] = useState<WordGameState>(() => saved?.state ?? createWordGame(headsUpDeck(saved?.category ?? "animals")));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  const deck = useMemo(() => headsUpDeck(category), [category]);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ category, state }));
    } catch {
      /* non-fatal */
    }
  }, [category, state]);

  const dispatch = useCallback((a: Parameters<typeof wordGameReducer>[2]) => setState((s) => wordGameReducer(deckRef.current, s, a)), []);

  const snapRef = useRef<HeadsUpSnapshot>({ headsup: toPublicWordGame(state), joinQrVisible });
  snapRef.current = { headsup: toPublicWordGame(state), joinQrVisible };

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
    if (room) emitSync(room, { headsup: toPublicWordGame(state), joinQrVisible });
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

  const setCategory = useCallback(
    (id: string) => {
      setState((s) => (s.phase === "setup" ? createWordGame(headsUpDeck(id), { config: s.config, teams: s.teams }) : s));
      setCategoryState(id);
    },
    [],
  );

  const value = useMemo<HeadsUpHostStore>(
    () => ({
      state,
      currentCard: cardAt(deck, state),
      category,
      setCategory,
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
    [state, deck, category, setCategory, dispatch, joinQrVisible, sfx, connected, presence, room],
  );

  return (
    <HostCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </HostCtx.Provider>
  );
}

export function HeadsUpFollowerProvider({ children, room, role = "display" }: { children: ReactNode; room: string; role?: Role }) {
  const [pub, setPub] = useState<WordGamePublic>(() => toPublicWordGame(createWordGame(headsUpDeck("animals"))));
  const [joinQrVisible, setJoinQrVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: HeadsUpSnapshot) => {
      if (!snap?.headsup) return; // ignore foreign/partial snapshots (shared-room safety)
      setPub(snap.headsup);
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

  const value = useMemo<HeadsUpViewStore>(
    () => ({ pub, joinQrVisible, connection: { connected, presence, room, role } }),
    [pub, joinQrVisible, connected, presence, room, role],
  );

  return (
    <ViewCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </ViewCtx.Provider>
  );
}

export function useHeadsUpHost(): HeadsUpHostStore {
  const v = useContext(HostCtx);
  if (!v) throw new Error("useHeadsUpHost must be used within a HeadsUpProvider");
  return v;
}

export function useHeadsUpView(): HeadsUpViewStore {
  const v = useContext(ViewCtx);
  if (!v) throw new Error("useHeadsUpView must be used within a HeadsUpFollowerProvider");
  return v;
}
