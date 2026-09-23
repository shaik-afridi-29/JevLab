export interface Trial {
  conf: number; // probability assigned to the predicted class, in [0,1]
  correct: boolean;
}

export interface Bin {
  lo: number;
  hi: number;
  n: number;
  acc: number;
  meanConf: number;
}

export function binTrials(trials: Trial[], bins = 10): Bin[] {
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({
    lo: i / bins,
    hi: (i + 1) / bins,
    n: 0,
    acc: 0,
    meanConf: 0,
  }));
  for (const t of trials) {
    const c = Math.min(1, Math.max(0, t.conf));
    const idx = Math.min(bins - 1, Math.floor(c * bins));
    const b = out[idx];
    b.n += 1;
    if (t.correct) b.acc += 1;
    b.meanConf += c;
  }
  for (const b of out) {
    if (b.n > 0) {
      b.acc /= b.n;
      b.meanConf /= b.n;
    }
  }
  return out;
}

/** ECE = Σ_bins |acc − conf| · (n/N). 0 is perfect; published Jev study ≈ 0.107. */
export function expectedCalibrationError(trials: Trial[], bins = 10): number {
  if (trials.length === 0) return 0;
  return binTrials(trials, bins).reduce(
    (ece, b) => (b.n > 0 ? ece + (Math.abs(b.acc - b.meanConf) * b.n) / trials.length : ece),
    0
  );
}
