import { useEffect, useState } from "react";
import { GameProvider } from "../store/gameStore";
import { BingoProvider } from "../store/bingoStore";
import { TriviaProvider } from "../store/triviaStore";
import { OffLimitsProvider } from "../store/offlimitsStore";
import { HeadsUpProvider } from "../store/headsupStore";
import { FullCastProvider } from "../store/fullcastStore";
import { MonikersProvider } from "../store/monikersStore";
import { ControlView } from "../control/ControlView";
import { BingoControl } from "../bingo/BingoControl";
import { TriviaControl } from "../trivia/TriviaControl";
import { OffLimitsControl } from "../offlimits/OffLimitsControl";
import { HeadsUpControl } from "../headsup/HeadsUpControl";
import { FullCastControl } from "../fullcast/FullCastControl";
import { MonikersControl } from "../monikers/MonikersControl";
import { Murder2Host } from "../murder2/Murder2Host";
import { CodenamesHost } from "../codenames/CodenamesHost";
import { JustOneHost } from "../justone/JustOneHost";
import { BallparkHost } from "../ballpark/BallparkHost";
import { PictionaryProvider } from "../store/pictionaryStore";
import { PictionaryControl } from "../pictionary/PictionaryControl";
import { TelestrationsHost } from "../telestrations/TelestrationsHost";
import { AfterDarkHost } from "../afterdark/AfterDarkHost";
import { GamePicker } from "./GamePicker";
import { SocketConnectionProvider } from "../net/SocketConnection";
import { BINGO_ROOM, generateRoomCode, getGameFromUrl, getRoomFromUrl, setUrlGame, setUrlRoom } from "../net/room";
import type { GameType } from "../net/socket";

// The host controller. Phone-first: if no game is chosen yet, the host picks one here (no display
// needed), and for Feud/Bingo the controller MINTS ITS OWN ROOM so its participant/team QR works
// standalone. Murder stays server-authoritative and still pairs to a display-minted room.
export function ControlRoute() {
  const [game] = useState<GameType | null>(() =>
    new URLSearchParams(window.location.search).has("game") ? getGameFromUrl() : null,
  );
  // THE ROOM DECIDES WHICH GAME THIS IS, not the controller's URL.
  //
  // A room code reaches the controller with no game attached -- the display says "or enter room
  // code", ControlPairButton sets ?room= and nothing else, and a re-opened or shared host link can
  // arrive stripped. Without asking, two things went wrong, both reproduced against a room the
  // server correctly reported as running trivia:
  //   * ?room=XXXX and no game  -> "PICK A GAME", making the host choose again for a game the
  //     display had already chosen.
  //   * ?game=feud&room=XXXX    -> the SURVEY SHOWDOWN remote, reporting "Display linked (1)"
  //     while driving a Trivia display. Wrong buttons, no error, nothing to indicate it.
  // The display minted the room and everyone in the venue is looking at it, so when the two
  // disagree the room wins. PlayerRoute already resolves this way against the same endpoint.
  const [resolved, setResolved] = useState(false);
  const roomInUrl = getRoomFromUrl();
  useEffect(() => {
    if (!roomInUrl || resolved) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(roomInUrl)}`);
        const data = await res.json();
        // Only act on a room the server actually knows. A room it has never seen (the host is
        // minting a fresh one) must fall through to the picker, not be treated as a conflict.
        if (live && data?.game && data.game !== game) {
          setUrlGame(data.game as GameType);
          window.location.reload();
          return;
        }
      } catch { /* offline or no such room: fall through to what the URL says */ }
      if (live) setResolved(true);
    })();
    return () => { live = false; };
  }, [roomInUrl, game, resolved]);

  const [room] = useState<string | undefined>(() => {
    const existing = getRoomFromUrl();
    if (existing) return existing;
    // Feud + Trivia mint a fresh room each session; Bingo uses the FIXED room (see the bingo branch
    // below) so its poster QR is permanent, so it needs no mint here.
    if (game === "feud" || game === "trivia" || game === "taboo" || game === "headsup" || game === "reverse" || game === "monikers") {
      const code = generateRoomCode();
      setUrlRoom(code);
      return code;
    }
    return undefined;
  });

  // Never render a remote while the room's real game is still in flight -- rendering the URL's
  // guess first is what put the Survey remote on screen. This sits BELOW every hook on purpose:
  // an early return above one would change the hook count between renders the moment the lookup
  // resolves, which React refuses.
  if (roomInUrl && !resolved) {
    return (
      <div className="ff-backdrop grid h-full place-items-center p-6 text-center">
        <div className="ff-title text-2xl text-ink/80">Finding room {roomInUrl}…</div>
      </div>
    );
  }

  if (!game) {
    return (
      <GamePicker
        // Feud + Bingo + Trivia: they mint/own their room here (phone-first). Murder is
        // server-authoritative and pairs through the display, so offering it here would dead-end.
        games={["feud", "bingo", "trivia", "taboo", "headsup", "reverse", "monikers"]}
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

  if (game === "codenames") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Cover Ops display QR.
        </div>
      );
    return (
      <SocketConnectionProvider room={room}>
        <CodenamesHost room={room} />
      </SocketConnectionProvider>
    );
  }

  if (game === "justone") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Solo Clue display QR.
        </div>
      );
    return (
      <SocketConnectionProvider room={room}>
        <JustOneHost room={room} />
      </SocketConnectionProvider>
    );
  }

  if (game === "ballpark") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Ballpark display QR.
        </div>
      );
    return (
      <SocketConnectionProvider room={room}>
        <BallparkHost room={room} />
      </SocketConnectionProvider>
    );
  }

  if (game === "pictionary") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Quick Draw display QR.
        </div>
      );
    return (
      <PictionaryProvider room={room}>
        <PictionaryControl room={room} />
      </PictionaryProvider>
    );
  }

  if (game === "telestrations") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the Sketch Relay display QR.
        </div>
      );
    return (
      <SocketConnectionProvider room={room}>
        <TelestrationsHost room={room} />
      </SocketConnectionProvider>
    );
  }

  if (game === "afterdark") {
    if (!room)
      return (
        <div className="ff-backdrop grid h-full place-items-center p-6 text-center font-bold text-ink/60">
          Open the host link from the After Dark display QR.
        </div>
      );
    return (
      <SocketConnectionProvider room={room}>
        <AfterDarkHost room={room} />
      </SocketConnectionProvider>
    );
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

  if (game === "monikers") {
    return (
      <MonikersProvider room={room}>
        <MonikersControl />
      </MonikersProvider>
    );
  }

  return (
    <GameProvider room={room}>
      <ControlView />
    </GameProvider>
  );
}
