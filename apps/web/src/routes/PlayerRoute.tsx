import { useState } from "react";
import { PlayerView } from "../murder/PlayerView";
import { getRoomFromUrl, setUrlRoom } from "../net/room";

// Players reach this by scanning the Murder display's join QR (carries ?room=). If opened
// without a room, offer a code entry.
export function PlayerRoute() {
  const [room] = useState(() => getRoomFromUrl());
  const [code, setCode] = useState("");

  if (!room) {
    return (
      <div className="ff-backdrop grid h-full place-items-center p-6">
        <div className="flex flex-col items-center text-center">
          <div className="ff-title text-4xl text-pink">ENTER ROOM CODE</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="ABCD"
            className="mt-4 w-40 rounded-lg border-2 border-ink/20 bg-white px-4 py-3 text-center text-2xl tracking-widest text-ink outline-none focus:border-teal"
          />
          <button
            disabled={code.length < 3}
            onClick={() => {
              setUrlRoom(code);
              window.location.reload();
            }}
            className="ff-sticker mt-3 bg-pink px-8 py-3 font-display text-2xl text-white disabled:opacity-40"
          >
            JOIN
          </button>
        </div>
      </div>
    );
  }

  return <PlayerView room={room} />;
}
