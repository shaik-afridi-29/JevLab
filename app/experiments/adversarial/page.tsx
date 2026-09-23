"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Plus, Trash2, Square } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { parseStateValue } from "@/components/editors";
import { ProbBar, RawInspector } from "@/components/visuals";
import { useLab } from "@/lib/store";
import { fmtPct } from "@/lib/utils";
import type { JevApiResponse, JevApiRequest } from "@/lib/jev/types";
import { logUsageFromResponse } from "@/lib/cost";

const CATEGORIES = ["Negation", "Contradiction", "Ambiguity", "Instruction Injection", "Conflicting Evidence", "Missing Evidence", "Long Context", "Irrelevant Context"];

export default function AdversarialPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const [question, setQuestion] = React.useState("Does the customer want a refund?");
  const [category, setCategory] = React.useState("Negation");
  const [variants, setVariants] = React.useState<string[]>([
    "The customer does not want a refund.",
    "The customer says they don't want a refund.",
    "The customer explicitly rejects a refund.",
    "The customer says they don't want a refund, although they might accept one.",
  ]);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<{ label: string; p: number }[] | null>(null);
  const [error, setError] = React.useState<{ title: string; detail: string } | null>(null);
  const [last, setLast] = React.useState<{ resp: JevApiResponse; req: JevApiRequest } | null>(null);
  const [cancelled, setCancelled] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const doRun = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setRows(null); setCancelled(false);
    try {
      const out: { label: string; p: number }[] = [];
      for (let i = 0; i < variants.length; i++) {
        const req = { model, state: parseStateValue(variants[i]), questions: { probe: { type: "noul" as const, instructions: question } } };
        const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }), signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `Variant ${i + 1} failed`);
        logUsageFromResponse("adversarial", body);
        const p = body.answers?.probe?.type === "noul" ? body.answers.probe.noul : 0;
        out.push({ label: `Variant ${i + 1}`, p });
        setRows([...out]);
        if (i === variants.length - 1) setLast({ resp: body, req: req as JevApiRequest });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setCancelled(true);
      } else {
        setError({ title: "Adversarial run failed", detail: e instanceof Error ? e.message : "Unknown error" });
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
        <h1 className="text-[26px] font-semibold tracking-tight">Experiment: Adversarial Testing</h1>
        <p className="mt-1 text-[14px] text-mist-400">Probe negation, contradiction, ambiguity and injection. Same question, hostile state variants.</p>
        <div className="mt-2.5 flex flex-wrap gap-2"><Edu text="Adversarial variants test robustness: does a negation flip the probability? Does injected instruction leak through? Compare the table — small shifts are normal, inversions deserve a closer look at wording." />{demoMode && <DemoBadge />}</div>
      </div>
      <Card className="mb-4 p-5">
        <SectionHead eyebrow="Base" title="Question under test" />
        <Field label="Noul instructions"><input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} /></Field>
        <div className="mt-3">
          <div className="mb-1.5 text-[12.5px] font-medium text-mist-200">Attack category</div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1.5 text-[12px] ${category === c ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-line/10 text-mist-400 hover:border-line/25"}`}>{c}</button>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHead eyebrow="Variants" title={`States · ${category}`} right={<Button size="sm" variant="outline" onClick={() => setVariants((v) => [...v, ""])}><Plus size={13} /> Add</Button>} />
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2">
                <span className="mono-num mt-2.5 w-14 shrink-0 font-mono text-[11.5px] text-mist-500">V{i + 1}</span>
                <textarea value={v} onChange={(e) => setVariants((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} rows={2} className={inputCls} aria-label={`Variant ${i + 1}`} />
                <button onClick={() => setVariants((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 self-start rounded-lg p-2 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={doRun} disabled={loading} className="flex-1" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? "Running…" : "Run all variants"}</Button>
            {loading && <Button onClick={() => abortRef.current?.abort()} variant="outline" size="lg" aria-label="Stop run"><Square size={15} /></Button>}
          </div>
          {cancelled && !loading && <p className="mt-2 text-[12px] text-amber-300">Cancelled — partial results kept, no further spend.</p>}
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="Observed" title="Comparison table" hint="One row per variant." />
          {error && <ErrorBox title={error.title} detail={error.detail} />}
          {!rows && !loading && <EmptyState title="No runs yet" body="Run the variants to populate the comparison." />}
          {rows && (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <motion.div key={r.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="mb-1 flex justify-between text-[12.5px]"><span className="font-mono text-mist-300">{r.label}</span><span className="mono-num font-mono font-semibold">{fmtPct(r.p)}</span></div>
                  <ProbBar value={r.p} tone={r.p >= 0.6 ? "emerald" : r.p > 0.4 ? "amber" : "red"} />
                  <div className="mt-1 truncate text-[11.5px] text-mist-500">{variants[i]}</div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {last && <div className="mt-4"><RawInspector response={last.resp} request={last.req} /></div>}
    </div>
  );
}
