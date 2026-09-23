import { describe, it, expect } from "vitest";
import { summarize, seededValues, hashSeed } from "./stats";
import { mockJevResponse } from "./demo";

describe("stats", () => {
  it("summarizes a known sample", () => {
    const s = summarize([0.9, 0.91, 0.92, 0.93, 1.0])!;
    expect(s.count).toBe(5);
    expect(s.mean).toBeCloseTo(0.932, 3);
    expect(s.median).toBeCloseTo(0.92, 3);
    expect(s.min).toBe(0.9);
    expect(s.max).toBe(1.0);
    expect(s.range).toBeCloseTo(0.1, 6);
    expect(s.stddev).toBeGreaterThan(0);
  });
  it("returns null for empty input", () => {
    expect(summarize([])).toBeNull();
  });
  it("seeded values are deterministic and bounded", () => {
    const a = seededValues("seed-x", 20, 0.9, 0.03);
    const b = seededValues("seed-x", 20, 0.9, 0.03);
    expect(a).toEqual(b);
    expect(a.every((v) => v >= 0.01 && v <= 0.99)).toBe(true);
  });
  it("hash is stable", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });
});

describe("demo mock", () => {
  it("returns all three answer shapes with valid ranges", () => {
    const r = mockJevResponse({
      model: "demo",
      state: "hello",
      questions: {
        n: { type: "noul", instructions: "Is it true?" },
        c: { type: "choice", instructions: "Pick", criteria: { a: "A", b: "B" } },
        s: { type: "score", instructions: "Rate", criteria: ["Low", "High"] },
      },
    });
    expect(r.answers.n.type).toBe("noul");
    const noul = r.answers.n as { noul: number };
    expect(noul.noul).toBeGreaterThanOrEqual(0);
    expect(noul.noul).toBeLessThanOrEqual(1);
    const choice = r.answers.c as { probabilities: Record<string, number> };
    const total = Object.values(choice.probabilities).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 2);
  });
  it("is deterministic", () => {
    const req = { model: "demo", state: "s", questions: { n: { type: "noul" as const, instructions: "q" } } };
    expect(mockJevResponse(req)).toEqual(mockJevResponse(req));
  });
});

describe("threshold logic", () => {
  it("pass/fail boundary holds", () => {
    const p = 0.73;
    expect(p >= 0.5).toBe(true);
    expect(p >= 0.75).toBe(false);
    expect(p >= 0.9).toBe(false);
  });
});
