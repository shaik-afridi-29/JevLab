"use client";

import React from "react";
import { Play } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { StateEditor, parseStateValue } from "@/components/editors";
import { RunsLineChart, RawInspector } from "@/components/visuals";
import { summarize } from "@/lib/stats";
import { useLab } from "@/lib/store";
import { fmtNum } from "@/lib/utils";
import type { JevApiResponse, JevApiRequest } from "@/lib/jev/types";
import { logUsageFromResponse } from "@/lib/cost";

export default function RepeatedPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const [stateText, setStateText] = React.useState("The customer has contacted support three times about the same issue and is asking for a manager.");
  const [question, setQuestion] = React.useState("Does this situation require escalation?");
  const [runs, setRuns] = React.useState(20);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [values, setValues] = React.useState<number[] | null>(null);
  const [error, setError] = React.useState<{ title: string; detail: string } | null>(null);
  const [last, setLast] = React.useState<{ resp: JevApiResponse; req: JevApiRequest } | null>(null);

  const stats = values ? summarize(values) : null;

  const doRun = async () => {
    setLoading(true); setError(null); setValues([]); setProgress(0);
    const out: number[] = [];
    try {
      for (let i = 0; i < runs; i++) {
        const req = { model, state: parseStateValue(stateText), questions: { probe: { type: "noul" as const, instructions: question } } };
        const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }) });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Run ${i + 1} failed`);
        logUsageFromResponse("repeated", body);
        const p = body.answers?.probe?.type === "noul" ? body.answers.probe.noul : NaN;
        out.push(p);
        setValues([...out]);
        setProgress(i + 1);
        if (i === runs - 1) setLast({ resp: body, req: req as JevApiRequest });
      }
    } catch (e) {
      setError({ title: "Repeated run failed", detail: e instanceof Error ? e.message : "Unknown error" });
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    const h = () => doRun();
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Experiment: Repeated Runs</h1>
        <p className="mt-1 text-[14px] text-mist-400">Execute the same request repeatedly and observe variation. An experiment — not a claim about calibration.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="Identical state and question, sent N times. The table, chart and summary statistics below describe only what you observed in this session." />{demoMode && <DemoBadge />}</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <SectionHead eyebrow="Fixed" title="State & question" />
          <StateEditor value={stateText} onChange={setStateText} />
          <div className="mt-4"><Field label="Noul instructions"><input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} /></Field></div>
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="Config" title="Runs" />
          <Field label="Number of runs" hint="1–50">
            <input type="number" min={1} max={50} value={runs} onChange={(e) => setRuns(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className={inputCls} />
          </Field>
          <div className="mt-3 flex gap-1.5">
            {[5, 10, 20, 50].map((n) => (
              <button key={n} onClick={() => setRuns(n)} className={`rounded-lg border px-3 py-1.5 font-mono text-[12px] ${runs === n ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25"}`}>{n}</button>
            ))}
          </div>
          <Button onClick={doRun} disabled={loading} className="mt-5 w-full" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? `Run ${progress}/${runs}…` : `Run ${runs}×`}</Button>
          {loading && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-wash/[0.07]"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${(progress / runs) * 100}%` }} /></div>}
        </Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <SectionHead eyebrow="Observed" title="Run sequence" hint="Each row is one identical request." />
          {error && <ErrorBox title={error.title} detail={error.detail} />}
          {!values && !loading && <EmptyState title="No runs yet" body="Choose a run count and execute. Values stream in live." />}
          {values && values.length > 0 && (
            <div>
              <RunsLineChart values={values} />
              <div className="mono-num mt-3 grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto font-mono text-[11.5px] sm:grid-cols-5">
                {values.map((v, i) => (
                  <div key={i} className="rounded-md bg-wash/[0.03] px-2 py-1.5 text-center text-mist-300"><span className="text-mist-500">{i + 1}</span> {v.toFixed(3)}</div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="Summary" title="Statistics" hint="Observed in this session only." />
          {!stats ? <p className="text-[13px] text-mist-500">Run to compute mean, median, spread.</p> : (
            <dl className="grid grid-cols-2 gap-2">
              {[["Mean", stats.mean], ["Median", stats.median], ["Min", stats.min], ["Max", stats.max], ["Std dev", stats.stddev], ["Range", stats.range]].map(([k, v]) => (
                <div key={k as string} className="rounded-lg bg-wash/[0.03] px-3 py-2.5">
                  <dt className="text-[11px] uppercase tracking-wider text-mist-500">{k}</dt>
                  <dd className="mono-num font-mono text-[16px] font-semibold">{fmtNum(v as number)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
      {last && <div className="mt-4"><RawInspector response={last.resp} request={last.req} /></div>}
    </div>
  );
}
