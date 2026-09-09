// NOTE: `ready` is the server saying whether the DATABASE is reachable. When it is false the
// endpoints still answer 200 with an EMPTY list (a deliberate fail-safe: the games keep running
// while the founder tools degrade). These helpers used to drop that flag, so the founder page
// rendered "No backers yet" during an outage -- confident, reassuring, and wrong.
// Client helpers for the founder admin page. The founder passcode is sent as the x-admin-passcode
// header to the existing superadmin endpoints (see apps/server/index.js). It's held in the page's
// memory (optionally remembered on-device); never sent anywhere but these same-origin admin calls.

export interface CodeRow {
  code: string;
  note: string;
  created: number;
  state: "valid" | "used" | "revoked";
  redeemedBy: string | null;
  redeemedAt: number | null;
  revokedAt?: number | null;
}

function headers(passcode: string) {
  return { "content-type": "application/json", "x-admin-passcode": passcode };
}

// Validate the passcode by listing codes. Returns the rows, or an error (e.g. wrong passcode).
export async function listCodes(passcode: string): Promise<{ codes?: CodeRow[]; ready?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/backer/codes", { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (!res.ok) return { error: "Couldn't load codes — try again." };
    const data = await res.json();
    return { codes: Array.isArray(data.codes) ? data.codes : [], ready: data.ready !== false };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

export async function mintCodes(passcode: string, count: number, note: string): Promise<{ codes?: string[]; error?: string }> {
  try {
    const res = await fetch("/api/backer/codes", {
      method: "POST",
      headers: headers(passcode),
      body: JSON.stringify({ count, note }),
    });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Couldn't mint codes." };
    return { codes: Array.isArray(data.codes) ? data.codes : [] };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// --- Backers (admin dashboard) ------------------------------------------------------------------
// The roster deliberately carries no avatars: they are data URLs up to 300KB each, so a list view
// would pull megabytes it never renders. `hasAvatar` is enough to show a marker.

export interface BackerRow {
  id: string;
  username: string;
  code: string | null;
  fullName: string | null;
  country: string | null;
  enclosure: string | null;
  created: number;
  hasPassword: boolean;
  hasAvatar: boolean;
}

export async function listBackers(passcode: string): Promise<{ users?: BackerRow[]; ready?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/backer/admin/users", { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (!res.ok) return { error: "Couldn't load backers — try again." };
    const data = await res.json();
    return { users: Array.isArray(data.users) ? data.users : [], ready: data.ready !== false };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// One backer in full, avatar included — the detail view. Separate from the roster on purpose: the
// list omits avatars so it stays small, and this fetches the heavy field only for the row you opened.
export interface BackerDetail extends Omit<BackerRow, "fullName" | "country"> {
  fullName: string | null;
  country: string | null;
  dob?: string | null;
  avatar: string | null;
}

export async function getBackerDetail(passcode: string, id: string): Promise<{ user?: BackerDetail; error?: string }> {
  try {
    const res = await fetch(`/api/backer/admin/users/${encodeURIComponent(id)}`, { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (res.status === 404) return { error: "That account no longer exists." };
    if (!res.ok) return { error: "Couldn't load that backer." };
    const data = await res.json();
    return { user: data.user };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// Edit a backer. Only what the founder may legitimately change: rename, or clear a forgotten
// password (which does NOT set a new one — their backer code still logs them in, so they are never
// locked out, and the founder never knows anyone's password).
export async function editBacker(
  passcode: string,
  id: string,
  patch: { username?: string; clearPassword?: boolean },
): Promise<{ user?: BackerDetail; error?: string }> {
  try {
    const res = await fetch(`/api/backer/admin/users/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: headers(passcode),
      body: JSON.stringify(patch),
    });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Couldn't save that change." };
    return { user: data.user };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// Take an unredeemed code out of circulation, or put it back. A REDEEMED code cannot be revoked —
// it is somebody's login key — and the server refuses with a message saying so.
export async function setCodeRevoked(passcode: string, code: string, revoked: boolean): Promise<{ codes?: CodeRow[]; error?: string }> {
  try {
    const res = await fetch("/api/backer/codes/revoke", {
      method: "POST", headers: headers(passcode), body: JSON.stringify({ code, revoked }),
    });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Couldn't change that code." };
    return { codes: data.codes };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// --- Audit log ----------------------------------------------------------------------------------
export interface EventRow {
  id: number;
  ts: number;
  type: string;
  actorId: string | null;
  data: Record<string, unknown> | null;
}

export async function listEvents(passcode: string, opts: { limit?: number; before?: number; type?: string } = {})
  : Promise<{ events?: EventRow[]; types?: { type: string; count: number }[]; error?: string }> {
  try {
    const q = new URLSearchParams();
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.before) q.set("before", String(opts.before));
    if (opts.type) q.set("type", opts.type);
    const res = await fetch(`/api/backer/admin/events?${q}`, { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (!res.ok) return { error: "Couldn't load the audit log." };
    const data = await res.json();
    return { events: data.events || [], types: data.types || [] };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

// --- Subscriptions ------------------------------------------------------------------------------
// The founder can set a plan by hand. That matters BEFORE Stripe exists: Kickstarter rewards get
// fulfilled manually at first, and afterwards this is the override for when the payment provider
// and reality disagree.

export interface Plan {
  id: string; price: string; name: string;
  months: number; games: number | "all"; customCharacters: number; blurb: string;
}

export interface SubscriptionRow {
  id: string;
  backerId: string;
  plan: string | null;
  status: "none" | "active" | "trialing" | "past_due" | "canceled";
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  currentPeriodEnd: number | null;
  created: number;
  updated: number;
}

export async function listSubscriptions(passcode: string)
  : Promise<{ subscriptions?: SubscriptionRow[]; plans?: Record<string, Plan>; error?: string }> {
  try {
    const res = await fetch("/api/backer/admin/subscriptions", { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (!res.ok) return { error: "Couldn't load subscriptions." };
    const data = await res.json();
    return { subscriptions: data.subscriptions || [], plans: data.plans || {} };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}

export async function setSubscription(
  passcode: string, backerId: string,
  patch: { plan?: string | null; status?: string; currentPeriodEnd?: number | null },
): Promise<{ subscription?: SubscriptionRow; error?: string }> {
  try {
    const res = await fetch(`/api/backer/admin/subscriptions/${encodeURIComponent(backerId)}`, {
      method: "POST", headers: headers(passcode), body: JSON.stringify(patch),
    });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || "Couldn't save that subscription." };
    return { subscription: data.subscription };
  } catch {
    return { error: "Network hiccup — try again." };
  }
}
