import { useEffect, useState } from "react";
import { RexSays } from "./RexBits";
import { enclosureView } from "./enclosures";
import { fetchSortQuestions, submitSort, type SortQuestion, type EnclosureResult } from "../net/backer";

// Rex's sorting: he asks the 5 questions one at a time, fires a snappy comeback after each pick, then
// reveals the enclosure (computed server-side) with its banner. `onDone` hands the enclosure id back
// so the club page can switch to the sorted state.

const INTRO = "Right. Five questions. Don't overthink it — I'll know if you're lying. 🦁";

export function SortingFlow({ onDone }: { onDone: (enclosureId: string) => void }) {
  const [questions, setQuestions] = useState<SortQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [rexLine, setRexLine] = useState(INTRO);
  const [picked, setPicked] = useState<number | null>(null); // current question's chosen answer (showing the quip)
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EnclosureResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { fetchSortQuestions().then((qs) => setQuestions(qs)); }, []);

  if (result) return <Reveal enclosure={result} onDone={onDone} />;

  if (!questions) return <div className="mt-16 text-center text-muted">Rex is loading his clipboard…</div>;
  if (questions.length === 0) return <div className="mt-16 text-center text-muted">Sorting's having a moment — try again shortly.</div>;

  const q = questions[i];
  const isLast = i === questions.length - 1;

  function pick(idx: number) {
    if (picked !== null || submitting) return;
    setPicked(idx);
    setRexLine(q.answers[idx].quip);
    setAnswers((a) => [...a, idx]);
  }

  async function next() {
    const nextAnswers = answers;
    if (isLast) {
      setSubmitting(true); setErr(null);
      const r = await submitSort(nextAnswers);
      setSubmitting(false);
      if (r.error || !r.enclosure) { setErr(r.error || "Rex fumbled the paperwork — try that last bit again."); return; }
      setResult(r.enclosure);
    } else {
      setI((n) => n + 1);
      setPicked(null);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <RexSays>{rexLine}</RexSays>

      <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Question {i + 1} of {questions.length}</div>
          <div className="flex gap-1.5">
            {questions.map((_, n) => (
              <span key={n} className={`h-1.5 w-6 rounded-full ${n < answers.length ? "bg-primary" : n === i ? "bg-primary/50" : "bg-line"}`} />
            ))}
          </div>
        </div>

        <h2 className="ff-title mt-3 text-2xl font-extrabold leading-tight">{q.q}</h2>

        <div className="mt-4 grid gap-2.5">
          {q.answers.map((a, idx) => {
            const chosen = picked === idx;
            const dim = picked !== null && !chosen;
            return (
              <button
                key={idx}
                onClick={() => pick(idx)}
                disabled={picked !== null}
                className={`rounded-xl border px-4 py-3 text-left font-semibold transition
                  ${chosen ? "border-primary bg-primary/15 text-ink" : "border-line bg-canvas text-ink hover:border-primary hover:-translate-y-0.5"}
                  ${dim ? "opacity-40" : ""}`}
              >
                {a.text}
              </button>
            );
          })}
        </div>

        {err && <p className="mt-3 text-sm font-semibold text-red-400">{err}</p>}

        {picked !== null && (
          <button
            onClick={next}
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40"
          >
            {submitting ? "Rex is deciding…" : isLast ? "Sort me!" : "Next question →"}
          </button>
        )}
      </div>
    </div>
  );
}

function Reveal({ enclosure, onDone }: { enclosure: EnclosureResult; onDone: (id: string) => void }) {
  const view = enclosureView(enclosure.id);
  const accent = enclosure.accent || view?.accent || "#8b5cf6";
  return (
    <div className="mt-8 flex flex-col items-center gap-6 text-center">
      <RexSays>Hah. I've seen enough. You, my friend, are a <b>{enclosure.name}</b> through and through. 🦁</RexSays>
      <div
        className="ff-rise flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border p-6"
        style={{ borderColor: accent, background: `radial-gradient(120% 100% at 50% 0%, ${accent}22, transparent 70%)` }}
      >
        <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Your enclosure</div>
        <img
          src={enclosure.banner || view?.banner}
          alt={enclosure.name}
          className="w-56 drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
          style={{ filter: `drop-shadow(0 0 22px ${accent}66)` }}
        />
        <div>
          <div className="ff-title text-3xl font-extrabold">{enclosure.name}</div>
          <div className="mt-1 font-display text-base font-bold" style={{ color: accent }}>"{enclosure.motto}"</div>
          <p className="mt-2 text-sm text-muted">{enclosure.blurb || view?.blurb}</p>
        </div>
      </div>
      <button
        onClick={() => onDone(enclosure.id)}
        className="rounded-2xl bg-gradient-to-br from-primary to-accent px-8 py-3.5 font-display text-xl font-extrabold text-white transition hover:-translate-y-0.5 active:scale-95"
      >
        Enter the club →
      </button>
    </div>
  );
}
