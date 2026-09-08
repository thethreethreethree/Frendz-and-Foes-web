// The four PlayZoo enclosures — canonical (owner-approved 2026-09-08). PlayZoo's own funny riff on
// the four Hogwarts houses: Rex sorts every backer into one of these with a 5-question silly quiz,
// and each gets its own group chat (plus a General room everyone shares). This is the single source
// of truth for the sorting algorithm, the chat rooms, and the enclosure banners.
//
// Not affiliated with / not using any Harry Potter IP — original crests + names.

export const ENCLOSURES = [
  {
    id: "rowdies",
    name: "The Rowdies",
    temperament: "Bold · Loud · Fearless",
    parallel: "Gryffindor", // the brave house
    crest: "Lion",
    motto: "Leap first, look later.",
    accent: "#f59e0b", // amber
    banner: "/ui/enclosure-rowdies.png",
    blurb: "Charge-first, loud, allergic to reading the sign. If it looks fun, they're already doing it.",
  },
  {
    id: "cuddle-crew",
    name: "The Cuddle Crew",
    temperament: "Loyal · Warm · Ride-or-die",
    parallel: "Hufflepuff", // the loyal house
    crest: "Bear + Otter",
    motto: "Snacks and secrets shared.",
    accent: "#2dd4bf", // teal
    banner: "/ui/enclosure-cuddle-crew.png",
    blurb: "No drama, no snitching, all snacks. They'll have your back and split their last fry with you.",
  },
  {
    id: "know-it-owls",
    name: "The Know-It-Owls",
    temperament: "Clever · Witty · Smug",
    parallel: "Ravenclaw", // the clever house
    crest: "Owl",
    motto: "Well, actually.",
    accent: "#8b5cf6", // violet
    banner: "/ui/enclosure-know-it-owls.png",
    blurb: "Trivia sharks and 'well, actually' merchants. Insufferably right roughly 80% of the time.",
  },
  {
    id: "schemers",
    name: "The Schemers",
    temperament: "Sly · Cunning · Mischief",
    parallel: "Slytherin", // the sly house
    crest: "Raccoon + Fox",
    motto: "Didn't see it? Didn't happen.",
    accent: "#ec4899", // hot pink
    banner: "/ui/enclosure-schemers.png",
    blurb: "Always playing three moves ahead. It's not cheating if nobody catches you (John's enclosure).",
  },
];

export const ENCLOSURE_IDS = ENCLOSURES.map((e) => e.id);
export const getEnclosure = (id) => ENCLOSURES.find((e) => e.id === id) || null;

// Chat rooms: one per enclosure + a General room everyone can see. The sorting quiz + algorithm
// (answers map to an enclosure, so same answers land together — NOT random) live alongside this in
// the sorting module when that phase is built.
export const GENERAL_ROOM = { id: "general", name: "The Watering Hole", blurb: "Everyone, all enclosures, one room." };
