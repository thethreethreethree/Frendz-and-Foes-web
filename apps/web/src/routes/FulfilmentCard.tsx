// The Fulfilment panel on /founder — what we owe people, and how far along it is.
//
// The campaign promises custom characters (one at $30, two at $50) within a month of the campaign
// closing. Before this panel there was no list of who was owed what, only tier definitions saying
// how many are included — which cannot tell you whether any were delivered.
//
// Rows are generated SERVER-SIDE from each backer's tier every time this loads, so the queue cannot
// drift from what was actually sold, and nothing here can create a promise that was not bought.
import { useEffect, useState } from "react";
import { listFulfilment, updateFulfilment, FULFILMENT_STATUSES } from "../net/founder";
import type { FulfilmentRow, FulfilmentSummary } from "../net/founder";

// Colour carries status so the queue is scannable without reading every row. Semantic, not accent:
// red means late, green means done, and those never swap meaning.
const TONE: Record<string, string> = {
  owed: "bg-danger/15 text-danger",
  briefed: "bg-primary/15 text-primary",
  "in-progress": "bg-primary/15 text-primary",
  review: "bg-accent/15 text-accent",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-muted/15 text-muted",
};

const dueLabel = (due: number | null) => (due ? new Date(due).toLocaleDateString() : "—");
const isOverdue = (r: FulfilmentRow) =>
  r.due != null && r.due < Date.now() && !["delivered", "cancelled"].includes(r.status);

export function FulfilmentCard({ passcode }: { passcode: string }) {
  const [items, setItems] = useState<FulfilmentRow[]>([]);
  const [summary, setSummary] = useState<FulfilmentSummary | null>(null);
  const [ready, setReady] = useState(true);
  const [openOnly, setOpenOnly] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const r = await listFulfilment(passcode, openOnly);
    if (r.ready === false) { setReady(false); setErr(null); return; }
    if (r.error) { setErr(r.error); return; }
    setReady(true); setErr(null);
    setItems(r.items ?? []);
    setSummary(r.summary ?? null);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode, openOnly]);

  async function setField(id: string, patch: { status?: string; due?: string | null; notes?: string }) {
    setBusy(id);
    const r = await updateFulfilment(passcode, id, patch);
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null);
    // Replace in place rather than reloading: a reload would re-sort under the cursor mid-edit.
    setItems((prev) => prev.map((x) => (x.id === id && r.item ? r.item : x)));
    const s = await listFulfilment(passcode, openOnly);
    if (s.summary) setSummary(s.summary);
  }

  async function exportCsv() {
    try {
      const res = await fetch("/api/backer/admin/fulfilment.csv", { headers: { "x-admin-passcode": passcode } });
      if (!res.ok) { setErr("Couldn't build the CSV."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `playzoo-fulfilment-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { setErr("Couldn't build the CSV."); }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="ff-title text-xl">Fulfilment</h2>
        <span className="text-xs text-muted">
          {ready
            ? `${summary?.open ?? 0} still owed${summary?.overdue ? ` · ${summary.overdue} overdue` : ""}`
            : "queue unavailable"}
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Outstanding only
        </label>
        <button onClick={() => void exportCsv()} disabled={!ready}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary disabled:opacity-40">
          Export CSV
        </button>
        <button onClick={() => void load()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary">
          Refresh
        </button>
      </div>

      {!ready && (
        <p className="border-b border-line px-4 py-3 text-sm text-danger">
          Can&apos;t read the database — this is <b>not</b> your real list of promises.
        </p>
      )}

      {ready && summary && (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {(["owed", "in-progress", "review", "delivered"] as const).map((s) => (
            <div key={s} className="bg-surface px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{s}</div>
              <div className="ff-title mt-1 text-2xl tabular-nums">{summary.byStatus[s] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {err && <p className="border-t border-line px-4 py-2 text-sm font-semibold text-danger">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Backer</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className={`border-t border-line ${busy === r.id ? "opacity-50" : ""}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{r.backer_name || r.backer_id}</div>
                  {r.backer_full_name && <div className="text-xs text-muted">{r.backer_full_name}</div>}
                </td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">
                  <select value={r.status} disabled={busy === r.id}
                    onChange={(e) => void setField(r.id, { status: e.target.value })}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${TONE[r.status] ?? ""}`}>
                    {FULFILMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input type="date" disabled={busy === r.id}
                    value={r.due ? new Date(r.due).toISOString().slice(0, 10) : ""}
                    onChange={(e) => void setField(r.id, { due: e.target.value || null })}
                    className={`rounded-lg border border-line bg-canvas px-2 py-1 text-xs ${isOverdue(r) ? "text-danger" : "text-ink"}`} />
                  {isOverdue(r) && <div className="mt-0.5 text-xs font-semibold text-danger">overdue</div>}
                  <span className="sr-only">{dueLabel(r.due)}</span>
                </td>
                <td className="px-4 py-2">
                  <input defaultValue={r.notes ?? ""} placeholder="brief, link, who's drawing it…"
                    disabled={busy === r.id}
                    onBlur={(e) => { if (e.target.value !== (r.notes ?? "")) void setField(r.id, { notes: e.target.value }); }}
                    className="w-full min-w-[10rem] rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-ink" />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  {!ready
                    ? "Can't read the database — this is not your list of promises."
                    : openOnly
                      ? "Nothing outstanding. Every promise made so far has been delivered."
                      : "No promises recorded yet. Rows appear here as soon as a backer holds a tier that includes a custom character."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        Due dates start empty on purpose. The campaign FAQ promises characters within a month of the
        campaign closing, and nobody has told the system when that is — so set them here rather than
        have the software invent a deadline.
      </p>
    </section>
  );
}
