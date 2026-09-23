import { describe, it, expect } from "vitest";
import { judgeCount, judgeNegationSum, judgeNoulVsChoice, PRESETS } from "./jaggedness";

describe("jaggedness judges", () => {
  it("count judge compares code tally to ground truth", () => {
    // 3 fruits among 8 items; model flags exactly those 3
    const probs = [0.02, 0.97, 0.01, 0.95, 0.03, 0.04, 0.91, 0.05];
    expect(judgeCount(probs, 3)).toBe("holds");
    expect(judgeCount([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9], 3)).toBe("breaks");
  });
  it("negation-sum judge flags non-complementary pairs", () => {
    expect(judgeNegationSum(0.72, 0.47)).toBe("breaks"); // published 1.19
    expect(judgeNegationSum(0.8, 0.21)).toBe("holds");
  });
  it("noul-vs-choice judge flags the published disagreement", () => {
    expect(judgeNoulVsChoice(0.22, 0.01)).toBe("breaks");
    expect(judgeNoulVsChoice(0.9, 0.88)).toBe("holds");
  });
  it("covers all 9 official failure modes", () => {
    expect(PRESETS).toHaveLength(9);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(9);
  });
});
