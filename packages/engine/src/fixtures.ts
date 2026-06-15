// Question bank seeded from the original "Frendz and Foes (El Nido)" deck.
//
// Each answer carries its survey count; points are assigned 8 (most popular) down by rank, per
// the game rules. Round 1 = q1–q10, Round 2 = q11–q20, then the bonus question. IDs are stable
// (a1 = top-points answer) so tests and saved games stay valid.

import type { Question } from "./types.js";
import { makeQuestion } from "./qmake.js";

// --- Round 1 ---------------------------------------------------------------------------------

export const SAMPLE_REGULAR_1: Question = makeQuestion(
  "q1",
  "regular",
  "Name something you never forget to pack for a trip to the Philippines (except your sense of adventure).",
  [
    ["Passport", 30],
    ["Sunblock", 20],
    ["Clothes", 15],
    ["Gadgets", 10],
    ["Bank Cards", 8],
    ["Water Bottle", 7],
    ["Bug spray", 6],
    ["Flip flops", 4],
  ],
);

export const SAMPLE_REGULAR_2: Question = makeQuestion(
  "q2",
  "regular",
  "Name an island in the Philippines best fitted for the saying “what happens in ___ stays in ___”.",
  [
    ["Palawan", 29],
    ["Boracay", 21],
    ["Cebu", 17],
    ["Siargao", 13],
    ["Bohol", 11],
    ["Siquijor", 7],
    ["Baler", 5],
    ["Zambales", 3],
  ],
);

const Q3 = makeQuestion(
  "q3",
  "regular",
  "Name a local dish you must try in the Philippines before you can properly say you’ve been to the Philippines.",
  [
    ["Lechon", 25],
    ["Adobo", 21],
    ["Sisig", 19],
    ["Pansit", 13],
    ["Balut", 11],
    ["Sinigang", 7],
    ["Lumpia", 3],
    ["Bulalo", 1],
  ],
);

const Q4 = makeQuestion(
  "q4",
  "regular",
  "Name a tropical fruit in the Philippines that can double as a weapon.",
  [
    ["Durian", 27],
    ["Coconut", 22],
    ["Jackfruit", 18],
    ["Pineapple", 13],
    ["Soursop", 9],
    ["Pomelo", 6],
    ["Watermelon", 4],
    ["Green Mango", 1],
  ],
);

const Q5 = makeQuestion(
  "q5",
  "regular",
  "Name a Filipino dish that will make you question your sanity and your bravery.",
  [
    ["Balut", 27],
    ["Tamilok", 21],
    ["Papaitan", 17],
    ["Betamax", 14],
    ["Dinuguan", 6],
    ["Kinilaw", 5],
    ["Adidas", 3],
    ["Isaw", 2],
  ],
);

const Q6 = makeQuestion(
  "q6",
  "regular",
  "Name a common mode of transportation in Southeast Asia that makes your insurance agent nervous.",
  [
    ["Scooter / Motorbike", 30],
    ["Motorbike Taxi", 24],
    ["Tuk-tuk", 19],
    ["Boat", 18],
    ["Jeepney", 13],
    ["Bus", 10],
    ["Bicycle", 5],
    ["Train", 2],
  ],
);

const Q7 = makeQuestion(
  "q7",
  "regular",
  "Name a favorite activity for backpackers in the Philippines that guarantees fun and sunburn.",
  [
    ["Island hopping", 28],
    ["Snorkeling", 21],
    ["Beach hopping", 17],
    ["Sunbathing", 14],
    ["Surfing", 10],
    ["Swimming", 6],
    ["Kayaking", 3],
    ["Sailing", 1],
  ],
);

const Q8 = makeQuestion(
  "q8",
  "regular",
  "Name a famous tourist destination in the Philippines you can use to make your co-worker and your ex jealous.",
  [
    ["Boracay", 30],
    ["Palawan", 23],
    ["Siargao", 17],
    ["Cebu", 13],
    ["Bohol", 9],
    ["Siquijor", 6],
    ["Baguio", 5],
    ["Baler", 1],
  ],
);

const Q9 = makeQuestion(
  "q9",
  "regular",
  "Name a Southeast Asian country with the best nightlife.",
  [
    ["Thailand", 41],
    ["Vietnam", 18],
    ["Philippines", 14],
    ["Indonesia", 13],
    ["Malaysia", 7],
    ["Laos", 4],
    ["Cambodia", 2],
    ["Brunei", 1],
  ],
);

const Q10 = makeQuestion(
  "q10",
  "regular",
  "Name an essential item for jungle trekking in the Philippines (to avoid finding out how good your travel insurance is).",
  [
    ["Insect repellent", 30],
    ["First aid kit", 23],
    ["Mosquito net", 17],
    ["Camping setup", 9],
    ["Toiletries", 6],
    ["Clothes / Boots", 3],
    ["Multitool", 1],
  ],
);

// --- Round 2 ---------------------------------------------------------------------------------

const Q11 = makeQuestion(
  "q11",
  "regular",
  "Name a go-to item in people’s backpack.",
  [
    ["Gadgets", 40],
    ["Water bottle", 30],
    ["Clothes", 10],
    ["Sun block", 8],
    ["Travel documents", 5],
    ["Toiletries", 4],
    ["Common medicine", 2],
    ["Multi-tool", 1],
  ],
);

const Q12 = makeQuestion(
  "q12",
  "regular",
  "Name a common way backpackers document their travels (other than medical bills).",
  [
    ["Photos", 50],
    ["Blogging / Vlogging", 20],
    ["Social media", 15],
    ["Journal / diary", 7],
    ["Passport stamp", 4],
    ["Sketching / painting", 3],
    ["Scrapbook", 2],
    ["Postcards", 1],
  ],
);

const Q13 = makeQuestion(
  "q13",
  "regular",
  "Name a Southeast Asian city known for its vibrant night markets.",
  [
    ["Bangkok", 30],
    ["Hanoi", 22],
    ["Ho Chi Minh City", 18],
    ["Kuala Lumpur", 13],
    ["Jakarta", 10],
    ["Cebu City", 5],
    ["Siem Reap", 2],
    ["Yangon", 1],
  ],
);

const Q14 = makeQuestion(
  "q14",
  "regular",
  "Name a typical accommodation choice for backpackers.",
  [
    ["Hostels", 40],
    ["Guesthouses", 22],
    ["Eco-lodges", 13],
    ["Beach huts", 10],
    ["Homestays", 6],
    ["Couchsurfing", 4],
    ["Airbnb", 3],
    ["Camping", 2],
  ],
);

const Q15 = makeQuestion(
  "q15",
  "regular",
  "Name a travel essential you’d never share with anyone.",
  [
    ["Toothbrush", 29],
    ["Deodorant", 23],
    ["Underwear", 19],
    ["Towel", 13],
    ["Phone / Camera", 8],
    ["Passport", 7],
    ["Razor", 6],
    ["Personal medication", 4],
  ],
);

const Q16 = makeQuestion(
  "q16",
  "regular",
  "Name an animal you might see at a Southeast Asian temple — and a crazy after party.",
  [
    ["Monkeys", 40],
    ["Elephants", 30],
    ["Dogs", 15],
    ["Cats", 10],
    ["Turtles", 5],
    ["Exotic birds", 3],
    ["Fish", 2],
    ["Snakes", 1],
  ],
);

const Q17 = makeQuestion(
  "q17",
  "regular",
  "Name a strange Southeast Asian food you might dare to try if you’re drunk enough.",
  [
    ["Balut", 30],
    ["Scorpion", 22],
    ["Fried insects", 18],
    ["Century eggs", 13],
    ["Tamilok", 10],
    ["Sizzling squid ink", 5],
    ["Pickled fruit", 2],
    ["Fish sauce ice cream", 1],
  ],
);

const Q18 = makeQuestion(
  "q18",
  "regular",
  "Name a popular souvenir backpackers bring back from their travels.",
  [
    ["Local crafts / artwork", 35],
    ["Clothing", 25],
    ["Food / spices", 15],
    ["Postcards / prints", 10],
    ["Jewelry / accessories", 5],
    ["Musical instruments", 4],
    ["Handmade soaps", 3],
    ["Books / maps", 2],
  ],
);

const Q19 = makeQuestion(
  "q19",
  "regular",
  "Name a Filipino stereotype that is 100% true.",
  [
    ["Loves karaoke", 30],
    ["Warm hospitality", 22],
    ["Family-oriented", 18],
    ["Loves to party", 13],
    ["Love for rice", 10],
    ["Religious", 5],
    ["Tardiness", 2],
    ["Pointing with lips", 1],
  ],
);

const Q20 = makeQuestion(
  "q20",
  "regular",
  "Name a typical breakfast option for backpackers.",
  [
    ["Fresh fruit", 35],
    ["Bread / toast with jam", 20],
    ["Omelette / eggs", 15],
    ["Yogurt with granola", 10],
    ["Pancakes / waffles", 8],
    ["Local street food", 5],
    ["Smoothie", 4],
    ["Rice / noodles", 3],
  ],
);

// --- Bonus -----------------------------------------------------------------------------------

export const SAMPLE_BONUS: Question = makeQuestion(
  "bonus1",
  "bonus",
  "Name a Filipino city famous for its historical sites.",
  [
    ["Vigan", 30],
    ["Cebu City", 18],
    ["Intramuros (Manila)", 13],
  ],
);

/** The 20 curated regular questions (Round 1 + Round 2), in deck order. */
export const STANDARD_REGULARS: Question[] = [
  SAMPLE_REGULAR_1,
  SAMPLE_REGULAR_2,
  Q3,
  Q4,
  Q5,
  Q6,
  Q7,
  Q8,
  Q9,
  Q10,
  Q11,
  Q12,
  Q13,
  Q14,
  Q15,
  Q16,
  Q17,
  Q18,
  Q19,
  Q20,
];

/** Standard game: the fixed deck — Round 1 (10) + Round 2 (10) + bonus. */
export const SAMPLE_QUESTIONS: Question[] = [...STANDARD_REGULARS, SAMPLE_BONUS];
