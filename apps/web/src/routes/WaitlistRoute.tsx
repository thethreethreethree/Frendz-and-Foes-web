import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { chatWithJohn, type RexMessage } from "../net/host";

// The pre-launch waitlist, hosted by JOHN the schemer. PlayZoo isn't open for new accounts yet;
// anyone who tries to sign up lands here. John works the velvet rope — you get "on the list" by
// backing the Kickstarter — and you can chat with him while you're here. His reply comes from
// /api/john-chat (DeepSeek), with a canned fallback so the page never dead-ends. The real
// Kickstarter.com link is coming; for now the CTA points at the on-site /kickstarter campaign.

const GREETING =
  "Well, well. Look who strolled up to the velvet rope. Name's John — I run the list around here. " +
  "PlayZoo's not open to the public yet, see… but between you and me? Back us on Kickstarter and I'll " +
  "make sure you're first through the gate. So — what's your angle? 🦝";

// Point this at the real Kickstarter.com project once it's live; until then it's the on-site campaign.
const KICKSTARTER_URL = "/kickstarter";

export function WaitlistRoute() {
  const [messages, setMessages] = useState<RexMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: RexMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    const history = next.filter((m, i) => !(i === 0 && m.role === "assistant"));
    const reply = await chatWithJohn(history);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: reply ?? "Line's crackling — a guy owes me a favour. Say that again?" },
    ]);
    setBusy(false);
  }

  return (
    <div className="ff-backdrop min-h-full overflow-y-auto text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
        {/* Who's talking */}
        <div className="flex items-center gap-3">
          <JohnFace size={52} />
          <div>
            <div className="ff-title text-xl font-extrabold leading-none">John</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Your man on the inside</div>
          </div>
          <Link to="/" className="ml-auto rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5">
            ← Home
          </Link>
        </div>

        {/* The pitch */}
        <h1 className="ff-title mt-8 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ textWrap: "balance" }}>
          The zoo's not open to just anyone… <span className="text-primary">yet.</span>
        </h1>
        <p className="mt-3 text-lg text-muted">
          Sign-ups are closed, friend — we're not letting the whole jungle in on day one. But here's the thing:
          back us on <b className="text-ink">Kickstarter</b> and you jump the line. First through the gate, best
          seats in the enclosure. That's the play.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={KICKSTARTER_URL}
            className="rounded-2xl bg-gradient-to-br from-primary to-accent px-7 py-3.5 text-center font-display text-xl font-extrabold text-white shadow-[0_16px_40px_-12px_rgb(var(--c-primary)/0.6)] transition hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
          >
            🎟️ Get on the list — back us on Kickstarter
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">The full Kickstarter goes live soon. For now, take a look at the campaign — and tell 'em John sent you.</p>

        {/* Chat with John */}
        <div className="mt-9 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <JohnFace size={28} />
            <span className="text-sm font-bold text-ink">Chat with John</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-muted">While you wait</span>
          </div>
          <div ref={scroller} className="h-[clamp(240px,40vh,380px)] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <JohnFace size={26} />}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                    m.role === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-primary to-accent font-medium text-white"
                      : "rounded-bl-sm bg-raised font-medium text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-end gap-2">
                <JohnFace size={26} />
                <div className="rounded-2xl rounded-bl-sm bg-raised px-3.5 py-2.5">
                  <span className="inline-flex gap-1"><Dot /> <Dot /> <Dot /></span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 border-t border-line px-3 py-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Say something to John…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || busy}
              className="rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2.5 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// John's round mug — the raccoon head badge, emoji fallback if the art's missing.
function JohnFace({ size }: { size: number }) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (!ok)
    return <span style={dim} className="grid shrink-0 place-items-center rounded-full bg-surface text-lg">🦝</span>;
  return (
    <img
      src="/avatars/raccoon.png"
      alt="John the raccoon"
      style={dim}
      onError={() => setOk(false)}
      className="shrink-0 rounded-full border-2 border-primary object-cover"
    />
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted [animation-duration:1s]" />;
}
