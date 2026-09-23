"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play, Save, Plus, Download, Upload, Copy, Trash2 } from "lucide-react";
import { Button, Card, Edu, ErrorBox, ResultSkeleton, EmptyState, DemoBadge, SectionHead } from "./ui";
import { StateEditor, QuestionCardEditor, parseStateValue, newQuestion } from "./editors";
import { AnswerCard, RawInspector } from "./visuals";
import { useJevRun } from "./useJevRun";
import { experimentToRequest } from "@/lib/jev/service";
import { validateExperiment } from "@/lib/jev/validators";
import type { Experiment, Question, QuestionType } from "@/lib/jev/types";
import { useLab } from "@/lib/store";
import { uid, downloadJson, timeAgo } from "@/lib/utils";

export function Playground({
  title, subtitle, edu, initial, allowed = ["noul", "choice", "score"], singleType,
}: {
  title: string; subtitle: string; edu: string;
  initial: Experiment;
  allowed?: QuestionType[];
  singleType?: QuestionType;
}) {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);
  const upsert = useLab((s) => s.upsertExperiment);
  const addResult = useLab((s) => s.addResult);
  const { loading, response, request, error, run, reset } = useJevRun();

  const [exp, setExp] = React.useState<Experiment>(initial);
  const [stateText, setStateText] = React.useState<string>(
    typeof initial.state === "string" ? initial.state : JSON.stringify(initial.state, null, 2)
  );
  const [savedTick, setSavedTick] = React.useState<string | null>(null);
  const dirty = React.useRef(false);

  // Autosave draft on change (debounced)
  React.useEffect(() => {
    dirty.current = true;
    const t = setTimeout(() => {
      if (!dirty.current) return;
      dirty.current = false;
      upsert({ ...exp, state: parseStateValue(stateText), name: exp.name });
      setSavedTick(new Date().toISOString());
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateText, exp.questions, exp.name, exp.description]);

  const issues = React.useMemo(
    () => validateExperiment({ state: parseStateValue(stateText), questions: exp.questions }),
    [stateText, exp.questions]
  );

  const doRun = React.useCallback(async () => {
    const req = experimentToRequest({ state: parseStateValue(stateText), questions: exp.questions }, model);
    const started = Date.now();
    const resp = await run(req);
    if (resp) {
      addResult({
        experimentId: exp.id, runId: uid("run"), timestamp: new Date().toISOString(),
        latencyMs: (resp as { _meta?: { latencyMs?: number } })._meta?.latencyMs ?? Date.now() - started,
        response: resp, request: req, demo: demoMode,
      });
    }
  }, [exp, stateText, model, run, addResult, demoMode]);

  // ⌘⏎ runs, ⌘S saves
  React.useEffect(() => {
    const onRun = () => doRun();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); doRun(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        upsert({ ...exp, state: parseStateValue(stateText) });
        setSavedTick(new Date().toISOString());
      }
    };
    window.addEventListener("jev:run", onRun);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("jev:run", onRun); window.removeEventListener("keydown", onKey); };
  }, [doRun, exp, stateText, upsert]);

  const updateQ = (q: Question) => setExp((e) => ({ ...e, questions: e.questions.map((x) => (x.id === q.id ? q : x)) }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-mist-400">{subtitle}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <Edu text={edu} />
            {demoMode && <DemoBadge />}
            {savedTick && <span className="text-[11.5px] text-mist-500">Draft autosaved {timeAgo(savedTick)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadJson(`${exp.name || "experiment"}.json`, { ...exp, state: parseStateValue(stateText) })}>
            <Download size={14} /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => { upsert({ ...exp, state: parseStateValue(stateText) }); setSavedTick(new Date().toISOString()); }}>
            <Save size={14} /> Save
          </Button>
          <Button size="sm" disabled={loading || issues.length > 0} onClick={doRun} kbd="⌘⏎">
            <Play size={14} /> {loading ? "Running…" : "Run with Jev"}
          </Button>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] text-amber-200">
          <span className="font-semibold">Check before running: </span>{issues.slice(0, 3).map((i) => i.message).join(" · ")}
          {issues.length > 3 && ` (+${issues.length - 3} more)`}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {/* LEFT: state */}
        <Card className="p-5">
          <SectionHead eyebrow="Step 1" title="State" hint="What Jev should judge. Text or structured JSON." />
          <StateEditor value={stateText} onChange={(v) => { setStateText(v); reset(); }} />
          <div className="mt-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-mist-200">Experiment name</label>
            <input value={exp.name} onChange={(e) => setExp({ ...exp, name: e.target.value })} className="w-full rounded-lg border border-line/10 bg-ink-950 px-3 py-2 text-[13.5px] outline-none focus:border-emerald-400/50" />
          </div>
        </Card>

        {/* RIGHT: questions */}
        <Card className="p-5">
          <SectionHead
            eyebrow="Step 2"
            title={singleType ? `${singleType[0].toUpperCase() + singleType.slice(1)} question` : "Questions"}
            hint={singleType === "choice" ? "Compare multiple alternatives. Add, delete and reorder options." : singleType === "score" ? "Evaluate against an ordered low → high scale." : "Ask Jev whether something is true."}
            right={
              !singleType && (
                <div className="flex gap-1">
                  {allowed.map((t) => (
                    <button key={t} onClick={() => setExp((e) => ({ ...e, questions: [...e.questions, newQuestion(t, e.questions.length + 1)] }))} className="rounded-md border border-line/10 px-2 py-1 text-[11.5px] capitalize text-mist-300 hover:border-line/25">
                      + {t}
                    </button>
                  ))}
                </div>
              )
            }
          />
          <div className="space-y-3">
            {exp.questions.map((q) => (
              <QuestionCardEditor key={q.id} q={q} onChange={updateQ} onRemove={exp.questions.length > 1 ? () => setExp((e) => ({ ...e, questions: e.questions.filter((x) => x.id !== q.id) })) : undefined} />
            ))}
          </div>
          {!singleType && (
            <button onClick={() => setExp((e) => ({ ...e, questions: [...e.questions, newQuestion("noul", e.questions.length + 1)] }))} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line/15 px-3 py-2 text-[13px] text-mist-300 hover:border-line/30">
              <Plus size={14} /> Add question
            </button>
          )}
          <div className="mt-5 border-t border-line/[0.07] pt-4">
            <Button disabled={loading || issues.length > 0} onClick={doRun} className="w-full" size="lg" kbd="⌘⏎">
              <Play size={16} /> {loading ? "Asking Jev…" : "Run with Jev"}
            </Button>
          </div>
        </Card>
      </div>

      {/* RESULTS */}
      <div className="mt-6">
        <SectionHead eyebrow="Step 3" title="Results" hint="Jev output · app visualization · observed interpretation. Never presented as certainty." />
        {loading && <ResultSkeleton />}
        {error && <ErrorBox title={error.title} detail={error.detail} />}
        {!loading && !error && !response && (
          <EmptyState title="No results yet" body="Define state and a question above, then run. Results animate in here with the full distribution — not just a winner." />
        )}
        {response && (
          <div className="space-y-4">
            {demoMode && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5 text-[12.5px] text-amber-200"><DemoBadge /> <span>Mock probabilities for UI exploration — not Jev output.</span></div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(response.answers).map(([k, a]) => (
                <AnswerCard key={k} qKey={k} answer={a} />
              ))}
            </div>
            <RawInspector response={response} request={request} />
          </div>
        )}
      </div>
    </div>
  );
}
