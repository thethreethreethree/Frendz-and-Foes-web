// Frendz Bingo store — authority (host) + follower (display), sharing the same socket/room as
// Feud. The host draws/reveals; the resulting BingoState syncs to the display. No scoring.

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
import { bingoReducer, createBingo, type BingoAction, type BingoState } from "@ff/engine";
import { playSfx, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  type BingoSnapshot,
  type ConnectionInfo,
  type Presence,
  type Pulse,
  type Role,
} from "../net/socket";
import { ConnectionCtx } from "../net/connection";

export interface BingoStore {
  bingo: BingoState;
  draw: () => void;
  revealDare: () => void;
  undraw: () => void;
  reset: () => void;
  sfx: (name: SfxName, variant?: number) => void;
  connection: ConnectionInfo;
}

const BingoCtx = createContext<BingoStore | null>(null);
const STORAGE_KEY = "ff:bingo:v1";

const isDemoBingo = () =>
  typeof window !== "undefined" && window.location.search.includes("demo=bingo");

function seededBingo(): BingoState {
  return { drawn: ["B7", "I22", "N40", "G51", "O66"], currentId: "O66", dareRevealed: true };
}

function loadBingo(): BingoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as BingoState;
    if (Array.isArray(p?.drawn)) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function BingoProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [bingo, setBingo] = useState<BingoState>(() =>
    isDemoBingo() ? seededBingo() : (loadBingo() ?? createBingo()),
  );
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    if (isDemoBingo()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bingo));
    } catch {
      /* non-fatal */
    }
  }, [bingo]);

  const snapRef = useRef<BingoSnapshot>({ bingo });
  snapRef.current = { bingo };

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
    if (room) emitSync(room, { bingo });
  }, [room, bingo]);

  const sfx = useCallback(
    (name: SfxName, variant?: number) => {
      playSfx(name, variant ?? 0);
      if (room) emitPulse(room, { kind: "sfx", name, variant: variant ?? 0 });
    },
    [room],
  );

  const dispatch = useCallback((a: BingoAction) => setBingo((b) => bingoReducer(b, a)), []);

  const value = useMemo<BingoStore>(
    () => ({
      bingo,
      draw: () => {
        dispatch({ type: "DRAW" });
        sfx("swoosh");
      },
      revealDare: () => {
        dispatch({ type: "REVEAL_DARE" });
        sfx("drumroll");
      },
      undraw: () => dispatch({ type: "UNDRAW" }),
      reset: () => dispatch({ type: "RESET" }),
      sfx,
      connection: { connected, presence, room: room ?? null, role: room ? "host" : null },
    }),
    [bingo, dispatch, sfx, connected, presence, room],
  );

  return (
    <BingoCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </BingoCtx.Provider>
  );
}

const noop = () => {};

export function BingoDisplayProvider({
  children,
  room,
  role = "display",
}: {
  children: ReactNode;
  room: string;
  role?: Role;
}) {
  const [bingo, setBingo] = useState<BingoState>(createBingo());
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: BingoSnapshot) => snap?.bingo && setBingo(snap.bingo);
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

  const value = useMemo<BingoStore>(
    () => ({
      bingo,
      draw: noop,
      revealDare: noop,
      undraw: noop,
      reset: noop,
      sfx: playSfx,
      connection: { connected, presence, room, role },
    }),
    [bingo, connected, presence, room, role],
  );

  return (
    <BingoCtx.Provider value={value}>
      <ConnectionCtx.Provider value={value.connection}>{children}</ConnectionCtx.Provider>
    </BingoCtx.Provider>
  );
}

export function useBingo(): BingoStore {
  const v = useContext(BingoCtx);
  if (!v) throw new Error("useBingo must be used within a bingo provider");
  return v;
}
