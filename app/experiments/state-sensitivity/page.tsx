"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Plus, Trash2, Square } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { parseStateValue } from "@/components/editors";
import { ProbBar, RawInspector } from "@/components/visuals";
import { useLab } from "@/lib/store";
import { uid, fmtPct } from "@/lib/utils";
import type { JevApiResponse, JevApiRequest } from "@/lib/jev/types";
import { logUsageFromResponse } from "@/lib/cost";

export default function StateSensitivityPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const [question, setQuestion] = React.useState("Does this situation require escalation?");
  const [states, setStates] = React.useState<string[]>([
    "Customer contacted support once about a minor issue.",
    "Customer contacted support three times about the same issue with no callback.",
    "Customer contacted support ten times, is asking for a manager, mentions churn.",
  ]);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<{ label: string; p: number }[] | null>(null);
  const [error, setError] = React.useState<{ title: string; detail: string } | null>(null);
  const [lastReq, setLastReq] = React.useState<JevApiRequest | null>(null);
  const [lastResp, setLastResp] = React.useState<JevApiResponse | null>(null);
  const [cancelled, setCancelled] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const doRun = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setRows(null); setCancelled(false);
    try {
      const out: { label: string; p: number }[] = [];
      let lastR: JevApiResponse | null = null; let lastQ: JevApiRequest | null = null;
      for (let i = 0; i < states.length; i++) {
        const req = { model, state: parseStateValue(states[i]), questions: { probe: { type: "noul" as const, instructions: question } } };
        lastQ = req as JevApiRequest;
        const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }), signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `State ${i + 1} failed`);
        logUsageFromResponse("state-sensitivity", body);
        lastR = body;
        const ans = body.answers?.probe;
        out.push({ label: `State ${String.fromCharCode(65 + i)}`, p: ans?.type === "noul" ? ans.noul : 0 });
        setRows([...out]);
      }
      setLastResp(lastR); setLastReq(lastQ);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setCancelled(true);
      } else {
        setError({ title: "Jev request failed", detail: e instanceof Error ? e.message : "Unknown error" });
      }
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
        <h1 className="text-[26px] font-semibold tracking-tight">Experiment: State Sensitivity</h1>
        <p className="mt-1 text-[14px] text-mist-400">Keep the question fixed while changing the state. Watch the probability move.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="One question, many states. Each state is sent as its own request so you can see exactly how added context shifts the estimate." />{demoMode && <DemoBadge />}</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHead eyebrow="Fixed" title="Question" />
          <Field label="Noul instructions"><input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} /></Field>
          <div className="mt-5 flex gap-2">
            <Button onClick={doRun} disabled={loading} className="flex-1" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? "Running…" : "Run all states"}</Button>
            {loading && <Button onClick={() => abortRef.current?.abort()} variant="outline" size="lg" aria-label="Stop run"><Square size={15} /></Button>}
          </div>
          {cancelled && !loading && <p className="mt-2 text-[12px] text-amber-300">Cancelled — partial results kept, no further spend.</p>}
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="Varied" title="States" right={<Button size="sm" variant="outline" onClick={() => setStates((s) => [...s, ""])}><Plus size={13} /> Add</Button>} />
          <div className="space-y-2">
            {states.map((s, i) => (
              <div key={i} className="flex gap-2">
                <span className="mono-num mt-2.5 w-12 shrink-0 font-mono text-[12px] text-mist-500">{String.fromCharCode(65 + i)}</span>
                <textarea value={s} onChange={(e) => setStates((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} rows={2} className={inputCls} aria-label={`State ${i + 1}`} />
                <button onClick={() => setStates((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 self-start rounded-lg p-2 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <SectionHead eyebrow="Observed" title="State comparison" />
        {error && <ErrorBox title={error.title} detail={error.detail} />}
        {!rows && !loading && <EmptyState title="No runs yet" body="Define state variants and run them against the fixed question." />}
        {rows && (
          <Card className="overflow-hidden">
            {rows.map((r, i) => (
              <motion.div key={r.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="grid grid-cols-[88px_1fr_64px] items-center gap-3 border-b border-line/[0.06] px-4 py-3.5 last:border-0">
                <span className="font-mono text-[12.5px] text-mist-300">{r.label}</span>
                <ProbBar value={r.p} tone={r.p >= 0.6 ? "emerald" : r.p > 0.4 ? "amber" : "red"} height={10} />
                <span className="mono-num text-right font-mono text-[13px] font-semibold">{fmtPct(r.p)}</span>
              </motion.div>
            ))}
          </Card>
        )}
        {lastResp && <div className="mt-4"><RawInspector response={lastResp} request={lastReq} /></div>}
      </div>
    </div>
  );
}
