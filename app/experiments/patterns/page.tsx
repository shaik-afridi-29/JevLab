"use client";

import React from "react";
import { Play } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field } from "@/components/ui";
import { StateEditor, parseStateValue } from "@/components/editors";
import { AnswerCard, RawInspector } from "@/components/visuals";
import { PATTERNS, decide, patternRequest, type Thresholds } from "@/lib/patterns";
import { logUsageFromResponse } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { JevApiResponse, JevApiRequest, JevAnswer } from "@/lib/jev/types";

interface LogRow {
  ts: string;
  action: string;
  detail: string;
  tone: "ok" | "warn" | "bad";
}

const toneCls: Record<LogRow["tone"], string> = {
  ok: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  bad: "border-red-400/30 bg-red-400/10 text-red-300",
};

export default function PatternsPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const [pid, setPid] = React.useState("guardrail");
  const pattern = PATTERNS.find((p) => p.id === pid)!;
  const [stateText, setStateText] = React.useState<string>(JSON.stringify(PATTERNS[0].defaultState, null, 2));
  const [warn, setWarn] = React.useState(0.5);
  const [hold, setHold] = React.useState(0.7);
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<JevApiResponse | null>(null);
  const [request, setRequest] = React.useState<JevApiRequest | null>(null);
  const [decision, setDecision] = React.useState<{ action: string; detail: string; tone: LogRow["tone"] } | null>(null);
  const [log, setLog] = React.useState<LogRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const switchPattern = (id: string) => {
    const p = PATTERNS.find((x) => x.id === id)!;
    setPid(id);
    setStateText(typeof p.defaultState === "string" ? p.defaultState : JSON.stringify(p.defaultState, null, 2));
    setResponse(null);
    setDecision(null);
    setError(null);
  };

  const doRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const req = patternRequest(pattern, parseStateValue(stateText), model);
      setRequest(req);
      const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Pattern run failed");
      logUsageFromResponse("patterns", body);
      setResponse(body);
      const probs: Record<string, number> = {};
      for (const [k, a] of Object.entries(body.answers)) {
        const ans = a as JevAnswer;
        probs[k] = ans.type === "noul" ? ans.noul : ans.type === "choice" ? ans.probabilities[ans.choice] ?? 0 : ans.score;
      }
      const t: Thresholds = { warn, hold };
      const d = decide(pid, probs, t);
      setDecision(d);
      setLog((l) => [{ ts: new Date().toLocaleTimeString(), action: d.action.toUpperCase(), detail: d.detail, tone: d.tone }, ...l].slice(0, 30));
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

  const counts = log.reduce((m, r) => ({ ...m, [r.action]: (m[r.action] ?? 0) + 1 }), {} as Record<string, number>);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Production Patterns</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-mist-400">The six shapes the community actually ships: guardrails, routers, gates, checkers, rerankers, classifiers. State in, Jev judges, code decides.</p>
        <div className="mt-2.5 flex gap-2"><Edu text="Every pattern follows one loop: upstream code produces state, Jev returns typed judgments in parallel, your policy maps them to an action. The verdict banner is application logic — Jev only supplied the probabilities." />{demoMode && <DemoBadge />}</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {PATTERNS.map((p) => (
          <button key={p.id} onClick={() => switchPattern(p.id)} className={cn("rounded-lg border px-3 py-2 text-[13px] font-medium", pid === p.id ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25")}>{p.title}</button>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="text-[13px] text-mist-300"><span className="font-semibold text-mist-100">{pattern.title}.</span> {pattern.blurb}</div>
        <div className="mt-1 font-mono text-[11px] text-mist-500">{pattern.source} · {pattern.explain}</div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <SectionHead eyebrow="State" title="Upstream context" hint="What your software already has: task, plan, pending action, page, claim." />
          <StateEditor value={stateText} onChange={setStateText} />
          {(pid === "guardrail" || pid === "rag-gate") && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label={`Warn at ${warn.toFixed(2)}`}><input type="range" min={0} max={1} step={0.05} value={warn} onChange={(e) => setWarn(Number(e.target.value))} className="w-full accent-amber-300" /></Field>
              <Field label={`Hold at ${hold.toFixed(2)}`}><input type="range" min={0} max={1} step={0.05} value={hold} onChange={(e) => setHold(Number(e.target.value))} className="w-full accent-red-400" /></Field>
            </div>
          )}
          <Button onClick={doRun} disabled={loading} className="mt-4 w-full" size="lg" kbd="⌘⏎"><Play size={15} /> {loading ? "Judging…" : "Run pattern"}</Button>
          {error && <div className="mt-3"><ErrorBox title="Pattern run failed" detail={error} /></div>}
          {decision && (
            <div className={cn("mt-4 rounded-xl border px-4 py-3", toneCls[decision.tone])}>
              <div className="text-[15px] font-bold tracking-wide">{decision.action.toUpperCase()}</div>
              <div className="mt-0.5 text-[12.5px] opacity-80">{decision.detail}</div>
            </div>
          )}
          {response && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(response.answers).map(([k, a]) => (
                <AnswerCard key={k} qKey={k} answer={a as JevAnswer} />
              ))}
            </div>
          )}
          {response && <div className="mt-4"><RawInspector response={response} request={request} /></div>}
          {!response && !loading && !error && <div className="mt-3"><EmptyState title="No judgment yet" body="Run the pattern to see Jev's answers and the routed verdict." /></div>}
        </Card>

        <Card className="p-5">
          <SectionHead eyebrow="Session" title="Verdict log" hint="Counts this session, like pi-warden's hold log." />
          {Object.keys(counts).length === 0 ? (
            <p className="text-[13px] text-mist-500">Runs accumulate here with their routed actions.</p>
          ) : (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Object.entries(counts).map(([k, v]) => (
                <span key={k} className="rounded-full bg-wash/[0.05] px-2.5 py-1 font-mono text-[11px] text-mist-300">{k} × {v}</span>
              ))}
            </div>
          )}
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {log.map((r, i) => (
              <div key={i} className={cn("rounded-lg border px-3 py-2", toneCls[r.tone])}>
                <div className="flex justify-between text-[12px] font-bold"><span>{r.action}</span><span className="font-mono font-normal opacity-70">{r.ts}</span></div>
                <div className="mt-0.5 text-[12px] opacity-80">{r.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
