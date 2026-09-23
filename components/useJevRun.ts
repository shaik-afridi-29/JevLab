"use client";

import React from "react";
import type { JevApiRequest, JevApiResponse } from "@/lib/jev/types";
import { useLab } from "@/lib/store";

export interface RunState {
  loading: boolean;
  response: (JevApiResponse & { _meta?: { demo: boolean; latencyMs: number; status: number } }) | null;
  request: JevApiRequest | null;
  error: { title: string; detail: string; status?: number } | null;
  run: (req: JevApiRequest, route?: string) => Promise<JevApiResponse | null>;
  reset: () => void;
}

export function useJevRun(): RunState {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<RunState["response"]>(null);
  const [request, setRequest] = React.useState<JevApiRequest | null>(null);
  const [error, setError] = React.useState<RunState["error"]>(null);

  const run = React.useCallback(
    async (req: JevApiRequest, route = "playground") => {
      const finalReq = { ...req, model: req.model || model || "jev-latest" };
      setLoading(true);
      setError(null);
      setRequest(finalReq);
      try {
        const res = await fetch("/api/jev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...finalReq, demo: demoMode }),
        });
        const body = await res.json();
        if (!res.ok) {
          const { friendlyErrorMessage } = await import("@/lib/jev/service");
          throw Object.assign(new Error(body.error ?? "Request failed"), { status: res.status, body });
        }
        const { logUsageFromResponse } = await import("@/lib/cost");
        logUsageFromResponse(route, body);
        setResponse(body);
        return body as JevApiResponse;
      } catch (err) {
        const { friendlyErrorMessage } = await import("@/lib/jev/service");
        setError(friendlyErrorMessage(err));
        setResponse(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [demoMode, model]
  );

  const reset = React.useCallback(() => {
    setResponse(null);
    setRequest(null);
    setError(null);
  }, []);

  return { loading, response, request, error, run, reset };
}
