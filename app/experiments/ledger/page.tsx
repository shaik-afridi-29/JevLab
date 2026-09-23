"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Trash2 } from "lucide-react";
import { Button, Card, Edu, EmptyState, SectionHead, DemoBadge } from "@/components/ui";
import { inputTokensToUsd, formatUsd, callsPerHourToUsd } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

const LatencyHist = dynamic(() => import("@/components/charts").then((m) => m.LatencyHist), {
  ssr: false,
  loading: () => <div className="animate-pulse-soft h-44 rounded-lg bg-wash/[0.04]" />,
});

export default function LedgerPage() {
  const ledger = useLab((s) => s.ledger);
  const clearLedger = useLab((s) => s.clearLedger);
  const demoMode = useLab((s) => s.demoMode);

  const [callsPerSec, setCallsPerSec] = React.useState(10);
  const [avgTokens, setAvgTokens] = React.useState(400);

  const live = ledger.filter((e) => !e.demo);
  const totalTokens = ledger.reduce((a, e) => a + e.inputTokens, 0);
  const spend = inputTokensToUsd(totalTokens);
  const lats = ledger.map((e) => e.latencyMs ?? 0).filter((l) => l > 0);
  const avgLat = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
  const proj = callsPerHourToUsd(callsPerSec * 3600, avgTokens);

  const byRoute = React.useMemo(() => {
    const m = new Map<string, { n: number; tokens: number }>();
    for (const e of ledger) {
      const cur = m.get(e.route) ?? { n: 0, tokens: 0 };
      m.set(e.route, { n: cur.n + 1, tokens: cur.tokens + e.inputTokens });
    }
    return [...m.entries()].sort((a, b) => b[1].tokens - a[1].tokens);
  }, [ledger]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Cost &amp; Latency Ledger</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-mist-400">Every Jev call this lab makes, priced at the $0.042/M-input list rate. Output tokens are free.</p>
          <div className="mt-2.5 flex gap-2"><Edu text="Spend is computed client-side from each response's usage.input_tokens. Demo-mode calls cost nothing and are marked as such. Projections assume sustained list-price traffic — TypeSafe notes pricing may be subsidized." />{demoMode && <DemoBadge />}</div>
        </div>
        {ledger.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Clear the ledger?")) clearLedger(); }}><Trash2 size={13} /> Clear</Button>
        )}
      </div>

      {ledger.length === 0 ? (
        <EmptyState title="No calls logged yet" body="Run anything — a playground, an experiment, a chess move — and each Jev call lands here with tokens, latency and cost." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Session spend", formatUsd(spend)],
              ["Calls", String(ledger.length)],
              ["Input tokens", totalTokens.toLocaleString()],
              ["Avg latency", lats.length ? `${Math.round(avgLat)}ms` : "—"],
            ].map(([k, v]) => (
              <Card key={k} className="p-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-mist-500">{k}</div>
                <div className="mono-num mt-1 font-mono text-[24px] font-semibold">{v}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <SectionHead eyebrow="Observed" title="Latency distribution" hint={`${live.length} live · ${ledger.length - live.length} demo calls`} />
              {lats.length ? <LatencyHist latencies={lats} /> : <p className="text-[13px] text-mist-500">No latency data yet.</p>}
              {byRoute.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {byRoute.map(([r, s]) => (
                    <div key={r} className="flex justify-between font-mono text-[12px] text-mist-300">
                      <span>{r}</span>
                      <span className="text-mist-500">{s.n} calls · {formatUsd(inputTokensToUsd(s.tokens))}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <SectionHead eyebrow="Projected" title="Loop economics" hint="Doom runs ~10 calls/sec at ~$7/hr. Model your own loop." />
              <label className="mb-1.5 block text-[12.5px] font-medium text-mist-200">Calls per second: {callsPerSec}</label>
              <input type="range" min={1} max={50} value={callsPerSec} onChange={(e) => setCallsPerSec(Number(e.target.value))} className="w-full accent-emerald-400" />
              <label className="mb-1.5 mt-3 block text-[12.5px] font-medium text-mist-200">Avg input tokens per call: {avgTokens}</label>
              <input type="range" min={100} max={4000} step={50} value={avgTokens} onChange={(e) => setAvgTokens(Number(e.target.value))} className="w-full accent-emerald-400" />
              <div className="mt-4 rounded-xl border border-line/10 bg-ink-950 p-4 text-center">
                <div className="text-[11px] uppercase tracking-[0.14em] text-mist-500">Projected burn</div>
                <div className="mono-num font-mono text-[30px] font-semibold">{formatUsd(proj)}<span className="text-[15px] text-mist-500">/hr</span></div>
                <div className="mt-1 font-mono text-[11.5px] text-mist-500">{(callsPerSec * 3600).toLocaleString()} calls/hr · {((callsPerSec * 3600 * avgTokens) / 1e6).toFixed(1)}M tokens/hr</div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-[64px_1fr_90px_90px_70px] gap-2 border-b border-line/[0.07] bg-wash/[0.02] px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-mist-500 sm:grid-cols-[140px_1fr_110px_90px_90px_70px]">
              <span className="hidden sm:inline">Time</span><span className="sm:hidden">Age</span><span>Route</span><span className="text-right">Tokens</span><span className="text-right">Cost</span><span className="hidden text-right sm:inline">Latency</span><span className="text-right">Mode</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {[...ledger].reverse().slice(0, 200).map((e, i) => (
                <div key={`${e.ts}-${i}`} className="grid grid-cols-[64px_1fr_90px_90px_70px] gap-2 border-b border-line/[0.05] px-4 py-2 font-mono text-[12px] last:border-0 sm:grid-cols-[140px_1fr_110px_90px_90px_70px]">
                  <span className="hidden text-mist-500 sm:inline">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className="text-mist-500 sm:hidden">{timeAgo(e.ts)}</span>
                  <span className="truncate text-mist-200">{e.route}</span>
                  <span className="text-right text-mist-300">{e.inputTokens.toLocaleString()}</span>
                  <span className="text-right text-mist-300">{formatUsd(inputTokensToUsd(e.inputTokens))}</span>
                  <span className="hidden text-right text-mist-500 sm:inline">{e.latencyMs ? `${e.latencyMs}ms` : "—"}</span>
                  <span className="text-right">{e.demo ? <span className="text-amber-300">demo</span> : <span className="text-emerald-300">live</span>}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
