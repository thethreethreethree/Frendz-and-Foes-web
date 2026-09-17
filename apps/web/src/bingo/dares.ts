import { DEFAULT_DARES } from "@ff/engine";

// WHICH BINGO DARE DECK THIS SITE CALLS.
//
// The owner's written deck (docs/party-dares.md) runs on the RENDER MIRROR ONLY. The public box,
// playzoo.snapaweb.com, keeps the deck it already had.
//
// WHY THE SERVER DECIDES AND NOT THE BUILD. Both hosts deploy from the same branch, so something
// must tell them apart. The first attempt was a build-time flag in render.yaml, beside the
// GAMES_OPEN that file already scopes to Render — and it did not work: that service is not
// blueprint-synced, so a variable added to render.yaml is ignored. Verified, not assumed: after
// that deploy Render served a bundle BYTE-IDENTICAL to the public one. `RENDER=true` is injected
// into every Render service automatically, needs no dashboard, and exists nowhere else, so the
// server reports the answer on /api/status — a request the client already makes at boot (see
// net/gate.ts), so this costs no extra round trip.
//
// WHY THE PARTY DECK IS A DYNAMIC IMPORT. A static import would bundle all 75 of the owner's dares
// into the public site too — never displayed, but sitting in the JavaScript for anyone who looked.
// Importing it only when the server asks for it keeps it in a separate chunk that the public build
// never fetches, which is what "not on playzoo" should actually mean. It is why PARTY_DARES is
// deliberately NOT re-exported from @ff/engine.

let deck: string[] = DEFAULT_DARES;
let deckName = "standard";

/**
 * Load the deck this host calls. Awaited once at boot, before first render, alongside the gate —
 * so every surface can read activeDares() synchronously and never flashes the wrong deck.
 */
export async function loadDares(name: string | undefined): Promise<void> {
  // A build-time pin still wins, so any host can be forced either way without touching the server.
  const want = (import.meta.env.VITE_BINGO_DARES as string) || name || "standard";
  if (want !== "party") return; // default deck is already loaded; nothing to fetch
  try {
    const mod = await import("@ff/engine/party");
    deck = mod.PARTY_DARES;
    deckName = "party";
  } catch {
    // Fail to the deck we already have. A chunk that will not load must not take Bingo down with
    // it -- a host mid-party needs SOME dare on the screen far more than the right one.
  }
}

/** The dare deck this host calls. Pass it: dareForBall(id, activeDares()). */
export function activeDares(): string[] {
  return deck;
}

/** Which deck is live — so the mirror is never a mystery when the two sites disagree. */
export function activeDaresName(): string {
  return deckName;
}
