// Murder Mystery: The Villagers — the character roster.
//
// Each villager has a UNIQUE signature weapon. That 1:1 mapping is the whole deduction engine:
// when a body is found with the Barber's scissors, suspicion falls on the Barber. The server is
// the single source of truth for this list (clients fetch it from /murder/characters).

export const VILLAGERS = [
  { id: "sam", name: "Sam", job: "Gardener", weaponId: "trowel", weapon: "Garden Trowel", emoji: "🌱", color: "#2f6f6f", blurb: "Always dirt under his nails. Knows everyone's comings and goings." },
  { id: "allen", name: "Allen", job: "Doctor", weaponId: "scalpel", weapon: "Scalpel", emoji: "🩺", color: "#8c2f39", blurb: "A steady hand with the sick — but known to be forgetful." },
  { id: "eugene", name: "Eugene", job: "Librarian", weaponId: "tome", weapon: "Heavy Tome", emoji: "📚", color: "#c19a2b", blurb: "Quiet, keeps to himself. Found an unusual old book recently." },
  { id: "larry", name: "Larry", job: "Blacksmith", weaponId: "hammer", weapon: "Forge Hammer", emoji: "🔨", color: "#4a6741", blurb: "A man of few words. A recent argument with a farmer is rumored." },
  { id: "gilbert", name: "Gilbert", job: "Town Mayor", weaponId: "key", weapon: "Ceremonial Key", emoji: "🗝️", color: "#6b4c86", blurb: "Long-standing mayor. His new zoning law angered many." },
  { id: "ronnie", name: "Ronnie", job: "Postman", weaponId: "opener", weapon: "Letter Opener", emoji: "✉️", color: "#7d8f3f", blurb: "Cheerful, knows where everyone lives — and reads return addresses." },
  { id: "mildred", name: "Mildred", job: "Cook", weaponId: "pin", weapon: "Rolling Pin", emoji: "🥖", color: "#c0562f", blurb: "Her pastries are legendary. A bad batch of flour has her agitated." },
  { id: "barbara", name: "Barbara", job: "Shopkeeper", weaponId: "umbrella", weapon: "Antique Umbrella", emoji: "☂️", color: "#2f5d8c", blurb: "Sells vintage clothes. Her shop was broken into — nothing taken." },
  { id: "vince", name: "Vince", job: "Barber", weaponId: "scissors", weapon: "Scissors", emoji: "✂️", color: "#b03b5a", blurb: "Talks a lot, hears everything. Never forgets a face." },
  { id: "wanda", name: "Wanda", job: "Butcher", weaponId: "cleaver", weapon: "Meat Cleaver", emoji: "🔪", color: "#7a2f2f", blurb: "Strong arms, sharper tools. Doesn't flinch at blood." },
  { id: "fred", name: "Fred", job: "Fisherman", weaponId: "hook", weapon: "Fishing Hook", emoji: "🎣", color: "#2f7a8c", blurb: "Out before dawn, back after dark. Alibis are hard to check." },
  { id: "iris", name: "Iris", job: "Florist", weaponId: "wire", weapon: "Florist Wire", emoji: "🌹", color: "#a83f6b", blurb: "Arranges beauty all day. Keeps very sharp wire in her apron." },
  { id: "ted", name: "Ted", job: "Carpenter", weaponId: "chisel", weapon: "Chisel", emoji: "🪚", color: "#8a5a2b", blurb: "Builds half the town. Was seen fixing the victim's porch." },
  { id: "nora", name: "Nora", job: "Nurse", weaponId: "syringe", weapon: "Syringe", emoji: "💉", color: "#3f8a7a", blurb: "Kind bedside manner. Has access to the medicine cabinet." },
  { id: "ollie", name: "Ollie", job: "Bartender", weaponId: "bottle", weapon: "Broken Bottle", emoji: "🍾", color: "#5c6b2f", blurb: "Hears every secret in town. Pours a heavy drink." },
  { id: "percy", name: "Percy", job: "Priest", weaponId: "candlestick", weapon: "Candlestick", emoji: "🕯️", color: "#6b6b8c", blurb: "Keeper of confessions. Was at the chapel — allegedly, alone." },
  { id: "hazel", name: "Hazel", job: "Teacher", weaponId: "globe", weapon: "Heavy Globe", emoji: "🌍", color: "#2f8c5a", blurb: "Strict, precise, and remembers exactly who was late." },
  { id: "duke", name: "Duke", job: "Butler", weaponId: "tray", weapon: "Silver Tray", emoji: "🍽️", color: "#3f3f52", blurb: "Impeccably polite. Moves through every room unnoticed." },
  { id: "rosa", name: "Rosa", job: "Seamstress", weaponId: "needles", weapon: "Knitting Needles", emoji: "🧶", color: "#a8527a", blurb: "Sews for the whole village. Notices what everyone wears." },
  { id: "marv", name: "Marv", job: "Mechanic", weaponId: "wrench", weapon: "Wrench", emoji: "🔧", color: "#4a5a6b", blurb: "Grease-stained and gruff. Fixed the victim's cart last week." },
  { id: "clara", name: "Clara", job: "Painter", weaponId: "paletteknife", weapon: "Palette Knife", emoji: "🎨", color: "#c07a2f", blurb: "Paints the town square daily. Sees everything from her easel." },
  { id: "gus", name: "Gus", job: "Farmer", weaponId: "pitchfork", weapon: "Pitchfork", emoji: "🌾", color: "#7a8c2f", blurb: "Up with the roosters. Had a loud dispute over land." },
  { id: "ivy", name: "Ivy", job: "Herbalist", weaponId: "vial", weapon: "Poison Vial", emoji: "☠️", color: "#3f6b3f", blurb: "Knows every plant — which heal, and which most certainly do not." },
  { id: "rex", name: "Rex", job: "Hunter", weaponId: "knife", weapon: "Hunting Knife", emoji: "🗡️", color: "#6b4a2f", blurb: "Comfortable in the woods. Comfortable with killing." },
  { id: "mona", name: "Mona", job: "Musician", weaponId: "string", weapon: "Violin String", emoji: "🎻", color: "#8c3f6b", blurb: "Plays at every gathering. Nobody watches the musician." },
  { id: "cyrus", name: "Cyrus", job: "Clockmaker", weaponId: "weight", weapon: "Clock Weight", emoji: "⏰", color: "#5a5a2f", blurb: "Obsessed with time. Can account for every minute — supposedly." },
  { id: "della", name: "Della", job: "Laundress", weaponId: "rope", weapon: "Clothesline Rope", emoji: "🧺", color: "#2f6b8c", blurb: "Handles everyone's linens. Would know how to remove a stain." },
  { id: "silas", name: "Silas", job: "Undertaker", weaponId: "shovel", weapon: "Shovel", emoji: "⚰️", color: "#3a3a3a", blurb: "Business has been unusually good lately." },
  { id: "pearl", name: "Pearl", job: "Jeweler", weaponId: "chain", weapon: "Silver Chain", emoji: "💎", color: "#8c6b2f", blurb: "Deals in precious things. Recently very short on money." },
  { id: "wes", name: "Wes", job: "Innkeeper", weaponId: "poker", weapon: "Iron Poker", emoji: "🔥", color: "#a8452f", blurb: "Knows who checked in, who left — and who never came back." },
];

export const byId = (id) => VILLAGERS.find((v) => v.id === id) || null;
export const weaponOf = (characterId) => byId(characterId)?.weaponId ?? null;
