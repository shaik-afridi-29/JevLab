import type { JevApiRequest, JevApiResponse } from "./types";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export interface CallOptions {
  /** Per-attempt ceiling. Upstream typically answers in under a second;
   *  occasional slow sampling passes can take far longer. */
  timeoutMs?: number;
  /** Retries on timeouts, network failures and 5xx only — never on 4xx. */
  retries?: number;
}

export async function callJevApi(
  req: JevApiRequest,
  apiKey: string,
  opts: CallOptions = {}
): Promise<{ response: JevApiResponse; latencyMs: number; status: number }> {
  const timeoutMs = opts.timeoutMs ?? 20000;
  const retries = opts.retries ?? 1;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - started;
      const status = res.status;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        const msg =
          (body as { message?: string; error?: string; detail?: string } | null)?.message ??
          (body as { error?: string } | null)?.error ??
          (body as { detail?: string } | null)?.detail ??
          `Jev API returned HTTP ${status}`;
        const err = Object.assign(new Error(String(msg)), { status, body });
        // 4xx means our request was rejected — retrying cannot help.
        if (status >= 400 && status < 500) throw err;
        throw Object.assign(err, { retryable: true });
      }
      return { response: body as JevApiResponse, latencyMs, status };
    } catch (e) {
      clearTimeout(timer);
      const aborted = e instanceof DOMException && e.name === "AbortError";
      const err = aborted
        ? Object.assign(new Error(`Jev request timed out after ${timeoutMs}ms`), { status: 504, timeout: true })
        : (e as { status?: number });
      const status = typeof err?.status === "number" ? err.status : undefined;
      const retryable = aborted || status === undefined || status >= 500;
      lastErr = err;
      if (!retryable || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}
