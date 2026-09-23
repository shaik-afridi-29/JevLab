"use client";

import React from "react";
import { Play } from "lucide-react";
import { Button, Card, Edu, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { StateEditor, parseStateValue } from "@/components/editors";
import { NoulHero, ThresholdExplorer, ProbBar } from "@/components/visuals";
import { useJevRun } from "@/components/useJevRun";
import { experimentToRequest } from "@/lib/jev/service";
import { useLab } from "@/lib/store";
import { fmtPct } from "@/lib/utils";
import { logUsageFromResponse } from "@/lib/cost";

export default function CalibrationPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const { loading, response, run } = useJevRun();
  const [stateText, setStateText] = React.useState("The customer has contacted support three times about the same billing issue.");
  const [qa, setQa] = React.useState("Is the user frustrated?");
  const [qb, setQb] = React.useState("Does the user express frustration?");
  const [cmp, setCmp] = React.useState<{ a: number; b: number } | null>(null);
  const [cmpLoading, setCmpLoading] = React.useState(false);

  const doSingle = async () => {
    await run(experimentToRequest({ state: parseStateValue(stateText), questions: [{ id: "x", name: "probe", type: "noul", instructions: qa, criteria: {} }] }, model));
  };

  const doCompare = async () => {
    setCmpLoading(true);
    try {
      const mk = (instructions: string) => fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, state: parseStateValue(stateText), questions: { probe: { type: "noul", instructions } }, demo: demoMode }) }).then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error); logUsageFromResponse("calibration", b); return b.answers?.probe?.noul ?? 0; });
      const [a, b] = await Promise.all([mk(qa), mk(qb)]);
      setCmp({ a, b });
    } finally { setCmpLoading(false); }
  };

  React.useEffect(() => {
    const h = () => doSingle();
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  const p = response?.answers?.probe?.type === "noul" ? response.answers.probe.noul : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Experiment: Calibration</h1>
        <p className="mt-1 text-[14px] text-mist-400">Separate probability from application decision. Tune thresholds, compare wordings.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="Jev returns a probability. Your app returns a decision by comparing that probability to a threshold you choose. Move the slider: the probability never changes, only your PASS/FAIL rule does." />{demoMode && <DemoBadge />}</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHead eyebrow="Probe" title="Single Noul + threshold" />
          <StateEditor value={stateText} onChange={setStateText} />
          <div className="mt-4"><Field label="Noul instructions"><input value={qa} onChange={(e) => setQa(e.target.value)} className={inputCls} /></Field></div>
          <Button onClick={doSingle} disabled={loading} className="mt-4 w-full" kbd="⌘⏎"><Play size={14} /> {loading ? "Running…" : "Run probe"}</Button>
          {p !== null && <div className="mt-5"><NoulHero p={p} /><div className="mt-4"><ThresholdExplorer p={p} /></div></div>}
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="A / B" title="Wording comparison" hint="Same state, two phrasings. Observed difference only." />
          <Field label="Experiment A"><input value={qa} onChange={(e) => setQa(e.target.value)} className={inputCls} /></Field>
          <div className="mt-3"><Field label="Experiment B"><input value={qb} onChange={(e) => setQb(e.target.value)} className={inputCls} /></Field></div>
          <Button onClick={doCompare} disabled={cmpLoading} variant="outline" className="mt-4 w-full"><Play size={14} /> {cmpLoading ? "Comparing…" : "Compare A vs B"}</Button>
          {cmp && (
            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-mono text-mist-300">A · {qa.slice(0, 42)}</span><span className="mono-num font-mono font-semibold">{fmtPct(cmp.a)}</span></div>
                <ProbBar value={cmp.a} tone="blue" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-mono text-mist-300">B · {qb.slice(0, 42)}</span><span className="mono-num font-mono font-semibold">{fmtPct(cmp.b)}</span></div>
                <ProbBar value={cmp.b} tone="violet" />
              </div>
              <div className="rounded-xl border border-line/[0.08] bg-ink-950 p-4 text-center">
                <div className="text-[11px] uppercase tracking-[0.14em] text-mist-500">Observed difference</div>
                <div className={`mono-num font-mono text-[24px] font-semibold ${cmp.b - cmp.a >= 0 ? "text-emerald-300" : "text-red-300"}`}>{cmp.b - cmp.a >= 0 ? "+" : ""}{((cmp.b - cmp.a) * 100).toFixed(1)} pp</div>
                <div className="mt-1 text-[12px] text-mist-500">B {fmtPct(cmp.b)} vs A {fmtPct(cmp.a)} — describe, don&apos;t claim causality.</div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
