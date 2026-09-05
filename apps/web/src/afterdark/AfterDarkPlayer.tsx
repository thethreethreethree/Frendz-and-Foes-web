import { useState } from "react";
import { useAfterDark } from "./useAfterDark";
import { caSubmit, caPick, caNext, fillPrompt, type CaState, type CaYou } from "../net/afterdark";
import { getBrand } from "../brand/theme";

export function AfterDarkPlayer({ room }: { room: string }) {
  const { state, you, error, join } = useAfterDark(room, "player");
  const label = getBrand().games.afterdark?.label ?? "After Dark";
  if (!you) return <NameForm label={label} onJoin={join} error={error} />;
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;
  const me = state.players.find((p) => p.id === you.id);
  const iAmJudge = state.judgeId === you.id;

  return (
    <Wrap>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      <div className="mb-2 flex items-center justify-between text-sm text-muted"><span>{you.name}{iAmJudge ? " · JUDGE" : ""}</span>{state.phase !== "lobby" && <span>{me?.score ?? 0} pts</span>}</div>

      {state.phase === "lobby" && <Center><div className="ff-title text-2xl">{label} <span className="text-danger text-sm">18+</span></div><p className="mt-2 text-sm text-muted">{state.players.length} in. Waiting for the host…</p></Center>}
      {state.phase === "submitting" && (iAmJudge
        ? <Center><div className="ff-title text-xl">{state.prompt?.text}</div><p className="mt-3 text-muted">You're the judge — sit tight while everyone plays a card.</p></Center>
        : <Submit you={you} state={state} submitted={!!me?.submitted} />)}
      {state.phase === "judging" && (iAmJudge ? <Judge state={state} /> : <Center><div className="ff-title text-xl">{state.prompt?.text}</div><p className="mt-3 text-muted">The judge is picking…</p></Center>)}
      {state.phase === "reveal" && <RevealView state={state} canAdvance={iAmJudge} />}
      {state.phase === "ended" && <Center><div className="ff-title text-3xl">Game over</div><Standings state={state} /></Center>}
    </Wrap>
  );
}

function Submit({ you, state, submitted }: { you: CaYou; state: CaState; submitted: boolean }) {
  const pick = state.prompt?.pick ?? 1;
  const [sel, setSel] = useState<string[]>([]);
  if (submitted) return <Center><div className="ff-title text-2xl text-success">Card in ✓</div><p className="mt-2 text-sm text-muted">Waiting for the others…</p></Center>;
  const toggle = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length < pick ? [...s, c] : s));
  return (
    <div className="flex flex-col gap-2">
      <div className="ff-title text-center text-lg" style={{ textWrap: "balance" }}>{state.prompt?.text}</div>
      <p className="text-center text-xs text-muted">Pick {pick} card{pick > 1 ? "s" : ""} {pick > 1 ? "(order matters)" : ""}</p>
      <div className="flex flex-col gap-1.5">
        {you.hand.map((c) => {
          const idx = sel.indexOf(c);
          return (
            <button key={c} onClick={() => toggle(c)} className="rounded-lg border px-3 py-2 text-left text-sm" style={{ borderColor: idx >= 0 ? "rgb(var(--c-primary))" : "rgb(var(--c-line))", background: idx >= 0 ? "color-mix(in srgb, rgb(var(--c-primary)) 12%, transparent)" : "rgb(var(--c-surface))" }}>
              {pick > 1 && idx >= 0 ? `${idx + 1}. ` : ""}{c}
            </button>
          );
        })}
      </div>
      <button disabled={sel.length !== pick} onClick={() => caSubmit(sel)} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink disabled:opacity-40">PLAY CARD{pick > 1 ? "S" : ""}</button>
    </div>
  );
}

function Judge({ state }: { state: CaState }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="ff-title text-center text-lg" style={{ textWrap: "balance" }}>{state.prompt?.text}</div>
      <p className="text-center text-sm text-muted">Pick the funniest:</p>
      <div className="flex flex-col gap-1.5">
        {state.revealed.map((r) => (
          <button key={r.i} onClick={() => caPick(r.i)} className="rounded-lg border border-line bg-surface px-3 py-3 text-left text-sm font-semibold">{fillPrompt(state.prompt!.text, r.cards)}</button>
        ))}
      </div>
    </div>
  );
}

function RevealView({ state, canAdvance }: { state: CaState; canAdvance: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      {state.winner && <div className="ff-title text-2xl text-success">{fillPrompt(state.prompt!.text, state.winner.cards)}</div>}
      <div className="text-lg font-semibold">🏆 {state.winner?.name}</div>
      <Standings state={state} />
      {canAdvance ? <button onClick={caNext} className="ff-sticker mt-2 bg-primary px-8 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button> : <p className="text-sm text-muted">Waiting for the judge…</p>}
    </div>
  );
}

function Standings({ state }: { state: CaState }) {
  const rows = [...state.players].sort((a, b) => b.score - a.score);
  return <div className="flex flex-wrap justify-center gap-2">{rows.map((p, i) => <span key={p.id} className={`rounded-lg px-3 py-1 text-sm font-bold ${i === 0 ? "bg-primary text-primary-ink" : "bg-surface text-ink"}`} style={i === 0 ? {} : { border: "1px solid rgb(var(--c-line))" }}>{p.name} {p.score}</span>)}</div>;
}

function NameForm({ label, onJoin, error }: { label: string; onJoin: (n: string) => void; error: string | null }) {
  const [name, setName] = useState("");
  return (
    <Wrap>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="ff-title text-3xl">{label} <span className="text-danger text-base">18+</span></div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={16} className="w-56 rounded-lg border border-line px-4 py-3 text-center text-lg" />
        <button disabled={!name.trim()} onClick={() => onJoin(name.trim())} className="ff-sticker bg-primary px-8 py-3 font-display text-xl text-primary-ink disabled:opacity-40">JOIN</button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Wrap>
  );
}

function Center({ children }: { children: React.ReactNode }) { return <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>; }
function Wrap({ children }: { children: React.ReactNode }) { return <div className="flex h-full flex-col overflow-auto bg-canvas p-3 text-ink">{children}</div>; }
