import { useEffect, useRef, useState } from "react";
import { useCodenames } from "./useCodenames";
import { useRexHost, RexBanner } from "../host/RexHost";
import { CodenamesBoard } from "./CodenamesBoard";
import { Logo } from "../display/Logo";
import { QR, HostQR } from "../net/pairing";
import { codenamesJoinUrl, controllerUrl } from "../net/room";
import { getBrand } from "../brand/theme";
import { AvatarBadge } from "../net/avatars";
import type { CnState, CnTeam } from "../net/codenames";
import { useBackdrop } from "../display/gameArt";
import { BACKDROPS, BEATS, PROPS, AGENTS, artUrl, glow } from "./art";

// Display (TV) for "Cover Ops". Public board only — the secret key never reaches this screen.
export function CodenamesDisplay({ room }: { room: string }) {
  const { state } = useCodenames(room, "display");
  const label = getBrand().games.codenames?.label ?? "Cover Ops";

  // Rex, the AI host, reacts to Cover Ops beats (display only — one voice per room). No announce feed
  // here, so Rex is driven off real state transitions and deduped via refs so each moment fires once,
  // never every render: game start, each new clue (keyed on word+team), and the winner at game over.
  const { line, say } = useRexHost(room, "Cover Ops");
  const rex = useRef({ started: false, lastClue: "", ended: false });
  useEffect(() => {
    if (!state) return;
    const st = rex.current;
    // Rematch in the same room returns to the lobby; clear the dedupe so the next game re-greets
    // (the ref persists across games, otherwise `started`/`ended` would block a second run).
    if (state.phase === "lobby") {
      st.started = false;
      st.lastClue = "";
      st.ended = false;
      return;
    }
    if (state.phase === "playing" && !st.started) {
      st.started = true;
      say("start");
    }
    if (state.clue) {
      const key = `${state.clue.team}:${state.clue.word}`;
      if (key !== st.lastClue) {
        st.lastClue = key;
        say("clue", { clue: state.clue.word, team: state.clue.team === "red" ? "Red" : "Blue" });
      }
    }
    if (state.phase === "ended" && !st.ended) {
      st.ended = true;
      say("winner", { name: state.winner === "red" ? "Red" : "Blue" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.clue?.word, state?.clue?.team, state?.winner]);

  // useBackdrop is a HOOK, so it must run on EVERY render -- including the early return below
  // when state is still null. Placing it after that guard changed the hook count between
  // renders and React threw "Rendered more hooks than during the previous render".
  // Backdrop art keyed to the phase. Falls back to the .ff-backdrop gradient until the file exists.
  const phase = state?.phase === "ended" ? "ended" : state?.phase === "playing" ? "playing" : "lobby";
  const bg = useBackdrop("coverops", BACKDROPS[phase]);

  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;


  if (state.phase === "lobby") {
    return (
      <Center bg={bg}>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label}</div>
        <p className="mt-1 text-lg text-muted">Scan to join, pick a team, then the host starts.</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center">
            <QR text={codenamesJoinUrl(room)} size={200} />
            <div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div>
          </div>
          <Roster state={state} />
        </div>
        <div className="mt-5 flex items-end justify-center gap-3 opacity-90">
          {[AGENTS.salute, AGENTS.mugshot, AGENTS.sloth].map((a) => (
            <img key={a} src={artUrl(a)} alt="" aria-hidden className="h-24 w-auto rounded-md" />
          ))}
        </div>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Agents on file</p>
        <HostQR room={room} game="codenames" />
      </Center>
    );
  }

  return (
    <div style={bg} className="ff-backdrop relative flex h-full w-full flex-col items-center gap-3 overflow-hidden p-4 text-ink">
      {/* John reacts to the moment, bottom-right, behind the board. */}
      <BeatCard state={state} />
      {/* Top bar: turn + clue + counts */}
      <div className="flex w-full max-w-4xl items-center justify-between gap-3">
        <TeamCount label="Red" n={state.counts.red} color="#d64550" active={state.turn === "red"} />
        <img src={artUrl(PROPS.badge)} alt="" aria-hidden className="h-10 w-auto shrink-0"
             style={{ filter: glow("#8b5cf6", 12) }} title="Spymaster" />
        <div className="flex-1 text-center">
          {state.phase === "ended" ? (
            <div className="ff-title text-3xl" style={{ color: state.winner === "red" ? "#d64550" : "#3b7dd8" }}>
              {state.winner === "red" ? "Red" : "Blue"} wins! 🎉
            </div>
          ) : state.clue ? (
            <div>
              <div className="ff-title text-4xl" style={{ color: state.clue.team === "red" ? "#d64550" : "#3b7dd8" }}>
                {state.clue.word.toUpperCase()} · {state.clue.count}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-muted">
                <span className="relative inline-grid h-7 w-7 place-items-center">
                  <img src={artUrl(PROPS.chip)} alt="" aria-hidden className="absolute inset-0 h-full w-full"
                       style={{ filter: glow("#ec4899", 10) }} />
                  <span className="relative text-xs font-extrabold text-ink">{state.clue.remaining}</span>
                </span>
                guess{state.clue.remaining === 1 ? "" : "es"} left
              </div>
            </div>
          ) : (
            <div className="ff-title text-3xl" style={{ color: state.turn === "red" ? "#d64550" : "#3b7dd8" }}>
              {state.turn === "red" ? "Red" : "Blue"} spymaster is thinking…
            </div>
          )}
        </div>
        <img src={artUrl(PROPS.token)} alt="" aria-hidden className="h-10 w-auto shrink-0"
             style={{ filter: glow(state.turn === "red" ? "#d64550" : "#3b7dd8", 12) }} title="Turn marker" />
        <TeamCount label="Blue" n={state.counts.blue} color="#3b7dd8" active={state.turn === "blue"} />
      </div>

      <div className="w-full max-w-3xl">
        <CodenamesBoard cards={state.board} />
      </div>

      {state.log.length > 0 && (
        <div className="max-w-3xl text-center text-sm text-muted">{state.log[state.log.length - 1]}</div>
      )}

      <RexBanner line={line} />
    </div>
  );
}

function TeamCount({ label, n, color, active }: { label: string; n: number; color: string; active: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-2 text-center ${active ? "ring-2" : ""}`} style={{ background: `${color}22`, boxShadow: active ? `0 0 0 2px ${color}` : "none" }}>
      <div className="ff-title text-4xl tabular-nums" style={{ color }}>{n}</div>
      <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</div>
    </div>
  );
}

function Roster({ state }: { state: CnState }) {
  const by = (team: CnTeam, role: string) => state.players.filter((p) => p.team === team && p.role === role);
  return (
    <div className="grid grid-cols-2 gap-4 text-left">
      {(["red", "blue"] as CnTeam[]).map((team) => {
        const sm = by(team, "spymaster")[0];
        const agents = by(team, "operative");
        return (
          <div key={team} className="rounded-xl border border-line p-3" style={{ minWidth: 140 }}>
            <div className="ff-title text-xl" style={{ color: team === "red" ? "#d64550" : "#3b7dd8" }}>{team === "red" ? "Red" : "Blue"}</div>
            <div className="mt-1 flex items-center gap-1 text-sm">
              <b>Spymaster:</b>{" "}
              {sm ? (
                <span className="inline-flex items-center gap-1"><AvatarBadge avatar={sm.avatar} name={sm.name} size={20} />{sm.name}</span>
              ) : "—"}
            </div>
            <div className="text-sm">
              <b>Agents:</b>{" "}
              {agents.length ? (
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
                  {agents.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1"><AvatarBadge avatar={p.avatar} name={p.name} size={20} />{p.name}</span>
                  ))}
                </span>
              ) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Center({ children, bg }: { children: React.ReactNode; bg?: React.CSSProperties }) {
  return <div style={bg} className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}

// John's reaction card.
//
// The first version keyed off `state.clue`, which is null between turns -- most of the game -- so
// five of the six beats were effectively unreachable. It also read `state.assassinHit`, a field
// that does not exist on CnState; the front end was not in the typecheck's build graph, so nothing
// said so. Both were found by watching a real game rather than by any test.
//
// This version reacts to TRANSITIONS: which card just flipped, and whose turn it was when it did.
// A beat shows for a few seconds and clears, the way a reaction card should, and the ending is
// derived from the board (every colour is public once the game ends) rather than an invented field.
const BEAT_MS = 4500;

function BeatCard({ state }: { state: CnState }) {
  const [beat, setBeat] = useState<string | null>(null);
  const seen = useRef<{ revealed: Set<number>; phase: string; clue: string; team: CnTeam | null }>({
    revealed: new Set(), phase: "lobby", clue: "", team: null,
  });

  useEffect(() => {
    const st = seen.current;
    // Remember the guessing team while a clue is live: after the last guess the clue is cleared and
    // the turn has already flipped, so by then it is too late to ask who was guessing.
    if (state.clue) st.team = state.clue.team;

    if (state.phase === "lobby") {
      st.revealed = new Set(); st.phase = "lobby"; st.clue = ""; st.team = null;
      setBeat(null);
      return;
    }

    if (state.phase === "ended" && st.phase !== "ended") {
      st.phase = "ended";
      const assassin = state.board.some((c) => c.revealed && c.color === "assassin");
      setBeat(assassin ? BEATS.caught : BEATS.getaway);   // stays up; the game is over
      return;
    }
    if (state.phase === "ended") return;
    st.phase = state.phase;

    const flipped = state.board.find((c) => c.revealed && !st.revealed.has(c.i));
    if (flipped) {
      for (const c of state.board) if (c.revealed) st.revealed.add(c.i);
      if (flipped.color === "assassin") setBeat(BEATS.caught);
      else if (flipped.color === "neutral") setBeat(BEATS.disaster);
      else if (st.team && flipped.color === st.team) setBeat(BEATS.win);
      else setBeat(BEATS.shock);
      return;
    }

    const clueKey = state.clue ? `${state.clue.team}:${state.clue.word}:${state.clue.count}` : "";
    if (clueKey && clueKey !== st.clue) { st.clue = clueKey; setBeat(BEATS.clue); }
  }, [state]);

  // Clear after a beat, so John reacts and then gets out of the way.
  useEffect(() => {
    if (!beat || state.phase === "ended") return;
    const t = setTimeout(() => setBeat(null), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat, state.phase]);

  if (!beat) return null;
  return (
    <img
      src={artUrl(beat)}
      alt=""
      aria-hidden
      className="pointer-events-none absolute bottom-0 right-0 h-2/5 w-auto opacity-25"
      style={{ maskImage: "linear-gradient(to left, #000 40%, transparent)", WebkitMaskImage: "linear-gradient(to left, #000 40%, transparent)" }}
    />
  );
}
