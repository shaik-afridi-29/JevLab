"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CircleDot, SplitSquareHorizontal, Gauge, FlaskConical, ArrowRight, Play, Copy, Beaker } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui";
import { useLab } from "@/lib/store";
import { timeAgo, fmtPct } from "@/lib/utils";

const PRIMARY = [
  { href: "/noul", icon: <CircleDot size={20} />, tag: "YES / NO", title: "Noul", body: "Probabilistic truth evaluation", edu: "A Noul returns Jev's estimated probability that a proposition is true." },
  { href: "/choice", icon: <SplitSquareHorizontal size={20} />, tag: "SELECT", title: "Choice", body: "Compare multiple alternatives", edu: "Choice returns a probability distribution over predefined options." },
  { href: "/score", icon: <Gauge size={20} />, tag: "RANK", title: "Score", body: "Evaluate against an ordered scale", edu: "Score is derived from a distribution over ordered levels." },
  { href: "/experiments/question-sensitivity", icon: <FlaskConical size={20} />, tag: "EXPLORE", title: "Experiments", body: "Test Jev behavior", edu: "Fix state, vary wording — or fix wording, vary state — and observe." },
];

const QUICK = [
  { href: "/noul", title: "First Noul", body: "Ask your first yes/no question." },
  { href: "/choice", title: "Compare Choices", body: "See how Jev distributes probability." },
  { href: "/experiments/repeated", title: "Run an Experiment", body: "Test the same question repeatedly." },
  { href: "/experiments/adversarial", title: "Challenge Jev", body: "Try adversarial or ambiguous inputs." },
];

export default function OverviewPage() {
  const experiments = useLab((s) => s.experiments);
  const results = useLab((s) => s.results);
  const demoMode = useLab((s) => s.demoMode);
  const recent = experiments.slice(0, 5);

  return (
    <div>
      {/* Header with subtle abstract state→question→probability viz */}
      <div className="relative overflow-hidden rounded-2xl border border-line/[0.08] bg-ink-900 px-6 py-8 sm:px-8">
        <div className="lab-grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[560px] -translate-x-1/2 rounded-full bg-emerald-400/[0.07] blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Experimentation environment</div>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight sm:text-[34px]">Jev Lab</h1>
          <p className="mt-1 max-w-xl text-[14.5px] text-mist-400">Explore probabilistic decision-making with Jev. State + questions + criteria → structured probabilities → visual analysis.</p>
          <div className="mt-5 flex items-center gap-2 font-mono text-[11.5px] text-mist-500">
            <span className="rounded-md border border-line/10 bg-ink-950 px-2 py-1">STATE</span><span>→</span>
            <span className="rounded-md border border-line/10 bg-ink-950 px-2 py-1">QUESTION</span><span>→</span>
            <span className="rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-2 py-1 text-emerald-200">PROBABILITY</span>
            {demoMode && <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-200">DEMO MODE</span>}
          </div>
        </div>
      </div>

      {/* Primary cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRIMARY.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={c.href} className="group block rounded-xl border border-line/[0.08] bg-ink-900 p-5 shadow-card transition-colors hover:border-line/[0.16]">
              <div className="flex items-center justify-between">
                <span className="text-mist-400 transition-colors group-hover:text-emerald-300">{c.icon}</span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mist-500">{c.tag}</span>
              </div>
              <div className="mt-3 text-[16px] font-semibold tracking-tight">{c.title}</div>
              <div className="mt-0.5 text-[13px] text-mist-400">{c.body}</div>
              <div className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-mist-500 transition-colors group-hover:text-mist-200">Open <ArrowRight size={13} /></div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick start */}
      <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Quick start</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.title} href={q.href} className="rounded-xl border border-line/[0.08] bg-wash/[0.015] p-4 transition-colors hover:border-line/[0.16] hover:bg-wash/[0.03]">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><Play size={13} className="text-emerald-300" />{q.title}</div>
            <div className="mt-1 text-[13px] text-mist-400">{q.body}</div>
          </Link>
        ))}
      </div>

      {/* Go deeper */}
      <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Go deeper</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/experiments/jaggedness", title: "Jaggedness Gauntlet", body: "All 9 official failure modes, runnable." },
          { href: "/experiments/confidence-lab", title: "Confidence Lab", body: "From distribution shape to action policy." },
          { href: "/experiments/patterns", title: "Production Patterns", body: "Guardrails, routers, gates that ship." },
          { href: "/learn", title: "Learn Jev", body: "Model, math, limits, ecosystem." },
        ].map((q) => (
          <Link key={q.title} href={q.href} className="rounded-xl border border-line/[0.08] bg-wash/[0.015] p-4 transition-colors hover:border-line/[0.16] hover:bg-wash/[0.03]">
            <div className="text-[14px] font-semibold">{q.title}</div>
            <div className="mt-1 text-[13px] text-mist-400">{q.body}</div>
          </Link>
        ))}
      </div>

      {/* Recent */}
      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Recent experiments</h2>
        <Link href="/library" className="text-[12.5px] font-medium text-mist-400 hover:text-mist-100">View library →</Link>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-line/[0.08] bg-ink-900 px-8 py-12 text-center">
          <Beaker size={22} className="mx-auto text-mist-500" />
          <h3 className="mt-3 text-[16px] font-semibold">Your Jev laboratory is empty.</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-mist-400">Start with a question.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/noul"><Button size="sm">Explore Noul</Button></Link>
            <Link href="/choice"><Button size="sm" variant="outline">Explore Choice</Button></Link>
            <Link href="/score"><Button size="sm" variant="outline">Explore Score</Button></Link>
            <Link href="/experiments/question-sensitivity"><Button size="sm" variant="ghost">Browse Experiments</Button></Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line/[0.08]">
          {recent.map((e) => {
            const runs = results.filter((r) => r.experimentId === e.id).length;
            const last = results.find((r) => r.experimentId === e.id);
            return (
              <Link key={e.id} href="/library" className="flex items-center gap-4 border-b border-line/[0.06] bg-ink-900 px-4 py-3.5 transition-colors last:border-0 hover:bg-ink-850">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{e.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-mist-500">{e.kind ?? "experiment"} · {e.questions.length} question{e.questions.length === 1 ? "" : "s"} · {timeAgo(e.updatedAt)}</div>
                </div>
                <div className="hidden font-mono text-[11.5px] text-mist-500 sm:block">{runs} run{runs === 1 ? "" : "s"}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${runs > 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-wash/[0.06] text-mist-400"}`}>{runs > 0 ? (last?.demo ? "demo" : "done") : "draft"}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
