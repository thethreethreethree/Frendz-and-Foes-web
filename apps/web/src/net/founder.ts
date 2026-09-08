// Client helpers for the founder admin page. The founder passcode is sent as the x-admin-passcode
// header to the existing superadmin endpoints (see apps/server/index.js). It's held in the page's
// memory (optionally remembered on-device); never sent anywhere but these same-origin admin calls.

export interface CodeRow {
  code: string;
  note: string;
  created: number;
  state: "valid" | "used";
  redeemedBy: string | null;
  redeemedAt: number | null;
}

function headers(passcode: string) {
  return { "content-type": "application/json", "x-admin-passcode": passcode };
}

// Validate the passcode by listing codes. Returns the rows, or an error (e.g. wrong passcode).
export async function listCodes(passcode: string): Promise<{ codes?: CodeRow[]; error?: string }> {
  try {
    const res = await fetch("/api/backer/codes", { headers: headers(passcode) });
    if (res.status === 401) return { error: "That admin passcode isn't right." };
    if (!res.ok) return { error: "Couldn't load codes — try again." };
    const data = await res.json();
    return { codes: Array.isArray(data.codes) ? data.codes : [] };
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
