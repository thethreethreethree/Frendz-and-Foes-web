import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { currentQuestion } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { useRexHost, RexBanner } from "../host/RexHost";
import { Logo } from "./Logo";
import { FloatingAccents } from "./Icons";
import { MusicPlayer } from "../music/MusicPlayer";
import { AnswerBoard } from "./AnswerBoard";
import { Scoreboard } from "./Scoreboard";
import { Participants } from "./Participants";
import { Announcement } from "./Announcement";
import { useBackdrop } from "./gameArt";
import { BACKDROPS, BEATS, PROPS, STAGE_ALT, artUrl, glow } from "./feudArt";

export function DisplayView() {
  const { state, timerRemaining, buzzersArmed, scoresVisible, connection } = useGame();
  const question = currentQuestion(state);

  // Backdrop art keyed to the phase. Falls back to the .ff-backdrop gradient until a file exists.
  const phase = state.phase === "finished" ? "finished" : state.phase === "playing" ? "playing" : "setup";
  const bg = useBackdrop("feud", BACKDROPS[phase]);

  // Rex, the AI host, reacts to Feud moments (display only — one voice per room).
  const { line, say } = useRexHost(connection.room, "Survey Showdown");
  const rex = useRef({ introduced: false, announced: new Set<string>(), won: false });
  useEffect(() => {
    const st = rex.current;
    // Back at the lobby (new game / rematch in the same room): reset so Rex re-intros.
    if (state.phase === "setup") {
      rex.current = { introduced: false, announced: new Set<string>(), won: false };
      return;
    }
    if (state.phase === "playing" && !st.introduced) {
      st.introduced = true;
      say("intro");
    }
    // React the first time each answer flips to revealed on the current question.
    if (state.phase === "playing" && question) {
      for (const a of question.answers) {
        if (a.revealed && !st.announced.has(a.id)) {
          st.announced.add(a.id);
          const team = a.awardedTeamId
            ? state.teams.find((t) => t.id === a.awardedTeamId)
            : null;
          say("reveal", { answer: a.text, team: team?.name });
        }
      }
    }
    if (state.phase === "finished" && !st.won) {
      st.won = true;
      const w = [...state.teams].sort((a, b) => b.score - a.score)[0];
      if (w) say("winner", { name: w.name, score: w.score });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentQuestionIndex, question, say]);

  return (
    <div style={bg} className="ff-backdrop relative flex h-full w-full flex-col overflow-hidden p-6">
      <FeudBeat state={state} />
      <Announcement />
      <MusicPlayer />

      {/* Top bar */}
      <header className="flex items-center justify-between">
        <Logo className="text-4xl" />
        <div className="flex items-center gap-3">
          {timerRemaining != null && (
            <img src={artUrl(PROPS.clock)} alt="" aria-hidden className="h-12 w-auto"
                 style={{ filter: glow(timerRemaining <= 3 ? "#ec4899" : "#f59e0b", 12) }} />
          )}
          {timerRemaining != null && (
            <div
              className={`ff-sticker grid h-14 w-14 place-items-center font-display text-4xl ${
                timerRemaining <= 3 ? "bg-pink text-white" : "bg-surface text-ink"
              }`}
            >
              {timerRemaining}
            </div>
          )}
          {state.phase === "playing" && question && (
            <div className="ff-sticker bg-surface px-4 py-1.5 font-display text-2xl tracking-wide text-ink">
              {question.kind === "bonus" ? "BONUS ROUND" : "QUESTION"}
            </div>
          )}
        </div>
      </header>

      {buzzersArmed && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2">
          <div className="ff-sticker animate-pop flex items-center gap-3 bg-buzz-green px-8 py-2 font-display text-4xl tracking-widest text-white">
            <img src={artUrl(PROPS.buzzer)} alt="" aria-hidden className="h-10 w-auto"
                 style={{ filter: glow("#ffffff", 10) }} />
            BUZZERS LIVE
          </div>
        </div>
      )}

      <Strikes state={state} />

      {state.phase === "setup" && <FloatingAccents />}

      {/* Center stage */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
        {state.phase === "setup" && <TitleScene />}

        {state.phase === "playing" && question && (
          <>
            <motion.h1
              key={question.id}
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="ff-sticker max-w-5xl bg-surface px-6 py-4 text-center text-3xl font-extrabold text-ink"
            >
              {question.prompt}
            </motion.h1>
            <Participants state={state} />
            <AnswerBoard state={state} question={question} />
          </>
        )}

        {state.phase === "finished" && <WinnerScene />}
      </main>

      {/* Bottom scoreboard (host can hide it) */}
      {scoresVisible && (
        <footer className="pt-2">
          <Scoreboard state={state} />
        </footer>
      )}

      <RexBanner line={line} />
    </div>
  );
}

function TitleScene() {
  return (
    <div className="flex animate-floaty flex-col items-center text-center">
      <Logo className="text-7xl md:text-8xl" />
      <p className="mt-4 font-display text-4xl tracking-wide text-ink/80">GET READY!</p>
    </div>
  );
}

function WinnerScene() {
  const { state } = useGame();
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  return (
    <div className="relative text-center">
      {/* The fourth stage plate. Its board is already lit and off-centre so nothing can be rendered
          into it -- which makes it useless as a playing backdrop and ideal here, behind a result
          that needs no board at all. */}
      <img src={artUrl(STAGE_ALT)} alt="" aria-hidden
           className="pointer-events-none absolute inset-x-0 -top-8 mx-auto w-[36rem] max-w-full rounded-2xl opacity-20" />
      <div className="ff-title relative text-5xl text-grape">CHAMPIONS</div>
      {winner && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="ff-sticker mx-auto mt-6 inline-flex items-center gap-4 bg-surface px-10 py-6"
        >
          <span
            className="h-10 w-10 rounded-full border-4 border-ink"
            style={{ backgroundColor: winner.color ?? "#999" }}
          />
          <span className="text-5xl font-black text-ink">{winner.name}</span>
          <span className="font-display text-6xl text-pink">{winner.score}</span>
        </motion.div>
      )}
    </div>
  );
}

// Duke reacts to the moment. Driven off TRANSITIONS in real state rather than an event feed, so it
// cannot drift out of step with the board: a newly revealed answer that scored is a win, a strike
// is a strike, and the end of the game is the win or the loss. Shows for a few seconds and clears,
// the way a reaction card should. Sits behind the board at low opacity so it never fights the words.
const BEAT_MS = 4500;

function FeudBeat({ state }: { state: ReturnType<typeof useGame>["state"] }) {
  const [beat, setBeat] = useState<string | null>(null);
  const seen = useRef({ strikes: 0, revealed: 0, fills: 0, phase: "" as string });

  useEffect(() => {
    const st = seen.current;
    const q = currentQuestion(state);
    const revealed = q ? q.answers.filter((a) => a.revealed).length : 0;
    // `misses` on a REGULAR turn is this game's strike count -- there is no `strikes` field, and
    // the bonus round has no misses at all. Invented that field first; the typecheck caught it,
    // which is precisely why the front end is now in `npm run typecheck`.
    const strikes = state.turn && state.turn.kind === "regular" ? state.turn.misses : 0;

    if (state.phase === "setup") {
      seen.current = { strikes: 0, revealed: 0, fills: 0, phase: "setup" };
      setBeat(null);
      return;
    }
    if (state.phase === "finished" && st.phase !== "finished") {
      st.phase = "finished";
      setBeat(BEATS.win);
      return;
    }
    if (state.phase === "finished") return;

    if (st.phase !== "playing") { st.phase = "playing"; setBeat(BEATS.start); return; }
    // A first miss is a wince; a second is a full strike; a third ends the round.
    if (strikes > st.strikes) {
      st.strikes = strikes;
      setBeat(strikes >= 3 ? BEATS.lost : strikes === 1 ? BEATS.facepalm : BEATS.strike);
      return;
    }
    // The steal: once the misses are spent, a random team fills the board instead. That resolution
    // is this engine's steal, and it is exactly the moment Duke's coins-raining reaction belongs to.
    const fills = state.turn && state.turn.kind === "regular" ? state.turn.randomFillsResolved : 0;
    if (fills > st.fills) { st.fills = fills; setBeat(BEATS.steal); return; }
    if (revealed > st.revealed) { st.revealed = revealed; setBeat(BEATS.win); return; }
    if (revealed < st.revealed) { st.revealed = revealed; }        // new question, reset
  }, [state]);

  useEffect(() => {
    if (!beat || state.phase === "finished") return;
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

// One X per miss. `misses` on a regular turn IS this game's strike count; the bonus round has none,
// so nothing is drawn there. The token marks that someone is still on the clock to answer.
function Strikes({ state }: { state: ReturnType<typeof useGame>["state"] }) {
  if (state.phase !== "playing" || !state.turn || state.turn.kind !== "regular") return null;
  const misses = state.turn.misses;
  if (misses <= 0) return null;
  return (
    <div className="pointer-events-none absolute right-6 top-24 z-20 flex items-center gap-2">
      <img src={artUrl(PROPS.token)} alt="" aria-hidden className="h-9 w-auto opacity-80"
           style={{ filter: glow("#f59e0b", 8) }} title="On the clock" />
      {Array.from({ length: Math.min(misses, 3) }).map((_, i) => (
        <img key={i} src={artUrl(PROPS.strike)} alt="" aria-hidden className="h-12 w-auto"
             style={{ filter: glow("#d64550", 12) }} />
      ))}
    </div>
  );
}
