import { useState } from "react";

// Wordmark recreated as three beveled sticker badges (blue FRENDZ / gold AND / orange FOES),
// matching the brand art. Size is driven by the parent's font-size (e.g. text-6xl).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <Badge className="bg-gradient-to-b from-sky-400 to-blue-600 text-white">FRENDZ</Badge>
      <Badge className="bg-gradient-to-b from-amber-300 to-amber-500 text-ink">AND</Badge>
      <Badge className="bg-gradient-to-b from-orange-400 to-orange-600 text-white">FOES</Badge>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`ff-title inline-block rounded-xl border-[3px] border-ink px-3 py-1 leading-none shadow-sticker ${className}`}
    >
      {children}
    </span>
  );
}

// Brain + lightbulb hero. Uses /brand/brain.png if present; if the file is missing it simply
// renders nothing (the logo carries the screen), so the app never shows a broken image.
export function BrainHero({ className = "" }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src="/brand/brain.png"
      alt="Frendz and Foes"
      onError={() => setOk(false)}
      className={`select-none object-contain drop-shadow-xl ${className}`}
    />
  );
}
