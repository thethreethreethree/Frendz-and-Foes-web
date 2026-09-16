import { useAfterDark } from "./useAfterDark";
import { PlayerRoster } from "../net/PlayerRoster";
import { caStart, caNext, caReset, caKick } from "../net/afterdark";
import { RemoteShell } from "../control/shell";
import { Section } from "../control/ui";
import { getBrand } from "../brand/theme";

// Host controller for "After Dark". Start / Next / Reset. The judge picks + advances on their phone;
// the host has the same controls as a backstop.
//
// On RemoteShell since 2026-09-16. The 18+ mark used to be `text-sm` beside a `text-2xl` title —
// the smallest text in its own header, on the only age-gated game in the catalogue. It is a chip
// now, and it rides in the shell's badge slot so it cannot be crowded out by a long game name.
export function AfterDarkHost({ room }: { room: string }) {
  const { state, error } = useAfterDark(room, "host");
  const label = getBrand().games.afterdark?.label ?? "After Dark";
  if (!state) return <Connecting />;
  const judge = state.players.find((p) => p.id === state.judgeId)?.name ?? "—";
  const submitted = state.players.filter((p) => !p.isJudge && p.submitted).length;
  const nonJudge = state.players.filter((p) => !p.isJudge).length;

  const action = (
    <div className="space-y-2">
      {state.phase === "lobby" && <button onClick={caStart} className="ff-sticker w-full bg-primary px-4 py-4 font-display text-2xl text-primary-ink">START GAME</button>}
      {state.phase === "submitting" && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm text-muted">Waiting on cards ({submitted}/{nonJudge})…</p>}
      {state.phase === "judging" && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm text-muted">{judge} is picking the winner on their phone.</p>}
      {state.phase === "reveal" && <button onClick={caNext} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">NEXT ROUND →</button>}
      {state.phase === "ended" && <p className="rounded-lg border border-line bg-surface px-3 py-2 text-center font-semibold">Game over — see the winner on the display.</p>}
      {state.phase !== "lobby" && <button onClick={caReset} className="min-h-[44px] w-full rounded-lg border border-line px-4 text-sm font-semibold text-muted">Reset to lobby</button>}
    </div>
  );

  return (
    <RemoteShell
      title={label}
      badge={<span className="shrink-0 rounded-md bg-danger px-1.5 py-0.5 text-xs font-black text-white">18+</span>}
      room={room}
      action={action}
    >
      {error && <div className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}

      <Section title={`Players (${state.players.length})`}>
        <PlayerRoster
          players={state.players.map((p) => ({ ...p, note: p.isJudge ? "judge" : undefined }))}
          onRemove={caKick}
        />
        {state.phase !== "lobby" && (
          <div className="mt-1 text-sm text-muted">
            Round {state.round} · Judge {judge}
            {state.phase === "submitting" ? ` · ${submitted}/${nonJudge} played` : ""}
          </div>
        )}
      </Section>

      {/* See JustOneHost: a Start button for a game nobody could enter, with nothing saying how. */}
      {state.phase === "lobby" && (
        <p className="text-center text-xs text-muted">Players scan the display's QR to join. 18+ only.</p>
      )}
    </RemoteShell>
  );
}

function Connecting() {
  return <div className="grid h-full place-items-center bg-canvas p-4 text-muted">Connecting…</div>;
}
