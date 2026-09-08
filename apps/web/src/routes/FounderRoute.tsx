import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type CodeRow, listCodes, mintCodes } from "../net/founder";

// The founder admin page (/founder) — a hidden tool for you, not backers. Paste the admin passcode
// once (optionally remembered on this device), then mint backer codes and see who's redeemed what.
// The passcode is only ever sent as the x-admin-passcode header to the same-origin admin API.

const REMEMBER_KEY = "pz_founder_pc";

export function FounderRoute() {
  const [passcode, setPasscode] = useState("");
  const [remember, setRemember] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<CodeRow[]>([]);
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
    try { if (remember) localStorage.setItem(REMEMBER_KEY, pc); } catch { /* ignore */ }
  }

  async function refresh() {
    const r = await listCodes(passcode);
    if (!r.error) setRows(r.codes || []);
  }

  function lock() {
    setAuthed(false); setRows([]); setPasscode("");
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
  }

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-surface/60 p-6 backdrop-blur">
          <h1 className="ff-title text-2xl font-extrabold">Founder access</h1>
          <p className="mt-1 text-sm text-muted">Enter the admin passcode to manage backer codes.</p>
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
          <h1 className="ff-title text-2xl font-extrabold">Backer codes</h1>
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-muted">
            {rows.length} total · {valid.length} valid · {used.length} used
          </span>
          <button onClick={lock} className="ml-auto text-sm font-semibold text-muted hover:text-ink">Lock</button>
        </div>

        <MintCard passcode={passcode} onMinted={refresh} />

        <div className="overflow-hidden rounded-2xl border border-line bg-surface/60 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="text-sm font-bold text-ink">All codes</span>
            <button onClick={refresh} className="ml-auto rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs font-bold text-muted hover:text-ink">Refresh</button>
            <CopyButton label="Copy valid" text={valid.map((r) => r.code).join("\n")} />
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">State</th><th className="px-4 py-2">Note</th><th className="px-4 py-2">Redeemed</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No codes yet — mint some above.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.code} className="border-t border-line/60">
                    <td className="px-4 py-2 font-mono font-bold text-ink">{r.code}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.state === "valid" ? "bg-teal-500/15 text-teal-400" : "bg-muted/15 text-muted"}`}>{r.state}</span>
                    </td>
                    <td className="px-4 py-2 text-muted">{r.note || "—"}</td>
                    <td className="px-4 py-2 tabular-nums text-muted">{r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
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
