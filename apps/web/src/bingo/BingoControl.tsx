import { ballById, dareForBall, isBingoComplete, remainingCount } from "@ff/engine";
import { activeDares } from "./dares";
import { useBingo } from "../store/bingoStore";
import { BingoLogo } from "../display/Logo";
import { QR } from "../net/pairing";
import { bingoJoinUrl } from "../net/room";
import { MusicControl } from "../music/MusicControl";
import { Section, CtrlButton } from "../control/ui";
import { RemoteShell } from "../control/shell";

// Host controller for Frendz Bingo: draw a ball, read its dare (host-only), then reveal it on
// the display. Plus undo / reset and a log of what's been drawn.
export function BingoControl() {
  const { bingo, draw, revealDare, undraw, reset } = useBingo();
  const cur = ballById(bingo.currentId);
  const done = isBingoComplete(bingo);

  return (
    // The draw is the whole game: the host presses it every thirty seconds all night. It docks.
    <RemoteShell
      title={<BingoLogo className="text-xl" />}
      badge={
        <span className="shrink-0 rounded-lg bg-surface px-2 py-1 font-display text-xs leading-none text-muted">
          {bingo.drawn.length}/75
        </span>
      }
      action={
        <CtrlButton tone="pink" className="w-full py-4 text-xl" onClick={draw} disabled={done}>
          {done ? "All 75 drawn!" : "🎲 Draw next ball"}
        </CtrlButton>
      }
    >
      <>
        <PlayerJoinCode />

        <Section title="Current ball">
          {cur ? (
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-ink bg-ink font-display text-3xl text-canvas">
                <span className="-mb-1 text-base">{cur.letter}</span>
                <span className="leading-none">{cur.number}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase text-ink/40">
                  Dare (host only) {bingo.dareRevealed ? "· shown on screen" : "· hidden"}
                </div>
                <div className="text-sm font-bold">{dareForBall(cur.id, activeDares())}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-ink/50">No ball yet — draw one.</div>
          )}
          <div className="mt-2">
            <CtrlButton
              tone={bingo.dareRevealed ? "ink" : "grape"}
              onClick={revealDare}
              disabled={!cur || bingo.dareRevealed}
            >
              {bingo.dareRevealed ? "✓ Dare revealed" : "👁 Reveal dare on screen"}
            </CtrlButton>
          </div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <CtrlButton tone="ink" onClick={undraw} disabled={bingo.drawn.length === 0}>
            ↶ Undo last
          </CtrlButton>
          <CtrlButton
            tone="tang"
            onClick={() => {
              if (window.confirm("Reset bingo? All drawn balls are cleared.")) reset();
            }}
          >
            ↺ Reset
          </CtrlButton>
          <span className="self-center text-xs font-semibold text-ink/40">
            {remainingCount(bingo)} left
          </span>
        </div>

        <MusicControl />

        <Section title={`Drawn (${bingo.drawn.length})`}>
          {bingo.drawn.length === 0 ? (
            <div className="text-sm font-semibold text-ink/40">Nothing drawn yet.</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {bingo.drawn.map((id) => (
                <span
                  key={id}
                  className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                    id === bingo.currentId ? "bg-sun text-canvas" : "bg-ink/10 text-ink"
                  }`}
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </Section>
      </>
    </RemoteShell>
  );
}

// Host control for the player-join QR. Tapping "Show QR on screen" broadcasts it to the main
// display (large, for the whole room to scan); a small copy also shows here so a host with no
// display can still let players scan the phone directly. Every player is a pure spectator.
function PlayerJoinCode() {
  const { connection, joinQrVisible, setJoinQrVisible } = useBingo();
  const room = connection.room;
  const players = connection.presence?.spectator ?? 0;
  const hasDisplay = (connection.presence?.display ?? 0) > 0;
  if (!room) return null;

  return (
    <Section title="Player join code">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-ink/60">
          {players > 0 ? `${players} player${players === 1 ? "" : "s"} watching` : "No players yet"}
        </span>
        <CtrlButton tone={joinQrVisible ? "ink" : "grape"} onClick={() => setJoinQrVisible(!joinQrVisible)}>
          {joinQrVisible ? "✓ Hide QR" : "Show QR on screen"}
        </CtrlButton>
      </div>

      {joinQrVisible && (
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          <div className="text-xs font-black uppercase text-buzz-green">
            {hasDisplay ? "▲ Large QR is on the main screen" : "No display — players scan here"}
          </div>
          <QR text={bingoJoinUrl(room)} size={180} />
          <p className="text-xs font-bold text-ink/60">
            Everyone scans to follow the calls + dares on their phone. Room <b>{room}</b>.
          </p>
          <p className="text-[10px] font-black uppercase text-buzz-green">
            Permanent code — safe to print on a poster
          </p>
        </div>
      )}
    </Section>
  );
}
