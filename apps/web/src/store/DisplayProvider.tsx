// Follower provider for the display / spectator screens. It renders whatever the host
// broadcasts and runs no engine — all mutators are no-ops. It feeds the SAME context as
// GameProvider, so every display component works unchanged.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createGame, type GameState } from "@ff/engine";
import { playSfx } from "../audio/sfx";
import { joinRoom, type Presence, type Pulse, type Role, type Snapshot } from "../net/socket";
import { GameCtx, type Announcement, type GameStore } from "./gameStore";

const PLACEHOLDER: GameState = createGame({ teams: [], questions: [] });
const noop = () => {};

export function DisplayProvider({
  children,
  room,
  role = "display",
}: {
  children: ReactNode;
  room: string;
  role?: Role;
}) {
  const [state, setState] = useState<GameState>(PLACEHOLDER);
  const [buzzersArmed, setBuzzersArmed] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = joinRoom(room, role);
    const onSync = (snap: Snapshot) => {
      setState(snap.state);
      setBuzzersArmed(snap.buzzersArmed);
    };
    const onPulse = (p: Pulse) => {
      switch (p.kind) {
        case "sfx":
          playSfx(p.name);
          break;
        case "announce":
          setAnnouncement(p.announcement);
          if (announceTimer.current) clearTimeout(announceTimer.current);
          if (p.announcement.ttl)
            announceTimer.current = setTimeout(() => setAnnouncement(null), p.announcement.ttl);
          break;
        case "timer-start":
          setTimerEndsAt(Date.now() + p.seconds * 1000);
          break;
        case "timer-stop":
          setTimerEndsAt(null);
          break;
      }
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

  // Local countdown, decoupled from the host's clock (starts from the timer-start pulse).
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

  const timerRemaining =
    timerEndsAt == null ? null : Math.max(0, Math.ceil((timerEndsAt - now) / 1000));

  const value = useMemo<GameStore>(
    () => ({
      state,
      dispatch: noop,
      undo: noop,
      redo: noop,
      canUndo: false,
      canRedo: false,
      announcement,
      announce: noop,
      clearAnnouncement: () => setAnnouncement(null),
      sfx: playSfx,
      timerRemaining,
      startTimer: noop,
      stopTimer: noop,
      buzzersArmed,
      setBuzzersArmed: noop,
      newGame: noop,
      startNewGame: noop,
      connection: { connected, presence, room, role },
    }),
    [state, announcement, timerRemaining, buzzersArmed, connected, presence, room, role],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
