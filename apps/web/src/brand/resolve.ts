import { type Brand } from "./brand";

// Which brand should this page load? Resolution order:
//   1. ?brand=<slug>  — works today on the IP:port site (no domain needed)
//   2. subdomain      — acme.example.com -> "acme" (once a domain + wildcard DNS exist)
//   3. "default"
export function resolveSlug(): string {
  const q = new URLSearchParams(location.search).get("brand");
  if (q && /^[a-z0-9][a-z0-9-]{0,39}$/.test(q)) return q;
  const parts = location.hostname.split(".");
  if (parts.length > 2 && !/^\d+$/.test(parts[0]) && parts[0] !== "www") return parts[0];
  return "default";
}

// Fetch a stored brand from the server. Returns null on 404 / error / timeout, so the caller
// falls back to the built-in default brand — a slow or missing API never blocks the app.
export async function fetchBrand(slug: string): Promise<Brand | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`/api/brand/${slug}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as Brand;
  } catch {
    return null;
  }
}
