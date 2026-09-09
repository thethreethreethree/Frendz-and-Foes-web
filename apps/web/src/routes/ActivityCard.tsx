// The Activity panel on /founder — what actually happened on game nights.
//
// This answers the question that decides what gets built next: which of the fourteen games do
// people actually play, and do they finish them. Before session tracking existed, rooms lived in
// memory and vanished on restart, so the honest answer was "nobody knows".
//
// Every figure is DERIVED server-side from game_sessions on each request. Nothing is stored, so
// nothing can drift away from what happened.
import { useEffect, useState } from "react";
import { listActivity } from "../net/founder";
import type { SessionRow, ActivitySummary, GameStat } from "../net/founder";

// The fourteen game slugs the clients send, mapped to what they are called on the site. A slug with
// no entry here still shows — as itself — because a game quietly missing from a report is worse
// than an ugly label.
const GAME_NAMES: Record<string, string> = {
  feud: "Survey Showdown",
  trivia: "Trivia",
  murder: "Murder Mystery",
  codenames: "Cover Ops",
  telestrations: "Sketch Relay",
  pictionary: "Quick Draw",
  bingo: "Bingo Night",
  headsup: "Foreheads",
  justone: "Solo Clue",
  ballpark: "Ballpark",
  monikers: "Monikers",
  reverse: "Full Cast",
  taboo: "Off Limits",
  afterdark: "After Dark (18+)",
  unknown: "Unattributed",
};
const gameName = (slug: string) => GAME_NAMES[slug] ?? slug;

const minutes = (s: SessionRow) =>
  s.ended ? Math.max(1, Math.round((s.ended - s.started) / 60000)) : null;

// Completion rate counts only ENDED nights: a game still in progress has not failed to finish, and
// including it would drag the rate down in real time while people are playing.
function completionRate(g: GameStat): string {
  if (!g.finished_nights) return "—";
  return Math.round((g.completed / g.finished_nights) * 100) + "%";
}

export function ActivityCard({ passcode }: { passcode: string }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [allTime, setAllTime] = useState<ActivitySummary | null>(null);
  const [win, setWin] = useState<ActivitySummary | null>(null);
  const [days, setDays] = useState(30);
  const [ready, setReady] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await listActivity(passcode, days);
    if (r.ready === false) { setReady(false); setErr(null); return; }
    if (r.error) { setErr(r.error); return; }
    setReady(true); setErr(null);
    setSessions(r.sessions ?? []);
    setAllTime(r.allTime ?? null);
    setWin(r.window ?? null);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [passcode, days]);

  async function exportCsv() {
    try {
      const res = await fetch("/api/backer/admin/activity.csv", { headers: { "x-admin-passcode": passcode } });
      if (!res.ok) { setErr("Couldn't build the CSV."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `playzoo-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { setErr("Couldn't build the CSV."); }
  }

  const games = (win?.byGame ?? []).slice(0, 14);
  const busiest = games.length ? Math.max(...games.map((g) => g.nights)) : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="ff-title text-xl">Activity</h2>
        <span className="text-xs text-muted">
          {ready
            ? `${allTime?.totals.nights ?? 0} nights recorded${allTime?.totals.live ? ` · ${allTime.totals.live} live now` : ""}`
            : "figures unavailable"}
        </span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="ml-auto rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-ink">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
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
          Can&apos;t read the database — these are <b>not</b> your real figures. Nobody has stopped
          playing; we just can&apos;t tell you what happened.
        </p>
      )}

      {ready && (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {([
            ["Nights", win?.totals.nights ?? 0],
            ["Finished", win?.totals.completed ?? 0],
            ["Biggest room", win?.totals.biggest ?? 0],
            ["Live now", allTime?.totals.live ?? 0],
          ] as const).map(([label, v]) => (
            <div key={label} className="bg-surface px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
              <div className="ff-title mt-1 text-2xl tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      )}

      {err && <p className="border-t border-line px-4 py-2 text-sm font-semibold text-danger">{err}</p>}

      {/* Which games get played, as a bar per game. The bar is the point: fourteen numbers in a
          column is a table nobody reads, and the whole reason this exists is to see at a glance
          which games earn their keep. */}
      {ready && games.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Games played · last {days} days
          </div>
          <div className="flex flex-col gap-1.5">
            {games.map((g) => (
              <div key={g.game} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate">{gameName(g.game)}</span>
                <span className="h-4 flex-1 overflow-hidden rounded bg-canvas">
                  <span className="block h-full rounded bg-gradient-to-r from-primary to-accent"
                    style={{ width: busiest ? `${Math.max(4, (g.nights / busiest) * 100)}%` : "0%" }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums">{g.nights}</span>
                <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">
                  {completionRate(g)} finished
                </span>
                <span className="w-20 shrink-0 text-right text-xs text-muted tabular-nums">
                  {g.avg_players || 0} avg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Game</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2 text-right">Players</th>
              <th className="px-4 py-2 text-right">Length</th>
              <th className="px-4 py-2">Ending</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-4 py-2 text-muted">{new Date(s.started).toLocaleString()}</td>
                <td className="px-4 py-2">{s.game ? gameName(s.game) : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-2 font-mono text-xs">{s.room_code}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.peak_players}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted">
                  {s.ended ? `${minutes(s)}m` : "live"}
                </td>
                <td className="px-4 py-2">
                  {s.completed
                    ? <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">finished</span>
                    : s.ended
                      ? <span className="rounded bg-muted/15 px-2 py-0.5 text-xs font-semibold text-muted">abandoned</span>
                      : <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">playing</span>}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  {!ready
                    ? "Can't read the database — this is not your game history."
                    : "No game nights recorded yet. Every hosted room writes a row here from now on."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-muted">
        &ldquo;Abandoned&rdquo; means the room emptied without the game reaching its ending — which is
        worth knowing, not a fault. Players are counted at the room&apos;s busiest moment and exclude
        the host and the big screen. No player names are stored: people join by scanning a code and
        never make an account.
      </p>
    </section>
  );
}
