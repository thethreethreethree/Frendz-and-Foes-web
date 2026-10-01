import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { chatWithJohn, type RexMessage } from "../net/host";

// John's own chat — a separate surface from the waitlist door and from the /ask-john support desk.
//
// WHAT MAKES IT DIFFERENT. On /ask-john John is working: headset on, queue blinking, answering
// product questions and trying to flog people rubbish between answers. Here he is off the clock, and
// the subject is the FOUNDER — John Ramos, the real person who built PlayZoo. No sales bit, no
// Kickstarter push, no support queue.
//
// IT DOES NOT OPEN IN CHARACTER FOR A NAMED GUEST. The owner's instruction was to start the Brie
// conversation "when she says Hi my name is Brie, Britney" — so the handshake is a NAME, not a URL.
// Anyone can open this page; John is ordinary nosy John until somebody tells him who they are, and
// only then does he turn to face the conversation. That is also the right behaviour for a public
// page: a stranger who wanders in should not be greeted by a script written for someone else.
// The detection lives on the server (`brieIntroduced`, server/john.js) so it works no matter how she
// phrases it, and it reads the whole transcript so John does not forget her a message later.
//
// The founder facts are a CLOSED SET with a hard no-guessing rule (server/founderFacts.js). He is a
// real man; an improvised detail about him is indistinguishable from a true one to whoever reads it.

const GREETING =
  "Oh — someone's actually in here. Door was open, make yourself comfortable. 🦝";

const FALLBACK = "Line's crackling — a guy owes me a favour. Say that again?";

// A stable room so John's per-room throttle (2.5s gap, hourly cap) treats one visit as one
// conversation rather than as unrelated strangers.
const ROOM = "john-chat";

export function JohnRoute() {
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
    // Drop the canned greeting before sending: it is page furniture, not something John said, and
    // leaving it in the transcript makes the model answer it.
    const history = next.filter((m, i) => !(i === 0 && m.role === "assistant"));
    const reply = await chatWithJohn(history, ROOM, "brie");
    setMessages((m) => [...m, { role: "assistant", content: reply ?? FALLBACK }]);
    setBusy(false);
  }

  return (
    // Own scroll container: body{overflow:hidden} (index.css) locks the viewport for the game
    // screens, so a document-shaped page must scroll itself or its content is unreachable.
    <div className="ff-backdrop h-full ff-scroll text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="ff-title text-xl font-extrabold leading-none">John</div>
          <Link
            to="/"
            className="ff-tap ml-auto rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
          >
            ← Home
          </Link>
        </div>

        {/* John's card. The portrait has a heavy gold ring baked into the PNG, so it needs no plate
            behind it — and at this size the call-centre scene behind him reads as texture, not as a
            second photograph competing with the chat. */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4 backdrop-blur sm:gap-6 sm:p-5">
          <img
            src="/crew/john-agent.png"
            alt="John the raccoon, headset on, hands steepled, mid-scheme"
            className="h-24 w-24 shrink-0 sm:h-28 sm:w-28"
          />
          <div className="min-w-0">
            <div className="ff-title text-2xl font-extrabold leading-none sm:text-3xl">John</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Raccoon · off the clock
            </div>
            <p className="mt-2 text-sm leading-snug text-muted">
              Schemer, fixer, and the only one here who'll tell you what the founder is actually like.
              Ask him. He's in a talking mood.
            </p>
          </div>
        </div>

        <h1
          className="ff-title mt-6 text-3xl font-extrabold leading-tight sm:text-4xl"
          style={{ textWrap: "balance" }}
        >
          Want to know about <span className="text-primary">the guy who built this?</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          John's worked for him long enough to have opinions. Say hello — he'll want to know who he's
          talking to first.
        </p>

        {/* Chat. Height is min(30rem, 65dvh), not a flat 30rem: on a phone with the browser bars
            showing, a fixed 480px box plus everything above it pushes the composer off the bottom of
            the screen — you can read the conversation but not reach the thing you type into. */}
        <div className="mt-6 flex h-[min(30rem,65dvh)] min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-ink">John</span>
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-muted">
              Not on shift
            </span>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
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

          {/* One opener, and it is the introduction — because the conversation does not start until
              somebody tells John who they are, and a blank box does not tell you that. */}
          {messages.length === 1 && !busy && (
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2.5">
              {["Hi my name is Brie, Britney", "Who built PlayZoo?"].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="ff-tap rounded-full border border-line bg-canvas px-3 py-1.5 text-[13px] font-semibold text-muted transition hover:border-primary hover:text-ink"
                >
                  {q}
                </button>
              ))}
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
              placeholder="Say hello to John…"
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

        <p className="mt-4 text-center text-xs text-muted">
          John is an AI character. What he says about the founder is limited to what the founder told
          him — if he doesn't know, he'll say so rather than make it up.
        </p>
      </div>
    </div>
  );
}

// John's round mug, for the bubbles. The full call-centre portrait is far too detailed to read at
// 44px, so it stays in the card above. Emoji fallback if the art ever goes missing.
function JohnFace({ size }: { size: number }) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (!ok)
    return (
      <span style={dim} className="grid shrink-0 place-items-center rounded-full bg-surface text-lg">
        🦝
      </span>
    );
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
