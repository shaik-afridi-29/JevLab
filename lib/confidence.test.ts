import { describe, it, expect } from "vitest";
import { choiceConfidence, margin, entropyBits, normalizeSliders } from "./confidence";

describe("choiceConfidence (n·peak−1)/(n−1)", () => {
  it("matches the docs example: 0.84 over 3 options → ~0.76", () => {
    // (3 × 0.84 − 1) / 2 = 0.76
    expect(choiceConfidence([0.84, 0.159, 0.001])).toBeCloseTo(0.76, 2);
  });
  it("is 1 when concentrated, 0 when uniform", () => {
    expect(choiceConfidence([1, 0, 0])).toBe(1);
    expect(choiceConfidence([1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(0, 6);
  });
  it("clamps out-of-range input", () => {
    expect(choiceConfidence([1.2, -0.1, -0.1])).toBe(1);
  });
});

describe("margin", () => {
  it("is the gap between top-1 and top-2", () => {
    expect(margin([0.84, 0.159, 0.001])).toBeCloseTo(0.681, 3);
    expect(margin([0.5])).toBe(0.5);
  });
});

describe("entropyBits", () => {
  it("is 0 when concentrated, log2(n) when uniform", () => {
    expect(entropyBits([1, 0])).toBeCloseTo(0, 6);
    expect(entropyBits([0.5, 0.5])).toBeCloseTo(1, 6);
  });
});

describe("normalizeSliders", () => {
  it("keeps the total at 100 like the docs explorer", () => {
    expect(normalizeSliders([90, 6, 4], 0, 40)).toEqual([40, 36, 24]);
    const out = normalizeSliders([34, 33, 33], 2, 100);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
  });
});
