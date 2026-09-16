import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useConnection } from "./connection";
import { controllerUrl, generateRoomCode, setUrlRoom } from "./room";
import type { GameType } from "./socket";

export function QR({ text, size = 160 }: { text: string; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 1 }).then(setUrl).catch(() => setUrl(""));
  }, [text, size]);
  return url ? (
    <img src={url} width={size} height={size} alt="QR code" className="rounded-lg bg-white p-1" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded-lg bg-white/40" />
  );
}

// Live connection status pill, reads role from the shared connection info.
// The host controller's address, as something you can SCAN.
//
// The five server-authoritative games (After Dark, Sketch Relay, Ballpark, Solo Clue, Cover Ops)
// have no phone-first entry -- they are excluded from the /control picker because the DISPLAY mints
// the room and shows the player QR. That left the host URL printed as small text on a television,
// to be typed by hand. A second QR is the only thing that works from across a room.
export function HostQR({ room, game }: { room: string; game: GameType }) {
  return (
    <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-line px-3 py-2">
      <QR text={controllerUrl(room, game)} size={76} />
      <div className="text-left">
        <div className="ff-title text-base tracking-wider text-ink">HOST</div>
        <div className="text-xs text-muted">Scan to run the game from your phone</div>
        <div className="mt-0.5 font-mono text-[10px] text-muted">{controllerUrl(room, game)}</div>
      </div>
    </div>
  );
}

export function StatusPill() {
  const connection = useConnection();
  const { connected, presence, role, room } = connection;

  let label: string;
  let ok = connected;
  if (role === "host") {
    const displays = presence?.display ?? 0;
    label = !connected ? "Offline" : displays > 0 ? `Display linked (${displays})` : "Waiting for display";
    ok = connected && displays > 0;
  } else {
    const hosts = presence?.host ?? 0;
    label = !connected ? "Offline" : hosts > 0 ? "Host linked" : "Waiting for host";
    ok = connected && hosts > 0;
  }

  // CONTRAST. This was `bg-ink/80 ... text-white` — white text on a pill painted from --c-ink,
  // which is near-white (244 247 255) since the dark default. Measured off the rendered pixels at
  // 390x844: about 1.4:1, against 4.5:1 for AA body text. It is on ten host controllers and every
  // display's corner, and the string it renders is the ROOM CODE — the one thing a host reads out
  // loud to a room of people. It was the least legible text on their phone.
  //
  // Now: a surface chip with a hairline, the code at full ink and tabular so it cannot be misread,
  // the status word muted beside it, and the dot carrying the state. The dot also stopped being
  // binary — "connected but nothing paired yet" is a different situation from "offline", and
  // painting both of them tang said the same thing about both.
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-success" : connected ? "bg-warning" : "bg-danger"}`}
        aria-hidden
      />
      {room ? (
        <>
          <span className="font-display tracking-[0.12em] text-ink">{room}</span>
          <span className="font-bold text-muted">{label}</span>
        </>
      ) : (
        <span className="font-bold text-muted">Not linked</span>
      )}
    </span>
  );
}

// How long the host may be gone before the display offers the pairing card again.
//
// The server already holds this principle and the display did not: when the last peer leaves a room
// it waits 60s before dropping it, because (its words) "a host refreshing their phone is not the end
// of the night, and neither is a player's tunnel dropping for ten seconds." 45s is inside that
// window, so the card can never reappear for a room the server is about to discard anyway.
const HOST_GRACE_MS = 45_000;

// Full-screen pairing card shown on the DISPLAY until the host phone connects.
//
// IT USED TO INTERRUPT LIVE GAMES. `linked` is computed from the socket's CURRENT state, and a
// single falsy render put a full-screen QR over the television. Mid-game that happens constantly
// and for reasons that are not failures: the host's phone locks, Safari backgrounds the tab, the
// wifi blips, the host reloads their controller, or the DISPLAY's own socket reconnects (which
// clears `connected` on its own). The server deletes the host's peer the instant their socket drops
// and re-broadcasts presence with host:0, so the takeover was immediate. Reported by the owner:
// "the game qr code showed up while i was in the middle of a test".
//
// So the question the card answers had to change. It is no longer "is a host attached right now",
// which is a fact about the last half-second. It is "does this screen still need pairing" — and
// once a host has linked, a gap is a reconnection, not a request to pair. The card only returns
// after HOST_GRACE_MS, so a genuinely dead host can still be re-paired without a page reload.
export function DisplayPairing({ game }: { game: GameType }) {
  const connection = useConnection();
  const room = connection.room;
  const linked = connection.connected && (connection.presence?.host ?? 0) > 0;

  // Has a host EVER been attached to this screen? Before that, the card is exactly right.
  const [everLinked, setEverLinked] = useState(false);
  // Gone long enough that this is a real loss rather than a phone locking.
  const [goneTooLong, setGoneTooLong] = useState(false);

  useEffect(() => {
    if (linked) {
      setEverLinked(true);
      setGoneTooLong(false);
      return;
    }
    // Never linked: the card is already up and no timer is needed.
    if (!everLinked) return;
    const t = setTimeout(() => setGoneTooLong(true), HOST_GRACE_MS);
    return () => clearTimeout(t);
  }, [linked, everLinked]);

  if (!room || linked) {
    return (
      <div className="absolute right-3 top-3 z-40">
        <StatusPill />
      </div>
    );
  }

  // The host has dropped out of a game that was already running. Say so quietly, in the corner,
  // and leave the game on screen — the room is still watching it.
  if (everLinked && !goneTooLong) {
    return (
      <div className="absolute right-3 top-3 z-40 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-warning" aria-hidden />
        <span className="text-xs font-bold text-ink">Host reconnecting…</span>
      </div>
    );
  }

  return (
    // THE CARD WAS INVISIBLE FROM THE WAIST DOWN.
    //
    // It was `bg-white ... text-ink` — a literal white card, and --c-ink is near-white (#f4f7ff)
    // since the theme went dark. "or enter room code" and the room code itself rendered at about
    // 1.03:1: present in the DOM, unreadable on the television. The QR still scanned, so anyone
    // with a working camera never noticed; anyone typing the code by hand was reading nothing.
    // Same literal-white-under-dark-tokens fault as the music panel, on the FIRST screen a room
    // full of people looks at.
    //
    // The card is now a dark surface, which is also what the rest of the product is. The QR keeps
    // its own white quiet zone (the QR component supplies it) because a scanner needs the contrast.
    <div className="absolute inset-0 z-40 grid place-items-center bg-canvas/85 p-6 backdrop-blur">
      <div className="ff-sticker max-w-full bg-surface px-10 py-8 text-center text-ink">
        <div className="font-display text-3xl text-primary">SCAN TO HOST</div>
        <div className="mt-4 flex justify-center">
          <QR text={controllerUrl(room, game)} size={200} />
        </div>
        <div className="mt-5 text-sm font-bold uppercase tracking-wider text-muted">or enter room code</div>
        {/* tabular-nums so 0/O and 1/I cannot be misread by someone typing it from across a room. */}
        <div className="ff-title text-6xl tabular-nums tracking-[0.3em] text-ink">{room}</div>
        <div className="mt-4">
          <StatusPill />
        </div>
      </div>
    </div>
  );
}

// Controller pairing button: when unlinked, lets the host enter/generate a code.
export function ControlPairButton() {
  const connection = useConnection();
  if (connection.room) return <StatusPill />;
  return (
    <button
      onClick={() => {
        const entered = window.prompt("Enter the room code shown on the display (or leave blank to create one):");
        const code = (entered && entered.trim()) || generateRoomCode();
        setUrlRoom(code.toUpperCase());
        window.location.reload();
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-tang px-2.5 py-1 text-xs font-bold text-canvas"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-canvas" /> Pair display
    </button>
  );
}
