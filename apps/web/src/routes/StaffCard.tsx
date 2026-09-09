// The Staff panel on /founder — named admin accounts and what each one may do.
//
// WHY IT MATTERS: before this, everyone shared one passcode. The audit log could not say who acted,
// and access could not be revoked from one person without changing the passcode for everybody. That
// history is not repairable afterwards — the information was never captured — so this gets more
// valuable the sooner it is used, not less.
//
// The panel only renders for someone who can manage staff. That is a COURTESY, not a control: the
// server checks reqCan(req, "staff") on every one of these routes, and hiding a button has never
// stopped anyone who wanted to call the endpoint directly.
import { useEffect, useState } from "react";
import { listStaff, createStaff, updateStaff, STAFF_ROLES, ROLE_BLURB } from "../net/founder";
import type { StaffRow } from "../net/founder";

const ROLE_TONE: Record<string, string> = {
  owner: "bg-accent/15 text-accent",
  admin: "bg-primary/15 text-primary",
  support: "bg-success/15 text-success",
  readonly: "bg-muted/15 text-muted",
};

const seen = (t: number | null) => (t ? new Date(t).toLocaleDateString() : "never");

export function StaffCard({ passcode }: { passcode: string }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("support");
  const [password, setPassword] = useState("");

  async function load() {
    const r = await listStaff(passcode);
    if (r.error) {
      // A 403 is not an error to shout about — it means this account simply is not an owner.
      if (/only an owner/i.test(r.error)) { setAllowed(false); setErr(null); return; }
      setErr(r.error); return;
    }
    setAllowed(true); setErr(null);
    setStaff(r.staff ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode]);

  async function add() {
    setBusy("new");
    const r = await createStaff(passcode, { email, password, name: name || undefined, role });
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null); setEmail(""); setName(""); setPassword(""); setOpen(false);
    void load();
  }

  async function patch(id: string, p: { role?: string; active?: boolean }) {
    setBusy(id);
    const r = await updateStaff(passcode, id, p);
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null);
    void load();
  }

  // Not an owner: say so plainly rather than rendering an empty panel that looks broken.
  if (!allowed) {
    return (
      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="ff-title text-xl">Staff</h2>
        </div>
        <p className="px-4 py-4 text-sm text-muted">
          Only an owner can manage staff accounts. You can still use everything your role allows.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="ff-title text-xl">Staff</h2>
        <span className="text-xs text-muted">
          {staff.filter((s) => s.active).length} with access
          {staff.some((s) => !s.active) ? ` · ${staff.filter((s) => !s.active).length} revoked` : ""}
        </span>
        <button onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-sm font-extrabold text-white">
          {open ? "Cancel" : "Add someone"}
        </button>
        <button onClick={() => void load()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary">
          Refresh
        </button>
      </div>

      {open && (
        <div className="grid gap-2 border-b border-line px-4 py-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="them@example.com"
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink">
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="mt-1 block font-normal normal-case tracking-normal text-muted">
              {ROLE_BLURB[role]}
            </span>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="text"
              placeholder="at least 10 characters"
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
            <span className="mt-1 block font-normal normal-case tracking-normal text-muted">
              Send it to them yourself and have them change it. It is shown in plain text here
              because you are the one typing it.
            </span>
          </label>
          <div className="sm:col-span-2">
            <button onClick={() => void add()} disabled={busy === "new" || !email.trim() || password.length < 10}
              className="rounded-lg bg-gradient-to-br from-primary to-accent px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40">
              Create account
            </button>
          </div>
        </div>
      )}

      {err && <p className="border-b border-line px-4 py-2 text-sm font-semibold text-danger">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Last seen</th>
              <th className="px-4 py-2 text-right">Access</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className={`border-t border-line ${busy === s.id ? "opacity-50" : ""} ${s.active ? "" : "opacity-60"}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{s.name || s.email}</div>
                  {s.name && <div className="text-xs text-muted">{s.email}</div>}
                </td>
                <td className="px-4 py-2">
                  <select value={s.role} disabled={busy === s.id || !s.active}
                    onChange={(e) => void patch(s.id, { role: e.target.value })}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${ROLE_TONE[s.role] ?? ""}`}>
                    {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-muted">{seen(s.last_seen)}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => void patch(s.id, { active: !s.active })} disabled={busy === s.id}
                    className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                      s.active ? "border-line hover:border-danger hover:text-danger" : "border-success text-success"}`}>
                    {s.active ? "Revoke" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  No named accounts yet. You are signed in with the shared passcode, which works but
                  cannot tell the audit log who you are.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        Revoking ends the session someone is already using, not just their next login. Accounts are
        never deleted — a deleted person would turn every action they ever took back into an
        anonymous one. The shared passcode keeps working as an owner-level way back in, so staff
        accounts can never lock you out of your own site.
      </p>
    </section>
  );
}
