import { describe, it, expect } from "vitest";
import { decide, PATTERNS } from "./patterns";

describe("guardrail routing (pi-warden thresholds)", () => {
  it("holds destructive off-plan actions", () => {
    expect(decide("guardrail", { irreversible: 0.85, off_task: 0.9, intent_mismatch: 0.2 }, { warn: 0.5, hold: 0.7 }).action).toBe("hold");
  });
  it("warns in the middle band", () => {
    expect(decide("guardrail", { irreversible: 0.6, off_task: 0.1, intent_mismatch: 0.1 }, { warn: 0.5, hold: 0.7 }).action).toBe("warn");
  });
  it("passes benign actions", () => {
    expect(decide("guardrail", { irreversible: 0.05, off_task: 0.02, intent_mismatch: 0.01 }, { warn: 0.5, hold: 0.7 }).action).toBe("pass");
  });
});

describe("rag-gate routing", () => {
  it("drops injections, even relevant ones", () => {
    expect(decide("rag-gate", { relevant: 0.95, evidence: 0.9, contradicts: 0.1, injection: 0.99 }, { warn: 0.5, hold: 0.7 }).action).toBe("drop");
  });
  it("isolates contradictions", () => {
    expect(decide("rag-gate", { relevant: 0.8, evidence: 0.7, contradicts: 0.85, injection: 0.05 }, { warn: 0.5, hold: 0.7 }).action).toBe("conflict");
  });
  it("includes clean evidence", () => {
    expect(decide("rag-gate", { relevant: 0.9, evidence: 0.8, contradicts: 0.05, injection: 0.02 }, { warn: 0.5, hold: 0.7 }).action).toBe("include");
  });
});

describe("pattern catalog", () => {
  it("ships the six proven patterns", () => {
    expect(PATTERNS.map((p) => p.id)).toEqual(["guardrail", "router", "rag-gate", "citation", "rerank", "crawl"]);
  });
});
