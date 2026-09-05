import { useState } from "react";
import {
  TRIVIA_DECKS,
  TRIVIA_LETTERS,
  TRIVIA_ROUNDS,
  triviaQuestionInRound,
  type TriviaLetter,
  type TriviaState,
} from "@ff/engine";
import { TriviaFollowerProvider, useTrivia } from "../store/triviaStore";
import { emitIntent } from "../net/socket";
import { QR } from "../net/pairing";
import { triviaTeamJoinUrl } from "../net/room";
import { TRIVIA_BG_PLAYER, TRIVIA_CHAMPIONS, letterTile, roundBadge } from "./assets";

// A Trivia player's phone. Team mode: `answerer` taps A/B/C/D (locked in, sent to the host) and can
// share a view-only QR to teammates; `viewer` just watches. View mode: `spectator`, watch-only.
export function TriviaPlayer({
  room,
  teamId,
  role,
}: {
  room: string;
  teamId?: string;
  role: "answerer" | "viewer" | "spectator";
}) {
  return (
    <TriviaFollowerProvider room={room} role={role} teamId={teamId}>
      <TriviaPlayerView room={room} teamId={teamId} role={role} />
    </TriviaFollowerProvider>
  );
}

function TriviaPlayerView({
  room,
  teamId,
  role,
}: {
  room: string;
  teamId?: string;
  role: "answerer" | "viewer" | "spectator";
}) {
  const { trivia, connection } = useTrivia();
  const [localPicks, setLocalPicks] = useState<Record<string, TriviaLetter>>({});
  const hostLinked = (connection.presence?.host ?? 0) > 0;
  const team = teamId ? trivia.teams.find((t) => t.id === teamId) ?? null : null;
  const deck = TRIVIA_DECKS[trivia.version];
  const q = deck[trivia.currentIndex] ?? null;
  const revealed = q ? trivia.revealedQuestions.includes(q.id) : false;
  const canAnswer = role === "answerer" && trivia.phase === "playing";

  const broadcastPick = q && teamId ? trivia.answers[teamId]?.[q.id] : undefined;
  const picked = q ? localPicks[q.id] ?? broadcastPick : undefined;

  const choose = (letter: TriviaLetter) => {
    if (!canAnswer || !q || !teamId) return;
    setLocalPicks((m) => ({ ...m, [q.id]: letter }));
    emitIntent({ teamId, kind: "trivia-answer", questionId: q.id, letter });
  };

  return (
    <div
      className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto text-ink"
      style={{
        backgroundColor: "#0b0f1a",
        backgroundImage: `url(${TRIVIA_BG_PLAYER})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Floating header — the background art already carries the title. */}
      <div className="flex items-center gap-2 px-3 py-2">
        {team && (
          <div className="flex items-center gap-2 rounded-full bg-surface/90 px-2.5 py-1 shadow-pop backdrop-blur">
            <span className="h-5 w-5 rounded-full border-2 border-ink" style={{ backgroundColor: team.color ?? "#999" }} />
            <span className="max-w-[8rem] truncate font-display text-sm text-ink">{team.name}</span>
            <span className="font-display text-lg text-grape">{team.score}</span>
          </div>
        )}
        <span
          className={`ml-auto h-3 w-3 rounded-full ring-2 ring-white ${hostLinked ? "bg-buzz-green" : "bg-tang"}`}
          title={hostLinked ? "Host linked" : "Waiting for host"}
        />
      </div>

      <div className="flex flex-col gap-3 p-3">
        {trivia.phase === "setup" && (
          <div className="rounded-lg bg-surface px-3 py-6 text-center text-sm font-black text-ink">
            Waiting for the host to start…
          </div>
        )}

        {(trivia.phase === "playing" || trivia.phase === "reveal") && q && (
          <>
            <div className="flex items-center justify-between text-xs font-black uppercase text-ink/50">
              <span className="flex items-center gap-1.5">
                <img src={roundBadge(q.round)} alt="" className="h-7 w-7 object-contain" />
                {trivia.phase === "reveal" ? "Reveal · " : ""}
                {TRIVIA_ROUNDS[q.round]?.label} · Q{triviaQuestionInRound(trivia.currentIndex)}/10
              </span>
              {revealed && <span className="text-buzz-green">Answer revealed</span>}
            </div>

            <div className="rounded-xl bg-grape px-4 py-4 text-center text-lg font-extrabold text-white shadow-pop">
              {q.prompt}
            </div>

            <div className="flex flex-col gap-2">
              {TRIVIA_LETTERS.map((letter, i) => {
                const isPicked = picked === letter;
                const isCorrect = revealed && q.correct === letter;
                const isWrongPick = revealed && isPicked && q.correct !== letter;
                return (
                  <button
                    key={letter}
                    onClick={() => choose(letter)}
                    disabled={!canAnswer}
                    className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                      isCorrect
                        ? "border-buzz-green bg-buzz-green/15"
                        : isWrongPick
                          ? "border-tang bg-tang/15"
                          : isPicked
                            ? "border-ink bg-surface"
                            : "border-ink/10 bg-surface/85"
                    } ${canAnswer ? "active:translate-y-0.5" : "cursor-default"}`}
                  >
                    <img src={letterTile(letter)} alt={letter} className="h-11 w-11 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1 font-bold">{q.choices[i]}</span>
                    {isCorrect && <span className="font-display text-lg text-buzz-green">✓</span>}
                    {isWrongPick && <span className="font-display text-lg text-tang">✕</span>}
                  </button>
                );
              })}
            </div>

            {role === "answerer" && (
              <div className="text-center text-xs font-bold text-ink/50">
                {trivia.phase === "reveal"
                  ? revealed
                    ? picked === q.correct
                      ? "✓ Correct! +1 this question."
                      : `Correct answer: ${q.correct}.${picked ? " Not this time." : " No answer locked."}`
                    : "Reveal in progress — watch along."
                  : picked
                    ? `Locked in ${picked} — tap another to change.`
                    : hostLinked
                      ? "Tap your team's answer."
                      : "Waiting for the host to connect…"}
              </div>
            )}
            {role !== "answerer" && (
              <div className="rounded-lg border-2 border-dashed border-ink/15 px-3 py-2 text-center text-xs font-bold text-ink/50">
                👀 Watching only — {team ? "your team's answerer locks the answer." : "answer on paper with your group."}
              </div>
            )}
          </>
        )}

        {trivia.phase === "finished" && <Results trivia={trivia} teamId={teamId} />}

        {role === "answerer" && teamId && <ShareViewOnly room={room} teamId={teamId} />}
      </div>
    </div>
  );
}

function ShareViewOnly({ room, teamId }: { room: string; teamId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-surface/70 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border-2 border-ink/15 bg-surface px-3 py-2 text-sm font-bold text-ink"
      >
        {open ? "▾ Hide team QR" : "▸ Share a view-only screen with your team"}
      </button>
      {open && (
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          <QR text={triviaTeamJoinUrl(room, teamId, "viewer")} size={190} />
          <p className="text-xs font-bold text-ink/60">
            Teammates scan this to watch the questions. View-only — only this phone answers.
          </p>
        </div>
      )}
    </div>
  );
}

function Results({ trivia, teamId }: { trivia: TriviaState; teamId?: string }) {
  const ranked = [...trivia.teams].sort((a, b) => b.score - a.score);
  const ourRank = teamId ? ranked.findIndex((t) => t.id === teamId) + 1 : 0;
  return (
    <div className="rounded-xl bg-surface p-4 text-center shadow-pop">
      <img src={TRIVIA_CHAMPIONS} alt="" className="mx-auto -mt-2 h-24 w-24 object-contain" />
      <div className="ff-title text-3xl text-grape">FINAL</div>
      <ol className="mt-3 space-y-1.5 text-left">
        {ranked.map((t, i) => (
          <li
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              t.id === teamId ? "bg-sun/40 ring-2 ring-sun" : "bg-ink/5"
            }`}
          >
            <span className="w-5 font-display text-lg text-ink/50">{i + 1}</span>
            <span className="h-4 w-4 rounded-full border border-ink" style={{ backgroundColor: t.color ?? "#999" }} />
            <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
            <span className="font-display text-xl text-grape">{t.score}</span>
          </li>
        ))}
      </ol>
      {ourRank === 1 && <div className="mt-3 font-display text-2xl text-buzz-green">🏆 Your team won!</div>}
    </div>
  );
}
