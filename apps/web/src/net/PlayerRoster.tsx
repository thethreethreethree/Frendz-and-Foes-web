// The host's roster: who is in, who has dropped, and a way to take someone out.
//
// WHY THIS IS SHARED. Five games needed the same control, and each host previously rendered the
// roster as `players.map(p => p.name).join(", ")` -- a string, with nothing to hang a button on.
// Five copies of a list with a confirm and a remove button is five places for the behaviour to
// drift; this is one. Each game keeps its own socket event, because what removal has to REPAIR
// (a judge rotation, a book ring, a spymaster seat) is game-specific and lives on the server.
//
// The connected dot is the point of the thing at a bar: it tells the host who has actually walked
// out, as opposed to who is just slow.
export interface RosterPlayer {
  id: string;
  name: string;
  connected?: boolean;
  /** Short suffix for game-specific state: "judge", "guesser", "red spymaster". */
  note?: string;
}

export function PlayerRoster({
  players,
  onRemove,
  empty = "Nobody yet.",
}: {
  players: RosterPlayer[];
  onRemove: (id: string) => void;
  empty?: string;
}) {
  if (players.length === 0) return <div className="mt-1 text-sm text-muted">{empty}</div>;
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {players.map((p) => {
        const offline = p.connected === false;
        return (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 flex-none rounded-full ${offline ? "bg-tang" : "bg-buzz-green"}`} />
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.note ? <span className="text-muted"> · {p.note}</span> : null}
              {offline ? <span className="text-muted"> · offline</span> : null}
            </span>
            <button
              onClick={() => { if (confirm(`Remove ${p.name} from the game?`)) onRemove(p.id); }}
              className="ff-tap flex-none rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted"
              aria-label={`Remove ${p.name}`}
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}
