import { useState } from "react";
import { GameProvider } from "../store/gameStore";
import { ControlView } from "../control/ControlView";
import { getRoomFromUrl } from "../net/room";

// The controller works locally with no room (single-screen play); pairing a display just adds
// a room and remounts the provider in sync mode.
export function ControlRoute() {
  const [room] = useState(() => getRoomFromUrl() ?? undefined);
  return (
    <GameProvider room={room}>
      <ControlView />
    </GameProvider>
  );
}
