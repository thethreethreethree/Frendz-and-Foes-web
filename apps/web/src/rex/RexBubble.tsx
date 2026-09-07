import { useEffect, useRef, useState } from "react";
import { chatWithRex, type RexMessage } from "../net/host";

// Rex, everywhere. A floating chat bubble pinned to the corner of every screen: tap it to pop open a
// conversation with the PlayZoo host without leaving the page you're on. Replies come from the server
// (/api/rex-chat → DeepSeek) with a canned fallback so it never dead-ends. Text-first + role-tagged so
// a later 11Labs voice layer (TTS/STT) can speak replies and accept spoken input with no rewrite.

const GREETING =
  "Well, look what wandered out of its enclosure. I'm Rex — keeper, ringmaster, unpaid therapist to twenty animals. What do you want, hotshot? 🦁";

export function RexBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<RexMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: RexMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    const history = next.filter((m, i) => !(i === 0 && m.role === "assistant"));
    const reply = await chatWithRex(history);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: reply ?? "The keeper's radio just cut out — say that again, would you?" },
    ]);
    setBusy(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-3" style={{ fontFamily: "inherit" }}>
      {/* panel */}
      {open && (
        <div className="flex h-[min(70vh,540px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-line bg-canvas text-ink shadow-2xl">
          {/* header */}
          <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3 py-2.5">
            <RexFace size={34} />
            <div className="flex-1">
              <div className="ff-title text-base font-extrabold leading-none">Rex</div>
              <div className="text-[11px] font-medium text-muted">Your AI zookeeper</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="grid h-8 w-8 place-items-center rounded-full text-lg text-muted transition hover:bg-line hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* messages */}
          <div ref={scroller} className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <RexFace size={26} />}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
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
                <RexFace size={26} />
                <div className="rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot /> <Dot />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* composer */}
          <div className="flex items-end gap-2 border-t border-line bg-surface/60 px-2.5 py-2.5">
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
              className="max-h-24 flex-1 resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-[14px] text-ink outline-none focus:border-primary"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || busy}
              className="rounded-xl bg-gradient-to-br from-primary to-accent px-3.5 py-2 font-display text-base font-extrabold text-white transition active:scale-95 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* launcher button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Rex chat" : "Chat with Rex"}
        className="group grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-primary bg-gradient-to-br from-primary to-accent shadow-[0_10px_30px_-6px_rgb(var(--c-primary)/0.7)] transition hover:-translate-y-0.5 active:scale-95"
      >
        {open ? (
          <span className="font-display text-2xl text-white">✕</span>
        ) : (
          <RexFace size={72} bare />
        )}
      </button>
    </div>
  );
}

// Rex's portrait, with an emoji fallback if the art is missing so nothing shows a broken image.
// `bare` drops the ring (used inside the round launcher, which already has its own border).
function RexFace({ size, bare = false }: { size: number; bare?: boolean }) {
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
      src="/crew/rex-cutout.png"
      alt="Rex"
      style={dim}
      onError={() => setOk(false)}
      className={`shrink-0 rounded-full object-cover ${bare ? "" : "border-2 border-primary"}`}
    />
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted [animation-duration:1s]" />;
}
