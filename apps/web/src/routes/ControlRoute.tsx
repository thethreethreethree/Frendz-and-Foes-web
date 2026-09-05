import { useState } from "react";
import { GameProvider } from "../store/gameStore";
import { BingoProvider } from "../store/bingoStore";
import { TriviaProvider } from "../store/triviaStore";
import { OffLimitsProvider } from "../store/offlimitsStore";
import { HeadsUpProvider } from "../store/headsupStore";
import { FullCastProvider } from "../store/fullcastStore";
import { ControlView } from "../control/ControlView";
import { BingoControl } from "../bingo/BingoControl";
import { TriviaControl } from "../trivia/TriviaControl";
import { OffLimitsControl } from "../offlimits/OffLimitsControl";
import { HeadsUpControl } from "../headsup/HeadsUpControl";
import { FullCastControl } from "../fullcast/FullCastControl";
import { Murder2Host } from "../murder2/Murder2Host";
import { GamePicker } from "./GamePicker";
import { BINGO_ROOM, generateRoomCode, getGameFromUrl, getRoomFromUrl, setUrlGame, setUrlRoom } from "../net/room";
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
    // Feud + Trivia mint a fresh room each session; Bingo uses the FIXED room (see the bingo branch
    // below) so its poster QR is permanent, so it needs no mint here.
    if (game === "feud" || game === "trivia" || game === "taboo" || game === "headsup" || game === "reverse") {
      const code = generateRoomCode();
      setUrlRoom(code);
      return code;
    }
    return undefined;
  });

  if (!game) {
    return (
      <GamePicker
        // Feud + Bingo + Trivia: they mint/own their room here (phone-first). Murder is
        // server-authoritative and pairs through the display, so offering it here would dead-end.
        games={["feud", "bingo", "trivia", "taboo", "headsup", "reverse"]}
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
    // Fixed room so the player-join QR is permanent (posterable).
    return (
      <BingoProvider room={BINGO_ROOM}>
        <BingoControl />
      </BingoProvider>
    );
  }

  if (game === "trivia") {
    return (
      <TriviaProvider room={room}>
        <TriviaControl />
      </TriviaProvider>
    );
  }

  if (game === "taboo") {
    return (
      <OffLimitsProvider room={room}>
        <OffLimitsControl />
      </OffLimitsProvider>
    );
  }

  if (game === "headsup") {
    return (
      <HeadsUpProvider room={room}>
        <HeadsUpControl />
      </HeadsUpProvider>
    );
  }

  if (game === "reverse") {
    return (
      <FullCastProvider room={room}>
        <FullCastControl />
      </FullCastProvider>
    );
  }

  return (
    <GameProvider room={room}>
      <ControlView />
    </GameProvider>
  );
}
