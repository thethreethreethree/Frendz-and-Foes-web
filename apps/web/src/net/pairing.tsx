import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useConnection } from "./connection";
import { controllerUrl, generateRoomCode, setUrlRoom } from "./room";

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

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
      <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-buzz-green" : "bg-tang"}`} />
      {room ? `${room} · ${label}` : "Not linked"}
    </span>
  );
}

// Full-screen pairing card shown on the DISPLAY until the host phone connects.
export function DisplayPairing() {
  const connection = useConnection();
  const room = connection.room;
  const linked = connection.connected && (connection.presence?.host ?? 0) > 0;

  if (!room || linked) {
    return (
      <div className="absolute right-3 top-3 z-40">
        <StatusPill />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/80 backdrop-blur">
      <div className="ff-sticker bg-white px-10 py-8 text-center text-ink">
        <div className="font-display text-3xl text-pink">SCAN TO HOST</div>
        <div className="mt-4 flex justify-center">
          <QR text={controllerUrl(room)} size={200} />
        </div>
        <div className="mt-4 text-sm font-bold text-ink/60">or enter room code</div>
        <div className="ff-title text-6xl tracking-[0.3em] text-ink">{room}</div>
        <div className="mt-3">
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
      className="inline-flex items-center gap-1.5 rounded-full bg-tang px-2.5 py-1 text-xs font-bold text-white"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-white" /> Pair display
    </button>
  );
}
