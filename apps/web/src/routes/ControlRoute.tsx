import { useState } from "react";
import { GameProvider } from "../store/gameStore";
import { BingoProvider } from "../store/bingoStore";
import { ControlView } from "../control/ControlView";
import { BingoControl } from "../bingo/BingoControl";
import { Murder2Host } from "../murder2/Murder2Host";
import { GamePicker } from "./GamePicker";
import { generateRoomCode, getGameFromUrl, getRoomFromUrl, setUrlGame, setUrlRoom } from "../net/room";
import type { GameType } from "../net/socket";

// The host controller. Phone-first: if no game is chosen yet, the host picks one here (no display
// needed), and for Feud/Bingo the controller MINTS ITS OWN ROOM so its participant/team QR works
// standalone. Murder stays server-authoritative and still pairs to a display-minted room.
export function ControlRoute() {
  const [game] = useState<GameType | null>(() =>
    new URLSearchParams(window.location.search).has("game") ? getGameFromUrl() : null,
  );
  const [room] = useState<string | undefined>(() => {
    const existing = getRoomFromUrl();
    if (existing) return existing;
    // Mint a room for the phone-first games so their join QR is available without a display.
    if (game === "feud" || game === "bingo") {
      const code = generateRoomCode();
      setUrlRoom(code);
      return code;
    }
    return undefined;
  });

  if (!game) {
    return (
      <GamePicker
        onPick={(g) => {
          setUrlGame(g);
          // Reload so the room initializer above mints a fresh room for the chosen game.
          window.location.reload();
        }}
      />
    );
  }

  if (game === "murder") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Murder display QR.
        </div>
      );
    return <Murder2Host room={room} />;
  }

  if (game === "bingo") {
    return (
      <BingoProvider room={room}>
        <BingoControl />
      </BingoProvider>
    );
  }

  return (
    <GameProvider room={room}>
      <ControlView />
    </GameProvider>
  );
}
