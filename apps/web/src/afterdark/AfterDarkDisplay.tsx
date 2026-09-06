import { useEffect, useRef } from "react";
import { useAfterDark } from "./useAfterDark";
import { useRexHost, RexBanner } from "../host/RexHost";
import { Logo } from "../display/Logo";
import { QR } from "../net/pairing";
import { afterdarkJoinUrl, controllerUrl } from "../net/room";
import { fillPrompt, type CaState } from "../net/afterdark";
import { getBrand } from "../brand/theme";
import { AvatarBadge } from "../net/avatars";

// Display (TV) for "After Dark". Prompt + anonymous submissions + the winning combo. Hands stay
// private on phones. Marked 18+.
export function AfterDarkDisplay({ room }: { room: string }) {
  const { state } = useAfterDark(room, "display");
  const label = getBrand().games.afterdark?.label ?? "After Dark";

  // Rex, the AI host, works the room After Dark (display only — one filthy voice per room).
  const { line, say } = useRexHost(room, label);
  const rex = useRef({ started: false, judgeRound: -1, revealRound: -1, ended: false });
  useEffect(() => {
    if (!state) return;
    const st = rex.current;
    if (state.phase === "lobby") {
      // Back in the lobby (reset/rematch, same room) — clear dedupe so Rex re-intros next game.
      rex.current = { started: false, judgeRound: -1, revealRound: -1, ended: false };
      return;
    }
    const judgeName = state.players.find((p) => p.id === state.judgeId)?.name;
    if (state.phase !== "lobby" && !st.started) {
      st.started = true;
      say("intro");
    }
    if (state.phase === "judging" && st.judgeRound !== state.round) {
      st.judgeRound = state.round;
      say("judging", { judge: judgeName });
    }
    if (state.phase === "reveal" && st.revealRound !== state.round) {
      st.revealRound = state.round;
      say("reveal", { name: state.winner?.name });
    }
    if (state.phase === "ended" && !st.ended) {
      st.ended = true;
      const champ = [...state.players].sort((a, b) => b.score - a.score)[0];
      say("ended", { name: champ?.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.round, say]);

  if (!state) return <Center><p className="text-muted">Connecting…</p></Center>;
  const judge = state.players.find((p) => p.id === state.judgeId)?.name ?? "?";

  if (state.phase === "lobby") {
    return (
      <Center>
        <Logo className="text-5xl" />
        <div className="ff-title mt-2 text-3xl text-muted">{label} <span className="align-middle text-base text-danger">18+</span></div>
        <p className="mt-1 text-lg text-muted">Adult humor. Scan to join (3+ players).</p>
        <div className="mt-5 flex items-center gap-8">
          <div className="text-center"><QR text={afterdarkJoinUrl(room)} size={200} /><div className="ff-title mt-2 text-4xl tracking-[0.3em] text-ink">{room}</div></div>
          <div className="rounded-xl border border-line p-3 text-left" style={{ minWidth: 160 }}><div className="ff-title text-xl">Players ({state.players.length})</div><div className="mt-2 flex flex-col gap-1.5 text-sm">{state.players.length === 0 ? "—" : state.players.map((p) => (<span key={p.id} className="flex items-center gap-2"><AvatarBadge avatar={p.avatar} name={p.name} size={24} />{p.name}</span>))}</div></div>
        </div>
        <p className="mt-4 text-sm text-muted">Host: <span className="font-mono">{controllerUrl(room)}</span></p>
      </Center>
    );
  }

  return (
    <div className="ff-backdrop relative flex h-full w-full flex-col items-center gap-4 overflow-auto p-8 text-center text-ink">
      <div className="text-sm font-semibold uppercase tracking-widest text-muted">Round {state.round} · Judge: {judge} · first to {state.config.winScore}</div>
      <div className="ff-title max-w-3xl text-4xl" style={{ textWrap: "balance" }}>{state.prompt?.text}</div>

      {state.phase === "submitting" && (
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.filter((p) => !p.isJudge).map((p) => (
            <span key={p.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${p.submitted ? "bg-success text-white" : "bg-surface text-muted"}`} style={p.submitted ? {} : { border: "1px solid rgb(var(--c-line))" }}><AvatarBadge avatar={p.avatar} name={p.name} size={20} />{p.name}{p.submitted ? " ✓" : " …"}</span>
          ))}
        </div>
      )}

      {state.phase === "judging" && (
        <>
          <p className="text-lg text-muted">{judge} is judging…</p>
          <div className="flex w-full max-w-3xl flex-col gap-2">
            {state.revealed.map((r) => (
              <div key={r.i} className="ff-title rounded-xl bg-surface px-4 py-3 text-2xl" style={{ border: "1px solid rgb(var(--c-line))" }}>{fillPrompt(state.prompt!.text, r.cards)}</div>
            ))}
          </div>
        </>
      )}

      {state.phase === "reveal" && state.winner && (
        <>
          <div className="ff-title rounded-2xl bg-success px-6 py-4 text-3xl text-white">{fillPrompt(state.prompt!.text, state.winner.cards)}</div>
          <div className="text-xl font-semibold">🏆 {state.winner.name} wins the round</div>
        </>
      )}

      {(state.phase === "reveal" || state.phase === "ended") && <Standings state={state} />}
      {state.phase === "ended" && <div className="ff-title text-5xl text-primary">Champion!</div>}

      <RexBanner line={line} />
    </div>
  );
}

function Standings({ state }: { state: CaState }) {
  const rows = [...state.players].sort((a, b) => b.score - a.score);
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-2">
      {rows.map((p, i) => (
        <span key={p.id} className={`flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xl ${i === 0 ? "bg-primary text-primary-ink" : "bg-surface text-ink"}`} style={i === 0 ? {} : { border: "1px solid rgb(var(--c-line))" }}><AvatarBadge avatar={p.avatar} name={p.name} size={20} />{p.name} <span className="tabular-nums">{p.score}</span>{i === 0 ? " 👑" : ""}</span>
      ))}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="ff-backdrop grid h-full w-full place-items-center p-6 text-center text-ink"><div className="flex flex-col items-center">{children}</div></div>;
}
