import type { CSSProperties } from "react";

// Brand doodle icons as navy-outlined SVGs (paper plane, gears, lightbulb, arrow) plus a "?".
// Used only as subtle, slow-floating accents on the title screen and round/bonus banners.

type IconProps = { className?: string; style?: CSSProperties };

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PaperPlane({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...line}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9 22 2Z" />
    </svg>
  );
}

export function Lightbulb({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...line}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function Arrow({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...line}>
      <path d="M3 17c5 4 13 3 17-4" />
      <path d="M16 13l4 0 0 4" />
    </svg>
  );
}

export function Gears({ className, style }: IconProps) {
  const teeth = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    teeth.push(
      <line
        key={i}
        x1={12 + 6.5 * Math.cos(a)}
        y1={12 + 6.5 * Math.sin(a)}
        x2={12 + 9.5 * Math.cos(a)}
        y2={12 + 9.5 * Math.sin(a)}
      />,
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...line}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.5" />
      {teeth}
    </svg>
  );
}

// Scatter of slowly-bobbing accents covering the parent (which must be `relative`).
export function FloatingAccents({ tone = "ink" }: { tone?: "ink" | "light" }) {
  const color = tone === "light" ? "text-white/25" : "text-ink/25";
  const f = (delay: number): CSSProperties => ({ animationDelay: `${delay}s` });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${color}`}>
      <PaperPlane className="absolute left-[7%] top-[16%] h-12 w-12 animate-floaty" style={f(0)} />
      <Lightbulb className="absolute right-[10%] top-[14%] h-12 w-12 animate-floaty" style={f(0.7)} />
      <Gears className="absolute right-[8%] bottom-[14%] h-16 w-16 animate-floaty" style={f(1.3)} />
      <Arrow className="absolute left-[11%] bottom-[18%] h-12 w-12 animate-floaty" style={f(1.9)} />
      <span
        className="ff-title absolute left-[48%] top-[10%] animate-floaty text-5xl"
        style={f(1)}
      >
        ?
      </span>
    </div>
  );
}
