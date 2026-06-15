// Shared metadata for the three buzz-in slots, per the game rules.
export const SLOT_META = [
  { label: "1ST", name: "Steady Green", dot: "bg-buzz-green", ring: "ring-buzz-green" },
  {
    label: "2ND",
    name: "Flashing Green",
    dot: "bg-buzz-green animate-flashGreen",
    ring: "ring-buzz-green",
  },
  { label: "3RD", name: "Blue", dot: "bg-buzz-blue", ring: "ring-buzz-blue" },
] as const;
