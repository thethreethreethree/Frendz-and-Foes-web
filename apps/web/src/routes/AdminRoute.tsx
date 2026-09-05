import { useEffect, useState } from "react";
import { type Brand, type WordmarkColor, defaultBrand } from "../brand/brand";

// Self-serve brand admin (Phase 2, passcode-gated). Edit a tenant's colors/fonts/name/games
// and save to the server (SQLite). The live site loads a saved brand by ?brand=<slug>.
//
// This is operator UI, deliberately brand-INDEPENDENT: its chrome uses fixed neutral grays,
// never the brand tokens, so it looks the same whatever brand you're editing. Only the
// PREVIEW panel reflects the edited brand (via scoped CSS variables).

// ---- color helpers: Brand stores "R G B" channels; <input type=color> speaks hex ----
function channelsToHex(ch: string): string {
  const [r, g, b] = ch.trim().split(/\s+/).map((n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0)));
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function hexToChannels(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 0 0";
  const int = parseInt(m[1], 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

const FONT_PRESETS: Record<string, Brand["fonts"] & { label: string }> = {
  archivo: { label: "Archivo", display: '"Archivo", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', googleUrl: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
  sora: { label: "Sora", display: '"Sora", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', googleUrl: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
  fraunces: { label: "Fraunces", display: '"Fraunces", Georgia, serif', body: '"Inter", system-ui, sans-serif', googleUrl: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
  space: { label: "Space Grotesk", display: '"Space Grotesk", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', googleUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
};

const COLOR_FIELDS: { key: keyof Brand["colors"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "canvas", label: "Canvas" },
  { key: "ink", label: "Ink (text)" },
  { key: "surface", label: "Surface" },
  { key: "muted", label: "Muted" },
  { key: "line", label: "Line" },
];
const WM_COLORS: WordmarkColor[] = ["ink", "primary", "secondary", "accent", "sun", "grape"];
const GAME_KEYS = ["feud", "bingo", "murder", "trivia", "taboo", "headsup", "reverse", "monikers"] as const;

const clone = (b: Brand): Brand => JSON.parse(JSON.stringify(b));

export function AdminRoute() {
  const [passcode, setPasscode] = useState(sessionStorage.getItem("ff-admin-pass") || "");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [slug, setSlug] = useState("default");
  const [brand, setBrand] = useState<Brand>(clone(defaultBrand));
  const [status, setStatus] = useState("");

  // Load the preview's fonts so the chosen pairing actually renders in the preview panel.
  useEffect(() => {
    if (!brand.fonts.googleUrl) return;
    let link = document.getElementById("admin-fonts") as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.id = "admin-fonts"; link.rel = "stylesheet"; document.head.appendChild(link); }
    if (link.href !== brand.fonts.googleUrl) link.href = brand.fonts.googleUrl;
  }, [brand.fonts.googleUrl]);

  async function unlock() {
    setAuthErr("");
    try {
      const res = await fetch("/api/brands", { headers: { "x-admin-passcode": passcode } });
      if (res.status === 401) return setAuthErr("Wrong passcode.");
      if (res.status === 503) return setAuthErr("Admin is disabled on the server (no passcode configured).");
      if (!res.ok) return setAuthErr("Server error.");
      sessionStorage.setItem("ff-admin-pass", passcode);
      setAuthed(true);
      loadBrand("default");
    } catch { setAuthErr("Could not reach the server."); }
  }

  async function loadBrand(s: string) {
    setStatus("");
    try {
      const res = await fetch(`/api/brand/${s}`);
      if (res.ok) { setBrand(await res.json()); setStatus(`Loaded "${s}".`); }
      else { setBrand({ ...clone(defaultBrand), id: s }); setStatus(`No saved brand "${s}" yet — starting from the default template.`); }
    } catch { setStatus("Could not load."); }
  }

  async function save() {
    setStatus("");
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug)) return setStatus("Slug must be lowercase letters, numbers or dashes.");
    const body: Brand = { ...brand, id: slug, wordmark: brand.wordmark.filter((p) => p.text.trim()) };
    try {
      const res = await fetch(`/api/brand/${slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStatus(`Saved. Live at ?brand=${slug}`);
      else setStatus(`Save failed: ${data.error || res.status}`);
    } catch { setStatus("Save failed: could not reach the server."); }
  }

  const setColor = (key: keyof Brand["colors"], hex: string) =>
    setBrand((b) => ({ ...b, colors: { ...b.colors, [key]: hexToChannels(hex) } }));
  const setWM = (i: number, field: "text" | "color", val: string) =>
    setBrand((b) => { const wm = clone(b).wordmark; while (wm.length < 2) wm.push({ text: "", color: "ink" }); (wm[i] as any)[field] = val; return { ...b, wordmark: wm }; });
  const setGame = (key: string, field: "label" | "tagline", val: string) =>
    setBrand((b) => ({ ...b, games: { ...b.games, [key]: { ...b.games[key], [field]: val } } }));

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto mt-24 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Brand admin</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the admin passcode to manage brands.</p>
          <input
            type="password" value={passcode} autoFocus
            onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()}
            placeholder="Passcode"
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
          {authErr && <p className="mt-2 text-sm text-red-600">{authErr}</p>}
          <button onClick={unlock} className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Unlock</button>
        </div>
      </Shell>
    );
  }

  const wm0 = brand.wordmark[0] ?? { text: "", color: "ink" as WordmarkColor };
  const wm1 = brand.wordmark[1] ?? { text: "", color: "primary" as WordmarkColor };

  return (
    <Shell>
      <div className="mx-auto max-w-6xl">
        {/* action bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          <h1 className="mr-2 text-lg font-semibold text-gray-900">Brand admin</h1>
          <label className="text-xs font-mono uppercase tracking-wide text-gray-500">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="w-40 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm" />
          <button onClick={() => loadBrand(slug)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Load</button>
          <button onClick={save} className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800">Save</button>
          {status && <span className="ml-1 text-sm text-gray-600">{status}</span>}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* EDITOR */}
          <div className="space-y-6">
            <Group title="Identity">
              <Field label="Product name"><input value={brand.productName} onChange={(e) => setBrand({ ...brand, productName: e.target.value })} className={inp} /></Field>
              <Field label="Tagline"><input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} className={inp} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wordmark part 1">
                  <div className="flex gap-2">
                    <input value={wm0.text} onChange={(e) => setWM(0, "text", e.target.value)} className={inp} />
                    <select value={wm0.color} onChange={(e) => setWM(0, "color", e.target.value)} className={sel}>{WM_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                </Field>
                <Field label="Wordmark part 2">
                  <div className="flex gap-2">
                    <input value={wm1.text} onChange={(e) => setWM(1, "text", e.target.value)} className={inp} />
                    <select value={wm1.color} onChange={(e) => setWM(1, "color", e.target.value)} className={sel}>{WM_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                </Field>
              </div>
            </Group>

            <Group title="Palette">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="color" value={channelsToHex(brand.colors[key])} onChange={(e) => setColor(key, e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-transparent p-0.5" />
                    <span className="text-xs text-gray-600">{label}</span>
                  </label>
                ))}
              </div>
            </Group>

            <Group title="Type pairing">
              <div className="flex flex-wrap gap-2">
                {Object.entries(FONT_PRESETS).map(([key, f]) => {
                  const on = brand.fonts.display === f.display;
                  return <button key={key} onClick={() => setBrand({ ...brand, fonts: { display: f.display, body: f.body, googleUrl: f.googleUrl } })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 hover:bg-gray-50"}`}>{f.label}</button>;
                })}
              </div>
            </Group>

            <Group title="Game names">
              <div className="space-y-2">
                {GAME_KEYS.map((k) => (
                  <div key={k} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
                    <span className="text-xs font-mono uppercase text-gray-500">{k}</span>
                    <input value={brand.games[k]?.label ?? ""} onChange={(e) => setGame(k, "label", e.target.value)} placeholder="Name" className={inp} />
                    <input value={brand.games[k]?.tagline ?? ""} onChange={(e) => setGame(k, "tagline", e.target.value)} placeholder="Tagline" className={inp} />
                  </div>
                ))}
              </div>
            </Group>
          </div>

          {/* PREVIEW */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-2 text-xs font-mono uppercase tracking-wide text-gray-500">Live preview</div>
            <BrandPreview brand={brand} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

const inp = "w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-gray-900";
const sel = "rounded-lg border border-gray-300 px-2 py-1.5 text-sm";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full overflow-auto bg-gray-100 p-6 text-gray-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{children}</div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-mono font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-3 block"><span className="mb-1 block text-xs text-gray-500">{label}</span>{children}</label>;
}

// Scoped preview: sets the brand's tokens as CSS variables on its own container so children
// resolve them, without touching the global (live-site) theme.
function BrandPreview({ brand }: { brand: Brand }) {
  const c = brand.colors;
  const vars = {
    "--c-primary": `rgb(${c.primary})`, "--c-secondary": `rgb(${c.secondary})`, "--c-accent": `rgb(${c.accent})`,
    "--c-canvas": `rgb(${c.canvas})`, "--c-ink": `rgb(${c.ink})`, "--c-surface": `rgb(${c.surface})`,
    "--c-muted": `rgb(${c.muted})`, "--c-line": `rgb(${c.line})`, "--c-sun": `rgb(${c.sun})`, "--c-grape": `rgb(${c.grape})`,
    "--c-primary-ink": `rgb(${c.primaryInk})`, "--font-display": brand.fonts.display, "--font-body": brand.fonts.body,
    background: "var(--c-canvas)", color: "var(--c-ink)", fontFamily: "var(--font-body)",
  } as React.CSSProperties;
  const wmColor = (role?: WordmarkColor) => `var(--c-${role ?? "ink"})`;
  const disp: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "-0.02em" };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-300 shadow-md" style={vars}>
      {/* home */}
      <div className="flex flex-col items-center px-6 py-8 text-center"
        style={{ backgroundImage: "radial-gradient(600px 300px at 50% -20%, color-mix(in srgb, var(--c-primary) 14%, transparent), transparent 60%)" }}>
        <div style={{ ...disp, fontSize: 40, lineHeight: 1 }}>
          {(brand.wordmark.length ? brand.wordmark : [{ text: brand.productName }]).map((p, i) => <span key={i} style={{ color: wmColor(p.color) }}>{p.text}</span>)}
        </div>
        <div style={{ color: "var(--c-muted)", fontWeight: 500, marginTop: 8, fontSize: 14 }}>{brand.tagline}</div>
        <div className="mt-5 flex w-full max-w-[240px] flex-col gap-2">
          <span style={{ ...disp, background: "var(--c-primary)", color: "var(--c-primary-ink)", borderRadius: 12, padding: "10px 16px", fontSize: 15 }}>Open Display</span>
          <span style={{ ...disp, background: "color-mix(in srgb, var(--c-secondary) 14%, var(--c-surface))", color: "var(--c-ink)", border: "1px solid color-mix(in srgb, var(--c-secondary) 32%, transparent)", borderRadius: 12, padding: "10px 16px", fontSize: 15 }}>Host Controller</span>
        </div>
      </div>
      {/* game cards */}
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-6">
        {GAME_KEYS.map((k) => {
          const g = brand.games[k]; if (!g) return null;
          return (
            <div key={k} style={{ background: "var(--c-surface)", border: "1px solid var(--c-line)", borderRadius: 12, padding: "12px 10px", textAlign: "center", boxShadow: "0 10px 24px -18px rgba(0,0,0,.5)" }}>
              <div style={{ fontSize: 20 }}>{g.icon || "•"}</div>
              <div style={{ ...disp, fontSize: 14, marginTop: 6 }}>{g.label}</div>
              <div style={{ color: "var(--c-muted)", fontSize: 11, marginTop: 2 }}>{g.tagline}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
