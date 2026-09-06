import { useEffect, useRef } from "react";
import { useJustOne } from "./useJustOne";
import { useRexHost, RexBanner } from "../host/RexHost";
import { Logo } from "../display/Logo";
import { QR } from "../net/pairing";
import { AvatarBadge } from "../net/avatars";
import { justoneJoinUrl, controllerUrl } from "../net/room";
import { getBrand } from "../brand/theme";
import type { JoState } from "../net/justone";

// Display (TV) for "Solo Clue". Shows the secret word to the ROOM (the guesser is told to look away),
// then the surviving clues, then the result + running score. Gets the word on the private jo:word
// channel (the display is never the guesser).
export function JustOneDisplay({ room }: { room: string }) {
  const { state, word } = useJustOne(room, "display");
  const label = getBrand().games.justone?.label ?? "Solo Clue";

  // Rex, the AI host, reacts to Solo Clue moments (display only — one voice per room).
  const { line, say } = useRexHost(room, label);
  const rex = useRef({ started: false, revealRound: -1, overRound: -1, ended: false });
  useEffect(() => {
    if (!state) return;
    const st = rex.current;
    if (state.phase === "lobby") {
      // Back in the lobby (reset/rematch, same room) — clear dedupe so Rex re-intros next game.
      rex.current = { started: false, revealRound: -1, overRound: -1, ended: false };
      return;
    }
    if (state.phase !== "lobby" && !st.started) {
      st.started = true;
      say("intro");
    }
    if (state.phase === "reveal" && st.revealRound !== state.round) {
      st.revealRound = state.round;
      say("reveal");
    }
    if (state.phase === "roundover" && st.overRound !== state.round) {
      st.overRound = state.round;
      say("roundover", { got: state.lastGot ? "yes" : "no" });
    }
    if (state.phase === "ended" && !st.ended) {
      st.ended = true;
      say("ended", { score: `${state.score}/${state.totalRounds}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.round, say]);

  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;

  const guesser = state.players.find((p) => p.id === state.guesserId)?.name ?? "?";

  if (state.phase === "lobby") {
    return (
      <Center>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label}</div>
        <p className="mt-1 text-lg text-muted">Everyone scan to join. Need 3+ players.</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center">
            <QR text={justoneJoinUrl(room)} size={200} />
            <div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div>
          </div>
          <Roster state={state} />
        </div>
        <p className="mt-4 text-sm text-muted">Host: <span className="font-mono">{controllerUrl(room)}</span></p>
      </Center>
    );
  }

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden p-8 text-center text-ink">
      <div className="text-sm font-semibold uppercase tracking-widest text-muted">
        Round {state.round}/{state.totalRounds} · Score {state.score}
      </div>

      {state.phase === "writing" && (
        <>
          <div className="text-lg font-semibold text-primary">{guesser} is guessing — {guesser}, look away!</div>
          <div className="ff-title text-7xl">{word ?? "…"}</div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {state.players.filter((p) => p.id !== state.guesserId).map((p) => (
              <span key={p.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${p.submitted ? "bg-success text-white" : "bg-surface text-muted"}`} style={p.submitted ? {} : { border: "1px solid rgb(var(--c-line))" }}>
                <AvatarBadge avatar={p.avatar} name={p.name} size={20} />{p.name}{p.submitted ? " ✓" : " …"}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted">Everyone else: write ONE word. Duplicates cancel!</p>
        </>
      )}

      {state.phase === "reveal" && (
        <>
          <div className="ff-title text-4xl text-primary">{guesser}, make your guess!</div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {state.survivors.map((c, i) => (
              <span key={i} className="ff-title rounded-xl bg-surface px-4 py-2 text-3xl text-ink" style={{ border: "1px solid rgb(var(--c-line))" }}>{c.word}</span>
            ))}
          </div>
          {state.cancelled.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {state.cancelled.map((c, i) => (
                <span key={i} className="rounded-full px-3 py-1 text-lg font-semibold text-danger line-through">{c.word}</span>
              ))}
              <span className="self-center text-sm text-muted">cancelled (duplicates)</span>
            </div>
          )}
        </>
      )}

      {state.phase === "roundover" && (
        <>
          <div className="ff-title text-6xl" style={{ color: state.lastGot ? "#16a34a" : "#dc2626" }}>{state.lastGot ? "Got it! ✓" : "Missed ✗"}</div>
          <div className="text-xl">The word was <b>{state.word}</b></div>
          <div className="text-lg text-muted">Score: {state.score}/{state.round}</div>
        </>
      )}

      {state.phase === "ended" && (
        <>
          <div className="ff-title text-7xl">Final score</div>
          <div className="ff-title text-8xl text-primary">{state.score}/{state.totalRounds}</div>
        </>
      )}

      <RexBanner line={line} />
    </div>
  );
}

function Roster({ state }: { state: JoState }) {
  return (
    <div className="rounded-xl border border-line p-3 text-left" style={{ minWidth: 160 }}>
      <div className="ff-title text-xl">Players ({state.players.length})</div>
      <div className="mt-2 flex flex-col gap-1.5 text-sm">
        {state.players.length === 0 ? "—" : state.players.map((p) => (
          <span key={p.id} className="flex items-center gap-2"><AvatarBadge avatar={p.avatar} name={p.name} size={24} />{p.name}</span>
        ))}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}
