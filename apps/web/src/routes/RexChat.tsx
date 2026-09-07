import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { chatWithRex, type RexMessage } from "../net/host";

// "Chat with Rex" — a free-form conversation with the PlayZoo host. The banter that runs during
// games is one-liners; this is a full back-and-forth. Rex's reply comes from the server
// (/api/rex-chat → DeepSeek), with a canned fallback so the page never dead-ends. Built text-first
// and role-tagged so a later voice layer (11Labs TTS/STT) can speak replies and accept spoken input
// without reworking this screen.

const GREETING =
  "Well, look what wandered out of its enclosure. I'm Rex — keeper, ringmaster, unpaid therapist to twenty animals. What do you want, hotshot? 🦁";

export function RexChat() {
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
    // Send only the real turns (drop the seeded greeting so Rex isn't "replying to himself").
    const history = next.filter((m, i) => !(i === 0 && m.role === "assistant"));
    const reply = await chatWithRex(history);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: reply ?? "The keeper's radio just cut out — say that again, would you?",
      },
    ]);
    setBusy(false);
  }

  return (
    <div className="ff-backdrop flex h-full flex-col text-ink">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-line bg-surface/60 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          className="rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-3">
          <RexFace size={40} />
          <div>
            <div className="ff-title text-lg font-extrabold leading-none">Rex</div>
            <div className="text-xs font-medium text-muted">Your AI zookeeper</div>
          </div>
        </div>
      </header>

      {/* messages */}
      <div ref={scroller} className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <RexFace size={30} />}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-pop ${
                m.role === "user"
                  ? "rounded-br-sm bg-gradient-to-br from-primary to-accent font-medium text-white"
                  : "rounded-bl-sm bg-surface font-medium text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-end gap-2">
            <RexFace size={30} />
            <div className="rounded-2xl rounded-bl-sm bg-surface px-4 py-3 shadow-pop">
              <span className="inline-flex gap-1">
                <Dot /> <Dot /> <Dot />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-line bg-surface/60 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Say something to Rex…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-canvas px-4 py-3 text-[15px] text-ink outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || busy}
            className="rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Rex's portrait, with an emoji fallback if the art is missing so the bubble never shows a broken image.
function RexFace({ size }: { size: number }) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (!ok)
    return (
      <span style={dim} className="grid shrink-0 place-items-center rounded-full bg-surface text-lg">
        🦁
      </span>
    );
  return (
    <img
      src="/crew/rex-keeper.png"
      alt="Rex"
      style={dim}
      onError={() => setOk(false)}
      className="shrink-0 rounded-full border-2 border-primary object-cover"
    />
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted [animation-duration:1s]" />;
}
