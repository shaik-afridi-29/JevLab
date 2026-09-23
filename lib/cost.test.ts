import { describe, it, expect } from "vitest";
import { inputTokensToUsd, formatUsd, callsPerHourToUsd, type LedgerEntry } from "./cost";

describe("cost math", () => {
  it("prices 1M input tokens at $0.042", () => {
    expect(inputTokensToUsd(1_000_000)).toBeCloseTo(0.042, 6);
  });
  it("prices the Doom-loop rate (10 calls/s, ~300 tokens each)", () => {
    // 10 × 3600 × 300 = 10.8M tokens/hr → ~$0.45/hr at list price
    expect(inputTokensToUsd(10 * 3600 * 300)).toBeCloseTo(0.4536, 4);
  });
  it("treats missing usage as zero, never NaN", () => {
    expect(inputTokensToUsd(undefined)).toBe(0);
    expect(inputTokensToUsd(NaN)).toBe(0);
  });
  it("formats sub-cent values honestly", () => {
    expect(formatUsd(0.0004)).toBe("$0.0004");
    expect(formatUsd(4.05)).toBe("$4.05");
  });
  it("projects hourly cost from a call rate", () => {
    expect(callsPerHourToUsd(36000, 300)).toBeCloseTo(0.4536, 4);
  });
});

describe("ledger entry shape", () => {
  it("entries carry what the ledger page needs", () => {
    const e: LedgerEntry = { ts: "t", route: "noul", inputTokens: 312, latencyMs: 842, demo: false };
    expect(e.inputTokens).toBe(312);
  });
});
