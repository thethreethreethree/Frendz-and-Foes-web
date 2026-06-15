# Frendz & Foes — web edition

A Family-Feud-style survey game show. Survey questions, up to 12 teams, 2 rounds + a bonus
round, run from a host's phone that drives a big-screen display in real time.

## Structure (npm workspaces)

- `packages/engine` — pure, framework-free game engine + scoring rules (unit-tested with vitest)
- `apps/web` — React + Vite + Tailwind front-end (display screen + host controller)
- `apps/server` — Socket.IO relay that keeps the host phone and the display in sync

The host phone is the source of truth; the display and any spectators just follow. See the
hash routes: `#/` (home), `#/display` (big screen), `#/control` (host phone).

## Run locally

```bash
npm install
npm run dev:server   # relay on :8787
npm run dev:web      # app on :5173 (open #/display here, pair the phone)
```

Or production-style (one server serves the app + sockets on :8787):

```bash
npm run build
npm start
```

Then open `http://<your-LAN-ip>:8787/#/display` and pair a phone by scanning the QR.

## Tests

```bash
npm test         # engine scoring rules (vitest)
npm run test:sync  # relay server integration (node:test)
```

## Deploy

Includes a `render.yaml` blueprint: connect the repo on [Render](https://render.com) as a
Blueprint and it builds the front-end and runs the relay as one free web service. Real-time
sync works because the server serves the app and the sockets on the same origin.
