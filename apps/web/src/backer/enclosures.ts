// Client-side display data for the four enclosures (mirrors apps/server/enclosures.js — kept in sync
// by hand; the server is the source of truth for the sorting result). Display-only: name, motto,
// accent colour, banner art, and a one-line blurb for the reveal + the signed-in badge.

export interface EnclosureView {
  id: string;
  name: string;
  emoji: string;
  motto: string;
  accent: string;
  banner: string;
  blurb: string;
}

export const ENCLOSURES: EnclosureView[] = [
  { id: "rowdies", name: "The Rowdies", emoji: "🦁", motto: "Leap first, look later.", accent: "#f59e0b", banner: "/ui/enclosure-rowdies.png", blurb: "Charge-first, loud, allergic to reading the sign." },
  { id: "cuddle-crew", name: "The Cuddle Crew", emoji: "🐻", motto: "Snacks and secrets shared.", accent: "#2dd4bf", banner: "/ui/enclosure-cuddle-crew.png", blurb: "No drama, no snitching, all snacks." },
  { id: "know-it-owls", name: "The Know-It-Owls", emoji: "🦉", motto: "Well, actually.", accent: "#8b5cf6", banner: "/ui/enclosure-know-it-owls.png", blurb: "Trivia sharks and 'well, actually' merchants." },
  { id: "schemers", name: "The Schemers", emoji: "🦝", motto: "Didn't see it? Didn't happen.", accent: "#ec4899", banner: "/ui/enclosure-schemers.png", blurb: "Always three moves ahead. John's enclosure." },
];

export const enclosureView = (id: string | null): EnclosureView | null =>
  (id && ENCLOSURES.find((e) => e.id === id)) || null;
