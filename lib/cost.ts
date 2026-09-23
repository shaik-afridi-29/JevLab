import { useLab } from "./store";

/** List price: $0.042 per million input tokens. Output tokens are free. */
export const USD_PER_M_INPUT = 0.042;

export interface LedgerEntry {
  ts: string;
  route: string;
  inputTokens: number;
  latencyMs?: number;
  demo: boolean;
}

export function inputTokensToUsd(t: number | undefined | null): number {
  if (!Number.isFinite(t as number) || (t as number) < 0) return 0;
  return ((t as number) / 1_000_000) * USD_PER_M_INPUT;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

/** Projected $/hr for a sustained loop: callsPerHour × avg tokens/call. */
export function callsPerHourToUsd(callsPerHour: number, avgInputTokens: number): number {
  return inputTokensToUsd(callsPerHour * avgInputTokens);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Single call-site helper: pull usage out of an /api/jev body and log it. */
export function logUsageFromResponse(route: string, body: unknown, latencyMs?: number) {
  try {
    const b = body as { usage?: { input_tokens?: unknown }; _meta?: { demo?: boolean; latencyMs?: number } };
    useLab.getState().logUsage({
      ts: new Date().toISOString(),
      route,
      inputTokens: Math.round(num(b?.usage?.input_tokens)),
      latencyMs: latencyMs ?? num(b?._meta?.latencyMs),
      demo: b?._meta?.demo === true,
    });
  } catch {
    /* ledger is best-effort; never break a run */
  }
}
