import { useState } from "react";
import { DisplayProvider } from "../store/DisplayProvider";
import { BingoDisplayProvider } from "../store/bingoStore";
import { TriviaFollowerProvider } from "../store/triviaStore";
import { OffLimitsFollowerProvider } from "../store/offlimitsStore";
import { HeadsUpFollowerProvider } from "../store/headsupStore";
import { FullCastFollowerProvider } from "../store/fullcastStore";
import { MonikersFollowerProvider } from "../store/monikersStore";
import { DisplayView } from "../display/DisplayView";
import { BingoDisplay } from "../bingo/BingoDisplay";
import { TriviaDisplay } from "../trivia/TriviaDisplay";
import { OffLimitsDisplay } from "../offlimits/OffLimitsDisplay";
import { HeadsUpDisplay } from "../headsup/HeadsUpDisplay";
import { FullCastDisplay } from "../fullcast/FullCastDisplay";
import { MonikersDisplay } from "../monikers/MonikersDisplay";
import { Murder2Display } from "../murder2/Murder2Display";
import { CodenamesDisplay } from "../codenames/CodenamesDisplay";
import { DisplayPairing } from "../net/pairing";
import { GamePicker } from "./GamePicker";
import { BINGO_ROOM, getGameFromUrl, generateRoomCode, getRoomFromUrl, setUrlGame, setUrlRoom } from "../net/room";
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
    return <Murder2Display room={room} />;
  }

  if (game === "codenames") {
    // Server-authoritative like Murder; the display watches via cn:sync.
    return <CodenamesDisplay room={room} />;
  }

  if (game === "bingo") {
    // Fixed room (matches the permanent poster QR) so display, host, and players always share it.
    return (
      <BingoDisplayProvider room={BINGO_ROOM} role="display">
        <BingoDisplay />
        <DisplayPairing />
      </BingoDisplayProvider>
    );
  }

  if (game === "trivia") {
    return (
      <TriviaFollowerProvider room={room} role="display">
        <TriviaDisplay />
        <DisplayPairing />
      </TriviaFollowerProvider>
    );
  }

  if (game === "taboo") {
    return (
      <OffLimitsFollowerProvider room={room} role="display">
        <OffLimitsDisplay />
        <DisplayPairing />
      </OffLimitsFollowerProvider>
    );
  }

  if (game === "headsup") {
    return (
      <HeadsUpFollowerProvider room={room} role="display">
        <HeadsUpDisplay />
        <DisplayPairing />
      </HeadsUpFollowerProvider>
    );
  }

  if (game === "reverse") {
    return (
      <FullCastFollowerProvider room={room} role="display">
        <FullCastDisplay />
        <DisplayPairing />
      </FullCastFollowerProvider>
    );
  }

  if (game === "monikers") {
    return (
      <MonikersFollowerProvider room={room} role="display">
        <MonikersDisplay />
        <DisplayPairing />
      </MonikersFollowerProvider>
    );
  }

  return (
    <DisplayProvider room={room} role="display">
      <DisplayView />
      <DisplayPairing />
    </DisplayProvider>
  );
}
