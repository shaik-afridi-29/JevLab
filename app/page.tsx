"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDot, SplitSquareHorizontal, Gauge, FlaskConical, ArrowRight, Play, Beaker, Timer, Scale, Workflow, GraduationCap, TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useLab } from "@/lib/store";
import { timeAgo, playgroundFor } from "@/lib/utils";

const EXPLORE: { heading: string; links: { href: string; icon: React.ReactNode; title: string; body: string }[] }[] = [
  {
    heading: "Playgrounds",
    links: [
      { href: "/noul", icon: <CircleDot size={15} />, title: "Noul", body: "Yes / no truth evaluation" },
      { href: "/choice", icon: <SplitSquareHorizontal size={15} />, title: "Choice", body: "Compare alternatives" },
      { href: "/score", icon: <Gauge size={15} />, title: "Score", body: "Rank on an ordered scale" },
      { href: "/multi", icon: <FlaskConical size={15} />, title: "Multi", body: "All types, one state" },
    ],
  },
  {
    heading: "Experiments",
    links: [
      { href: "/experiments/jaggedness", icon: <TriangleAlert size={15} />, title: "Jaggedness Gauntlet", body: "9 failure modes, runnable" },
      { href: "/experiments/confidence-lab", icon: <Scale size={15} />, title: "Confidence Lab", body: "Shape → policy" },
      { href: "/experiments/patterns", icon: <Workflow size={15} />, title: "Patterns", body: "Guardrails that ship" },
      { href: "/experiments/ledger", icon: <Timer size={15} />, title: "Ledger", body: "Spend + latency" },
    ],
  },
  {
    heading: "Play & Learn",
    links: [
      { href: "/games/chess", icon: <Play size={15} />, title: "Chess vs Jev", body: "Choice over legal moves" },
      { href: "/games/loop", icon: <Timer size={15} />, title: "Loop Arena", body: "Real-time decisions" },
      { href: "/games/detective", icon: <Beaker size={15} />, title: "Detective", body: "Evidence board" },
      { href: "/learn", icon: <GraduationCap size={15} />, title: "Learn Jev", body: "Model, math, limits" },
    ],
  },
];

export default function OverviewPage() {
  const router = useRouter();
  const experiments = useLab((s) => s.experiments).filter((e) => !e.isDraft);
  const results = useLab((s) => s.results);
  const requestOpen = useLab((s) => s.requestOpen);
  const demoMode = useLab((s) => s.demoMode);
  const recent = experiments.slice(0, 3);

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

      {/* Continue — resume exact work, not a gallery */}
      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Continue</h2>
        <Link href="/library" className="text-[12.5px] font-medium text-mist-400 hover:text-mist-100">View library →</Link>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-2xl border border-line/[0.08] bg-ink-900 px-8 py-10 text-center">
          <Beaker size={22} className="mx-auto text-mist-500" />
          <h3 className="mt-3 text-[16px] font-semibold">Your Jev laboratory is empty.</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-mist-400">Saved experiments reappear here. Start with a question.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/noul"><Button size="sm">Explore Noul</Button></Link>
            <Link href="/choice"><Button size="sm" variant="outline">Explore Choice</Button></Link>
            <Link href="/experiments/jaggedness"><Button size="sm" variant="ghost">Run the Gauntlet</Button></Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line/[0.08]">
          {recent.map((e) => {
            const runs = results.filter((r) => r.experimentId === e.id).length;
            const last = results.find((r) => r.experimentId === e.id);
            return (
              <button
                key={e.id}
                onClick={() => { requestOpen(e.id); router.push(playgroundFor(e)); }}
                className="flex w-full items-center gap-4 border-b border-line/[0.06] bg-ink-900 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-ink-850"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{e.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-mist-500">{e.kind ?? "experiment"} · {e.questions.length} question{e.questions.length === 1 ? "" : "s"} · {timeAgo(e.updatedAt)}</div>
                </div>
                <div className="hidden font-mono text-[11.5px] text-mist-500 sm:block">{runs} run{runs === 1 ? "" : "s"}</div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${runs > 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-wash/[0.06] text-mist-400"}`}>{runs > 0 ? (last?.demo ? "demo" : "done") : "draft"}</span>
                <ArrowRight size={14} className="shrink-0 text-mist-500" />
              </button>
            );
          })}
        </div>
      )}

      {/* Explore — one compact strip, grouped by job */}
      <h2 className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Explore the lab</h2>
      <div className="grid gap-3 xl:grid-cols-3">
        {EXPLORE.map((group) => (
          <div key={group.heading} className="rounded-xl border border-line/[0.08] bg-ink-900 p-2">
            <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">{group.heading}</div>
            {group.links.map((q) => (
              <Link key={q.title} href={q.href} className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-wash/[0.04]">
                <span className="text-mist-500 transition-colors group-hover:text-emerald-300">{q.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{q.title}</span>
                  <span className="block truncate text-[12px] text-mist-500">{q.body}</span>
                </span>
                <ArrowRight size={13} className="ml-auto shrink-0 text-mist-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
