import { type Brand, defaultBrand } from "./brand";

// Runtime application of a Brand: this is what makes the palette/fonts/name swappable
// without a rebuild. It writes CSS variables onto <html> (which Tailwind tokens resolve
// against), swaps the font <link>, and sets the document title + favicon.
//
// Called once at bootstrap (main.tsx) and again whenever the brand changes (the Phase-2
// admin's live preview will call setBrand() on every edit).

let current: Brand = defaultBrand;

export const getBrand = (): Brand => current;

// Maps the Brand color fields onto the --c-* variables that tailwind.config.js consumes.
function applyColors(b: Brand) {
  const root = document.documentElement;
  const c = b.colors;
  const vars: Record<string, string> = {
    "--c-ink": c.ink,
    "--c-canvas": c.canvas,
    "--c-surface": c.surface,
    "--c-muted": c.muted,
    "--c-line": c.line,
    "--c-primary": c.primary,
    "--c-primary-ink": c.primaryInk,
    "--c-secondary": c.secondary,
    "--c-accent": c.accent,
    "--c-sun": c.sun,
    "--c-grape": c.grape,
    "--c-tang": c.tang,
    "--c-coral": c.coral,
    "--c-success": c.success,
    "--c-danger": c.danger,
    "--c-warning": c.warning,
    "--c-info": c.info,
    "--font-display": b.fonts.display,
    "--font-body": b.fonts.body,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

function applyFonts(b: Brand) {
  if (!b.fonts.googleUrl) return;
  let link = document.getElementById("brand-fonts") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "brand-fonts";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== b.fonts.googleUrl) link.href = b.fonts.googleUrl;
}

function applyMeta(b: Brand) {
  document.title = b.productName;
  if (b.faviconUrl) {
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = b.faviconUrl;
  }
}

// Apply a brand to the live document. Safe to call repeatedly (idempotent per brand).
export function applyBrand(b: Brand) {
  current = b;
  applyColors(b);
  applyFonts(b);
  applyMeta(b);
}

// Swap the active brand at runtime (admin preview, tenant switch). Components that read
// getBrand() at render will reflect it on their next render.
export function setBrand(b: Brand) {
  applyBrand(b);
}
