"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { StateEditor, parseStateValue } from "@/components/editors";
import { binTrials, expectedCalibrationError, type Trial } from "@/lib/calibration";
import { logUsageFromResponse } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { cn } from "@/lib/utils";

const ReliabilityChart = dynamic(() => import("@/components/charts").then((m) => m.ReliabilityChart), {
  ssr: false,
  loading: () => <div className="animate-pulse-soft h-56 rounded-lg bg-wash/[0.04]" />,
});

interface LabeledTrial extends Trial {
  p: number;
}

export default function CalibrationWorkbenchPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const [stateText, setStateText] = React.useState("The customer has contacted support three times about the same issue and is asking for a manager.");
  const [question, setQuestion] = React.useState("Does this situation require escalation?");
  const [expected, setExpected] = React.useState(true);
  const [n, setN] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [trials, setTrials] = React.useState<LabeledTrial[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const bins = trials ? binTrials(trials, 10) : [];
  const ece = trials ? expectedCalibrationError(trials, 10) : 0;

  const doRun = async () => {
    setLoading(true);
    setError(null);
    setTrials([]);
    setProgress(0);
    const out: LabeledTrial[] = [];
    try {
      for (let i = 0; i < n; i++) {
        const req = { model, state: parseStateValue(stateText), questions: { probe: { type: "noul" as const, instructions: question } } };
        const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }) });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Trial ${i + 1} failed`);
        logUsageFromResponse("calibration-workbench", body);
        const p = body.answers?.probe?.type === "noul" ? body.answers.probe.noul : NaN;
        const predicted = p >= 0.5;
        out.push({ p, conf: Math.max(p, 1 - p), correct: predicted === expected });
        setTrials([...out]);
        setProgress(i + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const h = () => doRun();
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Calibration Workbench</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-mist-400">A model is calibrated when answers at 0.9 are right ~90% of the time. Declare the right answer, run trials, and measure.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="You supply ground truth (the expected answer). Each trial is labeled correct/incorrect against it, binned by confidence, and scored as ECE. An independent study measured ~0.107 on Jev; calibrate per question, not per model." />{demoMode && <DemoBadge />}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <SectionHead eyebrow="Ground truth" title="State, question, expected answer" />
          <StateEditor value={stateText} onChange={setStateText} />
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_120px]">
            <Field label="Noul instructions"><input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} /></Field>
            <Field label="Expected">
              <div className="flex gap-1.5">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} onClick={() => setExpected(v)} className={cn("flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium", expected === v ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400")}>{v ? "Yes" : "No"}</button>
                ))}
              </div>
            </Field>
            <Field label="Trials" hint="1–50"><input type="number" min={1} max={50} value={n} onChange={(e) => setN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className={inputCls} /></Field>
          </div>
          <Button onClick={doRun} disabled={loading} className="mt-4 w-full" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? `Trial ${progress}/${n}…` : `Run ${n} trials`}</Button>
          {loading && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-wash/[0.07]"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${(progress / n) * 100}%` }} /></div>}
        </Card>

        <Card className="p-5">
          <SectionHead eyebrow="Measured" title="Expected calibration error" hint="0 is perfect. Lower is better." />
          {error && <ErrorBox title="Workbench failed" detail={error} />}
          {!trials && !loading && <EmptyState title="No trials yet" body="Declare ground truth on the left, then run. Green bars should track grey bars." />}
          {trials && trials.length > 0 && (
            <div>
              <div className="mono-num text-center font-mono text-[40px] font-semibold leading-none">{ece.toFixed(3)}</div>
              <div className="mt-1 text-center text-[12px] text-mist-500">{trials.filter((t) => t.correct).length}/{trials.length} correct · published independent study ≈ 0.107</div>
              <div className="mt-4"><ReliabilityChart bins={bins} /></div>
              <div className="mono-num mt-3 grid max-h-40 grid-cols-5 gap-1.5 overflow-y-auto font-mono text-[11px]">
                {trials.map((t, i) => (
                  <div key={i} className={cn("rounded-md px-1.5 py-1 text-center", t.correct ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300")}>{t.p.toFixed(2)}</div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
