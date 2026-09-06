import { useEffect, useRef } from "react";
import { useTelestrations } from "./useTelestrations";
import { useRexHost, RexBanner } from "../host/RexHost";
import { StrokesView, type Stroke } from "../pictionary/PictionaryCanvas";
import { Logo } from "../display/Logo";
import { QR } from "../net/pairing";
import { telestrationsJoinUrl, controllerUrl } from "../net/room";
import { getBrand } from "../brand/theme";

// Display (TV) for "Sketch Relay". Lobby QR, a live "who's done" board while everyone draws/guesses,
// then the big reveal — each book's chain shown one step at a time.
export function TelestrationsDisplay({ room }: { room: string }) {
  const { state } = useTelestrations(room, "display");
  const label = getBrand().games.telestrations?.label ?? "Sketch Relay";

  // Rex, the AI host, reacts to Sketch Relay moments (display only — one voice per room).
  const { line, say } = useRexHost(room, label);
  const rex = useRef({ started: false, revealed: false, lastBook: -1, ended: false });
  useEffect(() => {
    if (!state) return;
    const st = rex.current;
    if (state.phase === "playing" && !st.started) {
      st.started = true;
      say("intro");
    }
    if (state.phase === "reveal" && !st.revealed) {
      st.revealed = true;
      st.lastBook = state.reveal?.bookIndex ?? 0;
      say("reveal_intro");
    } else if (state.phase === "reveal" && state.reveal && state.reveal.bookIndex !== st.lastBook) {
      st.lastBook = state.reveal.bookIndex;
      say("new_book", { book: state.reveal.bookIndex + 1 });
    }
    if (state.phase === "ended" && !st.ended) {
      st.ended = true;
      say("ended");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.reveal?.bookIndex, say]);

  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;

  if (state.phase === "lobby") {
    return (
      <Center>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label}</div>
        <p className="mt-1 text-lg text-muted">Draw, pass, guess, repeat. Scan to join (3+ players).</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center"><QR text={telestrationsJoinUrl(room)} size={200} /><div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div></div>
          <div className="rounded-xl border border-line p-3 text-left" style={{ minWidth: 160 }}><div className="ff-title text-xl">Players ({state.players.length})</div><div className="mt-1 text-sm">{state.players.map((p) => p.name).join(", ") || "—"}</div></div>
        </div>
        <p className="mt-4 text-sm text-muted">Host: <span className="font-mono">{controllerUrl(room)}</span></p>
      </Center>
    );
  }

  if (state.phase === "playing") {
    const done = state.players.filter((p) => p.submitted).length;
    const turnLabel = state.turn === 0 ? "Draw your word!" : state.turn % 2 === 1 ? "Guess the drawing!" : "Draw the guess!";
    return (
      <Center>
        <div className="text-sm font-semibold uppercase tracking-widest text-muted">Turn {state.turn + 1}/{state.totalTurns}</div>
        <div className="ff-title text-6xl">{turnLabel}</div>
        <p className="mt-2 text-lg text-muted">Everyone's on their phones — pass happens automatically.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {state.players.map((p) => (
            <span key={p.id} className={`rounded-full px-3 py-1 text-sm font-semibold ${p.submitted ? "bg-success text-white" : "bg-surface text-muted"}`} style={p.submitted ? {} : { border: "1px solid rgb(var(--c-line))" }}>{p.name}{p.submitted ? " ✓" : " …"}</span>
          ))}
        </div>
        <div className="mt-3 text-2xl font-semibold text-primary">{done}/{state.players.length} done</div>
        <RexBanner line={line} />
      </Center>
    );
  }

  // reveal / ended
  const r = state.reveal;
  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center gap-3 overflow-auto p-6 text-center text-ink">
      {state.phase === "ended" || !r ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3"><div className="ff-title text-7xl">That's a wrap! 🎉</div><p className="text-lg text-muted">Hit reset on the host to play again.</p></div>
      ) : (
        <>
          <div className="text-sm font-semibold uppercase tracking-widest text-muted">Book {r.bookIndex + 1}/{state.totalBooks} · {r.ownerName}'s word</div>
          <div className="ff-title text-5xl text-primary">{r.seed}</div>
          <div className="flex w-full max-w-2xl flex-col gap-3">
            {r.shown.map((e, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{e.byName} {e.type === "draw" ? "drew" : "guessed"}</div>
                {e.type === "draw"
                  ? <div className="mx-auto h-56 w-full max-w-md"><StrokesView strokes={e.value as Stroke[]} /></div>
                  : <div className="ff-title text-4xl">{e.value as string}</div>}
              </div>
            ))}
          </div>
          {r.complete && <div className="text-lg font-semibold text-muted">End of the chain — next book →</div>}
        </>
      )}

      <RexBanner line={line} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}
