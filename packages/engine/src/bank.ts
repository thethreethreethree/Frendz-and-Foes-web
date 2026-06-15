// 100 extra survey questions (same El Nido / SEA-backpacker voice as the deck), each with 8
// AI-generated ranked answers. Combined with the 20 curated regulars, they form the 120-question
// pool used by "Randomize Survey" mode. Answers are listed most-popular-first; survey counts come
// from a descending template (display only) and points are assigned 8..1 by rank.

import type { Question } from "./types.js";
import { makeQuestion } from "./qmake.js";
import { STANDARD_REGULARS } from "./fixtures.js";

const COUNTS = [40, 30, 21, 15, 10, 7, 4, 2];

function bq(id: string, prompt: string, answers: string[]): Question {
  return makeQuestion(
    id,
    "regular",
    prompt,
    answers.slice(0, 8).map((t, i) => [t, COUNTS[i] ?? 1]),
  );
}

// [prompt, [answers, most popular first]]
const DATA: Array<[string, string[]]> = [
  // Food & Drink
  ["Name a Filipino street food that sounds scarier than it tastes.", ["Balut", "Isaw", "Betamax", "Adidas", "Kwek-kwek", "Dinuguan", "Chicken skin", "Pig ear"]],
  ["Name a dish you'd have to be dared to order at a Southeast Asian night market.", ["Fried insects", "Scorpion", "Frog", "Snake", "Balut", "Century egg", "Silkworm", "Tarantula"]],
  ["Name a Filipino dessert that's basically a sugar coma in a cup.", ["Halo-halo", "Leche flan", "Ube halaya", "Bibingka", "Turon", "Sapin-sapin", "Buko pandan", "Cassava cake"]],
  ["Name a drink you must try in the Philippines before you leave.", ["Buko juice", "Calamansi juice", "San Miguel beer", "Mango shake", "Sago't gulaman", "Tuba", "Lambanog", "Taho"]],
  ["Name a food tourists pretend to enjoy just to be polite.", ["Balut", "Durian", "Century egg", "Stinky tofu", "Natto", "Fish sauce", "Dinuguan", "Bagoong"]],
  ["Name something you'll find on every Filipino fiesta table.", ["Lechon", "Pancit", "Sweet spaghetti", "Lumpia", "Rice", "Fruit salad", "Leche flan", "Adobo"]],
  ["Name a Southeast Asian fruit that smells worse than it tastes.", ["Durian", "Jackfruit", "Marang", "Champedak", "Noni", "Soursop", "Mangosteen", "Rambutan"]],
  ["Name a snack that fuels every long bus ride in Asia.", ["Chips", "Crackers", "Instant noodles", "Biscuits", "Nuts", "Candy", "Banana chips", "Dried mango"]],
  ["Name a Filipino breakfast that (of course) comes with rice.", ["Tapsilog", "Longsilog", "Tocilog", "Cornsilog", "Fried egg", "Daing", "Spam", "Hotdog"]],
  ["Name a condiment Filipinos put on everything.", ["Soy sauce", "Vinegar", "Fish sauce", "Banana ketchup", "Calamansi", "Bagoong", "Toyomansi", "Chili"]],
  // Islands & Destinations
  ["Name a Philippine island worth maxing out your credit card for.", ["Palawan", "Boracay", "Siargao", "Cebu", "Bohol", "Coron", "El Nido", "Camiguin"]],
  ["Name a beach that's gorgeous but always packed.", ["Boracay", "White Beach", "Maya Bay", "Kuta", "Patong", "Nacpan", "Alona Beach", "Nha Trang"]],
  ["Name a Philippine spot famous for its sunsets.", ["Manila Bay", "Boracay", "El Nido", "Siargao", "La Union", "Subic", "Bantayan", "Calatagan"]],
  ["Name an underrated Philippine destination tourists sleep on.", ["Siquijor", "Camiguin", "Batanes", "Romblon", "Marinduque", "Biliran", "Guimaras", "Apo Island"]],
  ["Name a Southeast Asian country on every backpacker's bucket list.", ["Thailand", "Vietnam", "Philippines", "Indonesia", "Cambodia", "Malaysia", "Laos", "Myanmar"]],
  ["Name a city you'd happily get lost in.", ["Bangkok", "Hanoi", "Manila", "Hoi An", "Kuala Lumpur", "Siem Reap", "Singapore", "Ubud"]],
  ["Name a Philippine spot famous for diving or snorkeling.", ["Tubbataha", "Moalboal", "Coron", "Apo Reef", "Anilao", "Apo Island", "Malapascua", "Balicasag"]],
  ["Name a hike worth waking up at 3am for.", ["Mt Pulag", "Mt Pinatubo", "Mt Apo", "Mt Batulao", "Taal", "Osmeña Peak", "Mt Ulap", "Mt Daraitan"]],
  ["Name a place you'd go to disappear from your responsibilities.", ["Siargao", "Siquijor", "Batanes", "El Nido", "Coron", "Camiguin", "Bali", "A remote island"]],
  ["Name a tourist trap everyone visits anyway.", ["Maya Bay", "Boracay", "Intramuros", "Chocolate Hills", "Grand Palace", "Tarsier sanctuary", "Floating market", "Sky tower"]],
  // Getting Around
  ["Name a way to get around an Asian city that tests your faith.", ["Tricycle", "Jeepney", "Motorbike taxi", "Tuk-tuk", "Habal-habal", "Local bus", "Crossing the street", "Songthaew"]],
  ["Name something you'll always see strapped to a jeepney.", ["Luggage", "Sacks of rice", "Passengers", "Boxes", "Live chickens", "Sound system", "Spare tire", "Religious decals"]],
  ["Name a reason your ferry got \"delayed.\"", ["Bad weather", "Mechanical issue", "Waiting for passengers", "Overloading", "Low tide", "No reason given", "Late captain", "High waves"]],
  ["Name a vehicle you'd never expect to carry your luggage (but it will).", ["Roof of a bus", "Motorbike", "Tricycle sidecar", "Boat deck", "Top of a jeepney", "A scooter", "Someone's lap", "Cargo van"]],
  ["Name something that always happens on a long-haul Asian bus ride.", ["Loud movie", "AC too cold", "Bathroom stop", "Snack vendor boards", "Someone snores", "Flat tire", "Karaoke", "Crying baby"]],
  ["Name something you'll end up sharing a ride with at least once.", ["A chicken", "A goat", "Sacks of rice", "A stranger's bag", "Live fish", "A dog", "Too many people", "A motorbike"]],
  ["Name a line you'll hear from a tuk-tuk driver.", ["Where you go?", "Cheap price", "Special price for you", "I take you", "Five minutes", "My friend's shop", "Good price my friend", "Tuk-tuk?"]],
  ["Name something a tricycle can somehow fit.", ["A family of six", "Sacks of rice", "A refrigerator", "A mattress", "Live pigs", "Construction materials", "A water dispenser", "Half a barangay"]],
  // Where You Sleep
  ["Name a sound that keeps you up in a cheap hostel.", ["Snoring", "Roosters", "Karaoke", "Air-con", "Loud roommates", "Street noise", "Dogs barking", "Someone's alarm"]],
  ["Name something always broken in a budget guesthouse.", ["Wi-Fi", "Hot water", "Air-con", "The fan", "A light", "Door lock", "Toilet flush", "The TV"]],
  ["Name a hostel amenity that's a pleasant surprise.", ["Free breakfast", "Hot shower", "Pool", "Free beer", "Strong Wi-Fi", "Air-con", "Rooftop bar", "Clean sheets"]],
  ["Name something you'll find in every backpacker dorm.", ["Bunk beds", "Lockers", "A snorer", "Wet towels", "Phone chargers", "Backpacks", "A guitar", "Someone packing at 4am"]],
  ["Name a reason to splurge on a nicer room for just one night.", ["Air-con", "Hot shower", "Privacy", "A real bed", "Good Wi-Fi", "A pool", "After a long trek", "Your birthday"]],
  ["Name a red flag in a hostel review.", ["Bed bugs", "No hot water", "Rude staff", "Not as pictured", "Dirty bathroom", "Too noisy", "No AC", "Sketchy area"]],
  ["Name something you'd never touch barefoot in a shared bathroom.", ["The floor", "The drain", "A stray hair", "Wet tiles", "The shower", "A bug", "The toilet", "Someone's soap"]],
  ["Name a perk of staying in a beach hut.", ["Ocean view", "Sound of waves", "Sea breeze", "Steps to the beach", "Sunrise/sunset", "Hammock", "It's cheap", "Total quiet"]],
  // Packing & Gear
  ["Name something every backpacker overpacks.", ["Clothes", "Shoes", "Toiletries", "Books", "Gadgets", "\"Just in case\" stuff", "Medicine", "Underwear"]],
  ["Name an item you wish you'd brought on your first trip.", ["Power bank", "Adapter", "First-aid kit", "Earplugs", "Flip flops", "Dry bag", "Extra cash", "Quick-dry towel"]],
  ["Name a gadget that's useless once you're actually traveling.", ["Hair dryer", "Laptop", "Selfie stick", "Drone", "Travel iron", "Smartwatch", "E-reader", "GoPro"]],
  ["Name something that always leaks inside your backpack.", ["Shampoo", "Sunscreen", "Water bottle", "Bug spray", "Toothpaste", "Soap", "Lotion", "Shower gel"]],
  ["Name an item you'll buy abroad because you forgot it.", ["Charger", "Toothbrush", "Sunscreen", "Adapter", "Flip flops", "Underwear", "Razor", "Towel"]],
  ["Name something in a first-aid kit you'll actually use.", ["Band-aids", "Painkillers", "Anti-diarrhea meds", "Antiseptic", "Mosquito cream", "Plasters", "Rehydration salts", "Antihistamine"]],
  ["Name a thing that mysteriously vanishes from your bag.", ["Socks", "Pens", "Chargers", "Sunglasses", "Lighter", "Earphones", "Hair ties", "One flip flop"]],
  ["Name an item worth its weight in a tropical climate.", ["Sunscreen", "Bug spray", "Water bottle", "A hat", "Dry bag", "Electrolytes", "A fan", "Quick-dry towel"]],
  // Things To Do
  ["Name an activity that guarantees a great photo and a minor injury.", ["Cliff jumping", "Surfing", "Volcano hike", "Scooter ride", "Zip-lining", "Snorkeling on coral", "Climbing for the shot", "ATV ride"]],
  ["Name something tourists do that locals find hilarious.", ["Sunbathing", "Overpaying", "\"I love\" shirts", "Selfies everywhere", "Bad bargaining", "Getting sunburnt", "Mispronouncing names", "Wearing socks with sandals"]],
  ["Name a water activity worth the boat ride.", ["Island hopping", "Snorkeling", "Diving", "Whale shark watching", "Sandbar visit", "Lagoon tour", "Cliff jumping", "Sunset cruise"]],
  ["Name how backpackers spend a rainy day.", ["Netflix", "Sleep", "Hostel bar", "Card games", "Plan next stop", "Read", "Cook", "Do laundry"]],
  ["Name an experience you'd regret skipping in the Philippines.", ["El Nido island hopping", "Chocolate Hills", "Whale sharks", "Kawasan Falls", "Banaue Rice Terraces", "Surfing Siargao", "Taal Volcano", "Underground River"]],
  ["Name a bucket-list thing to do in Southeast Asia.", ["Full moon party", "Angkor Wat", "Halong Bay", "Bali temples", "Island hopping", "Jungle trekking", "Scuba diving", "Ride a scooter"]],
  ["Name an activity that sounds relaxing but really isn't.", ["A long bus ride", "Camping", "A \"short\" hike", "An overnight ferry", "A painful massage", "A group tour", "Sunbathing too long", "Snorkeling against the current"]],
  ["Name a free thing to do in any beach town.", ["Watch the sunset", "Swim", "Walk the beach", "People-watch", "Collect shells", "Nap in a hammock", "Beach volleyball", "Sit on the pier"]],
  // Culture & Stereotypes
  ["Name a Filipino stereotype that's 100% accurate.", ["Loves karaoke", "Always late", "Family-oriented", "Loves rice", "Hospitable", "Religious", "Loves basketball", "Points with lips"]],
  ["Name something Filipinos are weirdly proud of.", ["Manny Pacquiao", "Lechon", "Karaoke", "Jollibee", "The beaches", "Bayanihan spirit", "Miss Universe wins", "Halo-halo"]],
  ["Name a sign that a Filipino party is about to start.", ["Karaoke turns on", "Lechon arrives", "Tito starts grilling", "Beer comes out", "Loud speakers", "Everyone's late", "Tita serves food", "Basketball on TV"]],
  ["Name something every Filipino lola says.", ["Kumain ka na?", "Ingat", "Sayang", "Naku", "Bahala na", "Susmaryosep", "Anak", "Kain tayo"]],
  ["Name a Filipino habit foreigners find confusing.", ["Pointing with lips", "\"Pinoy time\"", "Eating with hands", "The \"psst\"", "\"Comfort room\"", "Calling everyone tito/tita", "Smiling when embarrassed", "Singing everywhere"]],
  ["Name something you'll be offered the moment you enter a Filipino home.", ["Food", "Slippers", "A drink", "Rice", "A seat", "Snacks", "\"Kain tayo\"", "Coffee"]],
  ["Name a local custom tourists always get wrong.", ["Tipping", "Removing shoes", "Temple dress code", "Using the left hand", "Pointing your feet", "Haggling rudely", "Touching heads", "Public affection"]],
  ["Name something Filipinos can turn into a karaoke duet.", ["My Way", "Endless Love", "A Whole New World", "Total Eclipse of the Heart", "Islands in the Stream", "Tagpuan", "Any love song", "A Disney song"]],
  ["Name a phrase you'll hear at every family reunion.", ["Ang laki mo na!", "Kumain ka na?", "May jowa ka na?", "Kailan ka mag-aasawa?", "Tumaba ka", "Magkano sweldo mo?", "Ang ganda mo na", "Saan ka na nagtatrabaho?"]],
  // Nightlife & Social
  ["Name where backpackers meet their next travel buddy.", ["Hostel common room", "The bar", "A walking tour", "On a boat", "At a bus stop", "The pool", "A pub crawl", "Sharing a taxi"]],
  ["Name a sign you've had too much fun on a beach night.", ["Sand everywhere", "Lost flip flops", "A hangover", "A new tattoo", "No memory", "Missing phone", "Sunburn", "A \"great\" idea"]],
  ["Name something that always happens at a hostel bar.", ["Beer pong", "Drinking games", "New friends", "A pub crawl forms", "Someone overshares", "A bad decision", "Music too loud", "Free shots"]],
  ["Name the drink behind every backpacker's bad decision.", ["Tequila", "Bucket cocktails", "Local rum", "Beer", "Shots", "Mystery punch", "\"Just one more\"", "Whiskey"]],
  ["Name a regret you'll have after a full-moon party.", ["Lost phone", "Hangover", "Empty wallet", "A tattoo", "Sand everywhere", "Missing the ferry", "Neon paint stains", "A sunrise hangover"]],
  ["Name a way to make instant friends in a hostel.", ["Offer a drink", "Share food", "Play cards", "Join a tour", "Cook together", "Ask \"where you headed?\"", "Lend a charger", "Start a game"]],
  ["Name something you'll lose on a night out abroad.", ["Phone", "Wallet", "Keys", "Your friends", "Flip flops", "Your memory", "Dignity", "Your way home"]],
  ["Name how you ended up dancing on a table.", ["Tequila", "A dare", "The DJ", "Everyone else did", "A birthday", "\"It's vacation\"", "Lost a bet", "Just vibes"]],
  // Money & Budget
  ["Name something surprisingly cheap in Southeast Asia.", ["Street food", "Massages", "Beer", "Transport", "Accommodation", "Fruit", "SIM cards", "Laundry"]],
  ["Name a tourist rip-off you'll find everywhere.", ["Airport taxi", "\"Sunset\" tours", "Bottled water", "Souvenirs", "Currency exchange", "Tuk-tuk rides", "Beach chairs", "ATM fees"]],
  ["Name a way backpackers stretch their last $20.", ["Street food", "Hostel dorm", "Walk everywhere", "Cook your own", "Free activities", "Skip drinking", "Share a room", "Instant noodles"]],
  ["Name a hidden cost that wrecks a travel budget.", ["Drinks", "ATM fees", "Tours", "\"Optional\" tips", "Visa fees", "Taxis", "Souvenirs", "Departure tax"]],
  ["Name something you'll haggle for at a market.", ["Souvenirs", "Clothes", "Tuk-tuk rides", "Bags", "Sunglasses", "Jewelry", "Art", "Fake watches"]],
  ["Name a \"free\" thing that ends up costing you.", ["A \"free\" tour", "A photo with someone", "A \"gift\"", "Free Wi-Fi", "A temple \"donation\"", "A local's help", "Free samples", "A \"free\" ride"]],
  ["Name a money mistake every first-time traveler makes.", ["Too much cash", "Airport exchange", "Not haggling", "Overpaying taxis", "Forgetting ATM fees", "No insurance", "Over-tipping", "Flashing valuables"]],
  ["Name something worth paying extra for, no regrets.", ["Travel insurance", "A good bed", "Direct flights", "A guided dive", "An AC room", "Fast Wi-Fi", "A nice meal", "Legroom"]],
  // Mishaps & Misadventures
  ["Name something that always goes wrong on travel day.", ["Delayed flight", "Lost luggage", "Missed connection", "Traffic", "Overslept", "Wrong terminal", "Forgot something", "Long immigration line"]],
  ["Name a reason you'd end up in a foreign pharmacy.", ["Diarrhea", "Sunburn", "Mosquito bites", "A cold", "Headache", "Motion sickness", "A cut", "A hangover"]],
  ["Name something you'd panic about losing abroad.", ["Passport", "Phone", "Wallet", "Bank cards", "Your bag", "Plane ticket", "Visa", "Your group"]],
  ["Name a travel scam to watch out for.", ["\"Broken\" taxi meter", "Fake tours", "\"Closed\" attraction", "Overpriced gems", "Pickpockets", "Spilled-drink trick", "Fake police", "ATM skimming"]],
  ["Name a reason your flight got delayed.", ["Weather", "Technical issue", "Late crew", "Air traffic", "A strike", "No reason", "A late passenger", "Runway congestion"]],
  ["Name something you'll leave behind in a hotel room.", ["Charger", "Toothbrush", "Clothes in the drawer", "Adapter", "Sunglasses", "A sock", "Toiletries", "Your dignity"]],
  ["Name a souvenir that customs might question.", ["A knife", "A coconut", "Liquids", "Sand or shells", "Dried food", "A wooden statue", "Plants or seeds", "Too much alcohol"]],
  ["Name a phrase you'll learn fast in an emergency.", ["Help!", "Hospital", "Police", "Toilet?", "How much?", "Stop!", "I'm lost", "Doctor"]],
  ["Name how you ended up in a town you never planned to visit.", ["Missed a bus", "Wrong stop", "A local's tip", "Bad weather", "A cheaper flight", "Followed friends", "Ferry cancelled", "Got lost"]],
  // Nature & Wildlife
  ["Name an animal you'd rather not meet on a jungle trek.", ["Snake", "Spider", "Leeches", "Wild boar", "Monkeys", "Scorpion", "Centipede", "Tiger"]],
  ["Name a creature that ends up in your hostel room.", ["Gecko", "Cockroach", "Mosquito", "Ant", "Spider", "Lizard", "Rat", "Moth"]],
  ["Name a sound of the jungle at night.", ["Crickets", "Frogs", "Birds", "Cicadas", "Monkeys", "Rustling leaves", "Owls", "A mystery noise"]],
  ["Name an animal tourists can't stop photographing in Asia.", ["Monkeys", "Elephants", "Tarsiers", "Water buffalo", "Sea turtles", "Geckos", "Whale sharks", "Stray dogs"]],
  ["Name a reason to respect the ocean while swimming.", ["Strong currents", "Jellyfish", "Sharp coral", "Big waves", "Rip tides", "Sea urchins", "Sharks", "Low visibility"]],
  ["Name something that bites you that you never see coming.", ["Mosquito", "Sandflies", "Ants", "Bed bugs", "Jellyfish", "Sea urchin", "A fish", "A leech"]],
  ["Name a natural wonder worth the long trip.", ["Banaue Rice Terraces", "Chocolate Hills", "Halong Bay", "Mt Pinatubo", "Kawasan Falls", "Taal Volcano", "Underground River", "Mayon Volcano"]],
  ["Name an animal that's cuter in photos than in person.", ["Monkeys", "Tarsiers", "Stray dogs", "Snakes", "Geckos", "Cats", "Water buffalo", "Sea urchins"]],
  // Random / Universal
  ["Name something every group trip argues about.", ["Where to eat", "The budget", "What to do", "Who's late", "Splitting the bill", "The schedule", "Directions", "Where to stay"]],
  ["Name a reason you'd extend your trip last-minute.", ["Met someone", "Love the place", "Missed a spot", "Cheap flights", "New friends", "Don't want to work", "Good weather", "Why not"]],
  ["Name something you swear you'll do \"next trip.\"", ["Pack lighter", "Book ahead", "Learn the language", "Budget better", "Travel slower", "Get insurance", "Wake up earlier", "Bring less"]],
  ["Name a travel app you can't live without.", ["Google Maps", "Grab", "Google Translate", "Booking.com", "WhatsApp", "Airbnb", "Maps.me", "XE currency"]],
  ["Name something you miss from home after a month away.", ["Your bed", "Family", "Friends", "Home food", "A hot shower", "Your pet", "Clean clothes", "Routine"]],
  ["Name the first thing you do when you finally get home.", ["Sleep", "Shower", "Hug family", "Eat home food", "Do laundry", "Sleep in your bed", "Check the fridge", "Unpack (eventually)"]],
];

export const NEW_100: Question[] = DATA.map(([prompt, answers], i) => bq(`r${i + 1}`, prompt, answers));

/** The full 120-question pool for Randomize Survey mode: 20 curated regulars + 100 new. */
export const RANDOM_POOL: Question[] = [...STANDARD_REGULARS, ...NEW_100];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a randomized game from a pool: `round1 + round2` distinct regular questions plus one
 * bonus, every slot drawn at random (no repeats), reshuffled on each call. The chosen bonus is
 * scored flat regardless of its source. Answer state is reset fresh.
 */
export function buildRandomizedGame(pool: Question[] = RANDOM_POOL, round1 = 10, round2 = 10): Question[] {
  const total = round1 + round2;
  const picked = shuffle(pool).slice(0, total + 1);
  return picked.map((q, i) => ({
    ...q,
    kind: i < total ? "regular" : "bonus",
    answers: q.answers.map((a) => ({ ...a, revealed: false, awardedTeamId: null })),
  }));
}
