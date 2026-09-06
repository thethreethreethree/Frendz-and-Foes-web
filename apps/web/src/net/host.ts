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
