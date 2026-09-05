import { useEffect, useRef } from "react";
import { getSocket, emitPulse, type Pulse } from "../net/socket";

// Points are normalized 0..1 so any canvas size renders the same drawing. dpr-scaled for crispness.
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

function fitCanvas(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * dpr()));
  c.height = Math.max(1, Math.round(r.height * dpr()));
}

function paintStroke(g: CanvasRenderingContext2D, W: number, H: number, points: number[], color: string, width: number) {
  if (points.length < 2) return;
  g.strokeStyle = color;
  g.lineWidth = width * dpr();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(points[0] * W, points[1] * H);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i] * W, points[i + 1] * H);
  g.stroke();
}

// DRAWER canvas (host): captures pointer input, draws locally, and streams strokes to the room.
// A changing `resetKey` (new word/turn) remounts it, clearing the surface.
export function DrawCanvas({ room, color, width }: { room: string; color: string; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const cur = useRef<number[]>([]);
  const lastEmit = useRef(0);

  useEffect(() => {
    const c = ref.current!;
    const resize = () => fitCanvas(c);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    cur.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pos(e);
    cur.current.push(p[0], p[1]);
    const c = ref.current!;
    const g = c.getContext("2d")!;
    paintStroke(g, c.width, c.height, cur.current.slice(-4), color, width); // draw the latest segment
    const now = Date.now();
    if (now - lastEmit.current > 40) { lastEmit.current = now; emitPulse(room, { kind: "draw", points: [...cur.current], color, width, live: true }); }
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emitPulse(room, { kind: "draw", points: [...cur.current], color, width, live: false });
    cur.current = [];
  };

  return (
    <canvas
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className="h-full w-full rounded-xl bg-white"
      style={{ touchAction: "none", border: "1px solid rgb(var(--c-line))" }}
    />
  );
}

// VIEWER canvas (display): renders strokes streamed over pulses, imperatively (no React re-render
// per point). Keeps committed strokes + the in-progress live preview.
export function ViewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const committed = useRef<{ points: number[]; color: string; width: number }[]>([]);
  const live = useRef<{ points: number[]; color: string; width: number } | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext("2d")!;
    const redraw = () => {
      g.clearRect(0, 0, c.width, c.height);
      for (const s of committed.current) paintStroke(g, c.width, c.height, s.points, s.color, s.width);
      if (live.current) paintStroke(g, c.width, c.height, live.current.points, live.current.color, live.current.width);
    };
    const resize = () => { fitCanvas(c); redraw(); };
    resize();
    window.addEventListener("resize", resize);

    const s = getSocket();
    const onPulse = (p: Pulse) => {
      if (p.kind === "draw") {
        const stroke = { points: p.points, color: p.color, width: p.width };
        if (p.live) live.current = stroke;
        else { committed.current.push(stroke); live.current = null; }
        redraw();
      } else if (p.kind === "clear") {
        committed.current = [];
        live.current = null;
        redraw();
      }
    };
    s.on("pulse", onPulse);
    return () => { window.removeEventListener("resize", resize); s.off("pulse", onPulse); };
  }, []);

  return <canvas ref={ref} className="h-full w-full rounded-2xl bg-white" style={{ border: "1px solid rgb(var(--c-line))" }} />;
}
