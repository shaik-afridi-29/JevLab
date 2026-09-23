"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Plus, Trash2 } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, inputCls } from "@/components/ui";
import { StateEditor, parseStateValue } from "@/components/editors";
import { ProbBar, RawInspector } from "@/components/visuals";
import { useJevRun } from "@/components/useJevRun";
import { experimentToRequest } from "@/lib/jev/service";
import { useLab } from "@/lib/store";
import { uid, fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function QuestionSensitivityPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const { loading, response, request, error, run } = useJevRun();
  const [stateText, setStateText] = React.useState("Customer: “I've been charged twice and nobody is answering me. This is the third message.”");
  const [questions, setQuestions] = React.useState<string[]>([
    "Is the customer frustrated?",
    "Does the customer express frustration?",
    "Is the customer extremely frustrated?",
    "Does the customer require urgent assistance?",
  ]);

  React.useEffect(() => {
    const h = (e: Event) => doRun();
    window.addEventListener("jev:run", h);
    return () => window.removeEventListener("jev:run", h);
  });

  const doRun = async () => {
    const qs = questions.filter((q) => q.trim()).map((instructions, i) => ({ id: `q${i}`, name: `q${i + 1}`, type: "noul" as const, instructions, criteria: {} }));
    if (qs.length === 0) return;
    await run(experimentToRequest({ state: parseStateValue(stateText), questions: qs }, model), "question-sensitivity");
  };

  const rows = response ? Object.entries(response.answers).map(([k, a]) => ({
    key: k,
    instructions: questions[Number(k.slice(1)) - 1] ?? k,
    p: a.type === "noul" ? a.noul : 0,
  })) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Experiment: Question Sensitivity</h1>
        <p className="mt-1 text-[14px] text-mist-400">Understand how changing the wording of a question affects Jev&apos;s output. Fixed state, varied phrasing.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="Same state, different phrasings. If small wording changes move the probability a lot, your downstream threshold or routing logic needs wider margins. Observed differences only — no causal claims." />{demoMode && <DemoBadge />}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHead eyebrow="Fixed" title="State" />
          <StateEditor value={stateText} onChange={setStateText} />
        </Card>
        <Card className="p-5">
          <SectionHead eyebrow="Varied" title="Questions" hint="Each row is one Noul against the same state." right={<Button size="sm" variant="outline" onClick={() => setQuestions((q) => [...q, ""])}><Plus size={13} /> Add</Button>} />
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <span className="mono-num mt-2.5 w-8 shrink-0 font-mono text-[12px] text-mist-500">Q{i + 1}</span>
                <input value={q} onChange={(e) => setQuestions((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Question wording…" className={inputCls} aria-label={`Question ${i + 1}`} />
                <button onClick={() => setQuestions((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 rounded-lg px-2 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove Q${i + 1}`}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <Button onClick={doRun} disabled={loading} className="mt-5 w-full" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? "Running…" : "Run all"}</Button>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHead eyebrow="Observed" title="Comparison" hint="Side-by-side probabilities. Language: observed difference." />
        {error && <ErrorBox title={error.title} detail={error.detail} />}
        {!response && !loading && !error && <EmptyState title="No runs yet" body="Add phrasings on the right and run them together." />}
        {loading && <div className="animate-pulse-soft rounded-xl bg-wash/[0.04] p-10 text-center text-[13px] text-mist-500">Asking Jev…</div>}
        {response && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              {rows.map((r, i) => (
                <motion.div key={r.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="grid grid-cols-[1fr_140px_64px] items-center gap-3 border-b border-line/[0.06] px-4 py-3 last:border-0 sm:grid-cols-[1fr_220px_72px]">
                  <div className="min-w-0 truncate text-[13px]">{r.instructions}</div>
                  <ProbBar value={r.p} tone={r.p >= 0.6 ? "emerald" : r.p > 0.4 ? "amber" : "red"} />
                  <div className="mono-num text-right font-mono text-[13px] font-semibold">{fmtPct(r.p)}</div>
                </motion.div>
              ))}
            </Card>
            <RawInspector response={response} request={request} />
          </div>
        )}
      </div>
    </div>
  );
}
