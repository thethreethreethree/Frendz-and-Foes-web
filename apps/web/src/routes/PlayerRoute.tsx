import { useEffect, useState } from "react";
import { Murder2Player } from "../murder2/Murder2Player";
import { FeudTeamView } from "../feud/FeudTeamView";
import { BingoPlayer } from "../bingo/BingoPlayer";
import { TriviaPlayer } from "../trivia/TriviaPlayer";
import { CodenamesPlayer } from "../codenames/CodenamesPlayer";
import { JustOnePlayer } from "../justone/JustOnePlayer";
import { BallparkPlayer } from "../ballpark/BallparkPlayer";
import { TelestrationsPlayer } from "../telestrations/TelestrationsPlayer";
import { AfterDarkPlayer } from "../afterdark/AfterDarkPlayer";
import { BINGO_ROOM, getGameFromUrl, getRoleFromUrl, getRoomFromUrl, getTeamFromUrl, setUrlGame, setUrlRoom } from "../net/room";
import { getBrand } from "../brand/theme";

// Played on the host's phone + the TV. No player component exists for any of these -- check
// apps/web/src/<game>/ and you will find Control and Display only.
const HOST_ONLY_GAMES: GameType[] = ["taboo", "headsup", "reverse", "monikers", "pictionary"];
import type { GameType } from "../net/socket";

// Players reach this by scanning a join QR (carries ?room=). Murder → each player's own screen;
// Frendz and Foes (?game=feud&team=…&role=…) → that team's answer/viewer phone; Bingo
// (?game=bingo) → a watch-only calls+dares screen. Opened without a room, we offer a code entry
// (which lands on Murder, the code-only join path).
export function PlayerRoute() {
  const [room] = useState(() => getRoomFromUrl());
  const [code, setCode] = useState("");
  const [asked, setAsked] = useState(false);

  // A typed room code carries no game, and resolving one from the URL means resolving a DEFAULT --
  // so a player who typed the code for a Trivia night was silently dropped into a different game.
  // The display invites typing ("or enter room code"), so this is a normal path, not an edge case.
  // Ask the room what it is running, then route on the answer.
  const urlHasGame = new URLSearchParams(window.location.search).has("game");
  useEffect(() => {
    if (!room || urlHasGame || asked) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(room)}`);
        const data = await res.json();
        if (!live) return;
        if (data?.game) { setUrlGame(data.game as GameType); window.location.reload(); return; }
      } catch { /* fall through to the join screen below */ }
      if (live) setAsked(true);
    })();
    return () => { live = false; };
  }, [room, urlHasGame, asked]);

  // Don't render a guessed game while the answer is still in flight.
  if (room && !urlHasGame && !asked) {
    return (
      <div className="ff-backdrop grid h-full place-items-center p-6 text-center">
        <div className="ff-title text-2xl text-white/80">Finding room {room}…</div>
      </div>
    );
  }

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
  if (game === "telestrations") return <TelestrationsPlayer room={room} />;
  if (game === "afterdark") return <AfterDarkPlayer room={room} />;

  // Frendz and Foes team phone — needs a team in the URL. Without one, fall through to Murder so
  // existing Murder join links (game=murder, or a bare code) are unaffected.
  const team = getTeamFromUrl();
  if (game === "feud" && team) {
    return <FeudTeamView room={room} teamId={team} role={getRoleFromUrl() ?? "answerer"} />;
  }

  // These five are played on the HOST'S phone and the big screen — they have no player surface at
  // all (Control + Display only; there is no OffLimitsPlayer, HeadsUpPlayer, and so on). They used
  // to fall through to Murder2Player, so a guest who scanned or typed into an Off Limits room was
  // shown "Murder Mystery — PICK YOUR ANIMAL" and invited to join a game nobody was playing.
  // Saying so plainly beats sending them somewhere confidently wrong.
  if (HOST_ONLY_GAMES.includes(game)) {
    const label = getBrand().games[game]?.label ?? game;
    return (
      <div className="ff-backdrop grid h-full place-items-center p-6 text-center">
        <div className="max-w-xs">
          <div className="ff-title text-3xl text-pink">{label}</div>
          <p className="mt-3 text-sm text-white/80">
            This one is played on the host&rsquo;s phone and the big screen — you don&rsquo;t need a
            screen of your own. Put the phone down and watch the telly.
          </p>
          <p className="mt-3 font-mono text-xs text-white/50">Room {room}</p>
        </div>
      </div>
    );
  }

  return <Murder2Player room={room} />;
}
