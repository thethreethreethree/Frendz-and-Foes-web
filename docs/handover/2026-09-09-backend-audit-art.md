# Handover — 2026-09-09 (backend, audits, art bible)

Continues `2026-09-08-session.md`, which covers the Ask John / Kickstarter / SQLite-Phase-1 work.
Everything here is pushed AND verified live unless it says otherwise.

---

## 0. Read this first: run the tests before auditing anything

**This project has a full test suite and I did not run it before auditing.** That cost a false bug
report and a fix for a bug that did not exist.

```bash
npm test        # vitest over packages/engine + 11 node --test files in test/
```

The existing suite contains a test literally named *"murderers win when all villagers are dead even
if the kill target isn't reached (no deadlock)"* and another describing what a wrong vote does.
Reading the engine and reasoning about it produced the OPPOSITE conclusion. Run the tests: they
describe intended behaviour far better than the code does.

**KNOWN BROKEN: `test/sync.test.mjs` hangs and fails.** Confirmed pre-existing by checking out an
older `apps/server/index.js` and reproducing it — it is not from this work. It is the relay's only
integration test (snapshot fan-out, late-join catch-up, pulses), so the relay is effectively
uncovered by the original suite. Not diagnosed.

---

## 1. What shipped

| Commit | What |
|---|---|
| `16f7940` | Phase 1: backers + codes onto SQLite |
| `fd927b4` | Scroll fix: three document pages were unreachable below the fold |
| `5932f07` | Four character bugs (agent mode dead, stripper, drifted personas, missing knowledge) |
| `405d9f0` | Bracketed stage directions |
| `babefa2` | Favicon rebuilt for 16px |
| `f10f28c` `92c4c12` | Founder roster + backer detail view |
| `96f078d` | Code revoke/filter + audit log + a real schema migration |
| `382ca3c` | Phase 2 subscriptions/entitlements + chat onto SQLite |
| `2b7b769` | past_due grace period + chat stats |
| `6f67441` | Entitlement gate (OFF by default) + Stripe config from env + legacy-file report |
| `fd96977` | Audit: 7 bugs across backend and frontend |
| `2fd538f` | Fail-safe restored: a dead database no longer kills the server |
| `336f13d` | Sketch Relay drawings bounded |
| `f40e992` | Host claim: only the real host can write game state |
| `d29a099` | Solo Clue + Ballpark rule bugs |
| `b3e7a3d` | **Correction**: the Murder "vote deadlock" was not real |
| `9ab0c5a` | Art bible generators |

---

## 2. Storage: everything is on SQLite now

All five JSON stores migrated, exports unchanged, `index.js` untouched by the moves:
`backers`, `backer_codes`, `messages` (chat), `users` + `brand_owners` (auth), `brands`.

**THE BUG WORTH REMEMBERING.** Every migration originally guarded on *"is the table empty?"* as a
proxy for *"has this migrated?"*. They are different questions. Empty the table — which an admin
legitimately can — and the next restart re-imports the legacy JSON and **resurrects deleted data**.
Found by the brands test deleting its only brand and restarting.

Migrations now record themselves in a `meta` table (`hasMigrated` / `markMigrated`), and each
BACKFILLS its marker when it finds a non-empty table, because databases already live on the box
migrated before markers existed.

Other things that matter:
- `sqlite.js` is imported **dynamically** by every store, and now by `index.js` too. A static import
  there had quietly broken the documented fail-safe: an unopenable database killed the whole server
  instead of degrading. Founder routes now 503; the games keep running.
- `ensureColumn()` is how any column added after first deploy reaches a live database.
  `CREATE TABLE IF NOT EXISTS` will never add one.
- `redeemCode` claims atomically; the old read-then-write let two signups take one code.
- Legacy JSON is **kept as backup**, never deleted. `GET /api/backer/admin/legacy` reports which
  files still exist and whether their migration is recorded. Each environment has its own database —
  Render's is separate from the box's.

---

## 3. Phase 2: subscriptions

Model and wiring points only; no Stripe integration. `applyStripeEvent()` is the single door.

- **`STRIPE_PRICE_MAP`** env var, e.g. `price_abc:zoo-pass,price_def:founding-animal`. Deliberately
  empty by default — a placeholder would look configured while matching nothing. A typo naming a
  plan that does not exist is dropped with a warning.
- **`STRIPE_WEBHOOK_SECRET`** — until it is set the webhook returns 503. Accepting an unverified
  webhook would let anyone grant themselves a subscription, so it fails CLOSED.
- Signature verification is a plain HMAC in `stripe.js`, no SDK. 18 tests, weighted to the refusals.
- **Entitlements DERIVE expiry** rather than trusting the status column: a missed webhook must not
  grant access forever.
- **`past_due` GRANTS access** (owner's call) — a card that expired keeps playing while Stripe
  retries, but only until the period ends.
- The founder can set a plan by hand, which matters before Stripe exists: Kickstarter rewards are
  fulfilled manually at first.

---

## 4. Security work

- **Admin passcode**: was a plain `===` with NO rate limit guarding 16 founder endpoints. Now
  constant-time with 20 failures / 15 min / IP, counting failures only so the founder is never
  locked out. The two `/api/brand/:slug` routes deliberately call `isSuperadmin(req)` without `res`
  — not being a superadmin is legitimate there.
- **Host claim** (`f40e992`): `role` is declared by the CLIENT, so any page guessing a room code
  could emit `sync` and overwrite a live game. The first socket to claim a room gets a token; only
  it may write. The token OUTLIVES the socket so a dropped host can reclaim; the client keeps it in
  sessionStorage. A denied claimer is downgraded to spectator, which is what makes every ENGINE's
  `socket.data.role === "host"` check safe too — proven in `murderGame.test.mjs`.
- **`ENFORCE_ENTITLEMENTS`** is OFF by default and gates the HOST only. Players scan a QR with no
  account; gating them is unenforceable and wrong for the product. It fails OPEN when the database
  is down.

---

## 5. Tests (ten suites, all passing)

```bash
node apps/server/speech.test.mjs            # 22 — narration AND emphasis, every notation
node apps/server/productKnowledge.test.mjs  # drift vs howtoplay.tsx
node apps/server/chat.test.mjs              # 28 — shapes, order, room access, the 200 cap
node apps/server/subscriptions.test.mjs     # entitlements, derived expiry, price map
node apps/server/stripe.test.mjs            # 18 — mostly refusals
node apps/server/auth.test.mjs              # migration + security behaviour + NO resurrection
node apps/server/telestrations.test.mjs     # 19 — drawing input sanitising
node apps/server/gameLogic.test.mjs         # Solo Clue + Ballpark rules
node apps/server/hostToken.test.mjs         # the impostor attack, over real sockets
node apps/server/murderGame.test.mjs        # a real Murder game, over real sockets
```

**These ARE now in `npm test`** (plus an eleventh, `entitlementGate.test.mjs`, which the list
above had missed). `npm test` is now three named steps so a failure says which layer broke:

```bash
npm run test:engine   # vitest over packages/engine
npm run test:server   # the 11 apps/server suites
npm run test:relay    # the 10 test/ suites
npm run test:sync     # KNOWN BROKEN, hangs, deliberately outside npm test
```

These eleven are plain scripts, not `node:test` files, so `node --test` treats each as ONE test
that passes iff the process exits 0. That is fine — every one of them calls `process.exit(1)` on
failure, and I proved the runner surfaces it by feeding it a deliberately failing file: the run
exits 1 and names the file. A suite wired in without that check would be a green light that
cannot turn red.

**`test/sync.test.mjs` is quarantined** (owner's call). It hangs forever, so leaving it in the
chain meant `npm test` never terminated and NOTHING after it ran. `--test-timeout` does not help:
it bounds `test()` callbacks inside a `node:test` file, not a standalone script's process — an 8s
timeout let a hanging canary run past four minutes. The file carries a banner saying so.

---

## 6. The correction worth reading

`65eb769` reported a Murder Mystery "vote deadlock" and fixed it. `b3e7a3d` reverted it: the bug was
not real. `caught.alive = false` happens ONLY when the person voted out IS a murderer; a wrong
majority CLEARS the suspect and kills nobody, so villagers can never be voted to zero.

The unit test passed because it **re-implemented the rules from the same misreading** and agreed
with itself. A test of re-implemented logic proves the re-implementation, not the engine. That style
is only worth anything for self-contained rules with no engine equivalent.

The socket harness written to CONFIRM the bug is what disproved it, in one run.

---

## 7. Real bugs found and fixed in the audits

Backend: admin brute-force; a custom `DB_PATH` killing the server; the rate-limit map leaking; an
empty legacy file never counting as migrated; Sketch Relay accepting unbounded drawings.

Frontend: four sound buttons rendering with no tone; Ballpark passing `null` into Rex's prompt so he
could announce "null"; three dead comparisons. **The frontend now typechecks clean, 0 errors** — six
known errors used to be noise a real one could hide in.

Game rules: `constructor` beat Solo Clue's cancellation (plain object keyed by player-chosen words —
now a Map); an empty Ballpark round produced `Infinity`.

Checked and clean: Fisher-Yates shuffles, deck exhaustion, rejoin auth in all six engines (crypto
token, correctly refused without it), empty-room cleanup, no server-side timers.

---

## 8. Art bible — 13 artifacts, 393 prompts

Generators in `tools/artbible/` (see its README for the casting table and the measurement).

**The gap, measured:** 41 image references in Murder Mystery, 34 in Trivia, 3 in Bingo, **zero in
the other eleven games** — those screens are text on a shared gradient.

One artifact per game; one card per image; every prompt complete. Bingo's 75 dare cards use the REAL
dare text from `packages/engine/src/bingoDares.ts`, in ball order.

Two mistakes the owner caught, both worth avoiding again: the first attempt used per-SET `{SLOT}`
templates with elided lists (the format he pointed at uses one card per image), and its counter
claimed 338 images while shipping 49 templates. **Look at the rendered page before publishing** — a
silent JS error left the card grid completely empty on one build.

---

## 8b. The bug wiring the suites up immediately found

`test/auth.test.mjs` had been failing for a while and NOBODY COULD SEE IT, because it sat after the
hanging `sync.test.mjs` in the old chain. It isolated `AUTH_DIR` only. That was correct before the
SQLite migration; after it, `AUTH_DIR` controls just the session-secret file and the user records
live in the database at `DB_PATH` — which the test did not isolate. So it wrote its fixtures into
the REAL dev database and then failed on its own duplicate-email assertion from the second run on.

Five fixture users and two `brand_owners` rows were removed from `apps/server/data/playzoo.db`
(every user row in that database was a fixture; `backers` and `brands` were untouched). The test
now sets `DB_PATH` to a temp file, proven by three consecutive clean runs and by the user count
staying at 0 across a full `npm test`.

The general lesson, again: **a test that is never run is not a test.** This one had been red for
days behind a hang, and was quietly corrupting the data it was supposed to be isolated from.

---

## 9. Open

1. **Generate the art.** Owner's chosen order: backdrops + event beats, one game at a time (~9
   images per game, the biggest visible change per image).
2. **Diagnose `test/sync.test.mjs`** — now the only thing standing between the relay and any
   integration coverage. It boots, prints its env line, then stalls before the first assertion.
4. Connect Stripe: set `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_MAP` on the box.
5. Kickstarter still shows the OLD story images; the current set is in
   `C:\Users\johns\OneDrive\Documents\PlayZoo Kickstarter Story`.
6. `crew/rex-warning.png`'s hat badge reads "Rlay2e" — shipped on the owner's explicit call.
7. `/ask-john`'s chat panel is a fixed `h-[30rem]` and reads as half-loaded on arrival.
