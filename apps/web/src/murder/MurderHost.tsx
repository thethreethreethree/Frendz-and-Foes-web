import { useState } from "react";
import { useMurder } from "./useMurder";
import { BingoLogo } from "../display/Logo";
import { MusicControl } from "../music/MusicControl";
import { Section, CtrlButton } from "../control/ui";

// Host (game master) for Murder: configure roles, assign & start, monitor, reset. Plays suspense
// music too.
export function MurderHost({ room }: { room: string }) {
  const g = useMurder(room, "host");
  const st = g.state;
  const [mur, setMur] = useState(1);
  const [det, setDet] = useState(1);
  const players = st?.players ?? [];
  const enough = players.length >= mur + det + 1;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overflow-x-hidden bg-concrete/40 text-ink">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <span className="font-display text-xl text-ink">MURDER</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${g.connected ? "bg-buzz-green" : "bg-tang"}`} />
          {room} · {players.length} players
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {(!st || st.phase === "lobby") && (
          <>
            <Section title={`Players (${players.length})`}>
              {players.length === 0 ? (
                <div className="text-sm font-semibold text-ink/40">
                  Players join by scanning the QR on the display.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {players.map((p) => (
                    <span key={p.id} className="rounded-md bg-ink/10 px-2 py-1 text-sm font-bold">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Roles">
              <Stepper label="Murderers" value={mur} set={setMur} min={1} max={4} />
              <Stepper label="Detectives" value={det} set={setDet} min={0} max={4} />
              <CtrlButton
                tone="pink"
                className="mt-2 w-full py-3 text-lg"
                disabled={!enough}
                onClick={() => {
                  g.config(mur, det);
                  setTimeout(g.assign, 80);
                }}
              >
                {enough ? "🎭 Assign roles & start" : `Need ${mur + det + 1}+ players`}
              </CtrlButton>
            </Section>
          </>
        )}

        {st && st.phase !== "lobby" && (
          <Section title={st.phase === "ended" ? "Game over" : "In progress"}>
            {st.phase === "ended" && (
              <div className="mb-2 ff-title text-2xl text-pink">
                {st.winner === "murderers" ? "MURDERERS WIN" : "CIVILIANS WIN"}
              </div>
            )}
            <ul className="space-y-1">
              {st.players.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className={`font-bold ${p.alive ? "" : "text-ink/40 line-through"}`}>
                    {p.alive ? "" : "💀 "}
                    {p.name}
                  </span>
                  {p.role && (
                    <span className="text-xs font-black uppercase text-ink/50">{p.role}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <CtrlButton tone="ink" onClick={() => g.reset(false)}>↺ Back to lobby</CtrlButton>
              <CtrlButton tone="tang" onClick={() => g.reset(true)}>New game</CtrlButton>
            </div>
          </Section>
        )}

        <MusicControl />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  set,
  min,
  max,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <CtrlButton tone="ink" onClick={() => set(Math.max(min, value - 1))}>−</CtrlButton>
        <span className="w-6 text-center font-display text-2xl">{value}</span>
        <CtrlButton tone="ink" onClick={() => set(Math.min(max, value + 1))}>+</CtrlButton>
      </div>
    </div>
  );
}
