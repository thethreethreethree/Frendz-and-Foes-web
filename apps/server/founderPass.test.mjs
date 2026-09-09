// The founder pass is a deliberate hole in the pre-launch gate, so it gets tested like one.
// Weighted to the REFUSALS: anything that wrongly returns a valid pass opens the games to the
// public before the Kickstarter, which is the one thing the gate exists to prevent.
process.env.AUTH_SECRET = "founder-pass-test-secret";
const m = await import("./founderPass.js");

let fails = 0;
const check = (label, ok) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); };

const good = m.makeFounderPass();
check("a freshly minted pass verifies", !!m.readFounderPass(good));
check("it carries an expiry in the future", m.readFounderPass(good).exp > Date.now());

// --- refusals ---
check("a tampered signature is refused", m.readFounderPass(good.slice(0, -1) + "x") === null);
check("a tampered payload is refused", m.readFounderPass("x" + good.slice(1)) === null);
check("garbage is refused", m.readFounderPass("garbage") === null);
check("an empty string is refused", m.readFounderPass("") === null);
check("null is refused", m.readFounderPass(null) === null);
check("a non-string is refused", m.readFounderPass({}) === null);
check("a token with no dot is refused", m.readFounderPass("abcdef") === null);
check("an EXPIRED pass is refused", m.readFounderPass(m.makeFounderPass(-1)) === null);

// A pass signed with a DIFFERENT secret must not verify -- otherwise anyone who guessed the format
// could mint their own.
const { createHmac } = await import("node:crypto");
const payload = Buffer.from(JSON.stringify({ f: 1, exp: Date.now() + 3600_000 })).toString("base64url");
const forged = payload + "." + createHmac("sha256", "not-the-secret").update(payload).digest("base64url");
check("a pass signed with the wrong secret is refused", m.readFounderPass(forged) === null);

// A validly signed token that is NOT a founder pass (missing the marker) must not open the gate.
const notFounder = Buffer.from(JSON.stringify({ uid: "u1", exp: Date.now() + 3600_000 })).toString("base64url");
const wrongKind = notFounder + "." + createHmac("sha256", "founder-pass-test-secret").update(notFounder).digest("base64url");
check("a correctly signed NON-founder token is refused", m.readFounderPass(wrongKind) === null);

// --- cookie header parsing (used by BOTH the HTTP gate and the socket handshake) ---
check("finds the pass among other cookies", !!m.founderFromCookieHeader(`a=1; ${m.FOUNDER_COOKIE}=${good}; b=2`));
check("finds it when it is the only cookie", !!m.founderFromCookieHeader(`${m.FOUNDER_COOKIE}=${good}`));
check("ignores a different cookie name", m.founderFromCookieHeader(`pz_backer=${good}`) === null);
check("handles a missing header", m.founderFromCookieHeader(undefined) === null);
check("handles an empty header", m.founderFromCookieHeader("") === null);
check("a bad value in the right cookie is refused", m.founderFromCookieHeader(`${m.FOUNDER_COOKIE}=nonsense`) === null);

// --- cookie flags: this is a credential ---
const c = m.founderCookie(good, true);
check("cookie is HttpOnly", c.includes("HttpOnly"));
check("cookie is SameSite=Lax", c.includes("SameSite=Lax"));
check("cookie is Secure over https", c.includes("; Secure"));
check("cookie is NOT Secure over plain http (dev)", !m.founderCookie(good, false).includes("; Secure"));
check("cookie expires rather than living forever", /Max-Age=\d+/.test(c) && !c.includes("Max-Age=0"));
check("revoking clears it", m.clearFounderCookie(true).includes("Max-Age=0"));
check("the pass is short-lived (<= 24h)", m.FOUNDER_PASS_HOURS <= 24);

console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURE(S)"}`);
process.exit(fails === 0 ? 0 : 1);
