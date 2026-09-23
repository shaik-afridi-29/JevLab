import type {
  Experiment,
  JevApiRequest,
  JevQuestionWire,
  Question,
} from "./types";

export const DEFAULT_MODEL = "jev-latest";

export function questionToWire(q: Question): JevQuestionWire {
  if (q.type === "noul") {
    const c = (q.criteria ?? {}) as { true?: string; false?: string };
    const criteria: { true?: string; false?: string } = {};
    if (typeof c.true === "string" && c.true.trim()) criteria.true = c.true;
    if (typeof c.false === "string" && c.false.trim()) criteria.false = c.false;
    const wire: JevQuestionWire = {
      type: "noul",
      instructions: q.instructions,
    };
    if (Object.keys(criteria).length > 0) (wire as { criteria?: unknown }).criteria = criteria;
    return wire;
  }
  if (q.type === "choice") {
    const c = (q.criteria ?? {}) as Record<string, string | null>;
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(c)) {
      if (!k.trim()) continue;
      cleaned[k] = typeof v === "string" && v.trim().length > 0 ? v : null;
    }
    return { type: "choice", instructions: q.instructions, criteria: cleaned };
  }
  const levels = ((q.criteria ?? []) as unknown[]).map((l) => String(l ?? ""));
  return { type: "score", instructions: q.instructions, criteria: levels };
}

export function experimentToRequest(
  exp: Pick<Experiment, "state" | "questions">,
  model: string = DEFAULT_MODEL
): JevApiRequest {
  const questions: Record<string, JevQuestionWire> = {};
  for (const q of exp.questions) questions[q.name] = questionToWire(q);
  return { model: model || DEFAULT_MODEL, state: exp.state, questions };
}

export function friendlyErrorMessage(err: unknown): { title: string; detail: string; status?: number } {
  const e = err as { message?: string; status?: number; body?: unknown } | null;
  const status = typeof e?.status === "number" ? e.status : undefined;
  const raw = String(e?.message ?? "Unknown error");
  if (status === 401 || status === 403)
    return { title: "Jev rejected the API key", detail: "The server could not authenticate with TypeSafe. Check TYPESAFE_API_KEY and test the connection in Settings.", status };
  if (status === 422)
    return { title: "Jev did not accept this question configuration", detail: raw, status };
  if (status === 429)
    return { title: "Rate limited by Jev", detail: "Too many requests in a short window. Wait a few seconds and retry.", status };
  if (status === 504 || /timed out after/i.test(raw))
    return { title: "Jev timed out", detail: "Upstream took unusually long (typical answers land in under a second; slow sampling passes occasionally stall). The call was retried once — try the turn again or continue manually.", status: status ?? 504 };
  if (/fetch failed|ECONN|network|timeout/i.test(raw))
    return { title: "Network failure reaching Jev", detail: raw, status };
  return { title: "Jev request failed", detail: raw, status };
}
