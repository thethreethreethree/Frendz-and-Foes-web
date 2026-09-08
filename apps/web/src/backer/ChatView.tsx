import { useEffect, useMemo, useRef, useState } from "react";
import { chatSocket, joinChatRoom, sendChat, type ChatMessage } from "../net/chat";
import { enclosureView } from "./enclosures";
import type { Backer } from "../net/backer";

// The club chat. A backer sees two rooms: General ("The Watering Hole") and their own enclosure. The
// server authorises join/post and broadcasts messages (echoing the sender's own back), so we render
// purely on receipt. Rex's lines (welcomes + moderation call-outs) arrive as messages flagged `rex`.

interface RoomTab { id: string; name: string; accent: string }
const GENERAL: RoomTab = { id: "general", name: "The Watering Hole", accent: "#8b5cf6" };

const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ChatView({ me }: { me: Backer }) {
  const rooms = useMemo<RoomTab[]>(() => {
    const enc = enclosureView(me.enclosure);
    return enc ? [GENERAL, { id: enc.id, name: enc.name, accent: enc.accent }] : [GENERAL];
  }, [me.enclosure]);

  const [active, setActive] = useState<string>(GENERAL.id);
  const [byRoom, setByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Wire the socket once. Listeners update the per-room message map; the server is the source of truth.
  useEffect(() => {
    const s = chatSocket();
    setConnected(s.connected);
    const onConnect = () => { setConnected(true); joinChatRoom(active); };
    const onDisconnect = () => setConnected(false);
    const onHistory = ({ roomId, messages }: { roomId: string; messages: ChatMessage[] }) =>
      setByRoom((m) => ({ ...m, [roomId]: messages }));
    const onMsg = ({ roomId, message }: { roomId: string; message: ChatMessage }) =>
      setByRoom((m) => {
        const cur = m[roomId] || [];
        if (cur.some((x) => x.id === message.id)) return m;
        return { ...m, [roomId]: [...cur, message] };
      });
    const onError = ({ error }: { error: string }) => { setNote(error); window.setTimeout(() => setNote(null), 3500); };
    const onBlocked = ({ reason }: { reason: string }) => { setNote(`Rex binned that — ${reason}.`); window.setTimeout(() => setNote(null), 3500); };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("chat:history", onHistory);
    s.on("chat:msg", onMsg);
    s.on("chat:error", onError);
    s.on("chat:blocked", onBlocked);
    if (s.connected) joinChatRoom(active);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("chat:history", onHistory);
      s.off("chat:msg", onMsg);
      s.off("chat:error", onError);
      s.off("chat:blocked", onBlocked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join whenever the active room changes (and we're connected). History arrives via chat:history.
  useEffect(() => { if (connected) joinChatRoom(active); }, [active, connected]);

  const messages = byRoom[active] || [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, active]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    sendChat(active, text);
    setDraft("");
  }

  const activeTab = rooms.find((r) => r.id === active) || GENERAL;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
      {/* room tabs */}
      <div className="flex items-center gap-1.5 border-b border-line px-2 py-2">
        {rooms.map((r) => {
          const on = r.id === active;
          return (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${on ? "text-white" : "text-muted hover:text-ink"}`}
              style={on ? { background: r.accent } : undefined}
            >
              {r.id === "general" ? "🌍" : "🏠"} {r.name}
            </button>
          );
        })}
        <span className={`ml-auto mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold ${connected ? "text-teal-400" : "text-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-teal-400" : "bg-muted"}`} />
          {connected ? "live" : "connecting…"}
        </span>
      </div>

      {/* messages */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <div className="mt-8 text-center text-sm text-muted">No messages yet — say hi. 👋</div>}
        {messages.map((m) => <Message key={m.id} m={m} meId={me.id} meName={me.username} accent={activeTab.accent} />)}
      </div>

      {/* composer */}
      <div className="flex items-end gap-2 border-t border-line px-3 py-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          maxLength={1000}
          placeholder={`Message ${activeTab.name}…`}
          className="max-h-28 flex-1 resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-primary"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || !connected}
          className="rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2.5 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {note && <div className="border-t border-line bg-canvas/60 px-4 py-2 text-center text-sm font-semibold text-amber-400">{note}</div>}
    </div>
  );
}

function Message({ m, meId, meName, accent }: { m: ChatMessage; meId: string; meName: string; accent: string }) {
  if (m.rex) {
    return (
      <CharacterLine name="Rex" img="/crew/rex-cutout.png" emoji="🦁" accent="rgb(var(--c-primary))">
        <RichText text={m.text} me={meName} />
      </CharacterLine>
    );
  }
  if (m.john) {
    return (
      <CharacterLine name="John" img="/avatars/raccoon.png" emoji="🦝" accent="#ec4899">
        <RichText text={m.text} me={meName} />
      </CharacterLine>
    );
  }
  const mine = m.author?.id && m.author.id === meId;
  const encAccent = enclosureView(m.author?.enclosure ?? null)?.accent || accent;
  return (
    <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <Avatar url={m.author?.avatar ?? null} name={m.author?.username ?? "?"} accent={encAccent} />
      <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
        {!mine && <div className="mb-0.5 text-xs font-bold" style={{ color: encAccent }}>{m.author?.username}</div>}
        <div className={`inline-block rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${mine ? "rounded-br-sm bg-gradient-to-br from-primary to-accent font-medium text-white" : "rounded-bl-sm bg-raised font-medium text-ink"}`}>
          <RichText text={m.text} me={meName} onGradient={!!mine} />
        </div>
        <div className="mt-0.5 text-[10px] text-muted">{timeOf(m.at)}</div>
      </div>
    </div>
  );
}

// Renders @username mentions as highlighted chips. When the mention is the current viewer, it gets a
// stronger "you" highlight so a tagged member notices. `onGradient` softens the chip on a member's own
// gradient bubble so it stays legible.
function RichText({ text, me, onGradient = false }: { text: string; me: string; onGradient?: boolean }) {
  const re = /@([A-Za-z0-9][A-Za-z0-9_.-]{2,19})/g;
  const out: React.ReactNode[] = [];
  let last = 0, key = 0, match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const uname = match[1];
    const isMe = uname.toLowerCase() === (me || "").toLowerCase();
    out.push(
      <span
        key={key++}
        className={
          isMe
            ? "rounded bg-primary px-1.5 py-0.5 font-extrabold text-white"
            : onGradient
              ? "rounded bg-white/25 px-1 font-bold"
              : "rounded bg-primary/15 px-1 font-bold text-primary"
        }
      >
        @{uname}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function Avatar({ url, name, accent }: { url: string | null; name: string; accent: string }) {
  if (url) return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full border object-cover" style={{ borderColor: accent }} />;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-extrabold text-white"
      style={{ borderColor: accent, background: accent }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// An AI-character line (Rex or John): round avatar + a tinted system bubble, so the banter clearly
// reads as the characters, not a member.
function CharacterLine({ name, img, emoji, accent, children }: { name: string; img: string; emoji: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <CharacterDot img={img} emoji={emoji} accent={accent} />
      <div className="rounded-2xl rounded-bl-sm border bg-canvas/70 px-3.5 py-2" style={{ borderColor: `${accent}66` }}>
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{name}</div>
        <div className="text-[15px] font-semibold text-ink">{children}</div>
      </div>
    </div>
  );
}

function CharacterDot({ img, emoji, accent }: { img: string; emoji: string; accent: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-surface text-base" style={{ borderColor: accent }}>{emoji}</span>;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2" style={{ borderColor: accent }}>
      <img src={img} alt="" className="h-full w-full object-cover" onError={() => setOk(false)} />
    </span>
  );
}
