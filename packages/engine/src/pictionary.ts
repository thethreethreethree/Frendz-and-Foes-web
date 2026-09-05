// "Quick Draw" — our take on Pictionary. The active team's drawer sketches the word on their phone;
// the strokes stream live to the TV; their team shouts guesses against the clock. Reuses the shared
// word-deck engine (wordgame.ts) for turns/timer/score — this file only supplies drawable words.
// All words are ORIGINAL generic concrete nouns (easy to draw, safe to ship).

import { type WordCard } from "./wordgame.js";

export const PICTIONARY_WORDS: readonly string[] = [
  "Cat", "House", "Tree", "Sun", "Car", "Boat", "Fish", "Star", "Clock", "Key",
  "Book", "Cup", "Hat", "Shoe", "Ball", "Cake", "Bird", "Flower", "Apple", "Banana",
  "Chair", "Table", "Door", "Bridge", "Mountain", "Cloud", "Snowman", "Rainbow", "Rocket", "Robot",
  "Ghost", "Crown", "Guitar", "Drum", "Piano", "Camera", "Lamp", "Umbrella", "Anchor", "Ladder",
  "Hammer", "Scissors", "Pencil", "Envelope", "Balloon", "Kite", "Bicycle", "Train", "Airplane", "Helicopter",
  "Lighthouse", "Castle", "Tent", "Cactus", "Volcano", "Igloo", "Windmill", "Sailboat", "Submarine", "Dinosaur",
  "Butterfly", "Snail", "Octopus", "Penguin", "Elephant", "Giraffe", "Owl", "Bee", "Spider", "Frog",
  "Turtle", "Crab", "Whale", "Shark", "Snowflake", "Campfire", "Mushroom", "Carrot", "Ice cream", "Donut",
  "Pizza", "Hamburger", "Lollipop", "Teapot", "Toaster", "Skateboard", "Sunglasses", "Backpack", "Trophy", "Magnet",
];

export function pictionaryDeck(): WordCard[] {
  return PICTIONARY_WORDS.map((w) => ({ word: w }));
}
