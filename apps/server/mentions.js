// @mention helpers shared by the reactive character replies (index.js) and the banter engine
// (banter.js). Two jobs: work out whether a member's message is addressed to Rex or John, and make
// sure a character's line actually @tags the person it's talking to (so they get pinged).

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Which character is a member's message addressed to? Explicit @tags win; then bare names. Rex is the
// host so he takes priority when it's ambiguous. Returns "rex" | "john" | null.
// NOTE: a member could be named "john" (same as the raccoon) — we accept that collision; tagging
// @john pings the member visually AND wakes the character, which is on-brand chaos.
export function addressedCharacter(text) {
  const t = String(text || "").toLowerCase();
  if (/@rex\b/.test(t)) return "rex";
  if (/@john\b/.test(t)) return "john";
  if (/\brex\b/.test(t)) return "rex";
  if (/\bjohn\b/.test(t)) return "john";
  return null;
}

// Ensure `text` @tags `username`. If it already has @username, leave it. If it names them without the
// @, add it. Otherwise prepend the tag so the person is always pinged.
export function ensureTag(text, username) {
  const u = String(username || "").trim();
  const t = String(text || "");
  if (!u) return t;
  if (new RegExp(`@${escapeRe(u)}\\b`, "i").test(t)) return t;
  const bare = new RegExp(`\\b${escapeRe(u)}\\b`, "i");
  if (bare.test(t)) return t.replace(bare, `@${u}`);
  return `@${u} ${t}`;
}
