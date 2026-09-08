// Client helpers for the backers-only club: code check, Rex-run signup, login, session. Cookies are
// HttpOnly and set by the server, so every call uses credentials: "include". Shapes mirror the
// /api/backer/* endpoints in apps/server/index.js.

export interface Backer {
  id: string;
  username: string;
  fullName: string;
  dob: string;
  country: string;
  avatar: string | null;
  enclosure: string | null;
  hasPassword: boolean;
  created: number;
}

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || "Something went wrong. Try again." };
  return data;
}

// Who's signed in (null if not). Best-effort — never throws.
export async function backerMe(): Promise<Backer | null> {
  try {
    const res = await fetch("/api/backer/me", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.backer || null;
  } catch {
    return null;
  }
}

// Is this a genuine, unused backer code? (Rex uses this before starting signup.)
export async function checkBackerCode(code: string): Promise<{ valid: boolean; state?: string }> {
  try {
    const res = await fetch("/api/backer/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return { valid: false };
    return await res.json();
  } catch {
    return { valid: false };
  }
}

export interface SignupPayload {
  code: string;
  username: string;
  fullName: string;
  dob: string;
  country: string;
  avatar: string | null;
}

export async function backerSignup(p: SignupPayload): Promise<{ backer?: Backer; error?: string }> {
  return postJson("/api/backer/signup", p);
}

export async function backerLogin(creds: { code?: string; username?: string; password?: string }): Promise<{ backer?: Backer; error?: string }> {
  return postJson("/api/backer/login", creds);
}

export async function backerSetPassword(password: string): Promise<{ ok?: boolean; error?: string }> {
  return postJson("/api/backer/password", { password });
}

export async function backerLogout(): Promise<void> {
  try { await fetch("/api/backer/logout", { method: "POST", credentials: "include" }); } catch { /* ignore */ }
}
