import type { JevApiRequest, JevApiResponse, JevAnswer } from "@/lib/jev/types";
import { hashSeed } from "@/lib/stats";

/** Deterministic mock Jev — clearly labeled DEMO DATA, never mistaken for live output. */
export function mockJevResponse(req: JevApiRequest): JevApiResponse {
  const answers: Record<string, JevAnswer> = {};
  for (const [key, q] of Object.entries(req.questions)) {
    const seedBase = `${JSON.stringify(req.state)}|${key}|${q.instructions}`;
    const h = hashSeed(seedBase);
    const unit = (h % 1000) / 1000;
    if (q.type === "noul") {
      // Center demo nouls in an interesting mid-high band so gauges look alive.
      const noul = 0.25 + unit * 0.7;
      answers[key] = { type: "noul", noul: round3(noul) };
    } else if (q.type === "choice") {
      const options = Object.keys(q.criteria);
      const weights = options.map((opt, i) => 1 + ((hashSeed(seedBase + opt) + i * 37) % 100) / 40);
      const total = weights.reduce((a, b) => a + b, 0);
      const probabilities: Record<string, number> = {};
      let best = options[0];
      let bestP = -1;
      options.forEach((opt, i) => {
        const p = round3(weights[i] / total);
        probabilities[opt] = p;
        if (p > bestP) {
          bestP = p;
          best = opt;
        }
      });
      const confidence = round3(0.5 + bestP / 2);
      answers[key] = { type: "choice", choice: best, probabilities, confidence };
    } else {
      const levels = q.criteria;
      const peak = h % levels.length;
      const probs: Record<string, number> = {};
      let total = 0;
      levels.forEach((_, i) => {
        const w = Math.exp(-Math.abs(i - peak) * 1.1) * (0.7 + ((hashSeed(seedBase + i) % 100) / 200));
        probs[String(i)] = w;
        total += w;
      });
      let score = 0;
      for (const [k, w] of Object.entries(probs)) {
        const p = w / total;
        probs[k] = round3(p);
        score += Number(k) * p;
      }
      const legend: Record<string, string> = {};
      levels.forEach((lvl, i) => {
        legend[String(i)] = lvl;
      });
      const confidence = round3(0.6 + (0.35 * Math.max(...Object.values(probs)) || 0));
      answers[key] = { type: "score", score: round3(score), legend, probabilities: probs, confidence };
    }
  }
  return {
    model: "demo-jev-mock",
    answers,
    usage: { input_tokens: 0, output_tokens: 0, cost_usd: 0, credits_remaining_usd: 0 },
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
