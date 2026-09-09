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

// Edit profile — pass only what changed. `avatar: null` removes the picture; omit it to keep it.
export async function updateProfile(patch: { username?: string; avatar?: string | null }): Promise<{ backer?: Backer; error?: string }> {
  return postJson("/api/backer/profile", patch);
}

export async function backerLogout(): Promise<void> {
  try { await fetch("/api/backer/logout", { method: "POST", credentials: "include" }); } catch { /* ignore */ }
}

// ---- The Sorting ----
export interface SortAnswer { text: string; quip: string }
export interface SortQuestion { q: string; answers: SortAnswer[] }
// The enclosure object the server returns after sorting (from apps/server/enclosures.js).
export interface EnclosureResult {
  id: string; name: string; temperament: string; motto: string; accent: string; banner: string; blurb: string;
}

export async function fetchSortQuestions(): Promise<SortQuestion[]> {
  try {
    const res = await fetch("/api/backer/sort/questions", { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.questions) ? data.questions : [];
  } catch {
    return [];
  }
}

export async function submitSort(answers: number[]): Promise<{ enclosure?: EnclosureResult; alreadySorted?: boolean; error?: string }> {
  return postJson("/api/backer/sort", { answers });
}

// --- Which games did you choose? ----------------------------------------------------------------
// The tiers sell "any five games you choose" (any ten at $30, every game at $50). The server owns
// the allowance — it reads it from the plan on every request — so this type mirrors what it sends
// rather than working any of it out here.
export type PickState = {
  ready: boolean;
  active: boolean;
  allGames: boolean;
  allowance: number | "all";
  chosen: string[];
  remaining: number | "all";
  overAllowance: boolean;
  games: string[];          // the catalogue, so the chooser never hardcodes a second game list
};

// A discriminated union, deliberately: with `error?: string` ON PickState, `"error" in result` does
// not narrow, so a caller handling the failure still sees `string | undefined` and has to cast. The
// two outcomes are genuinely different shapes, so the type says so.
export type PickResult = PickState | { error: string };

export async function myGames(): Promise<PickResult> {
  try {
    const res = await fetch("/api/backer/games", { credentials: "same-origin" });
    if (res.status === 401) return { error: "Sign in to choose your games." };
    if (!res.ok) return { error: "Couldn't load your games — try again." };
    return await res.json();
  } catch { return { error: "Network hiccup — try again." }; }
}

export async function setGamePick(game: string, pick: boolean): Promise<PickResult> {
  try {
    const res = await fetch("/api/backer/games", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game, pick }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { error: d.error || "Couldn't save that." };
    return d;
  } catch { return { error: "Network hiccup — try again." }; }
}
