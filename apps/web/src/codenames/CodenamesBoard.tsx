import type { CnCard, CnColor } from "../net/codenames";
import { tileFace, artUrl, AGENTS } from "./art";

// Fixed team/agent colours (game-semantic, like team colours — intentionally not brand tokens).
const SOLID: Record<CnColor, string> = { red: "#d64550", blue: "#3b7dd8", neutral: "#c9b58c", assassin: "#20242e" };
const TINT: Record<CnColor, string> = { red: "#f6d7da", blue: "#d4e2f6", neutral: "#ece3cf", assassin: "#c7cad1" };

// An UNREVEALED tile is a face-down dossier: the card art is the background and the codename sits
// on top of it. `i` picks a face deterministically so a card keeps its dossier all game. A REVEALED
// tile drops the art for a flat team colour, because at that point the colour IS the information
// and a busy card back would fight it. The assassin reveals to the silhouette card instead.
function tileStyle(color: CnColor | null, revealed: boolean, i: number): React.CSSProperties {
  if (revealed && color === "assassin")
    return {
      backgroundImage: `linear-gradient(rgba(11,16,32,.55), rgba(11,16,32,.55)), url("${artUrl(AGENTS.unknown)}")`,
      backgroundSize: "cover", backgroundPosition: "center",
      color: "#fff", borderColor: SOLID.assassin,
    };
  if (revealed && color) return { background: SOLID[color], color: color === "neutral" ? "#3a2f1a" : "#fff", borderColor: "transparent" };
  if (color) return { background: TINT[color], borderColor: SOLID[color], color: "#1a1a1a" }; // spymaster key (unrevealed)
  return {
    backgroundImage: `linear-gradient(rgba(11,16,32,.42), rgba(11,16,32,.42)), url("${tileFace(i)}")`,
    backgroundSize: "cover", backgroundPosition: "center",
    borderColor: "rgb(var(--c-line))", color: "#fff",
    textShadow: "0 1px 3px rgba(0,0,0,.85)",
  };
}

// The 5x5 grid. `keyColors` (spymaster only) tints unrevealed tiles with their secret colour.
// `onGuess` makes unrevealed tiles tappable (operatives, on their turn).
export function CodenamesBoard({
  cards,
  keyColors,
  onGuess,
}: {
  cards: CnCard[];
  keyColors?: CnColor[];
  onGuess?: (i: number) => void;
}) {
  return (
    <div className="grid w-full grid-cols-5 gap-1.5 sm:gap-2">
      {cards.map((c) => {
        const color = c.revealed ? c.color : keyColors ? keyColors[c.i] : null;
        const tappable = !!onGuess && !c.revealed;
        return (
          <button
            key={c.i}
            disabled={!tappable}
            onClick={() => tappable && onGuess(c.i)}
            style={tileStyle(color, c.revealed, c.i)}
            className={`flex aspect-[5/3] items-center justify-center rounded-md border-2 px-1 text-center text-[0.7rem] font-bold uppercase leading-tight tracking-tight sm:text-sm ${
              c.revealed ? "opacity-90" : ""
            } ${tappable ? "cursor-pointer transition hover:brightness-95" : ""}`}
          >
            {c.word}
          </button>
        );
      })}
    </div>
  );
}
