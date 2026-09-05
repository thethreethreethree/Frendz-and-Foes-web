import { useState } from "react";
import { currentQuestion, type Answer, type GameState, type Question } from "@ff/engine";
import { useGame } from "../store/gameStore";
import { emitIntent } from "../net/socket";
import { turnInfo } from "../control/turn";
import { QR } from "../net/pairing";
import { teamJoinUrl } from "../net/room";

// The team phone's UI. `answerer` gets the guess box + a view-only QR to share; `viewer` watches.
export function TeamView({
  room,
  teamId,
  role,
}: {
  room: string;
  teamId: string;
  role: "answerer" | "viewer";
}) {
  const { state, connection } = useGame();
  const team = state.teams.find((t) => t.id === teamId) ?? null;
  const q = currentQuestion(state);
  const info = turnInfo(state);
  const isOurTurn = info.activeTeamId === teamId;
  const hostLinked = (connection.presence?.host ?? 0) > 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-concrete/40 text-ink">
      {/* Team header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface/95 px-3 py-2 backdrop-blur">
        <span
          className="h-6 w-6 shrink-0 rounded-full border-2 border-ink"
          style={{ backgroundColor: team?.color ?? "#999" }}
        />
        <span className="min-w-0 flex-1 truncate font-display text-xl text-ink">
          {team?.name ?? "Your team"}
        </span>
        {team && <span className="font-display text-2xl text-pink">{team.score}</span>}
        <span
          className={`h-2.5 w-2.5 rounded-full ${hostLinked ? "bg-buzz-green" : "bg-tang"}`}
          title={hostLinked ? "Host linked" : "Waiting for host"}
        />
      </div>

      <div className="flex flex-col gap-3 p-3">
        {/* Turn banner */}
        <div
          className={`rounded-lg px-3 py-2 text-center text-sm font-black ${
            isOurTurn ? "bg-buzz-green text-white" : "bg-sun/70 text-canvas"
          }`}
        >
          {state.phase === "playing"
            ? isOurTurn
              ? "★ YOUR TEAM — answer now!"
              : info.label
            : state.phase === "finished"
              ? "Game over"
              : "Waiting for the host to start…"}
        </div>

        {state.phase === "playing" && q && <Board question={q} state={state} />}

        {state.phase === "finished" && <Results state={state} teamId={teamId} />}

        {role === "answerer" && state.phase === "playing" && (
          <AnswerBox teamId={teamId} disabled={!hostLinked} />
        )}

        {role === "answerer" && <ShareViewOnly room={room} teamId={teamId} />}

        {role === "viewer" && (
          <div className="rounded-lg border-2 border-dashed border-ink/15 px-3 py-2 text-center text-xs font-bold text-ink/50">
            👀 Watching only — your team's answerer submits the guesses.
          </div>
        )}
      </div>
    </div>
  );
}

// Compact phone board: one row per answer, covered until the host reveals it.
function Board({ question, state }: { question: Question; state: GameState }) {
  const teamById = (id: string | null) => (id ? state.teams.find((t) => t.id === id) ?? null : null);
  return (
    <div className="rounded-xl border border-line bg-surface/70 p-2">
      <div className="mb-2 rounded-lg bg-ink px-3 py-2 text-center text-sm font-extrabold text-canvas">
        {question.prompt}
      </div>
      <ul className="space-y-1.5">
        {question.answers.map((a: Answer, i: number) => {
          const points = question.kind === "bonus" ? state.config.bonusFlatPoints : a.rankPoints;
          const team = teamById(a.awardedTeamId ?? null);
          const accent = team?.color ?? "rgb(var(--c-primary))";
          return (
            <li
              key={a.id}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                a.revealed ? "bg-surface text-ink" : "bg-ink/90 text-concrete"
              }`}
              style={a.revealed ? { boxShadow: `inset 4px 0 0 ${accent}` } : undefined}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-base"
                style={
                  a.revealed
                    ? { backgroundColor: accent, color: "#fff" }
                    : { background: "rgba(255,255,255,.2)" }
                }
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">
                {a.revealed ? a.text : "• • •"}
              </span>
              {a.revealed && (
                <span
                  className="grid h-6 min-w-6 place-items-center rounded px-1.5 font-display text-base text-white"
                  style={{ backgroundColor: accent }}
                >
                  {points}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Answerer's guess input. The guess is an `intent` the host judges — nothing is scored client-side.
function AnswerBox({ teamId, disabled }: { teamId: string; disabled: boolean }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    emitIntent({ teamId, kind: "guess", text: t });
    setSent(t);
    setText("");
    window.setTimeout(() => setSent((s) => (s === t ? null : s)), 2500);
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-pop">
      <div className="mb-1 text-[10px] font-black uppercase text-ink/50">Your team's answer</div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={120}
          placeholder="Type your guess…"
          className="min-w-0 flex-1 rounded-lg border-2 border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-teal"
        />
        <button
          onClick={send}
          disabled={disabled || !text.trim()}
          className="ff-sticker bg-pink px-4 py-2 font-display text-lg text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {sent && <div className="mt-1.5 text-xs font-bold text-buzz-green">Sent “{sent}” to the host ✓</div>}
      {disabled && <div className="mt-1.5 text-xs font-bold text-tang">Waiting for the host to connect…</div>}
    </div>
  );
}

// The requested feature: the answerer shows a QR that teammates scan for a watch-only board.
function ShareViewOnly({ room, teamId }: { room: string; teamId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface/70 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border-2 border-line bg-surface px-3 py-2 text-sm font-bold text-ink"
      >
        {open ? "▾ Hide team QR" : "▸ Share a view-only screen with your team"}
      </button>
      {open && (
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          <QR text={teamJoinUrl(room, teamId, "viewer")} size={190} />
          <p className="text-xs font-bold text-ink/60">
            Teammates scan this to watch the board on their own phones. View-only — only this phone
            answers.
          </p>
        </div>
      )}
    </div>
  );
}

function Results({ state, teamId }: { state: GameState; teamId: string }) {
  const ranked = [...state.teams].sort((a, b) => b.score - a.score);
  const ourRank = ranked.findIndex((t) => t.id === teamId) + 1;
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-center shadow-pop">
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
            <span className="font-display text-xl text-pink">{t.score}</span>
          </li>
        ))}
      </ol>
      {ourRank === 1 && <div className="mt-3 font-display text-2xl text-buzz-green">🏆 Your team won!</div>}
    </div>
  );
}
