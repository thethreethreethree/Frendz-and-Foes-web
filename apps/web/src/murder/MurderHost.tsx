import { useState } from "react";
import { useMurder } from "./useMurder";
import { MusicControl } from "../music/MusicControl";
import { Section, CtrlButton } from "../control/ui";

// Host (game master): set the pace (cooldown + trials), start the game, watch it unfold, reset.
export function MurderHost({ room }: { room: string }) {
  const g = useMurder(room, "host");
  const st = g.state;
  const [cooldown, setCooldown] = useState(90);
  const [trials, setTrials] = useState(3);
  const players = st?.players ?? [];
  const ready = players.length >= 6 && players.every((p) => p.characterId);

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto overflow-x-hidden bg-concrete/40 text-ink">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ink/10 bg-white/95 px-3 py-2 backdrop-blur">
        <span className="font-display text-xl">MURDER MYSTERY</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${g.connected ? "bg-buzz-green" : "bg-tang"}`} />
          {room} · {players.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {g.error && (
          <div className="rounded-lg bg-tang px-3 py-2 text-sm font-bold text-white">{g.error}</div>
        )}

        {(!st || st.phase === "lobby") && (
          <>
            <Section title={`Villagers (${players.length}/6 min)`}>
              {players.length === 0 ? (
                <div className="text-sm font-semibold text-ink/40">
                  Players scan the QR on the display and pick a villager.
                </div>
              ) : (
                <ul className="space-y-1">
                  {players.map((p) => {
                    const c = g.byId.get(p.characterId ?? "");
                    return (
                      <li key={p.id} className="flex items-center gap-2 text-sm font-bold">
                        <span>{c?.emoji ?? "❓"}</span>
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] font-black uppercase text-ink/50">
                          {c ? `${c.job} · ${c.weapon}` : "choosing…"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Pace">
              <Stepper label="Kill cooldown (sec)" value={cooldown} set={setCooldown} min={0} max={180} step={15} />
              <Stepper label="Trials (accusations)" value={trials} set={setTrials} min={1} max={6} step={1} />
              <CtrlButton
                tone="pink"
                className="mt-2 w-full py-3 text-lg"
                disabled={!ready}
                onClick={() => {
                  g.config(cooldown, trials);
                  setTimeout(g.assign, 100);
                }}
              >
                {ready ? "🔪 Assign roles & start" : "Need 6+ players, all with villagers"}
              </CtrlButton>
              <p className="mt-2 text-[11px] font-semibold text-ink/50">
                4 kills wins for the murderer. They may frame others twice, then must use their own
                weapon. A wrong verdict clears the suspect and gives the murderer a free window.
              </p>
            </Section>
          </>
        )}

        {st && st.phase !== "lobby" && (
          <Section title={st.phase === "ended" ? "Game over" : "In progress"}>
            {st.phase === "ended" ? (
              <div className="mb-2 ff-title text-2xl text-pink">
                {st.winner === "murderer" ? "MURDERER WINS" : "VILLAGE WINS"}
              </div>
            ) : (
              <div className="mb-2 text-sm font-bold">
                💀 {st.kills}/{st.config.killsToWin} kills · ⚖️ {st.trialsLeft} trials left
              </div>
            )}
            <ul className="space-y-1">
              {st.players.map((p) => {
                const c = g.byId.get(p.characterId ?? "");
                return (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span>{p.alive ? c?.emoji : "💀"}</span>
                    <span className={`flex-1 truncate font-bold ${p.alive ? "" : "text-ink/40 line-through"}`}>
                      {p.name}
                    </span>
                    {p.cleared && <span className="text-[10px] font-black text-buzz-green">CLEARED</span>}
                    {p.role && (
                      <span className="text-[10px] font-black uppercase text-pink">{p.role}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex gap-2">
              <CtrlButton tone="ink" onClick={() => g.reset(false)}>↺ New round</CtrlButton>
              <CtrlButton tone="tang" onClick={() => g.reset(true)}>Clear players</CtrlButton>
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
  step,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <CtrlButton tone="ink" onClick={() => set(Math.max(min, value - step))}>−</CtrlButton>
        <span className="w-8 text-center font-display text-2xl">{value}</span>
        <CtrlButton tone="ink" onClick={() => set(Math.min(max, value + step))}>+</CtrlButton>
      </div>
    </div>
  );
}
