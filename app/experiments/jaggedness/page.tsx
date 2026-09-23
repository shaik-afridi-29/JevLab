"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, TriangleAlert } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge } from "@/components/ui";
import { RawInspector } from "@/components/visuals";
import { PRESETS, type Verdict } from "@/lib/jaggedness";
import { logUsageFromResponse } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { JevAnswer, JevApiResponse } from "@/lib/jev/types";

function topP(a: JevAnswer): number {
  if (a.type === "noul") return a.noul;
  if (a.type === "choice") return a.probabilities[a.choice] ?? 0;
  return 0;
}

interface PresetResult {
  variants: { label: string; answers: Record<string, { p: number; raw: unknown }>; response: JevApiResponse }[];
  status: Verdict;
  observed: string;
}

const badge: Record<Verdict, string> = {
  holds: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  breaks: "border-red-400/30 bg-red-400/10 text-red-300",
  info: "border-line/15 bg-wash/[0.04] text-mist-300",
};

export default function JaggednessPage() {
  const demoMode = useLab((s) => s.demoMode);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [results, setResults] = React.useState<Record<string, PresetResult>>({});
  const [error, setError] = React.useState<string | null>(null);

  const runAll = async () => {
    setRunning(true);
    setError(null);
    setResults({});
    setDone(0);
    let completed = 0;
    try {
      for (const preset of PRESETS) {
        const variants: PresetResult["variants"] = [];
        for (const v of preset.build()) {
          const res = await fetch("/api/jev", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...v.request, demo: demoMode }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? `${preset.title} / ${v.label} failed`);
          logUsageFromResponse("jaggedness", body);
          const answers: Record<string, { p: number; raw: unknown }> = {};
          for (const [k, a] of Object.entries((body as JevApiResponse).answers)) {
            answers[k] = { p: topP(a as JevAnswer), raw: a };
          }
          variants.push({ label: v.label, answers, response: body });
        }
        const { status, observed } = preset.judge(variants);
        setResults((r) => ({ ...r, [preset.id]: { variants, status, observed } }));
        completed += 1;
        setDone(completed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gauntlet failed");
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    const h = () => { if (!running) runAll(); };
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  const breaks = Object.values(results).filter((r) => r.status === "breaks").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Jaggedness Gauntlet</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-mist-400">
            All 9 failure modes from TypeSafe&apos;s official jev-1.13 jaggedness catalog, runnable. Green means the invariant held this time — red means Jev broke it live.
          </p>
          <div className="mt-2.5 flex gap-2">
            <Edu text="Each card runs the exact scenario shape from the docs (counting, hex-vs-names, negation sums, Noul-vs-Choice) and judges the observed output in code. 'Breaks' is not a bug in this app — it is Jev behaving exactly as documented." />
            {demoMode && <DemoBadge />}
          </div>
        </div>
        <Button onClick={runAll} disabled={running} size="lg" kbd="⌘⏎">
          <Play size={15} /> {running ? `Running ${done}/${PRESETS.length}…` : Object.keys(results).length ? "Run gauntlet again" : "Run the gauntlet"}
        </Button>
      </div>

      {running && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-wash/[0.07]">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(done / PRESETS.length) * 100}%` }} />
        </div>
      )}
      {error && <div className="mb-4"><ErrorBox title="Gauntlet failed" detail={error} /></div>}
      {Object.keys(results).length > 0 && !running && (
        <div className="mb-4 rounded-xl border border-line/10 bg-ink-900 px-4 py-3 text-[13px]">
          <TriangleAlert size={14} className="mr-2 inline text-amber-300" />
          {breaks} of {PRESETS.length} invariants broke on live Jev. That is the point of this page — know the edges before you ship on them.
        </div>
      )}
      {Object.keys(results).length === 0 && !running && !error && (
        <EmptyState title="Gauntlet not run yet" body="Nine presets, about fourteen Jev calls. Run them all and watch which documented edges break." />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {PRESETS.map((p, i) => {
          const r = results[p.id];
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card className="p-5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist-500">{String(i + 1).padStart(2, "0")} · {p.id}</span>
                  {r && <span className={cn("rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider", badge[r.status])}>{r.status}</span>}
                </div>
                <h3 className="text-[15.5px] font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">{p.warning}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed"><span className="font-medium text-emerald-300">Instead: </span><span className="text-mist-300">{p.instead}</span></p>
                {r && (
                  <div className="mt-3 rounded-lg bg-ink-950 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-mist-200">{r.observed}</div>
                )}
                {r && (
                  <details className="mt-2 text-[12px]">
                    <summary className="cursor-pointer text-mist-500 hover:text-mist-200">Raw responses ({r.variants.length})</summary>
                    <div className="mt-2 space-y-2">
                      {r.variants.map((v) => (
                        <RawInspector key={v.label} response={v.response} request={null} />
                      ))}
                    </div>
                  </details>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
