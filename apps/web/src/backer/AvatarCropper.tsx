import { useCallback, useEffect, useRef, useState } from "react";

// A tiny self-contained avatar cropper: pick a photo, drag to reposition, zoom, and it emits a
// 256x256 JPEG data URL (square; shown round everywhere via border-radius). No external library —
// canvas math only, so it stays inside the artifact/CSP and adds no weight.

const VIEW = 260; // on-screen crop square (css px)
const OUT = 256; // exported size (px)

export function AvatarCropper({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasImg, setHasImg] = useState(false);
  const [zoom, setZoom] = useState(1);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Base "cover" scale so the image always fills the square at zoom 1.
  const baseScale = useCallback(() => {
    const img = imgRef.current;
    if (!img) return 1;
    return Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
  }, []);

  const clamp = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const s = baseScale() * zoom;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    const maxX = Math.max(0, (dw - VIEW) / 2);
    const maxY = Math.max(0, (dh - VIEW) / 2);
    offset.current.x = Math.max(-maxX, Math.min(maxX, offset.current.x));
    offset.current.y = Math.max(-maxY, Math.min(maxY, offset.current.y));
  }, [baseScale, zoom]);

  // Draw the round preview.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.save();
    ctx.beginPath();
    ctx.arc(VIEW / 2, VIEW / 2, VIEW / 2, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      const s = baseScale() * zoom;
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      ctx.drawImage(img, VIEW / 2 - dw / 2 + offset.current.x, VIEW / 2 - dh / 2 + offset.current.y, dw, dh);
    }
    ctx.restore();
  }, [baseScale, zoom]);

  // Render the exported square (no clip) and emit the data URL.
  const emit = useCallback(() => {
    const img = imgRef.current;
    if (!img) { onChange(null); return; }
    const c = document.createElement("canvas");
    c.width = OUT; c.height = OUT;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, OUT, OUT);
    const k = OUT / VIEW;
    const s = baseScale() * zoom * k;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, OUT / 2 - dw / 2 + offset.current.x * k, OUT / 2 - dh / 2 + offset.current.y * k, dw, dh);
    onChange(c.toDataURL("image/jpeg", 0.85));
  }, [baseScale, zoom, onChange]);

  useEffect(() => { if (hasImg) { clamp(); draw(); emit(); } }, [zoom, hasImg, clamp, draw, emit]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        offset.current = { x: 0, y: 0 };
        setZoom(1);
        setHasImg(true);
        // draw/emit run via the effect once hasImg flips, but force once for zoom already 1:
        requestAnimationFrame(() => { clamp(); draw(); emit(); });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!hasImg) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    offset.current.x += e.clientX - drag.current.x;
    offset.current.y += e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    clamp();
    draw();
  }
  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    emit();
  }

  function clearImg() {
    imgRef.current = null;
    setHasImg(false);
    setZoom(1);
    offset.current = { x: 0, y: 0 };
    if (fileInput.current) fileInput.current.value = "";
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative touch-none select-none rounded-full border-2 border-primary bg-canvas shadow-inner"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <canvas ref={canvasRef} style={{ width: VIEW, height: VIEW, cursor: hasImg ? "grab" : "default", borderRadius: "9999px" }} />
        {!hasImg && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
            <span className="text-sm font-semibold text-muted">Your face goes here.<br />Upload a photo to start.</span>
          </div>
        )}
      </div>

      <input ref={fileInput} type="file" accept="image/*" onChange={pickFile} className="hidden" />

      {hasImg ? (
        <div className="flex w-full max-w-[280px] flex-col items-center gap-2">
          <label className="flex w-full items-center gap-2 text-xs font-semibold text-muted">
            <span aria-hidden>🔍</span>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[rgb(var(--c-primary))]"
              aria-label="Zoom"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInput.current?.click()} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink transition hover:border-primary">
              Change photo
            </button>
            <button type="button" onClick={clearImg} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-bold text-muted transition hover:text-ink">
              Remove
            </button>
          </div>
          <p className="text-[11px] text-muted">Drag the photo to reposition · slide to zoom</p>
        </div>
      ) : (
        <button type="button" onClick={() => fileInput.current?.click()} className="rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-2.5 font-display text-base font-extrabold text-white transition hover:-translate-y-0.5 active:scale-95">
          Upload photo
        </button>
      )}
    </div>
  );
}
