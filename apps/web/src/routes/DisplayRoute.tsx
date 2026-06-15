import { useState } from "react";
import { DisplayProvider } from "../store/DisplayProvider";
import { DisplayView } from "../display/DisplayView";
import { DisplayPairing } from "../net/pairing";
import { getRoomFromUrl, generateRoomCode, setUrlRoom } from "../net/room";

export function DisplayRoute() {
  // Pick a room once: use the URL's, or mint a fresh one and pin it to the URL.
  const [room] = useState(() => {
    const existing = getRoomFromUrl();
    if (existing) return existing;
    const code = generateRoomCode();
    setUrlRoom(code);
    return code;
  });

  return (
    <DisplayProvider room={room} role="display">
      <DisplayView />
      <DisplayPairing />
    </DisplayProvider>
  );
}
