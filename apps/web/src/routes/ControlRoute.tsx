import { useState } from "react";
import { GameProvider } from "../store/gameStore";
import { BingoProvider } from "../store/bingoStore";
import { ControlView } from "../control/ControlView";
import { BingoControl } from "../bingo/BingoControl";
import { getGameFromUrl, getRoomFromUrl } from "../net/room";

// The controller's game is set by the QR/URL (?game=). Works locally with no room too.
export function ControlRoute() {
  const [room] = useState(() => getRoomFromUrl() ?? undefined);
  const [game] = useState(() => getGameFromUrl());

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
