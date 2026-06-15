// Lightweight fuzzy matching so the host can type what a team *said* and instantly see which
// board answer it's closest to ("flip flops" ≈ "sandals" won't match, but "flipflop" ≈
// "Flip flops" will). Pure + dependency-free.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** 0..1 similarity between two phrases. */
export function similarity(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (q === t) return 1;

  // Token overlap rewards partial/contained matches and word order changes.
  const qTokens = new Set(q.split(" "));
  const tTokens = new Set(t.split(" "));
  let overlap = 0;
  for (const tok of qTokens) if (tTokens.has(tok)) overlap++;
  const tokenScore = overlap / Math.max(qTokens.size, tTokens.size);

  const contains = t.includes(q) || q.includes(t) ? 0.85 : 0;

  const dist = levenshtein(q, t);
  const editScore = 1 - dist / Math.max(q.length, t.length);

  return Math.max(tokenScore, contains, editScore);
}

export interface Match<T> {
  item: T;
  score: number;
}

/** Best-matching item above a threshold, or null. */
export function bestMatch<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold = 0.45,
): Match<T> | null {
  let best: Match<T> | null = null;
  for (const item of items) {
    const score = similarity(query, getText(item));
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= threshold ? best : null;
}
