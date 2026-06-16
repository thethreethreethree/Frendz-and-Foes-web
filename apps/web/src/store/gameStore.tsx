// React binding around the pure engine + real-time sync.
//
// Two providers share ONE context (so every component uses `useGame()` unchanged):
//   - GameProvider  : the AUTHORITY (host controller / local). Runs the engine, owns undo/redo,
//                     auto-saves to localStorage, and — when given a room — broadcasts each
//                     snapshot and one-shot pulse to subscribers.
//   - DisplayProvider (./DisplayProvider): a FOLLOWER. Renders whatever the host broadcasts;
//                     all mutators are no-ops.
// Ephemeral state (banner, timer, buzzers-armed, sfx) is never part of game history, so undo
// never rewinds a banner or replays a sound.

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
  createGame,
  initHistory,
  reducer as engineReducer,
  dispatch as engineDispatch,
  undo as engineUndo,
  redo as engineRedo,
  canUndo as engineCanUndo,
  canRedo as engineCanRedo,
  SAMPLE_QUESTIONS,
  type Action,
  type GameState,
  type History,
  type Team,
} from "@ff/engine";
import { playSfx, SFX_NAMES, type SfxName } from "../audio/sfx";
import {
  joinRoom,
  emitSync,
  emitPulse,
  getSocket,
  type Presence,
  type Role,
} from "../net/socket";

export type AnnouncementKind = "title" | "round" | "bonus" | "leaderboard" | "custom";

export interface Announcement {
  kind: AnnouncementKind;
  title: string;
  subtitle?: string;
  ttl?: number;
  nonce: number;
}

export interface ConnectionInfo {
  connected: boolean;
  presence: Presence | null;
  room: string | null;
  role: Role | null;
}

export interface GameStore {
  state: GameState;
  dispatch: (action: Action) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  announcement: Announcement | null;
  announce: (a: Omit<Announcement, "nonce">) => void;
  clearAnnouncement: () => void;
  /** Play a sound; omit `variant` to use the host's selected variant for that category. */
  sfx: (name: SfxName, variant?: number) => void;
  /** Selected variation index (0-9) per sound category. */
  sfxVariant: Record<SfxName, number>;
  setSfxVariant: (name: SfxName, variant: number) => void;
  timerRemaining: number | null;
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  buzzersArmed: boolean;
  setBuzzersArmed: (v: boolean) => void;
  /** Whether the team scoreboard is shown on the display. */
  scoresVisible: boolean;
  setScoresVisible: (v: boolean) => void;
  newGame: (
    teams: Array<Pick<Team, "id" | "name"> & Partial<Pick<Team, "color">>>,
    questions?: GameState["questions"],
  ) => void;
  /** Create a fresh game with the given teams/questions AND start it in one step. */
  startNewGame: (
    teams: Array<Pick<Team, "id" | "name"> & Partial<Pick<Team, "color">>>,
    questions?: GameState["questions"],
  ) => void;
  connection: ConnectionInfo;
}

export const GameCtx = createContext<GameStore | null>(null);
const STORAGE_KEY = "ff:save:v1";

const DEMO_TEAMS = [
  { id: "t1", name: "Sharks", color: "#ff2e9a" },
  { id: "t2", name: "Volcanoes", color: "#ff6b35" },
  { id: "t3", name: "Tide", color: "#1fd1c6" },
  { id: "t4", name: "Comets", color: "#8a4bff" },
];

const isDemo = () =>
  typeof window !== "undefined" && window.location.search.includes("demo=play");

function seededDemo(): History {
  let s = engineReducer(createGame({ teams: DEMO_TEAMS, questions: SAMPLE_QUESTIONS }), {
    type: "START_GAME",
  });
  s = engineReducer(s, { type: "SET_PARTICIPANTS", teamIds: ["t1", "t2", "t3"] });
  s = engineReducer(s, { type: "AWARD", answerId: "q1-a1", teamId: "t1" });
  s = engineReducer(s, { type: "MISS", teamId: "t2" });
  s = engineReducer(s, { type: "AWARD", answerId: "q1-a4", teamId: "t3" });
  return initHistory(s);
}

function loadSaved(): History | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as History;
    if (parsed?.present?.teams && parsed.present.questions) return parsed;
  } catch {
    /* ignore corrupt save */
  }
  return null;
}

function makeInitial(): History {
  if (isDemo()) return seededDemo();
  return loadSaved() ?? initHistory(createGame({ teams: DEMO_TEAMS, questions: SAMPLE_QUESTIONS }));
}

export function GameProvider({ children, room }: { children: ReactNode; room?: string }) {
  const [history, setHistory] = useState<History>(makeInitial);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const nonceRef = useRef(0);

  const [buzzersArmed, setBuzzersArmed] = useState(false);
  const [scoresVisible, setScoresVisible] = useState(true);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sfxVariant, setSfxVariantState] = useState<Record<SfxName, number>>(
    () => Object.fromEntries(SFX_NAMES.map((n) => [n, 0])) as Record<SfxName, number>,
  );

  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);

  // Auto-save (skip in demo preview so it can't clobber a real save).
  useEffect(() => {
    if (isDemo()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* non-fatal */
    }
  }, [history]);

  // Timer tick: drive `now` while running; buzz + clear at zero.
  useEffect(() => {
    if (timerEndsAt == null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= timerEndsAt) {
        setTimerEndsAt(null);
        playSfx("buzzer");
      }
    }, 200);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  // --- Host sync: broadcast snapshots + presence ---------------------------------------------
  const snapshotRef = useRef({ state: history.present, buzzersArmed, scoresVisible });
  snapshotRef.current = { state: history.present, buzzersArmed, scoresVisible };

  useEffect(() => {
    if (!room) return;
    const s = joinRoom(room, "host");
    const onConnect = () => {
      setConnected(true);
      emitSync(room, snapshotRef.current); // bring any waiting display up to date
    };
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("presence", setPresence);
    setConnected(s.connected);
    if (s.connected) emitSync(room, snapshotRef.current);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("presence", setPresence);
    };
  }, [room]);

  // Broadcast whenever game state or a display flag changes.
  useEffect(() => {
    if (room) emitSync(room, { state: history.present, buzzersArmed, scoresVisible });
  }, [room, history.present, buzzersArmed, scoresVisible]);

  const dispatch = useCallback((action: Action) => {
    setHistory((h) => engineDispatch(h, action));
  }, []);

  const announce = useCallback(
    (a: Omit<Announcement, "nonce">) => {
      nonceRef.current += 1;
      const full = { ...a, nonce: nonceRef.current };
      setAnnouncement(full);
      if (room) emitPulse(room, { kind: "announce", announcement: full });
    },
    [room],
  );

  const sfx = useCallback(
    (name: SfxName, variant?: number) => {
      const v = variant ?? sfxVariant[name] ?? 0;
      playSfx(name, v);
      if (room) emitPulse(room, { kind: "sfx", name, variant: v });
    },
    [room, sfxVariant],
  );

  const setSfxVariant = useCallback((name: SfxName, variant: number) => {
    setSfxVariantState((s) => ({ ...s, [name]: variant }));
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      setTimerEndsAt(Date.now() + seconds * 1000);
      if (room) emitPulse(room, { kind: "timer-start", seconds });
    },
    [room],
  );

  const stopTimer = useCallback(() => {
    setTimerEndsAt(null);
    if (room) emitPulse(room, { kind: "timer-stop" });
  }, [room]);

  const timerRemaining =
    timerEndsAt == null ? null : Math.max(0, Math.ceil((timerEndsAt - now) / 1000));

  const value = useMemo<GameStore>(
    () => ({
      state: history.present,
      dispatch,
      undo: () => setHistory((h) => engineUndo(h)),
      redo: () => setHistory((h) => engineRedo(h)),
      canUndo: engineCanUndo(history),
      canRedo: engineCanRedo(history),
      announcement,
      announce,
      clearAnnouncement: () => setAnnouncement(null),
      sfx,
      sfxVariant,
      setSfxVariant,
      timerRemaining,
      startTimer,
      stopTimer,
      buzzersArmed,
      setBuzzersArmed,
      scoresVisible,
      setScoresVisible,
      newGame: (teams, questions) => {
        setHistory(initHistory(createGame({ teams, questions: questions ?? SAMPLE_QUESTIONS })));
        setBuzzersArmed(false);
        setTimerEndsAt(null);
      },
      startNewGame: (teams, questions) => {
        setHistory(
          engineDispatch(initHistory(createGame({ teams, questions: questions ?? SAMPLE_QUESTIONS })), {
            type: "START_GAME",
          }),
        );
        setBuzzersArmed(false);
        setTimerEndsAt(null);
      },
      connection: { connected, presence, room: room ?? null, role: room ? "host" : null },
    }),
    [
      history,
      dispatch,
      announce,
      announcement,
      sfx,
      sfxVariant,
      setSfxVariant,
      startTimer,
      stopTimer,
      timerRemaining,
      buzzersArmed,
      scoresVisible,
      connected,
      presence,
      room,
    ],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): GameStore {
  const v = useContext(GameCtx);
  if (!v) throw new Error("useGame must be used within a game provider");
  return v;
}

export { getSocket };
