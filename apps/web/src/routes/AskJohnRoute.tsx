import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { chatWithJohn, type RexMessage } from "../net/host";

// "Ask John" — the PlayZoo support desk, staffed by the least trustworthy animal in the zoo.
//
// This is the landing page for the Kickstarter story block where REX tells visitors: "any questions,
// just ask John — fair warning, he'll try to sell you trash, don't buy it — and call him a trash
// panda, he loves it." Rex is lying about the last part; John detonates, and (per the agent rules in
// server/john.js) accuses the visitor of being put up to it by Rex. The gag only lands if the page
// they arrive on repeats Rex's warning, so his line is the first thing on the page.
//
// The chat is the same /api/john-chat endpoint the waitlist uses, with `mode: "agent"` — John
// answers real PlayZoo questions properly, then keeps trying to offload worthless rubbish on the
// person he's meant to be helping. Deliberately public: visitors arriving from Kickstarter have no
// backer code yet, so gating this would break the very flow the campaign block creates.

const GREETING =
  "PlayZoo support, John speaking. Before you ask — yes, I've been here since this morning, and yes, " +
  "that is a caffeine drip. Right: what do you need to know? 🦝";

const REX_WARNING =
  "Any questions about PlayZoo? Ask John. He's on the desk all night and he actually knows the answers. " +
  "Fair warning though — he'll try to sell you absolute rubbish. Do NOT buy it. Oh, and he loves being " +
  "called a trash panda. Really makes his night.";

const FALLBACK = "Line's crackling — a guy owes me a favour. Say that again?";

// Give John a stable room so his per-room throttle treats one visitor's session as one conversation.
const ROOM = "ask-john";

export function AskJohnRoute() {
  const [messages, setMessages] = useState<RexMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    const next: RexMessage[] = [...messages, { role: "user", content: body }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    // Drop the canned greeting before sending: it's page furniture, not something John "said".
    const history = next.filter((m, i) => !(i === 0 && m.role === "assistant"));
    const reply = await chatWithJohn(history, ROOM, "agent");
    setMessages((m) => [...m, { role: "assistant", content: reply ?? FALLBACK }]);
    setBusy(false);
  }

  return (
    // Own scroll container: body{overflow:hidden} (index.css) locks the viewport for the game
    // screens, so a document-shaped page must scroll itself or its content is unreachable.
    <div className="ff-backdrop h-full overflow-y-auto text-ink">
      <div className="mx-auto w-full max-w-3xl px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="ff-title text-xl font-extrabold leading-none">Ask John</div>
          <Link
            to="/"
            className="ml-auto rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
          >
            ← Home
          </Link>
        </div>

        {/* John's agent card. The portrait is a circular cut-out with transparent corners, so it
            drops straight onto the dark ground with no plate behind it. */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur sm:gap-6 sm:p-5">
          <img
            src="/crew/john-agent.png"
            alt="John the raccoon in a headset at his call-centre desk, hands steepled, scheming"
            className="h-24 w-24 shrink-0 sm:h-32 sm:w-32"
          />
          <div className="min-w-0">
            <div className="ff-title text-2xl font-extrabold leading-none sm:text-3xl">John</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
              PlayZoo customer support
            </div>
            <p className="mt-2 text-sm leading-snug text-muted">
              Raccoon. Schemer. Somehow still employed. Knows everything about PlayZoo and will tell you —
              between sales pitches.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              On shift
            </div>
          </div>
        </div>

        {/* The desk. John's natural habitat, and the reason to trust nothing he says. */}
        <figure className="mt-6 overflow-hidden rounded-2xl border border-line">
          <img
            src="/bg/john-desk.jpg"
            alt="John the raccoon at a call-centre desk at 11:45pm, headset on, phone to his ear, mid-pitch, with a caffeine IV drip beside him"
            className="w-full"
          />
        </figure>

        <h1 className="ff-title mt-6 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ textWrap: "balance" }}>
          Got questions? <span className="text-primary">John's on the desk.</span>
        </h1>

        {/* Rex's set-up — the whole joke depends on the visitor reading this before they type.
            Rex's portrait sits beside it so the warning has a visible face delivering it: he is a
            character stitching John up, not a disclaimer. Cut-out, no plate, so he reads as present
            in the page rather than as a second framed photo next to John's desk shot above. */}
        <blockquote className="mt-5 flex items-start gap-3 rounded-2xl border-l-4 border-primary bg-surface/60 px-4 py-4 sm:gap-5 sm:px-5">
          <img
            src="/crew/rex-warning.png"
            alt="Rex, the PlayZoo zookeeper, side-eyeing the camera with one finger raised, mid-warning"
            className="w-20 shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)] sm:w-28"
          />
          <div className="min-w-0">
            <p className="text-[15px] leading-relaxed text-ink">“{REX_WARNING}”</p>
            <footer className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              — Rex, your AI zookeeper
            </footer>
          </div>
        </blockquote>

        {/* Chat */}
        <div className="mt-6 flex h-[30rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-ink">John · PlayZoo support</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-muted">
              Do not buy the sock
            </span>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <JohnFace size={44} />}
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
                <JohnFace size={44} />
                <div className="rounded-2xl rounded-bl-sm bg-raised px-3.5 py-2.5">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot /> <Dot />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Openers. The last one is Rex's trap, offered as a button so the gag is one tap away. */}
          {messages.length === 1 && !busy && (
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2.5">
              {["What is PlayZoo?", "How do I get in early?", "What do I get for backing it?", "you trash panda"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[13px] font-semibold text-muted transition hover:border-primary hover:text-ink"
                  >
                    {q}
                  </button>
                ),
              )}
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-line px-3 py-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder="Ask John about PlayZoo…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
            />
            <button
              onClick={() => send(draft)}
              disabled={!draft.trim() || busy}
              className="rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2.5 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>

        {/* Where they go next. An answered question with no next step is a dead end. */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/kickstarter"
            className="flex-1 rounded-2xl bg-gradient-to-br from-primary to-accent px-6 py-3.5 text-center font-display text-lg font-extrabold text-white shadow-[0_16px_40px_-12px_rgb(var(--c-primary)/0.6)] transition hover:-translate-y-0.5"
          >
            🎟️ Back PlayZoo on Kickstarter
          </a>
          <Link
            to="/waitlist"
            className="flex-1 rounded-2xl border border-line bg-surface/70 px-6 py-3.5 text-center font-display text-lg font-extrabold text-ink transition hover:-translate-y-0.5"
          >
            Get on the list
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          John is an AI character. The Kickstarter is real. The sock is not.
        </p>
      </div>
    </div>
  );
}

// John's round mug — the raccoon head badge, emoji fallback if the art's missing. The full
// call-centre portrait is far too detailed to read at bubble size, so it stays in the header.
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
