export interface SummaryStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stddev: number;
  range: number;
}

export function summarize(values: number[]): SummaryStats | null {
  const xs = values.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;
  const median =
    count % 2 === 1
      ? sorted[(count - 1) / 2]
      : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
  const min = sorted[0];
  const max = sorted[count - 1];
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / count;
  return { count, mean, median, min, max, stddev: Math.sqrt(variance), range: max - min };
}

// Deterministic pseudo-random from a string seed (for demo mode).
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededValues(seed: string, n: number, center: number, spread: number): number[] {
  let h = hashSeed(seed) || 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const u = h / 4294967296;
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const v = h / 4294967296;
    const jitter = (u - 0.5) * 2 * spread + (v - 0.5) * spread;
    out.push(Math.min(0.99, Math.max(0.01, center + jitter)));
  }
  return out;
}
