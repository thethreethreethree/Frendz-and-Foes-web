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
  // Dark, gradient-forward default (party-app energy). Every color still flows through the theme
  // engine, so a brand can recolor or go light via the admin.
  colors: {
    ink: "244 247 255", // #f4f7ff near-white text
    canvas: "11 15 26", // #0b0f1a near-black with a blue bias
    surface: "22 28 43", // #161c2b elevated dark card
    muted: "148 163 184", // #94a3b8 slate
    line: "42 49 66", // #2a3142 dark hairline
    primary: "139 92 246", // #8b5cf6 vivid violet
    primaryInk: "255 255 255",
    secondary: "20 184 166", // #14b8a6 teal
    accent: "236 72 153", // #ec4899 pink
    sun: "245 158 11", // amber-500
    grape: "167 139 250", // violet-400
    tang: "251 146 60", // orange-400
    coral: "244 114 182", // pink-400
    success: "34 197 94", // green-500
    danger: "239 68 68", // red-500
    warning: "245 158 11", // amber-500
    info: "56 189 248", // sky-400
  },
  fonts: {
    display: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
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
    afterdark: { label: "After Dark", tagline: "Fill the blank — 18+", icon: "🌙" },
  },
};
