import { useState } from "react";
import { useJustOne } from "./useJustOne";
import { joClue, joJudge, joNext, type JoState } from "../net/justone";
import { getBrand } from "../brand/theme";

export function JustOnePlayer({ room }: { room: string }) {
  const { state, you, word, error, join } = useJustOne(room, "player");
  const label = getBrand().games.justone?.label ?? "Solo Clue";

  if (!you) return <NameForm label={label} onJoin={join} error={error} />;
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;

  const meGuesser = state.guesserId === you.id;
  const me = state.players.find((p) => p.id === you.id);

  return (
    <Wrap>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span>{you.name}</span>
        {state.phase !== "lobby" && <span>Round {state.round}/{state.totalRounds} · {state.score} pts</span>}
      </div>

      {state.phase === "lobby" && (
        <Center><div className="ff-title text-2xl">{label}</div><p className="mt-2 text-sm text-muted">{state.players.length} in. Waiting for the host to start…</p></Center>
      )}

      {state.phase === "writing" && (meGuesser
        ? <Center><div className="ff-title text-3xl text-primary">You're guessing!</div><p className="mt-3 text-muted">Look away from the TV and everyone's phones. They're writing clues for you.</p></Center>
        : <Writer word={word} submitted={!!me?.submitted} />)}

      {state.phase === "reveal" && (meGuesser
        ? <GuesserReveal state={state} />
        : <Spectate state={state} note="The guesser is guessing…" />)}

      {state.phase === "roundover" && <RoundOver state={state} meGuesser={meGuesser} />}

      {state.phase === "ended" && (
        <Center><div className="ff-title text-3xl">Final score</div><div className="ff-title mt-2 text-6xl text-primary">{state.score}/{state.totalRounds}</div></Center>
      )}
    </Wrap>
  );
}

function Writer({ word, submitted }: { word: string | null; submitted: boolean }) {
  const [clue, setClue] = useState("");
  if (submitted) return <Center><div className="ff-title text-2xl text-success">Clue in! ✓</div><p className="mt-2 text-sm text-muted">Waiting for the others…</p></Center>;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">The word is</div>
      <div className="ff-title text-5xl">{word ?? "…"}</div>
      <p className="text-sm text-muted">Write ONE word to help the guesser. Identical clues cancel out!</p>
      <input value={clue} onChange={(e) => setClue(e.target.value.replace(/\s/g, ""))} placeholder="Your one word" maxLength={24}
        className="w-56 rounded-lg border border-line px-4 py-3 text-center text-lg" />
      <button disabled={!clue.trim()} onClick={() => joClue(clue.trim())}
        className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40">SUBMIT CLUE</button>
    </div>
  );
}

function GuesserReveal({ state }: { state: JoState }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">Your clues</div>
      <div className="flex flex-wrap justify-center gap-2">
        {state.survivors.length === 0
          ? <p className="text-danger">All clues cancelled — take a wild guess!</p>
          : state.survivors.map((c, i) => <span key={i} className="ff-title rounded-xl bg-surface px-4 py-2 text-2xl" style={{ border: "1px solid rgb(var(--c-line))" }}>{c.word}</span>)}
      </div>
      <p className="text-sm text-muted">Say your guess out loud, then:</p>
      <div className="grid w-full grid-cols-2 gap-2">
        <button onClick={() => joJudge(true)} className="ff-sticker bg-success px-4 py-4 font-display text-xl text-white">GOT IT ✓</button>
        <button onClick={() => joJudge(false)} className="ff-sticker bg-warning px-4 py-4 font-display text-xl text-white">PASS ✗</button>
      </div>
    </div>
  );
}

function Spectate({ state, note }: { state: JoState; note: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex flex-wrap justify-center gap-2">
        {state.survivors.map((c, i) => <span key={i} className="rounded-xl bg-surface px-3 py-1.5 font-semibold" style={{ border: "1px solid rgb(var(--c-line))" }}>{c.word}</span>)}
        {state.cancelled.map((c, i) => <span key={`x${i}`} className="rounded-full px-3 py-1.5 font-semibold text-danger line-through">{c.word}</span>)}
      </div>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}

function RoundOver({ state, meGuesser }: { state: JoState; meGuesser: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="ff-title text-4xl" style={{ color: state.lastGot ? "#16a34a" : "#dc2626" }}>{state.lastGot ? "Got it! ✓" : "Missed ✗"}</div>
      <div className="text-lg">The word was <b>{state.word}</b></div>
      {meGuesser
        ? <button onClick={joNext} className="ff-sticker mt-2 bg-primary px-8 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>
        : <p className="text-sm text-muted">Waiting for the next round…</p>}
    </div>
  );
}

function NameForm({ label, onJoin, error }: { label: string; onJoin: (n: string) => void; error: string | null }) {
  const [name, setName] = useState("");
  return (
    <Wrap>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="ff-title text-3xl">{label}</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={16}
          className="w-56 rounded-lg border border-line px-4 py-3 text-center text-lg" />
        <button disabled={!name.trim()} onClick={() => onJoin(name.trim())}
          className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40">JOIN</button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Wrap>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>;
}
function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-auto bg-canvas p-4 text-ink">{children}</div>;
}
