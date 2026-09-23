"use client";

import { useTheme } from "@/lib/theme";

import React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn, fmtPct } from "@/lib/utils";
import { Collapsible, CopyDownload } from "./ui";
import type { JevAnswer, JevApiResponse, JevApiRequest } from "@/lib/jev/types";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Recharts is heavy (~120KB min) and only needed when a chart actually
// renders — split it out so tab navigation never pays the parse cost.
const ScoreChart = dynamic(() => import("./charts").then((m) => m.ScoreChart), {
  ssr: false,
  loading: () => <div className="animate-pulse-soft h-44 rounded-lg bg-wash/[0.04]" />,
});
const RunsChart = dynamic(() => import("./charts").then((m) => m.RunsChart), {
  ssr: false,
  loading: () => <div className="animate-pulse-soft h-52 rounded-lg bg-wash/[0.04]" />,
});

export function verdictForNoul(p: number): { label: string; tone: string } {
  if (p >= 0.85) return { label: "Likely true", tone: "text-emerald-300" };
  if (p >= 0.6) return { label: "Leaning true", tone: "text-emerald-200/80" };
  if (p > 0.4) return { label: "Uncertain", tone: "text-amber-300" };
  if (p > 0.15) return { label: "Leaning false", tone: "text-red-300/80" };
  return { label: "Likely false", tone: "text-red-300" };
}

export function ProbBar({ value, tone = "emerald", height = 8 }: { value: number; tone?: "emerald" | "red" | "amber" | "blue" | "violet"; height?: number }) {
  const fill =
    tone === "emerald" ? "bg-emerald-400" :
    tone === "red" ? "bg-red-400" :
    tone === "amber" ? "bg-amber-300" :
    tone === "blue" ? "bg-blue-400" : "bg-violet-400";
  return (
    <div className="prob-track w-full overflow-hidden rounded-full" style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
        className={cn("h-full rounded-full", fill)}
      />
    </div>
  );
}

export function NoulHero({ p }: { p: number }) {
  const v = verdictForNoul(p);
  return (
    <div>
      <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500")}>Jev assessment</div>
      <div className={cn("mt-1 text-[26px] font-semibold tracking-tight", v.tone)}>{v.label}</div>
      <div className="mono-num mt-1 font-mono text-[34px] font-semibold leading-none tracking-tight">{fmtPct(p)}</div>
      <div className="mt-3"><ProbBar value={p} tone={p >= 0.6 ? "emerald" : p > 0.4 ? "amber" : "red"} height={10} /></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">True</div>
          <div className="mono-num font-mono text-[17px] font-semibold text-emerald-200">{fmtPct(p)}</div>
        </div>
        <div className="rounded-lg border border-line/[0.08] bg-wash/[0.02] px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-mist-500">False</div>
          <div className="mono-num font-mono text-[17px] font-semibold text-mist-200">{fmtPct(1 - p)}</div>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-mist-500">
        Jev assigns {fmtPct(p)} probability to the proposition being true. This is an observed estimate, not certainty.
      </p>
    </div>
  );
}

// Honest absolute-width bars over the full distribution
export function ChoiceBarsAbsolute({ probs, top }: { probs: Record<string, number>; top: string }) {
  const rows = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {rows.map(([k, v]) => {
        const isTop = k === top;
        return (
          <div key={k} className={cn("rounded-lg border px-3 py-2", isTop ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-line/[0.07] bg-wash/[0.015]")}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className={cn("truncate font-mono text-[12.5px]", isTop ? "font-semibold text-emerald-200" : "text-mist-200")}>
                {k}{isTop && <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">highest</span>}
              </span>
              <span className="mono-num shrink-0 font-mono text-[13px] font-semibold">{fmtPct(v)}</span>
            </div>
            <ProbBar value={v} tone={isTop ? "emerald" : "blue"} height={7} />
          </div>
        );
      })}
    </div>
  );
}

export function ScoreView({ score, probs, legend, confidence }: { score: number; probs: Record<string, number>; legend: Record<string, string>; confidence: number }) {
  const levels = Object.keys(legend).map(Number).sort((a, b) => a - b);
  const data = levels.map((l) => ({ level: String(l), p: probs[String(l)] ?? 0, label: legend[String(l)] ?? "" }));
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Estimated score</div>
          <div className="mono-num font-mono text-[34px] font-semibold leading-none">{score.toFixed(2)}</div>
          <div className="mt-1 text-[12px] text-mist-500">range {levels[0]}–{levels[levels.length - 1]} · derived from the distribution below</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Confidence</div>
          <div className="mono-num font-mono text-[20px] font-semibold text-blue-300">{fmtPct(confidence)}</div>
        </div>
      </div>
      <ScoreChart data={data} score={score} />
      <div className="mt-2 space-y-1">
        {data.map((d) => (
          <div key={d.level} className="flex items-baseline gap-2 text-[12px]">
            <span className="mono-num w-6 shrink-0 font-mono text-mist-500">{d.level}</span>
            <span className="min-w-0 flex-1 truncate text-mist-300">{d.label}</span>
            <span className="mono-num shrink-0 font-mono text-mist-200">{fmtPct(d.p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RunsLineChart({ values }: { values: number[] }) {
  return <RunsChart values={values} />;
}

export function ThresholdExplorer({ p }: { p: number }) {
  const [t, setT] = React.useState(0.5);
  const pass = p >= t;
  return (
    <div className="rounded-xl border border-line/[0.08] bg-ink-950 p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Threshold explorer</div>
      <p className="mb-3 text-[12px] text-mist-500">The threshold is <span className="text-mist-200">your application logic</span> — Jev only returns the probability.</p>
      <input
        type="range" min={0.05} max={0.95} step={0.01} value={t}
        onChange={(e) => setT(Number(e.target.value))}
        className="w-full accent-emerald-400"
        aria-label="Decision threshold"
      />
      <div className="mono-num mt-1 flex justify-between font-mono text-[12px] text-mist-400">
        <span>0.05</span><span className="text-mist-100">threshold {t.toFixed(2)}</span><span>0.95</span>
      </div>
      <div className={cn("mt-3 rounded-lg border px-3 py-2.5 text-[13px] font-semibold", pass ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/[0.07] text-red-200")}>
        {pass ? "PASS" : "FAIL"} <span className="ml-1 font-normal opacity-70">at threshold {t.toFixed(2)} with p = {p.toFixed(3)}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[0.5, 0.75, 0.9].map((th) => (
          <div key={th} className="rounded-lg bg-wash/[0.03] px-2 py-1.5 font-mono text-[11.5px] text-mist-300">
            @{th.toFixed(2)} <span className={p >= th ? "text-emerald-300" : "text-red-300"}>{p >= th ? "PASS" : "FAIL"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RawInspector({ response, request }: { response: JevApiResponse; request: JevApiRequest | null }) {
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  return (
    <div className="space-y-3">
      <Collapsible title="Raw Jev response">
        <div className="mb-2 flex items-center justify-end">
          <CopyDownload data={response} filename="jev-response.json" />
        </div>
        <div className="overflow-hidden rounded-lg border border-line/10">
          <Monaco
            height="280px"
            language="json"
            theme={monacoTheme}
            value={JSON.stringify(response, null, 2)}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
          />
        </div>
      </Collapsible>
      {request && (
        <Collapsible title="Request inspector">
          <dl className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
            <div className="rounded-lg bg-wash/[0.03] p-2.5"><dt className="text-mist-500">Model</dt><dd className="mono-num font-mono text-mist-100">{request.model}</dd></div>
            <div className="rounded-lg bg-wash/[0.03] p-2.5"><dt className="text-mist-500">Questions</dt><dd className="mono-num font-mono text-mist-100">{Object.keys(request.questions).length}</dd></div>
            <div className="rounded-lg bg-wash/[0.03] p-2.5"><dt className="text-mist-500">Latency</dt><dd className="mono-num font-mono text-mist-100">{(response as { _meta?: { latencyMs?: number } })._meta?.latencyMs ?? "—"} ms</dd></div>
            <div className="rounded-lg bg-wash/[0.03] p-2.5"><dt className="text-mist-500">Status</dt><dd className="mono-num font-mono text-mist-100">{(response as { _meta?: { status?: number } })._meta?.status ?? 200}</dd></div>
          </dl>
          <div className="mt-3 overflow-hidden rounded-lg border border-line/10">
            <Monaco height="220px" language="json" theme={monacoTheme} value={JSON.stringify(request, null, 2)} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }} />
          </div>
        </Collapsible>
      )}
    </div>
  );
}

export function AnswerCard({ qKey, answer }: { qKey: string; answer: JevAnswer }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line/[0.08] bg-ink-900 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-wash/[0.05] px-2 py-1 font-mono text-[11.5px] text-mist-300">{qKey}</span>
        <span className="rounded-full border border-line/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-mist-400">{answer.type}</span>
      </div>
      {answer.type === "noul" && (
        <div>
          <NoulHero p={answer.noul} />
          <div className="mt-4"><ThresholdExplorer p={answer.noul} /></div>
        </div>
      )}
      {answer.type === "choice" && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Highest probability option</div>
          <div className="mt-1 truncate text-[22px] font-semibold tracking-tight text-mist-100">{answer.choice}</div>
          <div className="mono-num font-mono text-[15px] text-mist-400">{fmtPct(answer.probabilities[answer.choice] ?? 0)} · confidence {fmtPct(answer.confidence)}</div>
          <div className="mt-4"><ChoiceBarsAbsolute probs={answer.probabilities} top={answer.choice} /></div>
        </div>
      )}
      {answer.type === "score" && <ScoreView score={answer.score} probs={answer.probabilities} legend={answer.legend} confidence={answer.confidence} />}
    </motion.div>
  );
}
