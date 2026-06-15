import type { ReactNode } from "react";

// Small shared building blocks for the controller, tuned for thumb-friendly mobile taps.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-ink/10 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-ink/50">{title}</h2>
      {children}
    </section>
  );
}

export function CtrlButton({
  children,
  onClick,
  disabled,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "ink" | "pink" | "teal" | "sun" | "grape" | "tang" | "green";
  className?: string;
}) {
  const tones: Record<string, string> = {
    ink: "bg-ink text-white",
    pink: "bg-pink text-white",
    teal: "bg-teal text-ink",
    sun: "bg-sun text-ink",
    grape: "bg-grape text-white",
    tang: "bg-tang text-white",
    green: "bg-buzz-green text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`select-none rounded-lg px-3 py-2 text-sm font-bold shadow-pop active:translate-y-0.5 disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
