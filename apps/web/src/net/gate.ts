// Pre-launch access gate (client side). PlayZoo's games are LOCKED until the Kickstarter completes;
// until then every game entry point funnels to /waitlist. The single source of truth is the server
// (GET /api/status → { gamesOpen }), flipped by the GAMES_OPEN env flag on the box. We fetch it once
// at boot, before the router renders, and cache it here.
//
// FAIL CLOSED: the default is locked, and any fetch failure leaves it locked. A launch gate that
// broke open when the status call hiccuped would defeat the whole point — better a stray "join the
// waitlist" than the doors silently swinging open.

let gamesOpen = false;
// Set when THIS BROWSER holds a valid founder pass. The cookie itself is HttpOnly and signed, so
// this flag is only a mirror of what the server already decided -- flipping it in devtools buys
// nothing, because the socket checks the same cookie before it registers a single game handler.
let founderPass = false;

export function gamesAreOpen(): boolean {
  return gamesOpen || founderPass;
}

/** True when the games are reachable only because of the founder pass -- the UI says so out loud. */
export function isFounderPass(): boolean {
  return founderPass && !gamesOpen;
}

// Read the gate from the server. Call once at boot and await it before first render so the router
// and home page see the right value immediately (no flash of unlocked UI).
export async function fetchGate(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch("/api/status", { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return; // stays locked
    const data = await res.json();
    gamesOpen = data && data.gamesOpen === true;
    founderPass = data && data.founder === true;
  } catch {
    // network/error → stays locked (fail closed)
  }
}

/** Re-read the gate after unlocking the founder pass, so the router sees it without a reload. */
export async function refreshGate(): Promise<boolean> {
  await fetchGate();
  return gamesAreOpen();
}
