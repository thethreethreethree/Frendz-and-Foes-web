import { useState } from "react";
import { ballById, dareForBall, isBingoComplete, remainingCount } from "@ff/engine";
import { useBingo } from "../store/bingoStore";
import { BingoLogo } from "../display/Logo";
import { ControlPairButton, QR } from "../net/pairing";
import { bingoJoinUrl } from "../net/room";
import { MusicControl } from "../music/MusicControl";
import { Section, CtrlButton, HomeButton } from "../control/ui";

// Host controller for Frendz Bingo: draw a ball, read its dare (host-only), then reveal it on
// the display. Plus undo / reset and a log of what's been drawn.
export function BingoControl() {
  const { bingo, draw, revealDare, undraw, reset } = useBingo();
  const cur = ballById(bingo.currentId);
  const done = isBingoComplete(bingo);

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overflow-x-hidden bg-concrete/40 text-ink">
      {/* Command bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <BingoLogo className="text-base" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink/50">{bingo.drawn.length}/75</span>
          <HomeButton />
          <ControlPairButton />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <PlayerJoinCode />

        <CtrlButton tone="pink" className="py-4 text-xl" onClick={draw} disabled={done}>
          {done ? "All 75 drawn!" : "🎲 Draw next ball"}
        </CtrlButton>

        <Section title="Current ball">
          {cur ? (
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-ink bg-ink font-display text-3xl text-white">
                <span className="-mb-1 text-base">{cur.letter}</span>
                <span className="leading-none">{cur.number}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase text-ink/40">
                  Dare (host only) {bingo.dareRevealed ? "· shown on screen" : "· hidden"}
                </div>
                <div className="text-sm font-bold">{dareForBall(cur.id)}</div>
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
                    id === bingo.currentId ? "bg-sun text-ink" : "bg-ink/10 text-ink"
                  }`}
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// One QR the whole room scans to watch calls + dares on their own phones (they hold physical
// cards). Every player is a pure spectator, so a live count is all the host needs to see.
function PlayerJoinCode() {
  const { connection } = useBingo();
  const room = connection.room;
  const players = connection.presence?.spectator ?? 0;
  const [open, setOpen] = useState(false);
  if (!room) return null;

  return (
    <Section title="Player join code">
      {!open ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-ink/60">
            {players > 0 ? `${players} player${players === 1 ? "" : "s"} watching` : "No players yet"}
          </span>
          <CtrlButton tone="grape" onClick={() => setOpen(true)}>
            Show QR
          </CtrlButton>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <QR text={bingoJoinUrl(room)} size={200} />
          <p className="text-xs font-bold text-ink/60">
            Everyone scans this to follow the calls and dares on their phone. Room <b>{room}</b>.
          </p>
          <div className="text-xs font-black text-buzz-green">
            {players > 0 ? `✓ ${players} watching` : "Waiting for players to scan…"}
          </div>
          <button onClick={() => setOpen(false)} className="text-xs font-bold text-ink/40 underline">
            Hide
          </button>
        </div>
      )}
    </Section>
  );
}
