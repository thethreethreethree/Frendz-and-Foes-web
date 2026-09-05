import { useState } from "react";
import { getBrand } from "../brand/theme";
import type { WordmarkColor, WordmarkPart } from "../brand/brand";

// Wordmark is now brand-driven: it renders the active brand's text wordmark (each segment
// painted in a themeable token) or, when the brand supplies a logo image, that image.
// Size is driven by the parent's font-size (e.g. text-6xl).

// Literal class map so Tailwind's content scanner sees every class it must generate.
const WORDMARK_COLOR: Record<WordmarkColor, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  ink: "text-ink",
  sun: "text-sun",
  grape: "text-grape",
};

function Wordmark({ parts, className = "" }: { parts: WordmarkPart[]; className?: string }) {
  return (
    <div className={`ff-title inline-flex flex-wrap items-baseline justify-center ${className}`}>
      {parts.map((p, i) => (
        <span key={i} className={WORDMARK_COLOR[p.color ?? "ink"]}>
          {p.text}
        </span>
      ))}
    </div>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  const brand = getBrand();
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.productName}
        className={`select-none object-contain ${className}`}
      />
    );
  }
  return <Wordmark parts={brand.wordmark} className={className} />;
}

// Per-game wordmark used on the Bingo card. Renders the brand's Bingo label in the display
// font, two-tone, so it themes with everything else.
export function BingoLogo({ className = "" }: { className?: string }) {
  const brand = getBrand();
  const label = brand.games.bingo?.label ?? "Bingo Night";
  const words = label.split(" ");
  const parts: WordmarkPart[] = words.map((w, i) => ({
    text: (i === 0 ? "" : " ") + w,
    color: i === words.length - 1 ? "primary" : "ink",
  }));
  return <Wordmark parts={parts} className={className} />;
}

// Optional hero/logo image. Renders the brand's logo image when one is set; otherwise
// renders nothing (the wordmark carries the screen), so the app never shows a broken image.
export function BrainHero({ className = "" }: { className?: string }) {
  const brand = getBrand();
  const [ok, setOk] = useState(true);
  if (!brand.logoUrl || !ok) return null;
  return (
    <img
      src={brand.logoUrl}
      alt={brand.productName}
      onError={() => setOk(false)}
      className={`select-none object-contain drop-shadow-xl ${className}`}
    />
  );
}
