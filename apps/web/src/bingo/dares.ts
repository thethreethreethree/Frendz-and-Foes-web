import { DEFAULT_DARES, PARTY_DARES } from "@ff/engine";

// WHICH BINGO DECK THIS BUILD SHIPS.
//
// The two deployments run the same `main` branch but are NOT the same environment. Render is the
// owner's testing mirror (render.yaml already scopes GAMES_OPEN=true to it alone, with the note
// that "the Hetzner box reads its own environment from a systemd drop-in and never looks at this
// file"). playzoo.snapaweb.com is the public box.
//
// The owner's new dare deck is to run on RENDER ONLY for now. render.yaml sets
// VITE_BINGO_DARES=party, which Vite bakes in at build time on that host; the Hetzner build never
// sees the variable and therefore keeps the original deck. Same seam, same precedent, one line.
//
// WHY BUILD-TIME AND NOT hostname SNIFFING. A `location.hostname.includes("onrender")` check would
// put deployment policy inside render code, ship BOTH decks to every visitor, and silently do the
// wrong thing on a preview URL, a custom domain or localhost. A build flag is decided once, by the
// host that is actually doing the deploying, and is visible in the file that configures it.
//
// TO PUT THIS DECK ON THE PUBLIC SITE TOO: change the default below to PARTY_DARES (and then the
// flag is no longer doing anything and can go). That is the owner's call, not this file's.
const WANTS_PARTY = import.meta.env.VITE_BINGO_DARES === "party";

/** The dare deck this build calls. Pass it to dareForBall(id, ACTIVE_DARES). */
export const ACTIVE_DARES: string[] = WANTS_PARTY ? PARTY_DARES : DEFAULT_DARES;

/** Which deck this build is running — surfaced to the host so the mirror is never a mystery. */
export const ACTIVE_DARES_NAME = WANTS_PARTY ? "party" : "standard";
