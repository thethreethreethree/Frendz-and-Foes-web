// Per-game "How to play" rules, shown in the lobby while players wait for the host to start.
// Keyed by GameType. Kept short and phone-readable — a one-line summary plus 2-4 steps.

export interface GameRules {
  summary: string;
  steps: string[];
}

export const HOW_TO_PLAY: Record<string, GameRules> = {
  feud: {
    summary: "Two teams guess the most popular survey answers.",
    steps: [
      "We asked 100 people — the top answers are hidden on the board.",
      "Take turns naming answers to reveal them and bank points.",
      "Three strikes and the other team can steal the whole board.",
    ],
  },
  bingo: {
    summary: "Mark your card as numbers get drawn — first to a line wins.",
    steps: [
      "Each player gets a card on their phone.",
      "Numbers are drawn one at a time; matching squares mark themselves.",
      "Complete a line (or the whole card) to win — then do the dare!",
    ],
  },
  murder: {
    summary: "One of you is the secret murderer. Find them before it's too late.",
    steps: [
      "Everyone gets a secret role on their phone — one is the murderer.",
      "The murderer secretly 'winks' to eliminate players between rounds.",
      "Meet, argue, and vote out who you think did it before you're all gone.",
    ],
  },
  trivia: {
    summary: "Three rounds of questions — lock in your answer, fastest wins.",
    steps: [
      "A question and four answers appear on the big screen.",
      "Tap A, B, C, or D on your phone before the timer runs out.",
      "Right answers score — and answering faster scores more.",
    ],
  },
  taboo: {
    summary: "Describe the word — without saying the forbidden ones.",
    steps: [
      "You get a secret word plus a list of banned words.",
      "Get your team to say the word — but never use the banned words.",
      "Slip up and the other team buzzes you. Race the clock!",
    ],
  },
  headsup: {
    summary: "Guess the word on your forehead from your team's clues.",
    steps: [
      "Hold your phone to your forehead — you can't see the word, they can.",
      "Your team shouts clues to help you guess it.",
      "Guess as many as you can before time runs out.",
    ],
  },
  reverse: {
    summary: "The whole team acts it out at once — one player guesses.",
    steps: [
      "One player is the guesser and looks away.",
      "Everyone else acts out the prompt together — no talking.",
      "The guesser has to name it before the timer ends.",
    ],
  },
  monikers: {
    summary: "Same cards, three rounds, each harder than the last.",
    steps: [
      "Round 1: describe the name however you like.",
      "Round 2: only ONE word. Round 3: charades — no words at all.",
      "It's the same deck each round, so remember the cards!",
    ],
  },
  codenames: {
    summary: "Crack the grid from your spymaster's one-word clues.",
    steps: [
      "Each team's spymaster sees which words are theirs.",
      "They give a one-word clue and a number; your team taps the matches.",
      "Avoid the other team's words — and never tap the assassin.",
    ],
  },
  justone: {
    summary: "Everyone writes one clue — but matching clues cancel out.",
    steps: [
      "One player is the guesser and looks away.",
      "Everyone else secretly writes ONE word to help them.",
      "Identical clues are cancelled — then the guesser takes a shot.",
    ],
  },
  ballpark: {
    summary: "Every answer is a number. Guess it, then bet on the best guess.",
    steps: [
      "A question with a numeric answer appears.",
      "Everyone writes their guess on their phone.",
      "Then bet on whose guess is closest without going over.",
    ],
  },
  pictionary: {
    summary: "Draw the secret word — your team races to guess it.",
    steps: [
      "You get a secret word and draw it on your phone.",
      "Your team shouts guesses as your drawing appears on screen.",
      "Guess it before the timer runs out to score.",
    ],
  },
  telestrations: {
    summary: "Draw it, pass it, guess it — watch it drift into chaos.",
    steps: [
      "Everyone starts with a word and draws it.",
      "Pass to the next player, who guesses — then draws their guess.",
      "At the end, see how far each one drifted from the start.",
    ],
  },
  afterdark: {
    summary: "18+ fill-in-the-blank — play your funniest card.",
    steps: [
      "A prompt with a blank appears each round.",
      "Everyone plays their funniest card to fill it in.",
      "The rotating judge picks the winner. Keep it filthy.",
    ],
  },
};

// A compact rules card for the lobby. Pass the GameType key; renders nothing if unknown.
export function HowToPlay({ game, className = "" }: { game: string; className?: string }) {
  const rules = HOW_TO_PLAY[game];
  if (!rules) return null;
  return (
    <div className={`mx-auto w-full max-w-sm rounded-2xl border border-line bg-surface/60 p-4 text-left ${className}`}>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">How to play</div>
      <p className="mt-1 text-sm text-ink">{rules.summary}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {rules.steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-muted">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-ink">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
