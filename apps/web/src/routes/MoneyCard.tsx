// The Money panel on /founder.
//
// Every figure is DERIVED by the server from the payments rows on each request — nothing here is a
// stored total, so nothing can drift away from what actually happened.
//
// Amounts arrive as INTEGER MINOR UNITS and are formatted exactly once, at the bottom of this file.
// Money never becomes a float anywhere it could be added up.
import { useEffect, useState } from "react";
import { addPayment, listPayments } from "../net/founder";
import type { MoneySummary, PaymentRow } from "../net/founder";

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
    .format(cents / 100);
}

export function MoneyCard({ passcode }: { passcode: string }) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [allTime, setAllTime] = useState<MoneySummary | null>(null);
  const [thisMonth, setThisMonth] = useState<MoneySummary | null>(null);
  const [lastMonth, setLastMonth] = useState<MoneySummary | null>(null);
  const [ready, setReady] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const r = await listPayments(passcode);
    if (r.ready === false) { setReady(false); setErr(null); return; }
    if (r.error) { setErr(r.error); return; }
    setReady(true); setErr(null);
    setPayments(r.payments ?? []);
    setAllTime(r.allTime ?? null);
    setThisMonth(r.thisMonth ?? null);
    setLastMonth(r.lastMonth ?? null);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode]);

  // Kickstarter money never touches our Stripe, so it has to be enterable by hand or the ledger can
  // never show the true total. Parsed to MINOR UNITS here so a float never reaches the server.
  async function addManual() {
    const major = Number(amount);
    if (!Number.isFinite(major) || major === 0) { setErr("Enter an amount like 30 or 12.50."); return; }
    setBusy(true);
    const r = await addPayment(passcode, {
      kind: major > 0 ? "charge" : "refund",
      source: "kickstarter",
      amountCents: Math.round(Math.abs(major) * 100),
      description: note || "Kickstarter pledge",
    });
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setAmount(""); setNote(""); setErr(null);
    void load();
  }

  // The CSV route needs the passcode HEADER, which a plain <a href> cannot send.
  async function exportCsv() {
    try {
      const res = await fetch("/api/backer/admin/payments.csv", { headers: { "x-admin-passcode": passcode } });
      if (!res.ok) { setErr("Couldn't build the CSV."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `playzoo-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { setErr("Couldn't build the CSV."); }
  }

  const cards: [string, MoneySummary | null][] = [
    ["This month", thisMonth], ["Last month", lastMonth], ["All time", allTime],
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="ff-title text-xl">Money</h2>
        <span className="text-xs text-muted">
          {ready ? `${allTime?.count ?? 0} movements recorded` : "figures unavailable"}
        </span>
        <button onClick={() => void exportCsv()} disabled={!ready}
          className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary disabled:opacity-40">
          Export CSV
        </button>
        <button onClick={() => void load()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary">
          Refresh
        </button>
      </div>

      {!ready && (
        <p className="border-b border-line px-4 py-3 text-sm text-danger">
          Can&apos;t read the database — these are <b>not</b> your real figures.
        </p>
      )}

      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
        {cards.map(([label, s]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
            <div className="ff-title mt-1 text-2xl tabular-nums">
              {ready && s ? money(s.netCents) : "—"}
            </div>
            <div className="mt-0.5 h-4 text-xs tabular-nums text-muted">
              {ready && s ? `${money(s.grossCents)} in · ${money(s.refundedCents)} back` : ""}
            </div>
          </div>
        ))}
      </div>

      {ready && (
        <div className="flex flex-wrap items-end gap-2 border-t border-line px-4 py-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Add Kickstarter money
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30"
              inputMode="decimal"
              className="mt-1 block w-28 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)"
            className="min-w-[10rem] flex-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          <button onClick={() => void addManual()} disabled={busy || !amount.trim()}
            className="rounded-lg bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-sm font-extrabold text-white disabled:opacity-40">
            Record
          </button>
          <span className="text-xs text-muted">Negative for a refund. Stripe money records itself.</span>
        </div>
      )}

      {err && <p className="border-t border-line px-4 py-2 text-sm font-semibold text-danger">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Kind</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-2 text-muted">{new Date(p.occurred).toLocaleDateString()}</td>
                <td className="px-4 py-2">{p.kind}{p.status !== "succeeded" ? ` (${p.status})` : ""}</td>
                <td className="px-4 py-2 text-muted">{p.source}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${p.amount_cents < 0 ? "text-danger" : ""}`}>
                  {money(p.amount_cents, p.currency)}
                </td>
                <td className="px-4 py-2 text-muted">{p.description}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  {ready
                    ? "No money recorded yet. Stripe charges land here automatically once it is connected."
                    : "Can't read the database — this is not your payment history."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
