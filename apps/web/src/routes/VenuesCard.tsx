// Venues — a venue as a CUSTOMER, on /founder. Phase 5.
//
// `brands` already held a venue's colours and game labels. This is the other half: who they are,
// what they pay, when they renew, and what their nights actually produced.
//
// Every figure in the right-hand columns is DERIVED server-side from payments and game_sessions on
// each load. Nothing here is a stored total, so a venue's revenue cannot drift away from the ledger.
import { useEffect, useState } from "react";
import { listVenues, saveVenue, renewVenue, VENUE_STATUSES } from "../net/founder";
import type { VenueRow, VenueSummary } from "../net/founder";

function money(cents: number | null, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
    .format((cents ?? 0) / 100);
}
const day = (t: number | null) => (t ? new Date(t).toLocaleDateString() : "—");

const TONE: Record<string, string> = {
  prospect: "bg-muted/15 text-muted",
  trial: "bg-accent/15 text-accent",
  active: "bg-success/15 text-success",
  paused: "bg-primary/15 text-primary",
  churned: "bg-danger/15 text-danger",
};

const isOverdue = (v: VenueRow) =>
  v.renews != null && v.renews < Date.now() && (v.status === "active" || v.status === "trial");

export function VenuesCard({ passcode }: { passcode: string }) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [summary, setSummary] = useState<VenueSummary | null>(null);
  const [ready, setReady] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [slug, setSlug] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");

  async function load() {
    const r = await listVenues(passcode);
    if (r.error && /cannot see this/i.test(r.error)) { setAllowed(false); setErr(null); return; }
    if (r.ready === false && !r.error) { setReady(false); return; }
    if (r.error) { setErr(r.error); setReady(r.ready !== false); return; }
    setAllowed(true); setReady(true); setErr(null);
    setVenues(r.venues ?? []);
    setSummary(r.summary ?? null);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode]);

  async function add() {
    setBusy("new");
    // Parsed to MINOR UNITS here so a float never reaches the server — the same rule the money
    // panel follows, and the server refuses a string outright rather than coercing it.
    const major = Number(price);
    const r = await saveVenue(passcode, {
      slug: slug.trim().toLowerCase(),
      legalName: legalName || undefined,
      contactEmail: email || undefined,
      priceCents: price.trim() && Number.isFinite(major) ? Math.round(major * 100) : undefined,
    });
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null); setSlug(""); setLegalName(""); setEmail(""); setPrice(""); setOpen(false);
    void load();
  }

  async function setStatus(v: VenueRow, status: string) {
    setBusy(v.slug);
    const r = await saveVenue(passcode, { slug: v.slug, status });
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null); void load();
  }

  async function markPaid(v: VenueRow) {
    setBusy(v.slug);
    const r = await renewVenue(passcode, v.slug);
    setBusy(null);
    if (r.error) { setErr(r.error); return; }
    setErr(null); void load();
  }

  if (!allowed) {
    return (
      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <h2 className="ff-title text-xl">Venues</h2>
        </div>
        <p className="px-4 py-4 text-sm text-muted">
          Your account can&apos;t see venue billing. Everything else your role allows still works.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="ff-title text-xl">Venues</h2>
        <span className="text-xs text-muted">
          {ready
            ? `${summary?.byStatus.active ?? 0} paying · ${money(summary?.mrrCents ?? 0)}/mo`
            : "figures unavailable"}
          {summary?.overdue ? ` · ${summary.overdue} overdue` : ""}
        </span>
        <button onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-lg bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-sm font-extrabold text-white">
          {open ? "Cancel" : "Add a venue"}
        </button>
        <button onClick={() => void load()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:border-primary">
          Refresh
        </button>
      </div>

      {!ready && (
        <p className="border-b border-line px-4 py-3 text-sm text-danger">
          Can&apos;t read the database — these are <b>not</b> your real venue figures.
        </p>
      )}

      {ready && summary && (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {([
            ["MRR", money(summary.mrrCents)],
            ["Paying", summary.byStatus.active ?? 0],
            ["Trials", summary.byStatus.trial ?? 0],
            ["Due within 7 days", summary.dueSoon ?? 0],
          ] as const).map(([label, v]) => (
            <div key={label} className="bg-surface px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
              <div className="ff-title mt-1 text-2xl tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="grid gap-2 border-b border-line px-4 py-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="the-crown"
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
            <span className="mt-1 block font-normal normal-case tracking-normal text-muted">
              The same slug as their branding — one venue, one slug, one theme.
            </span>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Legal name
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Contact email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Monthly price
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="49"
              className="mt-1 block w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink" />
          </label>
          <div className="sm:col-span-2">
            <button onClick={() => void add()} disabled={busy === "new" || !slug.trim()}
              className="rounded-lg bg-gradient-to-br from-primary to-accent px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40">
              Add venue
            </button>
            <span className="ml-3 text-xs text-muted">
              Starts as a prospect. Set them to trial or active when they sign.
            </span>
          </div>
        </div>
      )}

      {err && <p className="border-b border-line px-4 py-2 text-sm font-semibold text-danger">{err}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Venue</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Monthly</th>
              <th className="px-4 py-2">Renews</th>
              <th className="px-4 py-2 text-right">Taken</th>
              <th className="px-4 py-2 text-right">Nights</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.slug} className={`border-t border-line ${busy === v.slug ? "opacity-50" : ""}`}>
                <td className="px-4 py-2">
                  <div className="font-semibold">{v.legal_name || v.slug}</div>
                  <div className="font-mono text-xs text-muted">{v.slug}</div>
                  {v.contact_email && <div className="text-xs text-muted">{v.contact_email}</div>}
                </td>
                <td className="px-4 py-2">
                  <select value={v.status} disabled={busy === v.slug}
                    onChange={(e) => void setStatus(v, e.target.value)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${TONE[v.status] ?? ""}`}>
                    {VENUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {v.price_cents == null ? "—" : money(v.price_cents)}
                </td>
                <td className={`px-4 py-2 tabular-nums ${isOverdue(v) ? "font-semibold text-danger" : "text-muted"}`}>
                  {day(v.renews)}{isOverdue(v) ? " · overdue" : ""}
                </td>
                {/* Derived from the ledger and the session table, never stored on the venue. */}
                <td className="px-4 py-2 text-right tabular-nums">{money(v.revenue_cents)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {v.nights}
                  {v.biggest > 0 && <span className="ml-1 text-xs text-muted">/{v.biggest} max</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {(v.status === "active" || v.status === "trial") && (
                    <button onClick={() => void markPaid(v)} disabled={busy === v.slug}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-success hover:text-success">
                      Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {venues.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  {!ready
                    ? "Can't read the database — this is not your venue list."
                    : "No venues yet. Add one when you have a bar, a wedding or an office party to sell to."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        &ldquo;Taken&rdquo; and &ldquo;Nights&rdquo; are read from the payments ledger and the session
        table each time this loads — they are not stored here, so they cannot drift. MRR counts
        <b> active</b> venues only: a trial in that figure is revenue that has not happened.
        &ldquo;Mark paid&rdquo; advances the renewal from the date it was <i>due</i>, not from today,
        so a late payment never walks the billing date forward month after month.
      </p>
    </section>
  );
}
