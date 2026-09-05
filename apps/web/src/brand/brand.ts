// The white-label brand contract. A single Brand object drives the entire visual
// identity at RUNTIME (colors, fonts, wordmark, product name, per-game copy) by writing
// CSS variables that Tailwind's tokens point at (see tailwind.config.js + applyBrand()).
//
// This is the seam the whole white-label product rests on: the app renders the *active*
// brand, the Phase-2 admin edits a Brand and saves it, and a tenant is just "which Brand
// do we load." Nothing in a component is hardcoded to "Frendz and Foes" anymore.

// Colors are stored as space-separated RGB channels ("15 23 42") — NOT hex — because they
// are injected into `rgb(var(--c-x) / <alpha-value>)`, which is what makes `bg-primary/70`
// (Tailwind alpha modifiers) keep working after theming.
export type RGB = string;

export interface BrandColors {
  ink: RGB; // primary text / darkest neutral
  canvas: RGB; // page background
  surface: RGB; // cards / raised surfaces
  muted: RGB; // secondary text, hairline UI
  line: RGB; // borders / dividers
  primary: RGB; // the brand's headline color — the main thing a customer swaps
  primaryInk: RGB; // text that sits on top of `primary`
  secondary: RGB; // supporting brand color
  accent: RGB; // energy / highlight moments
  sun: RGB; // warm gold (game accents)
  grape: RGB; // purple (game identity)
  tang: RGB; // warm orange (game identity)
  coral: RGB; // warm red/pink (game identity)
  success: RGB;
  danger: RGB;
  warning: RGB;
  info: RGB;
}

export interface BrandFonts {
  display: string; // CSS font-family stack for headlines
  body: string; // CSS font-family stack for body text
  googleUrl?: string; // optional <link href> that loads the two families
}

// Which token a wordmark segment is painted in. Kept to a fixed set so it maps to real
// Tailwind classes (the class strings must be literal for the content scanner).
export type WordmarkColor = "primary" | "secondary" | "accent" | "ink" | "sun" | "grape";

export interface WordmarkPart {
  text: string;
  color?: WordmarkColor;
}

export interface GameMeta {
  label: string; // display name on the game picker
  tagline: string; // one-line description under the name
  icon?: string; // optional emoji/glyph
}

export interface Brand {
  id: string;
  productName: string; // used for document.title and anywhere the product is named
  tagline: string; // subtitle under the wordmark (was "EL NIDO EDITION")
  logoUrl?: string; // uploaded wordmark image; when set it overrides the text wordmark
  faviconUrl?: string;
  colors: BrandColors;
  fonts: BrandFonts;
  wordmark: WordmarkPart[]; // text wordmark, rendered when logoUrl is absent
  games: Record<string, GameMeta>; // keyed by GameType ("feud" | "bingo" | "murder" | "trivia")
}

// The default neutral, premium canvas. Deliberately restrained: a slate-ink + off-white
// base with a single confident indigo primary, so a customer's own color + logo is what
// gives it personality. This is a placeholder brand — every field is meant to be replaced
// per customer; the product name "Playhouse" is a one-line change.
export const defaultBrand: Brand = {
  id: "default",
  productName: "Playhouse",
  tagline: "Party games for any crowd",
  colors: {
    ink: "28 25 23", // #1c1917 warm near-black (soft black)
    canvas: "250 248 244", // #faf8f4 warm ivory
    surface: "255 253 251", // #fffdfb warm white
    muted: "120 113 108", // #78716c warm grey
    line: "231 226 218", // #e7e2da warm hairline
    primary: "5 150 105", // #059669 deep emerald
    primaryInk: "255 255 255",
    secondary: "180 83 9", // #b45309 deep ochre (warm complement to emerald)
    accent: "234 88 12", // #ea580c orange (energy moments)
    sun: "234 179 8", // amber-500
    grape: "124 58 237", // violet-600
    tang: "234 88 12", // orange-600
    coral: "225 29 72", // rose-600
    success: "22 163 74", // green-600
    danger: "220 38 38", // red-600
    warning: "217 119 6", // amber-600
    info: "37 99 235", // blue-600
  },
  fonts: {
    display: '"Archivo", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
  },
  wordmark: [
    { text: "Play", color: "ink" },
    { text: "house", color: "primary" },
  ],
  games: {
    feud: { label: "Survey Showdown", tagline: "Top answers win", icon: "📊" },
    bingo: { label: "Bingo Night", tagline: "Draw a ball, do the dare", icon: "🎱" },
    murder: { label: "Murder Mystery", tagline: "Wink, kill, deduce", icon: "🔪" },
    trivia: { label: "Trivia", tagline: "3 rounds · A B C D", icon: "🧠" },
    taboo: { label: "Off Limits", tagline: "Describe it — watch your words", icon: "🚫" },
    headsup: { label: "Foreheads", tagline: "Guess the word on your head", icon: "🙈" },
    reverse: { label: "Full Cast", tagline: "The whole team acts it out", icon: "🎭" },
    monikers: { label: "Encore", tagline: "Same cards, three ways", icon: "🎬" },
    codenames: { label: "Cover Ops", tagline: "Crack the secret grid", icon: "🕵️" },
    justone: { label: "Solo Clue", tagline: "One word — but not the same one", icon: "💡" },
    ballpark: { label: "Ballpark", tagline: "Guess the number, bet on the best", icon: "🎯" },
    pictionary: { label: "Quick Draw", tagline: "Sketch it, they guess", icon: "✏️" },
    telestrations: { label: "Sketch Relay", tagline: "Draw, guess, repeat — telephone", icon: "🖍️" },
  },
};
