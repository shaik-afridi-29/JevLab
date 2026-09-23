"use client";

import React from "react";
import Link from "next/link";
import { Copy, Play, Download, Upload, Trash2, GitCompareArrows, Plus } from "lucide-react";
import { Button, Card, EmptyState, SectionHead, inputCls } from "@/components/ui";
import { ProbBar } from "@/components/visuals";
import { useLab } from "@/lib/store";
import { timeAgo, downloadJson, fmtPct, uid } from "@/lib/utils";
import type { Experiment } from "@/lib/jev/types";
import { logUsageFromResponse } from "@/lib/cost";

function playgroundFor(e: Experiment): string {
  if (e.kind === "noul" || (e.questions.length === 1 && e.questions[0].type === "noul")) return "/noul";
  if (e.kind === "choice" || (e.questions.length === 1 && e.questions[0].type === "choice")) return "/choice";
  if (e.kind === "score" || (e.questions.length === 1 && e.questions[0].type === "score")) return "/score";
  return "/multi";
}

export default function LibraryPage() {
  const experiments = useLab((s) => s.experiments);
  const results = useLab((s) => s.results);
  const upsert = useLab((s) => s.upsertExperiment);
  const remove = useLab((s) => s.removeExperiment);
  const duplicate = useLab((s) => s.duplicateExperiment);
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const [q, setQ] = React.useState("");
  const [tag, setTag] = React.useState<string | null>(null);
  const [compare, setCompare] = React.useState<string[]>([]);
  const [cmpRes, setCmpRes] = React.useState<{ a: number; b: number } | null>(null);
  const [cmpLoading, setCmpLoading] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState<string | null>(null);

  const allTags = React.useMemo(() => Array.from(new Set(experiments.flatMap((e) => e.tags))).sort(), [experiments]);
  const filtered = experiments.filter((e) => {
    if (tag && !e.tags.includes(tag)) return false;
    if (!q.trim()) return true;
    const hay = `${e.name} ${e.description ?? ""} ${e.tags.join(" ")}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const doCompare = async () => {
    const [aid, bid] = compare;
    const a = experiments.find((e) => e.id === aid);
    const b = experiments.find((e) => e.id === bid);
    if (!a || !b) return;
    const qa = a.questions.find((x) => x.type === "noul") ?? a.questions[0];
    const qb = b.questions.find((x) => x.type === "noul") ?? b.questions[0];
    if (!qa || !qb) return;
    setCmpLoading(true);
    try {
      const runOne = (exp: Experiment, qq: (typeof exp.questions)[number]) =>
        fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, state: exp.state, questions: { probe: { type: qq.type, instructions: qq.instructions, criteria: qq.criteria } }, demo: demoMode }) })
          .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); logUsageFromResponse("library-compare", j); return j; });
      const [ra, rb] = await Promise.all([runOne(a, qa), runOne(b, qb)]);
      const pa = ra.answers?.probe?.type === "noul" ? ra.answers.probe.noul : Object.values(ra.answers?.probe?.probabilities ?? {})[0] as number ?? 0;
      const pb = rb.answers?.probe?.type === "noul" ? rb.answers.probe.noul : Object.values(rb.answers?.probe?.probabilities ?? {})[0] as number ?? 0;
      setCmpRes({ a: pa, b: pb });
    } finally { setCmpLoading(false); }
  };

  const importFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(String(r.result));
        const list = Array.isArray(j) ? j : [j];
        for (const item of list) {
          const t = new Date().toISOString();
          upsert({ id: uid("exp"), name: String(item.name ?? "Imported"), description: item.description ?? "", state: item.state ?? "", questions: Array.isArray(item.questions) ? item.questions : [], createdAt: t, updatedAt: t, tags: Array.isArray(item.tags) ? item.tags : ["imported"], kind: item.kind ?? "mixed" } as Experiment);
        }
      } catch { /* ignore */ }
    };
    r.readAsText(f);
  };

  const cmpExps = compare.map((id) => experiments.find((e) => e.id === id)).filter(Boolean) as Experiment[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Saved Experiments</h1>
          <p className="mt-1 text-[14px] text-mist-400">{experiments.length} saved · autosaved drafts persist across sessions.</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line/12 bg-wash/[0.02] px-3 py-2 text-[13px] hover:border-line/25">
            <Upload size={14} /> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
          </label>
          <Button variant="outline" size="sm" onClick={() => downloadJson("jev-lab-library.json", experiments)}><Download size={14} /> Export all</Button>
        </div>
      </div>

      {cmpExps.length > 0 && (
        <Card className="mb-4 p-5">
          <SectionHead eyebrow="Compare" title={cmpExps.length === 2 ? `${cmpExps[0].name} vs ${cmpExps[1].name}` : "Select two experiments to compare"} hint="First Noul (or first question) of each, run against its own state. Observed difference only." right={cmpExps.length === 2 ? <Button size="sm" onClick={doCompare} disabled={cmpLoading}><GitCompareArrows size={13} /> {cmpLoading ? "Comparing…" : "Compare"}</Button> : undefined} />
          <div className="flex flex-wrap gap-2">
            {cmpExps.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-2 rounded-full border border-line/12 bg-wash/[0.03] px-3 py-1 text-[12.5px]">
                {e.name}
                <button onClick={() => { setCompare((c) => c.filter((x) => x !== e.id)); setCmpRes(null); }} className="text-mist-500 hover:text-mist-100">✕</button>
              </span>
            ))}
          </div>
          {cmpRes && (
            <div className="mt-4 space-y-3">
              <div><div className="mb-1 flex justify-between text-[12.5px]"><span>A · {cmpExps[0].name}</span><span className="mono-num font-mono font-semibold">{fmtPct(cmpRes.a)}</span></div><ProbBar value={cmpRes.a} tone="blue" /></div>
              <div><div className="mb-1 flex justify-between text-[12.5px]"><span>B · {cmpExps[1].name}</span><span className="mono-num font-mono font-semibold">{fmtPct(cmpRes.b)}</span></div><ProbBar value={cmpRes.b} tone="violet" /></div>
              <div className="rounded-lg bg-wash/[0.03] p-3 text-center text-[13px]">Observed difference: <span className="mono-num font-mono font-semibold">{cmpRes.b - cmpRes.a >= 0 ? "+" : ""}{((cmpRes.b - cmpRes.a) * 100).toFixed(1)} percentage points</span></div>
            </div>
          )}
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search experiments…" className={`${inputCls} max-w-xs`} aria-label="Search experiments" />
        <button onClick={() => setTag(null)} className={`rounded-full border px-3 py-1.5 text-[12px] ${tag === null ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400"}`}>All</button>
        {allTags.map((t) => (
          <button key={t} onClick={() => setTag(tag === t ? null : t)} className={`rounded-full border px-3 py-1.5 font-mono text-[12px] ${tag === t ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25"}`}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No experiments match" body="Try a different search, or start from a template." actions={<Link href="/templates"><Button size="sm">Browse templates</Button></Link>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((e) => {
            const n = results.filter((r) => r.experimentId === e.id).length;
            const inCmp = compare.includes(e.id);
            return (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-semibold">{e.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-mist-500">Type: {e.kind ?? e.questions[0]?.type ?? "mixed"} · Runs: {n} · {timeAgo(e.updatedAt)}</div>
                    {e.description && <div className="mt-1 line-clamp-2 text-[12.5px] text-mist-400">{e.description}</div>}
                    <div className="mt-2 flex flex-wrap gap-1">{e.tags.map((t) => (<span key={t} className="rounded bg-wash/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-mist-400">{t}</span>))}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/[0.07] pt-3">
                  <Link href={playgroundFor(e)}><Button size="sm" variant="subtle"><Play size={12} /> Open</Button></Link>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(e.id)}><Copy size={12} /> Duplicate</Button>
                  <Button size="sm" variant={inCmp ? "subtle" : "ghost"} onClick={() => { setCmpRes(null); setCompare((c) => (inCmp ? c.filter((x) => x !== e.id) : [...c, e.id].slice(-2))); }}><GitCompareArrows size={12} /> Compare</Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadJson(`${e.name}.json`, e)}><Download size={12} /> Export</Button>
                  {confirmDel === e.id ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <button onClick={() => { remove(e.id); setConfirmDel(null); }} className="rounded-md bg-red-500/20 px-2 py-1 font-medium text-red-200">Confirm</button>
                      <button onClick={() => setConfirmDel(null)} className="rounded-md px-2 py-1 text-mist-400 hover:bg-wash/[0.06]">Cancel</button>
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(e.id)}><Trash2 size={12} /></Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
