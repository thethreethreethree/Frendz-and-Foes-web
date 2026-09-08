import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  type BackerDetail, type BackerRow, type CodeRow, type EventRow,
  editBacker, getBackerDetail, listBackers, listCodes, listEvents, mintCodes, setCodeRevoked,
} from "../net/founder";
import { enclosureView } from "../backer/enclosures";

// The founder admin page (/founder) — a hidden tool for you, not backers. Paste the admin passcode
// once (optionally remembered on this device), then see every backer (who they are, which enclosure
// they landed in, how they log in) and mint/track backer codes.
//
// The roster sits ABOVE minting on purpose: "who is actually in?" is the question you open this page
// asking, and minting is the thing you do occasionally.
// The passcode is only ever sent as the x-admin-passcode header to the same-origin admin API.

const REMEMBER_KEY = "pz_founder_pc";

export function FounderRoute() {
  const [passcode, setPasscode] = useState("");
  const [remember, setRemember] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [users, setUsers] = useState<BackerRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-unlock if a passcode was remembered on this device.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(REMEMBER_KEY); } catch { /* ignore */ }
    if (saved) { setPasscode(saved); setRemember(true); void unlock(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlock(pc: string) {
    setBusy(true); setErr(null);
    const r = await listCodes(pc);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setAuthed(true);
    setRows(r.codes || []);
    void refreshBackers(pc);
    try { if (remember) localStorage.setItem(REMEMBER_KEY, pc); } catch { /* ignore */ }
  }

  async function refresh() {
    const r = await listCodes(passcode);
    if (!r.error) setRows(r.codes || []);
  }

  async function refreshBackers(pc = passcode) {
    const r = await listBackers(pc);
    if (!r.error) setUsers(r.users || []);
  }

  function lock() {
    setAuthed(false); setRows([]); setUsers([]); setPasscode("");
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
  }

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-surface/60 p-6 backdrop-blur">
          <h1 className="ff-title text-2xl font-extrabold">Founder access</h1>
          <p className="mt-1 text-sm text-muted">Enter the admin passcode to see your backers and manage codes.</p>
          <input
            type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") unlock(passcode); }}
            placeholder="admin passcode"
            className="mt-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-primary"
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this device
          </label>
          {err && <p className="mt-2 text-sm font-semibold text-red-400">{err}</p>}
          <button onClick={() => unlock(passcode)} disabled={busy || !passcode}
            className="mt-4 w-full rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 font-display text-lg font-extrabold text-white transition active:scale-95 disabled:opacity-40">
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
      </Shell>
    );
  }

  const valid = rows.filter((r) => r.state === "valid");
  const used = rows.filter((r) => r.state === "used");

  return (
    <Shell>
      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <h1 className="ff-title text-2xl font-extrabold">Backers</h1>
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-muted">
            {users.length} {users.length === 1 ? "backer" : "backers"} · {rows.length} codes · {valid.length} valid · {used.length} used
          </span>
          <button onClick={lock} className="ml-auto text-sm font-semibold text-muted hover:text-ink">Lock</button>
        </div>

        <BackersCard users={users} onRefresh={() => refreshBackers()} onOpen={setOpenId} />

        {openId && (
          <BackerDetailCard
            passcode={passcode} id={openId}
            onClose={() => setOpenId(null)}
            onChanged={() => refreshBackers()}
          />
        )}

        <MintCard passcode={passcode} onMinted={refresh} />

        <CodesCard passcode={passcode} rows={rows} setRows={setRows} onRefresh={refresh} />

        <AuditCard passcode={passcode} />
      </div>
    </Shell>
  );
}

// Every code and what happened to it, filterable, with revoke. Revoke only ever applies to an
// UNREDEEMED code: a redeemed one is somebody's login key and pulling it would lock a real backer
// out of their account, so the server refuses and says to remove the account instead.
function CodesCard({ passcode, rows, setRows, onRefresh }: {
  passcode: string; rows: CodeRow[]; setRows: (r: CodeRow[]) => void; onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "valid" | "used" | "revoked">("all");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const valid = rows.filter((r) => r.state === "valid");
  const shown = filter === "all" ? rows : rows.filter((r) => r.state === filter);
  const counts = {
    all: rows.length,
    valid: valid.length,
    used: rows.filter((r) => r.state === "used").length,
    revoked: rows.filter((r) => r.state === "revoked").length,
  };

  async function toggle(code: string, revoked: boolean) {
    setBusy(code); setErr(null);
    const r = await setCodeRevoked(passcode, code, revoked);
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    if (r.codes) setRows(r.codes);
  }

  const pill = (s: CodeRow["state"]) =>
    s === "valid" ? "bg-teal-500/15 text-teal-400"
    : s === "revoked" ? "bg-red-500/15 text-red-400"
    : "bg-muted/15 text-muted";

  return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="text-sm font-bold text-ink">All codes</span>
            <div className="flex flex-wrap gap-1">
              {(["all", "valid", "used", "revoked"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold transition ${
                    filter === f ? "bg-primary text-white" : "border border-line bg-canvas text-muted hover:text-ink"}`}>
                  {f} {counts[f]}
                </button>
              ))}
            </div>
            <button onClick={onRefresh} className="ml-auto rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-muted hover:text-ink">Refresh</button>
            <CopyButton label="Copy valid" text={valid.map((r) => r.code).join("\n")} />
          </div>
          {err && <p className="border-b border-line px-4 py-2 text-sm font-semibold text-red-400">{err}</p>}
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">State</th><th className="px-4 py-2">Note</th><th className="px-4 py-2">Redeemed</th><th className="px-4 py-2"></th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No codes yet — mint some above.</td></tr>}
                {rows.length > 0 && shown.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No {filter} codes.</td></tr>}
                {shown.map((r) => (
                  <tr key={r.code} className="border-t border-line/60">
                    <td className={`px-4 py-2 font-mono font-bold ${r.state === "revoked" ? "text-muted line-through" : "text-ink"}`}>{r.code}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pill(r.state)}`}>{r.state}</span>
                    </td>
                    <td className="px-4 py-2 text-muted">{r.note || "—"}</td>
                    <td className="px-4 py-2 tabular-nums text-muted">{r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {r.state === "used"
                        ? <span className="text-xs text-muted">in use</span>
                        : <button onClick={() => toggle(r.code, r.state !== "revoked")} disabled={busy === r.code}
                            className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-xs font-bold text-muted transition hover:text-ink disabled:opacity-40">
                            {busy === r.code ? "…" : r.state === "revoked" ? "Restore" : "Revoke"}
                          </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
}

// The backer roster. This is the question you open the founder page asking - who is actually in? -
// so it sits above minting. Search covers username, code, country and enclosure in one box rather
// than a filter row: with a few hundred backers you are looking for one person, not slicing a table.
function BackersCard({ users, onRefresh, onOpen }:
  { users: BackerRow[]; onRefresh: () => void; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? users.filter((u) =>
        [u.username, u.code, u.country, u.fullName, enclosureView(u.enclosure)?.name]
          .some((v) => (v || "").toLowerCase().includes(needle)))
    : users;

  const unsorted = users.filter((u) => !u.enclosure).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-sm font-bold text-ink">Backers</span>
        {unsorted > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
            {unsorted} not sorted yet
          </span>
        )}
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, code, country, enclosure…"
          className="ml-auto w-full max-w-xs rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none focus:border-primary"
        />
        <button onClick={onRefresh} className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-muted hover:text-ink">Refresh</button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">Backer</th>
              <th className="px-4 py-2">Enclosure</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2">Login</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">
                No backers yet — they appear here once someone redeems a code at /club.
              </td></tr>
            )}
            {users.length > 0 && shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Nothing matches “{q}”.</td></tr>
            )}
            {shown.map((u) => {
              const enc = enclosureView(u.enclosure);
              return (
                <tr key={u.id} onClick={() => onOpen(u.id)}
                    className="cursor-pointer border-t border-line/60 transition hover:bg-line/30">
                  <td className="px-4 py-2">
                    <div className="font-bold text-ink">{u.username}</div>
                    <div className="text-xs text-muted">{u.fullName || "—"}{u.country ? ` · ${u.country}` : ""}</div>
                  </td>
                  <td className="px-4 py-2">
                    {enc
                      ? <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ background: `${enc.accent}22`, color: enc.accent }}>{enc.name}</span>
                      : <span className="text-xs font-semibold text-amber-400">not sorted</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{u.code || "—"}</td>
                  <td className="px-4 py-2 tabular-nums text-muted">{new Date(u.created).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-xs text-muted">{u.hasPassword ? "code + password" : "code only"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// One backer in full. Fetched on open rather than carried in the roster, because the avatar is a
// data URL up to 300KB and the list would haul one per row for a column it never renders.
//
// Only two actions, deliberately. Renaming covers "they picked something unusable". Clearing a
// password is the forgot-password path - it does NOT set a new one, because the founder choosing
// someone's password would mean knowing it; their backer code still logs them in, so nobody gets
// locked out. Enclosure is shown but NOT editable: it is the outcome of the sorting quiz, and
// quietly overriding it would make the quiz a lie.
function BackerDetailCard({ passcode, id, onClose, onChanged }: {
  passcode: string; id: string; onClose: () => void; onChanged: () => void;
}) {
  const [user, setUser] = useState<BackerDetail | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setUser(null); setErr(null); setNote(null);
    getBackerDetail(passcode, id).then((r) => {
      if (!live) return;
      if (r.error) { setErr(r.error); return; }
      setUser(r.user || null);
      setName(r.user?.username || "");
    });
    return () => { live = false; };
  }, [passcode, id]);

  async function save(patch: { username?: string; clearPassword?: boolean }, ok: string) {
    setBusy(true); setErr(null); setNote(null);
    const r = await editBacker(passcode, id, patch);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setUser(r.user || null);
    setName(r.user?.username || "");
    setNote(ok);
    onChanged();
  }

  const enc = enclosureView(user?.enclosure ?? null);
  const renamed = !!user && name.trim() !== "" && name.trim() !== user.username;

  return (
    <div className="rounded-2xl border border-primary/50 bg-surface/70 p-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Backer</span>
        <button onClick={onClose} className="ml-auto text-sm font-semibold text-muted hover:text-ink">Close</button>
      </div>

      {!user && !err && <p className="mt-3 text-sm text-muted">Loading…</p>}
      {err && !user && <p className="mt-3 text-sm font-semibold text-red-400">{err}</p>}

      {user && (
        <>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            {user.avatar
              ? <img src={user.avatar} alt={`${user.username}'s profile picture`}
                     className="h-20 w-20 shrink-0 rounded-full border border-line object-cover" />
              : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-dashed border-line text-xs text-muted">
                  no photo
                </div>}
            <div className="min-w-0">
              <div className="ff-title text-xl font-extrabold text-ink">{user.username}</div>
              <div className="text-sm text-muted">
                {user.fullName || "—"}{user.country ? ` · ${user.country}` : ""}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {enc
                  ? <span className="rounded-full px-2 py-0.5 font-bold"
                          style={{ background: `${enc.accent}22`, color: enc.accent }}>{enc.name}</span>
                  : <span className="font-semibold text-amber-400">not sorted yet</span>}
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-muted">{user.code || "no code"}</span>
                <span className="text-muted">joined {new Date(user.created).toLocaleDateString()}</span>
                <span className="text-muted">{user.hasPassword ? "code + password" : "code only"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <label className="flex-1 text-sm font-bold text-ink">Username
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-primary" />
            </label>
            <button onClick={() => save({ username: name.trim() }, "Username updated.")}
              disabled={busy || !renamed}
              className="rounded-xl bg-gradient-to-br from-primary to-accent px-4 py-2.5 font-display font-extrabold text-white transition active:scale-95 disabled:opacity-40">
              {busy ? "Saving…" : "Rename"}
            </button>
            <button
              onClick={() => save({ clearPassword: true }, "Password cleared — they can still log in with their code.")}
              disabled={busy || !user.hasPassword}
              title={user.hasPassword ? "They log in with their code until they set a new one" : "No password set"}
              className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm font-bold text-muted transition hover:text-ink disabled:opacity-40">
              Clear password
            </button>
          </div>

          {note && <p className="mt-2 text-sm font-semibold text-teal-400">{note}</p>}
          {err && <p className="mt-2 text-sm font-semibold text-red-400">{err}</p>}
        </>
      )}
    </div>
  );
}

// The append-only audit log — the system's own record of what happened. Reads the events table that
// signup, redeem, sort, mint, revoke and admin actions all write to.
//
// Pages by `before` (an id), not an offset: ids only increase, so a page cannot shift under you
// while new events are being written. The type filter is built from the data rather than a hardcoded
// list, so a new event type shows up here the moment something writes one.
function AuditCard({ passcode }: { passcode: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [types, setTypes] = useState<{ type: string; count: number }[]>([]);
  const [type, setType] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(reset: boolean) {
    setBusy(true); setErr(null);
    const before = reset || events.length === 0 ? undefined : events[events.length - 1].id;
    const r = await listEvents(passcode, { limit: 50, before, type: type || undefined });
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    const batch = r.events || [];
    setTypes(r.types || []);
    setEvents(reset ? batch : [...events, ...batch]);
    setDone(batch.length < 50);
  }

  useEffect(() => { void load(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode, type]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-sm font-bold text-ink">Audit log</span>
        <span className="text-xs text-muted">everything the system recorded, newest first</span>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="ml-auto rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink outline-none focus:border-primary">
          <option value="">all types</option>
          {types.map((t) => <option key={t.type} value={t.type}>{t.type} ({t.count})</option>)}
        </select>
        <button onClick={() => load(true)} disabled={busy}
          className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-muted hover:text-ink disabled:opacity-40">
          Refresh
        </button>
      </div>
      {err && <p className="border-b border-line px-4 py-2 text-sm font-semibold text-red-400">{err}</p>}
      <div className="max-h-[420px] overflow-y-auto">
        {events.length === 0 && !busy && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nothing recorded yet. Signups, redeems, sorting and admin actions all land here.
          </p>
        )}
        <ul className="divide-y divide-line/60">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-sm">
              <span className="font-mono text-xs font-bold text-primary">{e.type}</span>
              {e.actorId && <span className="font-mono text-xs text-muted">{e.actorId}</span>}
              {e.data && Object.keys(e.data).length > 0 && (
                <span className="text-xs text-muted">
                  {Object.entries(e.data).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                </span>
              )}
              <span className="ml-auto shrink-0 tabular-nums text-xs text-muted">
                {new Date(e.ts).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {!done && events.length > 0 && (
          <button onClick={() => load(false)} disabled={busy}
            className="w-full border-t border-line px-4 py-2 text-xs font-bold text-muted hover:text-ink disabled:opacity-40">
            {busy ? "Loading…" : "Load older"}
          </button>
        )}
      </div>
    </div>
  );
}

function MintCard({ passcode, onMinted }: { passcode: string; onMinted: () => void }) {
  const [count, setCount] = useState(10);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function mint() {
    if (busy) return;
    setBusy(true); setErr(null); setMinted(null);
    const r = await mintCodes(passcode, count, note);
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setMinted(r.codes || []);
    onMinted();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Mint codes</div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold text-ink">How many
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className="mt-1 block w-24 rounded-xl border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-primary" />
        </label>
        <label className="flex-1 text-sm font-bold text-ink">Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Kickstarter wave 1"
            className="mt-1 block w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-primary" />
        </label>
        <button onClick={mint} disabled={busy}
          className="rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-2.5 font-display text-base font-extrabold text-white transition active:scale-95 disabled:opacity-40">
          {busy ? "Minting…" : "Mint"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-red-400">{err}</p>}
      {minted && (
        <div className="mt-4 rounded-xl border border-teal-500/40 bg-canvas p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-bold text-teal-400">{minted.length} new codes</span>
            <CopyButton label="Copy all" text={minted.join("\n")} />
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm text-ink sm:grid-cols-3">
            {minted.map((c) => <div key={c}>{c}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* ignore */ } }}
      disabled={!text}
      className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-muted transition hover:text-primary disabled:opacity-40"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ff-backdrop h-full overflow-y-auto text-ink">
      <div className="mx-auto w-full max-w-3xl px-5 pt-8 pb-12">
        <div className="flex items-center justify-between">
          <div className="ff-title text-xl font-extrabold">PlayZoo · Founder</div>
          <Link to="/" className="rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5">← Home</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
