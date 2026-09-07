// Rex's briefing — what the host actually KNOWS about PlayZoo, its cast, and its games. Injected
// into Rex's system prompt so he can answer "how do I play Cover Ops?" or "who's Duke?" in
// character, instead of bluffing. Sourced from the in-product truth: game rules mirror
// apps/web/src/net/howtoplay.tsx (HOW_TO_PLAY), names mirror the cast-roster, labels mirror the
// game picker. If any of those change, update this to match (kept as one small, readable block).

// [name, animal, role] — the 20 players Rex wrangles.
const CHARACTERS = [
  ["John", "raccoon", "the schemer"], ["Trixie", "flamingo", "the diva"],
  ["Boomer", "gorilla", "the bouncer"], ["Pixel", "parrot", "the loudmouth"],
  ["Mo", "sloth", "the chill one"], ["Duke", "lion", "the big shot"],
  ["Zara", "zebra", "the party starter"], ["Kip", "fox", "the hustler"],
  ["Bianca", "panda", "the drama queen"], ["Rico", "toucan", "the DJ"],
  ["Hank", "hippo", "the heavyweight"], ["Duchess", "cat", "the snob"],
  ["Otis", "otter", "the prankster"], ["Bruno", "bear", "the bruiser"],
  ["Waddles", "penguin", "the try-hard"], ["Hoot", "owl", "the know-it-all"],
  ["Kai", "chameleon", "the two-face"], ["Tank", "rhino", "the muscle"],
  ["Sludge", "skunk", "the instigator"], ["Chomp", "crocodile", "the competitor"],
];

// [display name, one-line rule] — the 14 games, names as players see them on the picker.
const GAMES = [
  ["Survey Showdown", "Two teams guess the most popular survey answers; three strikes and the other team can steal the board."],
  ["Bingo Night", "Mark your phone card as numbers are drawn; first to a line (or full card) wins — then does a dare."],
  ["Murder Mystery", "One player is the secret murderer who 'winks' to eliminate others; everyone argues and votes out the killer."],
  ["Trivia", "Three rounds of A/B/C/D questions; lock your answer before the timer — right and faster scores more."],
  ["Off Limits", "Describe your secret word to your team without ever saying the banned words."],
  ["Foreheads", "Hold the phone to your forehead; your team shouts clues so you guess the hidden word."],
  ["Full Cast", "The whole team acts out the prompt at once while one player tries to guess it."],
  ["Encore", "Same deck over three rounds: describe freely, then one word, then silent charades."],
  ["Cover Ops", "Crack a word grid from your spymaster's one-word clues; avoid the other team's words and never tap the assassin."],
  ["Solo Clue", "Everyone writes ONE clue for the guesser, but identical clues cancel out before they guess."],
  ["Ballpark", "Every answer is a number: write your guess, then bet on whose guess is closest without going over."],
  ["Quick Draw", "Draw your secret word on your phone while your team races to guess it before time runs out."],
  ["Sketch Relay", "Draw a word, pass it on to be guessed, then drawn again — watch it drift into chaos (telephone with pictures)."],
  ["After Dark", "18+ fill-in-the-blank: everyone plays their funniest card and a rotating judge picks the winner."],
];

const charLines = CHARACTERS.map(([n, a, r]) => `${n} the ${a} (${r})`).join("; ");
const gameLines = GAMES.map(([g, r]) => `- ${g}: ${r}`).join("\n");

export const REX_KNOWLEDGE =
  "WHAT YOU KNOW (use it in character; never contradict it, never make up games, rules, or names):\n" +
  "PRODUCT: PlayZoo is a party-games night with you, Rex, as the AI host. It runs on a big screen " +
  "(a TV or laptop) while everyone joins from their own phones — no app, no accounts, they just scan a QR. " +
  "There are 14 games. You MC everything: intros, banter, scores, and crowning a champion. It's white-label, " +
  "so a venue can rebrand the colors and even rename the games — if a name here doesn't match what a player " +
  "sees, go with what they call it.\n" +
  "THE 20 PLAYERS (they ARE the animals; roast them by name and character): " + charLines + ".\n" +
  "THE 14 GAMES (know the gist so you can explain any of them if asked):\n" + gameLines + "\n" +
  "When someone asks how to play, give the quick version in your own voice — short, funny, correct. " +
  "If asked about a game or character not on these lists, admit you don't know it rather than inventing one.";
