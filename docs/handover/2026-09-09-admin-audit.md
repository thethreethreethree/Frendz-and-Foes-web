# Admin system audit — 2026-09-09

Ground-up audit (CLAUDE.md §1.7) of the founder/admin surface: the `/founder` page, the `/admin`
brand tool, and the sixteen server endpoints behind the shared passcode.

`npm test` was run FIRST and was green (exit 0, 43s) — the discipline from the false Murder-deadlock
bug. Every finding below was **reproduced against a running server**, not inferred from reading code.

---

## Verdict

The guard itself is sound. The four defects are around it: one that lies to the founder during an
outage, one path where the passcode hardening was missed, and two of low consequence.

| # | Severity | Finding | Proven how |
|---|---|---|---|
| 1 | **HIGH (operational)** | A dead database renders as "No backers yet" / "No codes yet — mint some above" | Ran the server against an unopenable DB |
| 2 | **MEDIUM (security)** | Signup's founder bypass uses `===` on the passcode with NO rate limit | 30 wrong guesses, all accepted for processing |
| 3 | LOW-MED (latent) | `/api/backer/subscription` reads `req.cookies`; no cookie-parser is mounted → always 401 | Probed Express with this exact middleware stack |
| 4 | LOW (noise) | `isSuperadmin` ignores `rateLimited`'s return → `ERR_HTTP_HEADERS_SENT` after the 20th failure | Tripped the limit, read the server log |
| 5 | LOW (accountability) | An admin renaming a backer is indistinguishable from the backer renaming themselves | Read the log calls |

---

## 1. HIGH — the founder page lies when the database is down

The dead-database fail-safe works *at the server*: the process stays up, games keep running, and the
admin endpoints degrade to `200 {"ready": false, "users": []}` instead of throwing. That was the
correct design decision and it holds.

**But the founder UI never reads `ready`.** Grep it: `apps/web/src/routes/FounderRoute.tsx` and
`apps/web/src/net/*.ts` do not reference the flag anywhere. So an empty list from a broken database
is rendered by the same branch as an empty list from a healthy one:

```
FounderRoute.tsx:182   "No codes yet — mint some above."
FounderRoute.tsx:254   "No backers yet — they appear here once someone redeems a code at /club."
```

Measured against a server pointed at an unopenable `DB_PATH`:

```
/api/brands                 200  {"ready":false,"brands":[]}
/api/backer/codes           200  {"ready":false,"codes":[]}
/api/backer/admin/users     200  {"ready":false,"users":[]}
/api/backer/admin/chat      200  {"ready":false,"rooms":[]}
/api/backer/admin/events    503  {"error":"The database is unavailable right now."}
```

Why this is the worst one on the list: during a real outage the founder opens `/founder`, sees a
confident "No backers yet", and reasonably concludes the backer data is gone. The codes panel goes
further and **invites the destructive action** — "mint some above" — which during an outage is
exactly the wrong move. Note `/admin/events` is the one endpoint that answers honestly, because it
uses `needDb`; the inconsistency is itself the tell.

The fix is small and belongs in the UI, not the server: render a "database unavailable" state when
`ready === false`, and hide the mint control behind it.

---

## 2. MEDIUM — the signup bypass skips both passcode defences

`POST /api/auth/signup` lets the founder create an account while public signups are closed:

```js
const founder = !!(process.env.ADMIN_PASSCODE && req.body && req.body.passcode === process.env.ADMIN_PASSCODE);
```

That is a plain `===`, and this route has **no rate limiting at all**. Both of the protections added
to `isSuperadmin` are absent here — and it is the *same passcode* that unlocks all sixteen founder
endpoints, so this route is a guessing oracle for the whole admin surface.

Measured:

```
30 wrong-passcode signup attempts  ->  403 403 403 ... 403   (no 429, ever)
correct passcode                   ->  200 {"user":{...}}    (gate bypassed, account created)
```

Compare the header path, also measured, which behaves correctly:

```
attempts 1-19 -> 401     attempt 20+ -> 429     correct passcode after lockout -> 200 (founder never locked out)
```

Two things make this less than critical: the live site is HTTPS with a 301 from HTTP (verified), so
the passcode is not in the clear, and the passcode itself is a reasonable passphrase rather than a
short PIN. It is still the one place the hardening was missed, and the asymmetry is indefensible —
20 tries per 15 minutes on one door, unlimited on the other to the same building.

---

## 3. LOW-MED — an endpoint that can never succeed

```js
app.get("/api/backer/subscription", (req, res) => {
  const sess = readBackerSession(req.cookies?.[BACKER_COOKIE]);   // <- req.cookies
```

**No cookie-parser is mounted.** `index.js` uses only `express.json()` and static middleware. Proven
with a control server running that exact stack:

```json
{ "hasCookiesProp": false, "reqCookies": "undefined", "rawHeader": "pz_backer=abc123; other=1" }
```

So `req.cookies` is always `undefined`, and this route always answers `401 Not signed in` even for a
correctly signed-in backer. Every other route reads cookies via `parseCookies(req.headers.cookie)`;
this is the only one that does not.

Severity is held down by one fact worth stating plainly: **nothing calls it.** No frontend caller
exists, so no user is hitting this today. It is a trap for whoever next wires "your plan" into the
club UI and spends an afternoon on a mystery 401.

---

## 4. LOW — error spam once the rate limit trips

`isSuperadmin` calls the limiter but discards its answer:

```js
if (res) rateLimited(req, res, "adminpass", 20, 15 * 60_000);   // return value ignored
return false;                                                    // caller then sends its own 401
```

`rateLimited` already sent a 429 and returned `true`. The caller then runs
`res.status(401).json(...)` on a finished response. Reproduced — after the 20th failure every
request logs:

```
Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
```

The client is unaffected: the first response wins, so the attacker correctly receives 429. This is
log noise, not broken behaviour. It matters only because noise is where a real error goes to hide.

---

## 5. LOW — the audit log cannot tell admin from user

`POST /api/backer/admin/users/:id` renames a backer through the same `updateBacker()` the backer's
own profile page uses, so both write `backer.update`. Reading the log later, a founder-initiated
rename is indistinguishable from the person renaming themselves.

`admin.password_cleared` IS distinctly logged, which shows the intent was there — this is a gap, not
a design choice. Note also that a shared passcode means the log can never name *which* admin acted;
that is inherent to the current auth model and is only worth solving if more than one person ever
gets the passcode.

---

## Checked and clean — do not re-audit these

- **All sixteen admin endpoints call `isSuperadmin(req, res)`.** Enumerated route by route; no gaps.
  The two `/api/brand/:slug` writes deliberately call `isSuperadmin(req)` without `res`, which is
  correct — not being a superadmin is a legitimate state there.
- **Constant-time compare** via sha256 digests plus an explicit length check, so neither content nor
  length short-circuits.
- **Failure-only rate limiting works and the founder is never locked out** — verified by tripping the
  limit with 24 wrong guesses, then succeeding with the correct passcode.
- **No mass assignment**: the user mutation destructures exactly `{ username, clearPassword }`.
- **HTTPS is live** with an HTTP→HTTPS 301. The code comment "until real accounts land with HTTPS"
  is now stale and should be deleted so it stops implying an exposure that no longer exists.
- **The passcode travels only as `x-admin-passcode` to the same origin**, and the input is
  `type="password"`. It is written to `localStorage` only when the founder ticks "remember" — an
  opt-in convenience, worth knowing but not a defect.
- **The rate-limit map is swept** (`sweepAuthHits`), so it cannot grow without bound.
- **The live admin system works**: passcode set on the box, wrong rejected, correct accepted,
  `ready: true`.
- **`/api/my/brands` is properly authenticated** by `sessionUser(req)`, not the passcode.

---

## Method note

The dead-database check is the one that changed my mind mid-audit. Reading the route list, the
endpoints without `needDb` looked like a bug — a dead database would 500. Running them showed the
opposite: they degrade politely. The actual defect was one layer up, in a UI that treats a polite
degradation as good news. Reading the code would have produced a confident wrong finding, which is
the failure this project keeps paying for.
