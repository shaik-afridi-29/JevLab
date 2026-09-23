"use client";

import React from "react";
import { Play } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { ProbBar } from "@/components/visuals";
import { choiceConfidence, margin, entropyBits, applyMeasure, normalizeSliders, type MeasureId } from "@/lib/confidence";
import { logUsageFromResponse } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PRESETS: Record<string, number[]> = {
  "Clear winner": [90, 6, 4],
  "Spread out": [40, 33, 27],
  "Even split": [100 / 3, 100 / 3, 100 / 3],
};

export default function ConfidenceLabPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  // Explorer
  const [count, setCount] = React.useState(3);
  const [probs, setProbs] = React.useState<number[]>([90, 6, 4]);
  const [measure, setMeasure] = React.useState<MeasureId>("typesafe");

  // Policy simulator
  const [stateText, setStateText] = React.useState("Customer: please approve the pending $4,200 withdrawal to the new account today.");
  const [floor, setFloor] = React.useState(0.5);
  const [highBar, setHighBar] = React.useState(0.9);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ choice: string; confidence: number; dist: Record<string, number>; gated: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const setCountSafe = (n: number) => {
    setCount(n);
    setProbs(Array.from({ length: n }, (_, i) => 100 / n));
  };

  const conf = choiceConfidence(probs.map((p) => p / 100));
  const mg = margin(probs.map((p) => p / 100));
  const ent = entropyBits(probs.map((p) => p / 100));

  const runPolicy = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const req = {
        model,
        state: stateText,
        questions: {
          action: {
            type: "choice" as const,
            instructions: "What is the user trying to do?",
            criteria: {
              check_balance: "View account balance",
              approve_transfer: "Approve the pending withdrawal request",
              support: "Get help with an issue",
            },
          },
        },
      };
      const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Policy run failed");
      logUsageFromResponse("confidence-lab", body);
      const a = body.answers.action;
      const dist = a.probabilities as Record<string, number>;
      setResult({ choice: a.choice, confidence: a.confidence, dist, gated: applyMeasure(measure, Object.values(dist)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const h = () => runPolicy();
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  const routeOf = (r: NonNullable<typeof result>): { label: string; cls: string } => {
    if (r.gated < floor) return { label: "ROUTE TO HUMAN — below the uncertainty floor", cls: "border-red-400/30 bg-red-400/10 text-red-300" };
    if (r.choice === "approve_transfer" && r.gated < highBar)
      return { label: "HIGH STAKES — ask the user to confirm first", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" };
    return { label: `ACT — ${r.choice} proceeds automatically`, cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Confidence Lab</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-mist-400">Confidence is a statistic computed from the distribution shape — explore the math, then gate real actions on it.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="TypeSafe confidence is (n·peak−1)/(n−1): 1.0 when all mass sits on one option, 0 when uniform. Noul answers carry no confidence — the probability is the signal. Thresholds below are your policy, not Jev's." />{demoMode && <DemoBadge />}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHead eyebrow="Math" title="Distribution → confidence" hint="Drag sliders; the total stays at 100, like the official explorer." />
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12.5px] text-mist-400">Options:</span>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setCountSafe(n)} className={cn("rounded-lg border px-2.5 py-1 font-mono text-[12px]", count === n ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400")}>{n}</button>
            ))}
            <div className="ml-auto flex gap-1.5">
              {Object.keys(PRESETS).map((k) => (
                <button key={k} onClick={() => { const v = PRESETS[k]; setCountSafe(v.length); setProbs([...v]); }} className="rounded-md border border-line/10 px-2 py-1 text-[11px] text-mist-400 hover:border-line/25">{k}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {probs.map((p, i) => (
              <label key={i} className="flex items-center gap-3 text-[13px]">
                <span className="w-5 font-mono font-semibold text-mist-300">{String.fromCharCode(65 + i)}</span>
                <input type="range" min={0} max={100} step={1} value={p} onChange={(e) => setProbs(normalizeSliders(probs, i, Number(e.target.value)))} className="min-w-0 flex-1 accent-emerald-400" aria-label={`Probability ${i}`} />
                <output className="mono-num w-16 text-right font-mono text-mist-200">{p.toFixed(1)}%</output>
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Confidence</div><div className="mono-num font-mono text-[20px] font-semibold text-emerald-300">{conf.toFixed(2)}</div></div>
            <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Margin</div><div className="mono-num font-mono text-[20px] font-semibold text-blue-300">{mg.toFixed(2)}</div></div>
            <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Entropy</div><div className="mono-num font-mono text-[20px] font-semibold text-violet-400">{ent.toFixed(2)}b</div></div>
          </div>
          <p className="mt-2 text-[12px] text-mist-500">Flat distribution → low confidence: no option is a clear winner, or the state doesn&apos;t contain enough to go on.</p>
        </Card>

        <Card className="p-5">
          <SectionHead eyebrow="Policy" title="Three-path gate" hint="Act · confirm · route to human. Thresholds scale with risk." />
          <Field label="State"><textarea value={stateText} onChange={(e) => setStateText(e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={`Uncertainty floor: ${floor.toFixed(2)}`} hint="below → human"><input type="range" min={0} max={0.9} step={0.05} value={floor} onChange={(e) => setFloor(Number(e.target.value))} className="w-full accent-red-400" /></Field>
            <Field label={`High-stakes bar: ${highBar.toFixed(2)}`} hint="transfer needs this"><input type="range" min={0.5} max={1} step={0.05} value={highBar} onChange={(e) => setHighBar(Number(e.target.value))} className="w-full accent-amber-300" /></Field>
          </div>
          <Field label="Gate on">
            <div className="flex gap-1.5">
              {(["typesafe", "margin", "certainty"] as MeasureId[]).map((m) => (
                <button key={m} onClick={() => setMeasure(m)} className={cn("rounded-lg border px-3 py-1.5 text-[12px] capitalize", measure === m ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400")}>{m}</button>
              ))}
            </div>
          </Field>
          <Button onClick={runPolicy} disabled={loading} className="mt-4 w-full" kbd="⌘⏎"><Play size={14} /> {loading ? "Asking Jev…" : "Run gate"}</Button>
          {error && <div className="mt-3"><ErrorBox title="Gate run failed" detail={error} /></div>}
          {result && (
            <div className="mt-4 space-y-2">
              {Object.entries(result.dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between font-mono text-[12px]"><span className="text-mist-300">{k}</span><span className="mono-num font-semibold">{fmtPct(v)}</span></div>
                  <ProbBar value={v} tone={k === result.choice ? "emerald" : "blue"} height={7} />
                </div>
              ))}
              <div className="mono-num flex justify-between font-mono text-[12px] text-mist-400"><span>Jev confidence {result.confidence.toFixed(2)}</span><span>{measure} gate {result.gated.toFixed(2)}</span></div>
              <div className={cn("rounded-xl border px-4 py-3 text-center text-[13.5px] font-semibold", routeOf(result).cls)}>{routeOf(result).label}</div>
            </div>
          )}
          {!result && !loading && !error && <div className="mt-3"><EmptyState title="No gate run yet" body="Try the withdrawal state above, then soften it to a balance check and watch the route change." /></div>}
        </Card>
      </div>
    </div>
  );
}
