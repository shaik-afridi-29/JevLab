/** Confidence measures computed from a probability distribution. */

export function choiceConfidence(probs: number[]): number {
  const n = probs.length;
  if (n < 2) return 1;
  const peak = Math.max(...probs.map((p) => Math.min(1, Math.max(0, p))));
  return Math.min(1, Math.max(0, (n * peak - 1) / (n - 1)));
}

/** Top-1 minus top-2: how contested the win is. */
export function margin(probs: number[]): number {
  if (probs.length === 0) return 0;
  const sorted = [...probs].sort((a, b) => b - a);
  if (sorted.length === 1) return sorted[0];
  return Math.max(0, sorted[0] - sorted[1]);
}

/** Shannon entropy in bits: 0 = certain, log2(n) = uniform. */
export function entropyBits(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return Math.max(0, h);
}

export type MeasureId = "typesafe" | "margin" | "certainty";

export function applyMeasure(id: MeasureId, probs: number[]): number {
  if (id === "margin") return margin(probs);
  if (id === "certainty") {
    const n = probs.length;
    if (n < 2) return 1;
    return 1 - entropyBits(probs) / Math.log2(n);
  }
  return choiceConfidence(probs);
}

/** Docs-explorer behavior: set slider i, rescale the others to keep total 100. */
export function normalizeSliders(current: number[], index: number, value: number): number[] {
  const next = [...current];
  next[index] = value;
  const others = next.map((_, i) => i).filter((i) => i !== index);
  const remaining = 100 - value;
  const prevTotal = others.reduce((a, i) => a + current[i], 0);
  if (others.length === 0) return [100];
  others.forEach((i, k) => {
    next[i] = prevTotal > 0 ? (remaining * current[i]) / prevTotal : remaining / others.length;
    if (k === others.length - 1) {
      // absorb float dust so the total is exactly 100
      const total = next.reduce((a, b) => a + b, 0);
      next[i] += 100 - total;
    }
  });
  return next;
}
