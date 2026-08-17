import { useState } from "react";
import {
  TRIVIA_DECKS,
  TRIVIA_LETTERS,
  TRIVIA_ROUNDS,
  TRIVIA_VERSION_LABELS,
  triviaQuestionInRound,
  type TriviaMode,
  type TriviaVersion,
} from "@ff/engine";
import { useTrivia } from "../store/triviaStore";
import { QR } from "../net/pairing";
import { triviaTeamJoinUrl, triviaViewJoinUrl } from "../net/room";
import { Section, CtrlButton, HomeButton } from "../control/ui";
import { letterTile, versionBadge } from "./assets";

const PALETTE = ["#ff2e9a", "#ff6b35", "#1fd1c6", "#8a4bff", "#ffd23f", "#22c55e", "#3b82f6", "#ef4444"];

// Host controller for Frendz Trivia.
export function TriviaControl() {
  const t = useTrivia();
  const { trivia } = t;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overflow-x-hidden bg-concrete/40 text-ink">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <span className="font-display text-lg text-ink">
          {trivia.phase === "playing" || trivia.phase === "reveal"
            ? `${trivia.phase === "reveal" ? "REVEAL · " : ""}${TRIVIA_ROUNDS[TRIVIA_DECKS[trivia.version][trivia.currentIndex]?.round ?? 0]?.label} · Q${triviaQuestionInRound(trivia.currentIndex)}/10`
            : `TRIVIA — ${TRIVIA_VERSION_LABELS[trivia.version].replace("Frendz Trivia ", "")}`}
        </span>
        <div className="flex items-center gap-2">
          {trivia.phase !== "setup" && (
            <button
              onClick={() => {
                if (window.confirm("Reset the game? Returns to setup — you can change the version, mode, and teams. Scores are cleared."))
                  t.reset();
              }}
              className="rounded-lg bg-tang px-2.5 py-1.5 text-xs font-bold text-white"
            >
              ↺ Reset
            </button>
          )}
          <img src={versionBadge(trivia.version)} alt={trivia.version} className="h-8 w-8 object-contain" />
          <HomeButton />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {trivia.phase === "setup" && <Setup />}
        {(trivia.phase === "playing" || trivia.phase === "reveal") && <JoinCodes />}
        {trivia.phase === "playing" && <Play />}
        {trivia.phase === "reveal" && <Reveal />}
        {trivia.phase === "finished" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-grape/10 px-3 py-2 text-center font-display text-lg">Game over — champions on screen.</div>
            <CtrlButton tone="teal" className="w-full py-3" onClick={t.reset}>
              ↺ New game (keep teams)
            </CtrlButton>
          </div>
        )}

        {trivia.phase !== "setup" && (
          <Scoreboard />
        )}
      </div>
    </div>
  );
}

function Setup() {
  const t = useTrivia();
  const { trivia } = t;
  const [teams, setTeams] = useState(() =>
    trivia.teams.length
      ? trivia.teams.map((x) => ({ id: x.id, name: x.name, color: x.color ?? "#999" }))
      : [0, 1, 2].map((i) => ({ id: crypto.randomUUID(), name: `Team ${i + 1}`, color: PALETTE[i] })),
  );

  const update = (id: string, name: string) => setTeams((ts) => ts.map((x) => (x.id === id ? { ...x, name } : x)));
  const add = () =>
    setTeams((ts) => [...ts, { id: crypto.randomUUID(), name: `Team ${ts.length + 1}`, color: PALETTE[ts.length % PALETTE.length] }]);
  const remove = (id: string) => setTeams((ts) => (ts.length > 2 ? ts.filter((x) => x.id !== id) : ts));

  const start = () => {
    if (trivia.mode === "team") t.setTeams(teams.map((x) => ({ id: x.id, name: x.name.trim() || "Team", color: x.color })));
    t.start();
  };

  return (
    <>
      <Section title="Deck version">
        <div className="grid grid-cols-3 gap-1.5">
          {(["v1", "v2", "v3"] as TriviaVersion[]).map((v) => (
            <button
              key={v}
              onClick={() => t.configure({ version: v })}
              className={`rounded-lg border-2 px-2 py-2 text-sm font-black ${
                trivia.version === v ? "border-grape bg-grape text-white" : "border-ink/15 bg-white text-ink"
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Mode">
        <div className="grid grid-cols-1 gap-1.5">
          {(
            [
              ["team", "Team mode", "One phone per team answers; teammates can view."],
              ["view", "View-all mode", "One QR for everyone — watch only, no answering."],
            ] as [TriviaMode, string, string][]
          ).map(([m, label, blurb]) => (
            <button
              key={m}
              onClick={() => t.configure({ mode: m })}
              className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-bold ${
                trivia.mode === m ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink"
              }`}
            >
              {label}
              <span className={`block text-[10px] font-semibold ${trivia.mode === m ? "text-white/70" : "text-ink/50"}`}>{blurb}</span>
            </button>
          ))}
        </div>
      </Section>

      {trivia.mode === "team" && (
        <Section title={`Teams (${teams.length})`}>
          <ul className="space-y-1.5">
            {teams.map((tm, i) => (
              <li key={tm.id} className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-ink" style={{ backgroundColor: tm.color }} />
                <input
                  value={tm.name}
                  onChange={(e) => update(tm.id, e.target.value)}
                  maxLength={20}
                  className="min-w-0 flex-1 rounded-lg border-2 border-ink/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal"
                />
                <button
                  onClick={() => remove(tm.id)}
                  disabled={teams.length <= 2}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/10 font-bold text-ink disabled:opacity-30"
                >
                  ✕
                </button>
                <span className="w-4 text-center text-xs font-black text-ink/30">{i + 1}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <CtrlButton tone="teal" onClick={add} disabled={teams.length >= 8}>+ Add team</CtrlButton>
          </div>
        </Section>
      )}

      <CtrlButton tone="pink" className="w-full py-3 text-xl" onClick={start}>
        ▶ Start {TRIVIA_VERSION_LABELS[trivia.version]}
      </CtrlButton>
    </>
  );
}

function JoinCodes() {
  const t = useTrivia();
  const { trivia, connection } = t;
  const room = connection.room;
  const [sel, setSel] = useState<string | null>(null);
  if (!room) return null;

  if (trivia.mode === "view") {
    return (
      <Section title="Player join code">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-ink/60">
            {(connection.presence?.spectator ?? 0) > 0 ? `${connection.presence?.spectator} watching` : "No players yet"}
          </span>
          <CtrlButton tone={t.joinQrVisible ? "ink" : "grape"} onClick={() => t.setJoinQrVisible(!t.joinQrVisible)}>
            {t.joinQrVisible ? "✓ Hide QR" : "Show QR on screen"}
          </CtrlButton>
        </div>
        {t.joinQrVisible && (
          <div className="mt-3 flex flex-col items-center gap-2 text-center">
            <QR text={triviaViewJoinUrl(room)} size={180} />
            <p className="text-xs font-bold text-ink/60">Everyone scans to watch the questions. Room <b>{room}</b>.</p>
          </div>
        )}
      </Section>
    );
  }

  const selected = trivia.teams.find((x) => x.id === sel) ?? trivia.teams[0] ?? null;
  const linked = (id: string) => (connection.presence?.teams?.[id]?.answerers ?? 0) > 0;
  return (
    <Section title="Team join codes">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {trivia.teams.map((tm) => (
          <button
            key={tm.id}
            onClick={() => setSel(tm.id)}
            className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 text-xs font-bold ${
              selected?.id === tm.id ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tm.color ?? "#999" }} />
            {tm.name}
            <span className={`h-2 w-2 rounded-full ${linked(tm.id) ? "bg-buzz-green" : "bg-ink/20"}`} />
          </button>
        ))}
      </div>
      {selected && (
        <div className="flex flex-col items-center gap-2 text-center">
          <QR text={triviaTeamJoinUrl(room, selected.id, "answerer")} size={190} />
          <p className="text-xs font-bold text-ink/60">
            One teammate scans to be {selected.name}'s answer-phone, then shares a view-only QR to the team.
          </p>
          <div className="text-xs font-black">
            {linked(selected.id) ? <span className="text-buzz-green">✓ Answer-phone linked</span> : <span className="text-tang">Waiting for a teammate to scan…</span>}
          </div>
        </div>
      )}
    </Section>
  );
}

// Playing: teams lock answers as the host advances. Nothing is revealed. When done, begin the reveal.
function Play() {
  const t = useTrivia();
  const { trivia } = t;
  const deck = TRIVIA_DECKS[trivia.version];
  const q = deck[trivia.currentIndex];
  if (!q) return null;
  const answeredCount = trivia.mode === "team" ? trivia.teams.filter((tm) => trivia.answers[tm.id]?.[q.id]).length : 0;
  const roundEnd = q.round * 10 + 9;
  const atRoundEnd = trivia.currentIndex >= roundEnd;

  return (
    <>
      <Section title={`${TRIVIA_ROUNDS[q.round]?.label} · Question ${triviaQuestionInRound(trivia.currentIndex)} of 10`}>
        <div className="rounded-lg bg-ink px-3 py-2 text-center text-sm font-extrabold text-white">{q.prompt}</div>
        <ul className="mt-2 space-y-1">
          {TRIVIA_LETTERS.map((letter, i) => {
            const isCorrect = q.correct === letter;
            return (
              <li
                key={letter}
                className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-sm ${
                  isCorrect ? "border-buzz-green bg-buzz-green/10 font-bold" : "border-ink/10 bg-white"
                }`}
              >
                <img src={letterTile(letter)} alt={letter} className="h-7 w-7 shrink-0 object-contain" />
                <span className="min-w-0 flex-1">{q.choices[i]}</span>
                {isCorrect && <span className="text-[10px] font-black uppercase text-buzz-green">answer key</span>}
              </li>
            );
          })}
        </ul>
        {trivia.mode === "team" && (
          <div className="mt-1.5 text-xs font-bold text-ink/50">{answeredCount}/{trivia.teams.length} teams locked in</div>
        )}
        <div className="mt-1 text-[10px] font-semibold text-ink/40">Answer key is host-only — teams don't see it until the reveal.</div>
      </Section>

      <div className="flex items-center gap-2">
        <CtrlButton tone="ink" onClick={t.prev} disabled={trivia.currentIndex === q.round * 10}>◀ Prev</CtrlButton>
        <CtrlButton tone="pink" className="flex-1" onClick={() => { t.next(); t.sfx("swoosh"); }} disabled={atRoundEnd}>
          Next question ▶
        </CtrlButton>
      </div>

      <CtrlButton tone="grape" className="w-full py-3" onClick={() => { t.beginReveal(); t.sfx("drumroll"); }}>
        ▶ Reveal {TRIVIA_ROUNDS[q.round]?.label} answers{atRoundEnd ? "" : " (round not finished)"}
      </CtrlButton>
    </>
  );
}

// Reveal: at the end of the game the host walks every question in order, revealing answers one by
// one. Team mode tallies scores as each answer is revealed; view mode is scored manually.
function Reveal() {
  const t = useTrivia();
  const { trivia } = t;
  const deck = TRIVIA_DECKS[trivia.version];
  const q = deck[trivia.currentIndex];
  if (!q) return null;
  const shown = trivia.revealedQuestions.includes(q.id);
  const roundStart = q.round * 10;
  const roundEnd = roundStart + 9;
  const atRoundEnd = trivia.currentIndex >= roundEnd;
  const roundAllRevealed = deck.slice(roundStart, roundEnd + 1).every((qq) => trivia.revealedQuestions.includes(qq.id));
  const isLastRound = q.round >= 2;

  return (
    <>
      <Section title={`Reveal · ${TRIVIA_ROUNDS[q.round]?.label} · Question ${triviaQuestionInRound(trivia.currentIndex)} of 10`}>
        <div className="rounded-lg bg-ink px-3 py-2 text-center text-sm font-extrabold text-white">{q.prompt}</div>
        <ul className="mt-2 space-y-1">
          {TRIVIA_LETTERS.map((letter, i) => {
            const isCorrect = q.correct === letter;
            const highlight = shown && isCorrect;
            return (
              <li
                key={letter}
                className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-sm ${
                  highlight ? "border-buzz-green bg-buzz-green/15 font-bold" : "border-ink/10 bg-white"
                }`}
              >
                <img src={letterTile(letter)} alt={letter} className="h-7 w-7 shrink-0 object-contain" />
                <span className="min-w-0 flex-1">{q.choices[i]}</span>
                {highlight && <span className="text-[10px] font-black uppercase text-buzz-green">✓ correct</span>}
              </li>
            );
          })}
        </ul>
        {trivia.mode === "team" && shown && (
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-bold">
            {trivia.teams.map((tm) => {
              const got = trivia.answers[tm.id]?.[q.id] === q.correct;
              return (
                <span key={tm.id} className={`rounded px-1.5 py-0.5 ${got ? "bg-buzz-green/20 text-ink" : "bg-ink/10 text-ink/50"}`}>
                  {tm.name} {got ? "+1" : "✕"}
                </span>
              );
            })}
          </div>
        )}
      </Section>

      <div className="flex items-center gap-2">
        <CtrlButton tone="ink" onClick={t.prev} disabled={trivia.currentIndex === roundStart}>◀ Prev</CtrlButton>
        <CtrlButton
          tone={shown ? "ink" : "grape"}
          className="flex-1"
          onClick={() => { t.revealCurrent(); t.sfx("ding"); }}
          disabled={shown}
        >
          {shown ? "✓ Revealed" : "👁 Reveal this answer"}
        </CtrlButton>
        <CtrlButton tone="pink" onClick={() => { t.next(); t.sfx("swoosh"); }} disabled={atRoundEnd}>Next ▶</CtrlButton>
      </div>

      <CtrlButton
        tone={isLastRound ? "grape" : "teal"}
        className="w-full py-3"
        onClick={() => { t.continueReveal(); t.sfx(isLastRound ? "applause" : "swoosh"); }}
        disabled={!roundAllRevealed}
      >
        {roundAllRevealed
          ? isLastRound
            ? "🏆 Show champions"
            : `Continue to ${TRIVIA_ROUNDS[q.round + 1]?.label} ▶`
          : `Reveal all ${TRIVIA_ROUNDS[q.round]?.label} answers to continue`}
      </CtrlButton>
    </>
  );
}

function Scoreboard() {
  const { trivia } = useTrivia();
  if (trivia.teams.length === 0) return null;
  const ranked = [...trivia.teams].sort((a, b) => b.score - a.score);
  return (
    <Section title="Scores">
      <div className="grid grid-cols-2 gap-1 text-sm">
        {ranked.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5 rounded bg-white px-2 py-1">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color ?? "#999" }} />
            <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
            <span className="font-display text-lg">{t.score}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
