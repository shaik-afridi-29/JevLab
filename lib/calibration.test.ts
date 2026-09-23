import { describe, it, expect } from "vitest";
import { binTrials, expectedCalibrationError } from "./calibration";

describe("binTrials", () => {
  it("bins by confidence of the predicted class", () => {
    const bins = binTrials(
      [
        { conf: 0.9, correct: true },
        { conf: 0.85, correct: false },
        { conf: 0.6, correct: true },
      ],
      5
    );
    expect(bins).toHaveLength(5);
    const top = bins[4];
    expect(top.n).toBe(2);
    expect(top.acc).toBeCloseTo(0.5, 6);
    expect(top.meanConf).toBeCloseTo(0.875, 6);
  });
  it("handles empty input", () => {
    expect(binTrials([], 5).every((b) => b.n === 0)).toBe(true);
  });
});

describe("expectedCalibrationError", () => {
  it("is 0 for a perfectly calibrated set", () => {
    // 9/10 correct at 0.9 confidence → acc == conf in the bin → ECE 0
    const exact = Array.from({ length: 9 }, () => ({ conf: 0.9, correct: true as boolean })).concat([
      { conf: 0.9, correct: false as boolean },
    ]);
    expect(expectedCalibrationError(exact, 10)).toBeCloseTo(0, 6);
  });
  it("penalizes overconfidence", () => {
    const trials = Array.from({ length: 10 }, () => ({ conf: 0.9, correct: false as boolean }));
    expect(expectedCalibrationError(trials, 5)).toBeCloseTo(0.9, 6);
  });
});
