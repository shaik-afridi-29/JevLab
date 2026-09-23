import type { Experiment, Question } from "./types";

export interface ValidationIssue {
  path: string;
  message: string;
}

function isBlank(s: unknown): boolean {
  return typeof s !== "string" || s.trim().length === 0;
}

function stateIsEmpty(state: unknown): boolean {
  if (state === null || state === undefined) return true;
  if (typeof state === "string") return state.trim().length === 0;
  if (Array.isArray(state)) return state.length === 0;
  if (typeof state === "object") return Object.keys(state).length === 0;
  return false;
}

export function validateQuestion(q: Question): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (isBlank(q.name)) issues.push({ path: `${q.id}.name`, message: "Question needs a key name (used as the answer key)." });
  if (!/^[a-zA-Z0-9_\-]+$/.test(q.name || ""))
    issues.push({ path: `${q.id}.name`, message: "Key may only contain letters, numbers, underscore or dash." });
  if (isBlank(q.instructions))
    issues.push({ path: `${q.id}.instructions`, message: "Instructions describe what Jev should judge. This is required." });

  if (q.type === "choice") {
    const c = (q.criteria ?? {}) as Record<string, unknown>;
    const keys = Object.keys(c);
    if (keys.length < 2)
      issues.push({ path: `${q.id}.criteria`, message: "Choice needs at least 2 options." });
    if (keys.length > 255)
      issues.push({ path: `${q.id}.criteria`, message: "Choice supports at most 255 options." });
    for (const k of keys) {
      if (isBlank(k)) issues.push({ path: `${q.id}.criteria`, message: "Option keys cannot be blank." });
    }
  }

  if (q.type === "score") {
    const c = (q.criteria ?? []) as unknown[];
    if (!Array.isArray(c) || c.length < 2)
      issues.push({ path: `${q.id}.criteria`, message: "Score needs an ordered scale of 2–10 levels." });
    if (Array.isArray(c) && c.length > 10)
      issues.push({ path: `${q.id}.criteria`, message: "Score supports at most 10 levels." });
    if (Array.isArray(c)) {
      c.forEach((lvl, i) => {
        if (isBlank(lvl as string))
          issues.push({ path: `${q.id}.criteria[${i}]`, message: `Level ${i} needs a concrete description.` });
      });
    }
  }
  return issues;
}

export function validateExperiment(exp: Pick<Experiment, "state" | "questions">): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (stateIsEmpty(exp.state))
    issues.push({ path: "state", message: "State is empty. Jev judges a state — provide text or JSON." });
  if (!exp.questions || exp.questions.length === 0)
    issues.push({ path: "questions", message: "Add at least one question." });
  const names = new Set<string>();
  for (const q of exp.questions ?? []) {
    if (names.has(q.name))
      issues.push({ path: `${q.id}.name`, message: `Duplicate question key "${q.name}". Keys must be unique.` });
    names.add(q.name);
    issues.push(...validateQuestion(q));
  }
  return issues;
}

export function parseStateInput(raw: string, mode: "text" | "json"): { value: unknown; error?: string } {
  if (mode === "text") return { value: raw };
  if (raw.trim() === "") return { value: "" };
  try {
    return { value: JSON.parse(raw) };
  } catch (e) {
    return { value: raw, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}
