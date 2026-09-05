// "Full Cast" — our take on Reverse Charades: the WHOLE team acts out the phrase at once while a
// single teammate guesses. The acting team holds the device (it shows the phrase); the guesser must
// not see it — so the TV display, like Off Limits, shows the timer/score but never the phrase.
//
// Reuses the shared word-deck engine (wordgame.ts). This file just supplies the deck: original,
// group-actable phrases (scenes a crowd can mime together). All content is original.

import { type WordCard } from "./wordgame.js";

export const FULLCAST_PHRASES: readonly string[] = [
  "Rowing a boat", "A traffic jam", "Climbing a ladder", "A thunderstorm", "Making a pizza",
  "A roller coaster", "A tug of war", "Building a sandcastle", "A zombie chase", "A washing machine",
  "A conga line", "A pillow fight", "Planting a tree", "Waiting in a long line", "A haunted house",
  "Flying a kite", "A car wash", "A marching band", "A snowball fight", "Cooking breakfast",
  "A crowded elevator", "Jumping on a trampoline", "A magic show", "Herding sheep", "A relay race",
  "A campfire singalong", "Painting a wall", "A game of leapfrog", "A robot dance", "A sinking ship",
  "Popping bubble wrap", "Walking the red carpet", "Milking a cow", "A snowman melting", "A crowded subway",
  "A fireworks show", "Raking leaves", "A yoga class", "Bowling a strike", "A puppet show",
  "A volcano erupting", "A birthday surprise", "Catching butterflies", "A slow-motion race", "Sneaking past a guard",
  "Making a snow angel", "An awkward handshake", "A falling domino chain", "Blowing up a balloon", "A stampede",
  "A stadium wave", "Assembling a puzzle", "Climbing a mountain", "A hair salon", "A rocket launch",
  "A fancy tea party", "A group selfie", "A safari", "Herding cats", "A flash mob",
  "A pit stop", "A parade", "Building a human pyramid", "A sneeze that won't come", "A crowded photo booth",
  "A slow elevator door", "A game of hot potato", "A crab walking sideways", "A wobbly table", "A revolving door",
];

/** The deck in the shape the shared engine consumes. */
export function fullCastDeck(): WordCard[] {
  return FULLCAST_PHRASES.map((w) => ({ word: w }));
}
