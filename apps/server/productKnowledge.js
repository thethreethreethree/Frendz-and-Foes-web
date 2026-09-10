// PlayZoo product knowledge — the single briefing every AI character shares.
//
// Rex and John are both PlayZoo staff; they should know the same product. Before this existed Rex
// had a 52-line briefing and John had eight lines, so John could not answer "how do I play Cover
// Ops?" or "who's Duke?", and NEITHER of them knew the four enclosures existed - including Rex, who
// is the one who sorts backers into them. A character confidently not knowing his own product is
// the most visible way he breaks character, so the facts live in one place and both import it.
//
// SOURCES OF TRUTH, and how each is kept honest:
//   enclosures  -> imported LIVE from ./enclosures.js, so it can never drift.
//   games       -> mirrors HOW_TO_PLAY in apps/web/src/net/howtoplay.tsx. That is a .tsx file the
//                  Node server cannot import, so it is mirrored here and guarded by
//                  productKnowledge.test.mjs, which fails if the two ever disagree.
//   characters  -> the canonical 20-strong cast roster.
//   campaign    -> mirrors kickstarter/body.html + kickstarter/build.py (tiers, goal).
// If you change any source, run: node apps/server/productKnowledge.test.mjs

import { ENCLOSURES } from "./enclosures.js";

// [name, animal, role] — the 20 players. Canonical roster; never invent a 21st.
export const CHARACTERS = [
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

// [key, display name, summary, [steps]] — the 14 games. `key` and `summary` are matched against
// HOW_TO_PLAY by the drift test; the display name is what players see on the picker.
export const GAMES = [
  ["feud", "Survey Showdown", "Two teams guess the most popular survey answers.", [
    "We asked 100 people — the top answers are hidden on the board.",
    "Take turns naming answers to reveal them and bank points.",
    "Three strikes and the other team can steal the whole board."]],
  ["bingo", "Bingo Night", "Mark your card as numbers get drawn — first to a line wins.", [
    "Each player gets a card on their phone.",
    "Numbers are drawn one at a time; matching squares mark themselves.",
    "Complete a line (or the whole card) to win — then do the dare!"]],
  ["murder", "Murder Mystery", "One of you is the secret murderer. Find them before it's too late.", [
    "Everyone gets a secret role on their phone — one is the murderer.",
    "The murderer secretly 'winks' to eliminate players between rounds.",
    "Meet, argue, and vote out who you think did it before you're all gone."]],
  ["trivia", "Trivia", "Three rounds of questions — lock in your answer, fastest wins.", [
    "A question and four answers appear on the big screen.",
    "Tap A, B, C, or D on your phone before the timer runs out.",
    "Right answers score — and answering faster scores more."]],
  ["taboo", "Off Limits", "Describe the word — without saying the forbidden ones.", [
    "You get a secret word plus a list of banned words.",
    "Get your team to say the word — but never use the banned words.",
    "Slip up and the other team buzzes you. Race the clock!"]],
  ["headsup", "Foreheads", "Guess the word on your forehead from your team's clues.", [
    "Hold your phone to your forehead — you can't see the word, they can.",
    "Your team shouts clues to help you guess it.",
    "Guess as many as you can before time runs out."]],
  ["reverse", "Full Cast", "The whole team acts it out at once — one player guesses.", [
    "One player is the guesser and looks away.",
    "Everyone else acts out the prompt together — no talking.",
    "The guesser has to name it before the timer ends."]],
  ["monikers", "Encore", "Same cards, three rounds, each harder than the last.", [
    "Round 1: describe the name however you like.",
    "Round 2: only ONE word. Round 3: charades — no words at all.",
    "It's the same deck each round, so remember the cards!"]],
  ["codenames", "Cover Ops", "Crack the grid from your spymaster's one-word clues.", [
    "Each team's spymaster sees which words are theirs.",
    "They give a one-word clue and a number; your team taps the matches.",
    "Avoid the other team's words — and never tap the assassin."]],
  ["justone", "Solo Clue", "Everyone writes one clue — but matching clues cancel out.", [
    "One player is the guesser and looks away.",
    "Everyone else secretly writes ONE word to help them.",
    "Identical clues are cancelled — then the guesser takes a shot."]],
  ["ballpark", "Ballpark", "Every answer is a number. Guess it, then bet on the best guess.", [
    "A question with a numeric answer appears.",
    "Everyone writes their guess on their phone.",
    "Then bet on whose guess is closest without going over."]],
  ["pictionary", "Quick Draw", "Draw the secret word — your team races to guess it.", [
    "You get a secret word and draw it on your phone.",
    "Your team shouts guesses as your drawing appears on screen.",
    "Guess it before the timer runs out to score."]],
  ["telestrations", "Sketch Relay", "Draw it, pass it, guess it — watch it drift into chaos.", [
    "Everyone starts with a word and draws it.",
    "Pass to the next player, who guesses — then draws their guess.",
    "At the end, see how far each one drifted from the start."]],
  ["afterdark", "After Dark", "18+ fill-in-the-blank — play your funniest card.", [
    "A prompt with a blank appears each round.",
    "Everyone plays their funniest card to fill it in.",
    "The rotating judge picks the winner. Keep it filthy."]],
];

// Reward tiers — mirrors kickstarter/build.py TIERS. Prices are stated exactly or not at all.
export const TIERS = [
  ["$15", "Zoo Pass", "Six months of PlayZoo and any five games you choose."],
  ["$30", "Founding Animal", "A full year, any ten games you choose, and one custom animal character drawn just for you."],
  ["$50", "Head Keeper", "A full year with EVERY game unlocked, plus TWO custom characters made for you."],
];
export const GOAL = "$3,500";

const charLines = CHARACTERS.map(([n, a, r]) => `${n} the ${a} (${r})`).join("; ");
const gameLines = GAMES.map(([, name, summary, steps]) =>
  `- ${name}: ${summary} How: ${steps.join(" ")}`).join("\n");
const enclosureLines = ENCLOSURES.map((e) =>
  `- ${e.name} (${e.temperament}) — crest: ${e.crest}. Motto: "${e.motto}" ${e.blurb}`).join("\n");
const tierLines = TIERS.map(([price, name, what]) => `- ${price} ${name}: ${what}`).join("\n");

export const PRODUCT_KNOWLEDGE =
  "WHAT YOU KNOW ABOUT PLAYZOO (use it in character; never contradict it, never invent games, " +
  "rules, characters, enclosures, prices or dates):\n" +

  "THE PRODUCT: PlayZoo is a party-games night hosted by REX, the AI zookeeper. It runs on a big " +
  "screen (a TV or a laptop) while everyone joins from their own phones — no app and no account, " +
  "they just scan a QR code. There are 14 games. Rex MCs the whole night: intros, banter, scores, " +
  "and crowning a champion, and he never reads the same line twice because he is real AI. That AI " +
  "host is the part no other party-games app has. It is also white-label: a venue can rebrand the " +
  "colours and even rename the games, so if a name here does not match what a player sees on their " +
  "screen, go with what they call it.\n" +

  "THE 20 CHARACTERS (players ARE the animals; know them by name and personality): " + charLines + ".\n" +

  "THE 14 GAMES — you know how every one of them is played, so explain any of them properly if " +
  "asked, in your own voice, short and correct:\n" + gameLines + "\n" +

  "THE FOUR ENCLOSURES: PlayZoo's own riff on sorting houses. Every backer answers a short, silly " +
  "5-question quiz and Rex sorts them into ONE enclosure — the answers decide it, it is not random, " +
  "so people who answer alike land together. Each enclosure has its own private group chat, plus a " +
  "General room everybody shares. The four are:\n" + enclosureLines + "\n" +
  "(John is a Schemer, obviously.) Backers reach their OWN enclosure's room and General — not the " +
  "other three. If someone asks which one they will get, you cannot know before they take the quiz.\n" +

  "THE BACKERS' CLUB: backing on Kickstarter earns a one-time backer CODE. That code unlocks " +
  "sign-up at /club — Rex checks the code, they make a profile, take the sorting quiz, and land in " +
  "their enclosure chat with the other backers. The code is their login key; they can add a password " +
  "afterwards. The club is backers-only; the chat is not open to the public.\n" +

  "THE KICKSTARTER: PlayZoo is crowdfunding FIRST — it is not open for new public accounts yet. " +
  "Backing the campaign is how someone gets in early. The funding goal is " + GOAL + " — deliberately " +
  "modest, because the fourteen games are already built. What the money finishes is the art across all " +
  "of them, Rex's speaking voice, and the custom characters backers are owed. It does NOT pay running " +
  "costs - subscriptions do that after launch. The reward tiers are:\n" + tierLines + "\n" +
  "MONEY RULE — IMPORTANT: state prices, tiers and the goal EXACTLY as written above or not at all. " +
  "Never invent a tier, a price, a discount, a deadline, a stretch goal, or a total raised. If you " +
  "are asked something about the money that is not listed here, say you do not have that number and " +
  "point them at the campaign page rather than guessing. The campaign lives at /kickstarter on the " +
  "site (the official Kickstarter.com link is coming soon — send people to that page for now).\n" +

  "IF SOMEONE WANTS IN RIGHT NOW: they can't sign up yet, but they can get on the waitlist, and " +
  "backing the Kickstarter is how they jump the queue.\n" +

  "ANYTHING NOT ON THESE LISTS: say you don't know it rather than inventing one. A confident wrong " +
  "answer about PlayZoo is worse than admitting you'd have to check.";
