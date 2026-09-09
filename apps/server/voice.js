// Shared rules about HOW the characters talk, as opposed to who they are.
//
// Personas live in john.js and host.js and describe character. This file holds the delivery rules
// that must be identical across every surface — because Rex in the game, Rex in a chat, John on the
// waitlist and John on the support desk should sound like the same two people everywhere.
//
// It is a separate module rather than an addition to speech.js on purpose: speech.js contains
// literal NUL bytes as a sentinel (const ELL = "\0E\0", which hides an ellipsis from the punctuation
// repair), so any tool that rewrites that file as text can silently corrupt it. It already nearly
// did. Nothing that does not have to touch it should.

// How long a spoken-aloud reply should be.
//
// WHY THIS EXISTS: Rex's free chat had NO length instruction at all, and John's said only "keep
// replies short" — which a model reads as a suggestion. Both ran to max_tokens: 220, and both
// sounded like written paragraphs rather than someone talking to you.
//
// The rule is NUMBERS, not adjectives. "Short" is an opinion. "Two sentences, under 40 words" is a
// measurement, and a model obeys a measurement.
//
// It also says WHY, because the risk in cutting length is cutting the joke with it. Brevity is not
// a tax on the humour — it is the delivery. A one-line jab lands; the same joke with a setup, an
// aside and a callback is somebody explaining a joke.
//
// The token cap that accompanies this stays ABOVE what a compliant reply needs. Lowering max_tokens
// to force brevity truncates mid-word, which reads as broken rather than as brisk — the failure is
// worse than the problem.
export const BREVITY_RULE = [
  "LENGTH — THIS MATTERS AS MUCH AS THE CONTENT.",
  "Reply in ONE or TWO short sentences. Under 40 words, almost always.",
  "You are TALKING, not writing. Say the one funny, useful thing and stop.",
  "Do NOT pad. Do NOT list. Do NOT restate the question back at them. Do NOT add a closing line",
  "offering further help. Never explain your own joke.",
  "If you have three good lines, pick the best one and bin the other two — the ones you cut are what",
  "make the kept one land.",
  "The ONLY time you may reach three sentences is when you are genuinely losing your temper, and",
  "even then it is a burst, not a speech.",
].join(" ");

// Headroom above a compliant reply, NOT a brake.
//
// Two sentences of about 40 words is roughly 55 tokens. 130 leaves room for a long word or an
// em-dash without ever cutting a sentence in half. The prompt does the shortening; this only stops
// a runaway.
export const CHAT_MAX_TOKENS = 130;
