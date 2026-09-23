import type { JevApiRequest, JevApiResponse } from "./types";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export async function callJevApi(
  req: JevApiRequest,
  apiKey: string
): Promise<{ response: JevApiResponse; latencyMs: number; status: number }> {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
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
    throw Object.assign(new Error(String(msg)), { status, body });
  }
  return { response: body as JevApiResponse, latencyMs, status };
}
