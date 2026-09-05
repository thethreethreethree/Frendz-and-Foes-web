import { useState } from "react";
import { Murder2Player } from "../murder2/Murder2Player";
import { FeudTeamView } from "../feud/FeudTeamView";
import { BingoPlayer } from "../bingo/BingoPlayer";
import { TriviaPlayer } from "../trivia/TriviaPlayer";
import { CodenamesPlayer } from "../codenames/CodenamesPlayer";
import { JustOnePlayer } from "../justone/JustOnePlayer";
import { BallparkPlayer } from "../ballpark/BallparkPlayer";
import { BINGO_ROOM, getGameFromUrl, getRoleFromUrl, getRoomFromUrl, getTeamFromUrl, setUrlRoom } from "../net/room";

// Players reach this by scanning a join QR (carries ?room=). Murder → each player's own screen;
// Frendz and Foes (?game=feud&team=…&role=…) → that team's answer/viewer phone; Bingo
// (?game=bingo) → a watch-only calls+dares screen. Opened without a room, we offer a code entry
// (which lands on Murder, the code-only join path).
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

  const game = getGameFromUrl();

  // Bingo — one QR for everyone; every player is a pure watch-only follower. Always the FIXED room
  // (matches the permanent poster QR), regardless of what the scanned link carried.
  if (game === "bingo") return <BingoPlayer room={BINGO_ROOM} />;

  // Trivia — team mode carries a team (answerer/viewer); view mode has no team → spectator.
  if (game === "trivia") {
    const tTeam = getTeamFromUrl();
    if (tTeam) return <TriviaPlayer room={room} teamId={tTeam} role={getRoleFromUrl() ?? "answerer"} />;
    return <TriviaPlayer room={room} role="spectator" />;
  }

  if (game === "codenames") return <CodenamesPlayer room={room} />;
  if (game === "justone") return <JustOnePlayer room={room} />;
  if (game === "ballpark") return <BallparkPlayer room={room} />;

  // Frendz and Foes team phone — needs a team in the URL. Without one, fall through to Murder so
  // existing Murder join links (game=murder, or a bare code) are unaffected.
  const team = getTeamFromUrl();
  if (game === "feud" && team) {
    return <FeudTeamView room={room} teamId={team} role={getRoleFromUrl() ?? "answerer"} />;
  }

  return <Murder2Player room={room} />;
}
