// Chat moderation — a blunt guard for the backer chats. The bar is deliberately narrow: this blocks
// hate slurs and a few targeted-abuse phrases, NOT casual swearing (PlayZoo is an adult, sweary-
// cartoon crowd). Rex steps in when it trips (see the chat handlers). It's a first line, not a court.
//
// Two matchers, to catch obfuscation WITHOUT false-positiving innocent words:
//   1. STREAM — collapse the whole message to a letter stream (undo leetspeak + strip separators) and
//      look for a few unambiguous, long slurs people space out to sneak past filters.
//   2. TOKEN — split into words, normalize each, and match collision-prone short roots ONLY as whole
//      words. This is why "raccoon" (our mascot), "spicy", "gobbledygook" etc. are NOT flagged.

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "i" };

function normalize(text) {
  let out = "";
  for (const ch of String(text || "").toLowerCase()) out += LEET[ch] ?? ch;
  return out.replace(/[^a-z]/g, "");
}

// Long, low-collision slurs + abuse phrases — matched anywhere in the collapsed stream so "n-i-g-g-e-r"
// and "k y s" are caught. (Rare innocent collisions like "niggardly" are an accepted trade-off.)
const STREAM = ["nigger", "nigga", "faggot", "kike", "tranny", "kys", "killyourself", "killurself", "wetback", "beaner", "raghead"];

// Collision-prone short slurs — matched ONLY as standalone words (so raccoon/spicy/despicable pass).
const TOKENS = new Set(["coon", "spic", "gook", "chink", "dyke", "fag", "paki", "retard", "retarded", "cripple", "spaz"]);

export function screen(text) {
  const stream = normalize(text);
  if (!stream) return { ok: true };
  for (const s of STREAM) if (stream.includes(s)) return { ok: false, reason: "hate speech or a slur" };
  for (const raw of String(text || "").toLowerCase().split(/[^a-z0-9@$!|]+/)) {
    if (TOKENS.has(normalize(raw))) return { ok: false, reason: "a slur" };
  }
  return { ok: true };
}
