import { describe, it, expect, afterEach } from "vitest";
import { validateExperiment, validateQuestion, parseStateInput } from "./validators";
import { experimentToRequest, questionToWire, friendlyErrorMessage } from "./service";
import { callJevApi } from "./client";
import type { Question } from "./types";

const noul: Question = { id: "q1", name: "escalate", type: "noul", instructions: "Does this need escalation?" };

describe("validators", () => {
  it("accepts a valid noul", () => {
    expect(validateQuestion(noul)).toEqual([]);
  });
  it("rejects blank instructions", () => {
    const issues = validateQuestion({ ...noul, instructions: "  " });
    expect(issues.some((i) => i.path.includes("instructions"))).toBe(true);
  });
  it("rejects bad question keys", () => {
    expect(validateQuestion({ ...noul, name: "has space" }).length).toBeGreaterThan(0);
  });
  it("requires >=2 choice options", () => {
    const issues = validateQuestion({ id: "c", name: "pick", type: "choice", instructions: "Pick", criteria: { only: "one" } });
    expect(issues.length).toBeGreaterThan(0);
  });
  it("requires 2-10 score levels", () => {
    expect(validateQuestion({ id: "s", name: "sev", type: "score", instructions: "Rate", criteria: ["only"] }).length).toBeGreaterThan(0);
    expect(validateQuestion({ id: "s", name: "sev", type: "score", instructions: "Rate", criteria: Array(11).fill("x") }).length).toBeGreaterThan(0);
  });
  it("flags empty state and duplicate keys", () => {
    const issues = validateExperiment({ state: "   ", questions: [noul, { ...noul, id: "q2" }] });
    expect(issues.some((i) => i.path === "state")).toBe(true);
    expect(issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });
  it("parses JSON state", () => {
    expect(parseStateInput('{"a":1}', "json").value).toEqual({ a: 1 });
    expect(parseStateInput("{bad", "json").error).toBeTruthy();
  });
});

describe("service", () => {
  it("builds a noul wire without empty criteria", () => {
    const w = questionToWire(noul);
    expect(w).toEqual({ type: "noul", instructions: "Does this need escalation?" });
  });
  it("keeps noul true/false criteria when provided", () => {
    const w = questionToWire({ ...noul, criteria: { true: "yes-case", false: "" } });
    expect(w).toEqual({ type: "noul", instructions: noul.instructions, criteria: { true: "yes-case" } });
  });
  it("nulls blank choice descriptions", () => {
    const w = questionToWire({ id: "c", name: "pick", type: "choice", instructions: "Pick", criteria: { a: "desc", b: " " } });
    expect(w).toEqual({ type: "choice", instructions: "Pick", criteria: { a: "desc", b: null } });
  });
  it("builds a full request with model default", () => {
    const req = experimentToRequest({ state: "hello", questions: [noul] }, "");
    expect(req.model).toBe("jev-latest");
    expect(Object.keys(req.questions)).toEqual(["escalate"]);
  });
  it("maps 401 to a human message", () => {
    const m = friendlyErrorMessage(Object.assign(new Error("Unauthorized"), { status: 401 }));
    expect(m.title).toMatch(/API key/i);
  });
  it("maps 422 to config message", () => {
    const m = friendlyErrorMessage(Object.assign(new Error("bad"), { status: 422 }));
    expect(m.title).toMatch(/did not accept/i);
  });
});

describe("callJevApi resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("aborts a hung upstream call after timeoutMs", async () => {
    // Stub honors abort like real fetch: hangs until the signal fires.
    globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_res, rej) => {
        init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
      })) as unknown as typeof fetch;
    const t0 = Date.now();
    await expect(
      callJevApi({ model: "m", state: "s", questions: {} } as never, "k", { timeoutMs: 60, retries: 0 })
    ).rejects.toMatchObject({ status: 504 });
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it("retries once after a timeout, then succeeds", async () => {
    let n = 0;
    globalThis.fetch = (async () => {
      n += 1;
      if (n === 1) throw new DOMException("aborted", "AbortError");
      return new Response(JSON.stringify({ model: "m", answers: {} }), { status: 200 });
    }) as unknown as typeof fetch;
    const out = await callJevApi({ model: "m", state: "s", questions: {} } as never, "k", { timeoutMs: 500, retries: 1 });
    expect(n).toBe(2);
    expect(out.status).toBe(200);
  });

  it("does not retry client errors", async () => {
    let n = 0;
    globalThis.fetch = (async () => {
      n += 1;
      return new Response(JSON.stringify({ error: "bad" }), { status: 422 });
    }) as unknown as typeof fetch;
    await expect(
      callJevApi({ model: "m", state: "s", questions: {} } as never, "k", { timeoutMs: 500, retries: 2 })
    ).rejects.toMatchObject({ status: 422 });
    expect(n).toBe(1);
  });
});
