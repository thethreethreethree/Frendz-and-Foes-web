import { useEffect, useRef, useState } from "react";
import { useTelestrations } from "./useTelestrations";
import { CaptureCanvas, StrokesView, type Stroke } from "../pictionary/PictionaryCanvas";
import { teSubmitDraw, teSubmitText } from "../net/telestrations";
import { getBrand } from "../brand/theme";
import { AvatarNameForm } from "../net/avatars";
import { HowToPlay } from "../net/howtoplay";

const PEN_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#ffffff"];

export function TelestrationsPlayer({ room }: { room: string }) {
  const { state, you, error, join } = useTelestrations(room, "player");
  const label = getBrand().games.telestrations?.label ?? "Sketch Relay";
  if (!you) return <Wrap><AvatarNameForm label={label} onJoin={join} error={error} /></Wrap>;
  if (!state) return <Wrap><p className="text-muted">Connecting…</p></Wrap>;

  return (
    <Wrap>
      {error && <div className="mb-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white">{error}</div>}
      {state.phase === "lobby" && <Center><div className="ff-title text-2xl">{label}</div><p className="mb-4 mt-2 text-sm text-muted">{state.players.length} in. Waiting for the host…</p><HowToPlay game="telestrations" /></Center>}
      {state.phase === "playing" && (you.submitted
        ? <Center><div className="ff-title text-2xl text-success">Done ✓</div><p className="mt-2 text-sm text-muted">Waiting for everyone else…</p></Center>
        : you.type === "draw" ? <DrawTurn you={you} /> : <GuessTurn you={you} />)}
      {(state.phase === "reveal" || state.phase === "ended") && <Center><div className="ff-title text-2xl">Watch the big screen! 📺</div><p className="mt-2 text-sm text-muted">The chains are being revealed.</p></Center>}
    </Wrap>
  );
}

function DrawTurn({ you }: { you: { turn?: number; prompt?: { word?: string } | null } }) {
  const strokesRef = useRef<Stroke[]>([]);
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [clearNonce, setClearNonce] = useState(0);
  useEffect(() => { strokesRef.current = []; setClearNonce((n) => n + 1); }, [you.turn]);
  const clear = () => { strokesRef.current = []; setClearNonce((n) => n + 1); };
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-center text-sm font-semibold text-muted">Draw this:</div>
      <div className="ff-title text-center text-3xl text-primary">{you.prompt?.word}</div>
      <div className="min-h-0 flex-1"><CaptureCanvas key={clearNonce} strokesRef={strokesRef} color={color} width={4} /></div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">{PEN_COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className="h-8 w-8 rounded-full" style={{ background: c, border: color === c ? "3px solid rgb(var(--c-primary))" : "1px solid rgb(var(--c-line))" }} />)}</div>
        <button onClick={clear} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted">Clear</button>
      </div>
      <button onClick={() => teSubmitDraw(strokesRef.current)} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink">DONE DRAWING</button>
    </div>
  );
}

function GuessTurn({ you }: { you: { prompt?: { drawing?: Stroke[] } | null } }) {
  const [guess, setGuess] = useState("");
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-center text-sm font-semibold text-muted">What is this?</div>
      <div className="min-h-0 flex-1"><StrokesView strokes={you.prompt?.drawing ?? []} /></div>
      <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess" maxLength={40}
        className="w-full rounded-lg border border-line px-4 py-3 text-center text-lg" />
      <button disabled={!guess.trim()} onClick={() => teSubmitText(guess.trim())} className="ff-sticker w-full bg-primary px-4 py-3 font-display text-xl text-primary-ink disabled:opacity-40">SUBMIT GUESS</button>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) { return <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>; }
function Wrap({ children }: { children: React.ReactNode }) { return <div className="flex h-full flex-col overflow-hidden bg-canvas p-3 text-ink">{children}</div>; }
