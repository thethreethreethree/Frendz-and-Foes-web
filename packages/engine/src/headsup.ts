// "Foreheads" — our take on the hold-it-on-your-head guessing game. The holder puts the phone to
// their forehead so the group sees the word (the holder must not); the group shouts clues; the
// holder marks got/pass against the clock. Reuses the shared word-deck engine (wordgame.ts) — this
// file only supplies the themed decks. All words are ORIGINAL generic vocabulary (no copied lists).

import { type WordCard } from "./wordgame.js";

export interface HeadsUpCategory {
  id: string;
  label: string;
  icon: string;
  words: string[];
}

export const HEADSUP_CATEGORIES: HeadsUpCategory[] = [
  {
    id: "animals",
    label: "Animals",
    icon: "🦊",
    words: ["Elephant", "Penguin", "Kangaroo", "Dolphin", "Giraffe", "Octopus", "Hedgehog", "Flamingo", "Cheetah", "Walrus", "Chameleon", "Raccoon", "Peacock", "Jellyfish", "Koala", "Otter"],
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: "🍔",
    words: ["Spaghetti", "Pancakes", "Avocado", "Popcorn", "Sushi", "Waffle", "Meatball", "Pineapple", "Bagel", "Taco", "Pretzel", "Cupcake", "Nachos", "Omelette", "Smoothie", "Burrito"],
  },
  {
    id: "house",
    label: "Around the House",
    icon: "🏠",
    words: ["Toaster", "Umbrella", "Doorbell", "Pillow", "Vacuum", "Blender", "Mirror", "Ladder", "Blanket", "Candle", "Broom", "Kettle", "Drawer", "Curtain", "Mousetrap", "Nightlight"],
  },
  {
    id: "actions",
    label: "Act It Out",
    icon: "🤹",
    words: ["Juggling", "Sneezing", "Tiptoeing", "Snoring", "Whispering", "Yawning", "Skipping", "Wrestling", "Tickling", "Bowling", "Marching", "Shrugging", "Clapping", "Stretching", "Fishing", "Winking"],
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: "👷",
    words: ["Firefighter", "Astronaut", "Plumber", "Magician", "Lifeguard", "Barber", "Detective", "Farmer", "Referee", "Pilot", "Sculptor", "Beekeeper", "Lumberjack", "Cashier", "Surgeon", "Waiter"],
  },
  {
    id: "nature",
    label: "Great Outdoors",
    icon: "🏔️",
    words: ["Volcano", "Waterfall", "Glacier", "Desert", "Rainforest", "Canyon", "Island", "Swamp", "Meadow", "Cave", "Iceberg", "Tornado", "Geyser", "Sand dune", "Whirlpool", "Campfire"],
  },
];

export function headsUpCategory(id: string): HeadsUpCategory {
  return HEADSUP_CATEGORIES.find((c) => c.id === id) ?? HEADSUP_CATEGORIES[0];
}

/** Build a word-deck for a category, in the shape the shared engine consumes. */
export function headsUpDeck(categoryId: string): WordCard[] {
  const c = headsUpCategory(categoryId);
  return c.words.map((w) => ({ word: w, category: c.id }));
}
