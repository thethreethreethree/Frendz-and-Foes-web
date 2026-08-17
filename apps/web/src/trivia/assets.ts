// Paths to the Frendz Trivia art (optimized into apps/web/public/ui/trivia). Served at /ui/trivia/*.
export const TRIVIA_BG_PLAYER = "/ui/trivia/player-bg.jpg";
export const TRIVIA_BG_DISPLAY = "/ui/trivia/display-bg.jpg";
export const TRIVIA_LOBBY = "/ui/trivia/lobby.jpg";
export const TRIVIA_CHAMPIONS = "/ui/trivia/champions.png";
export const TRIVIA_STAMP_CORRECT = "/ui/trivia/stamp-correct.png";
export const TRIVIA_STAMP_MISS = "/ui/trivia/stamp-miss.png";

const ROUND_SLUG = ["science", "sports", "entertainment"];
export const roundBadge = (round: number) => `/ui/trivia/badge-${ROUND_SLUG[round] ?? "science"}.png`;
export const versionBadge = (v: string) => `/ui/trivia/badge-${v}.png`;
export const letterTile = (letter: string) => `/ui/trivia/tile-${letter.toLowerCase()}.png`;
