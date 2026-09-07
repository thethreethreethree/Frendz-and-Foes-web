// Pre-launch access gate (client side). PlayZoo's games are LOCKED until the Kickstarter completes;
// until then every game entry point funnels to /waitlist. The single source of truth is the server
// (GET /api/status → { gamesOpen }), flipped by the GAMES_OPEN env flag on the box. We fetch it once
// at boot, before the router renders, and cache it here.
//
// FAIL CLOSED: the default is locked, and any fetch failure leaves it locked. A launch gate that
// broke open when the status call hiccuped would defeat the whole point — better a stray "join the
// waitlist" than the doors silently swinging open.

let gamesOpen = false;

export function gamesAreOpen(): boolean {
  return gamesOpen;
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
  } catch {
    // network/error → stays locked (fail closed)
  }
}
