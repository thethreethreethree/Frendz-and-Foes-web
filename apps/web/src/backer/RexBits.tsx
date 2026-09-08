import { useState } from "react";

// Rex's round portrait + a speech bubble, shared by the club sign-up and the sorting flow so Rex
// looks and speaks the same everywhere. Falls back to an emoji if the cutout art 404s.

export function RexFace({ size = 56 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  const dim = { width: size, height: size } as const;
  if (!ok) return <span style={dim} className="grid shrink-0 place-items-center rounded-full border-2 border-primary bg-surface text-2xl">🦁</span>;
  return (
    <span style={dim} className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-gradient-to-br from-primary to-accent">
      <img src="/crew/rex-cutout.png" alt="Rex" style={{ width: size - 4, height: size - 4 }} className="object-cover" onError={() => setOk(false)} />
    </span>
  );
}

export function RexSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3">
      <RexFace />
      <div className="relative max-w-md rounded-2xl rounded-bl-sm border border-primary/50 bg-surface/90 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">Rex · your zookeeper</div>
        <div className="mt-1 font-display text-lg font-bold leading-snug text-ink" style={{ textWrap: "balance" }}>{children}</div>
      </div>
    </div>
  );
}
