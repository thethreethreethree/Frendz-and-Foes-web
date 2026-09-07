// Client helper for Rex, the AI host. Posts a game "moment" to the server, which returns one line
// of MC banter (Claude, or a canned line). Best-effort: returns null on any failure.
export interface HostPayload {
  room?: string;
  game: string;
  moment: string;
  detail?: Record<string, string | number | undefined>;
}

export async function askHost(payload: HostPayload): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch("/api/host", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.line === "string" ? data.line : null;
  } catch {
    return null;
  }
}

// A single turn in a Rex conversation. Kept text-only + role-tagged so a future voice layer
// (11Labs TTS/STT) can read replies aloud and feed transcribed speech straight back in.
export interface RexMessage {
  role: "user" | "assistant";
  content: string;
}

// Free-form chat with Rex: send the recent history, get his next reply. Returns null on any
// failure so the UI can show a graceful fallback rather than break.
export async function chatWithRex(messages: RexMessage[], room?: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch("/api/rex-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, messages }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.reply === "string" ? data.reply : null;
  } catch {
    return null;
  }
}
