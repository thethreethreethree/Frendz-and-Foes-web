import { useState } from "react";
import { DisplayProvider } from "../store/DisplayProvider";
import { BingoDisplayProvider } from "../store/bingoStore";
import { DisplayView } from "../display/DisplayView";
import { BingoDisplay } from "../bingo/BingoDisplay";
import { MurderDisplay } from "../murder/MurderDisplay";
import { DisplayPairing } from "../net/pairing";
import { GamePicker } from "./GamePicker";
import { getGameFromUrl, generateRoomCode, getRoomFromUrl, setUrlGame, setUrlRoom } from "../net/room";
import type { GameType } from "../net/socket";

export function DisplayRoute() {
  // The host picks a game first (unless one is already in the URL), then pairing/QR shows.
  const [game, setGame] = useState<GameType | null>(() =>
    new URLSearchParams(window.location.search).has("game") ? getGameFromUrl() : null,
  );
  // Pick a room once: use the URL's, or mint a fresh one and pin it to the URL.
  const [room] = useState(() => {
    const existing = getRoomFromUrl();
    if (existing) return existing;
    const code = generateRoomCode();
    setUrlRoom(code);
    return code;
  });

  if (!game) {
    return (
      <GamePicker
        onPick={(g) => {
          setUrlGame(g);
          setGame(g);
        }}
      />
    );
  }

  if (game === "murder") {
    // Murder is server-authoritative (its own socket events); no Feud/Bingo provider needed.
    return <MurderDisplay room={room} />;
  }

  if (game === "bingo") {
    return (
      <BingoDisplayProvider room={room} role="display">
        <BingoDisplay />
        <DisplayPairing />
      </BingoDisplayProvider>
    );
  }

  return (
    <DisplayProvider room={room} role="display">
      <DisplayView />
      <DisplayPairing />
    </DisplayProvider>
  );
}
