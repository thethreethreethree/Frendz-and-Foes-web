// The founder pass: lets the OWNER'S BROWSER into the games while the public gate stays shut.
//
// WHY THIS EXISTS: GAMES_OPEN is all-or-nothing. Before the Kickstarter it is false, so nobody can
// reach a game — which is correct, and the campaign page says so in as many words. But the owner
// still needs to play the thing to test it. Flipping GAMES_OPEN would open the doors to everyone
// and give away exactly what backers are paying for.
//
// HOW: the owner posts the admin passcode once; the server returns a signed, EXPIRING cookie. Both
// gates then honour that cookie — the HTTP status endpoint the front-end reads, and the socket
// handshake that decides whether game handlers get registered at all. Satisfying only one of those
// would let the owner reach a screen the server then ignores.
//
// Signed with the same HMAC shape as the backer session (base64url payload + "." + signature), so
// the cookie cannot be forged without AUTH_SECRET. It carries no identity, only an expiry: this is
// a door key, not an account. The audit's point stands — a shared passcode can never tell you WHICH
// admin acted — and that is a reason to build real accounts later, not a reason to skip the expiry.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSCODE || "playzoo-dev-secret";
export const FOUNDER_COOKIE = "pz_founder";

// Deliberately short. A pass that never expired would be a permanent public-gate bypass sitting in
// whatever browser last used it, including a borrowed laptop.
const PASS_HOURS = 12;

export function makeFounderPass(hours = PASS_HOURS) {
  const payload = Buffer.from(JSON.stringify({ f: 1, exp: Date.now() + hours * 3600_000 })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readFounderPass(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1));
  const expect = Buffer.from(createHmac("sha256", SECRET).update(payload).digest("base64url"));
  if (sig.length !== expect.length || !timingSafeEqual(sig, expect)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!data || data.f !== 1 || typeof data.exp !== "number" || data.exp < Date.now()) return null;
  return { exp: data.exp };
}

/** Parse a raw Cookie header. Works for both Express requests and socket handshakes. */
export function founderFromCookieHeader(header) {
  if (!header || typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === FOUNDER_COOKIE) {
      return readFounderPass(decodeURIComponent(part.slice(i + 1).trim()));
    }
  }
  return null;
}

export function founderCookie(token, secure = true) {
  return `${FOUNDER_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${PASS_HOURS * 3600}${secure ? "; Secure" : ""}`;
}

export function clearFounderCookie(secure = true) {
  return `${FOUNDER_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export const FOUNDER_PASS_HOURS = PASS_HOURS;
