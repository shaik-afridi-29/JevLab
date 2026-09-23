import { ExternalLink } from "lucide-react";
import { Card, Edu } from "@/components/ui";

function LinkRow({ href, label, note }: { href: string; label: string; note: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-wash/[0.04]">
      <span>
        <span className="text-[13.5px] font-medium text-mist-100">{label}</span>
        <span className="block text-[12px] text-mist-500">{note}</span>
      </span>
      <ExternalLink size={13} className="mt-1 shrink-0 text-mist-500" />
    </a>
  );
}

export default function LearnPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Learn Jev</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-mist-400">Everything about Jev in one place: the model, the math, the limits, the ecosystem, and the honest debates. Curated September 2026.</p>
        <div className="mt-2.5"><Edu text="This page is a static digest of public sources (TypeSafe docs, independent evals, community builds). Figures are list prices and published claims — verify against the live API in the playgrounds." /></div>
      </div>

      <Card className="mb-4 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">The model</div>
        <h2 className="text-[16px] font-semibold">System One, named after Jevons</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mist-300">
          TypeSafe AI (San Francisco, founded by InstructGPT co-author Diogo Almeida) exited stealth on September 15, 2026 with $40M in seed funding led by DCVC.
          Jev is its first <em>System One</em> model — after Kahneman&apos;s fast, automatic judgment. It is named after economist William Stanley Jevons, whose paradox holds
          that making a resource cheaper increases total consumption of it: decisions cheap enough to make ten times a second get made ten times a second.
          Jev reads state once and answers every question in parallel, with no autoregressive loop — which is why output tokens are free.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Primitives</div>
          <div className="space-y-2 text-[13px]">
            <div><span className="font-mono font-semibold text-mist-100">Noul</span> <span className="text-mist-400">— yes/no probability 0–1. No confidence field; the probability is the signal. Short for Bernoulli.</span></div>
            <div><span className="font-mono font-semibold text-mist-100">Choice</span> <span className="text-mist-400">— up to 255 options. Returns argmax + full distribution + confidence. Add a none/other option when coverage is incomplete.</span></div>
            <div><span className="font-mono font-semibold text-mist-100">Score</span> <span className="text-mist-400">— 2–10 ordered levels. Returns a possibly-fractional expectation + distribution + legend. Ordered, not metric: never interpolate magnitudes.</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Confidence</div>
          <p className="text-[13px] leading-relaxed text-mist-300">Derived from distribution shape: <span className="font-mono">(n·peak−1)/(n−1)</span>. Three paths: act on high, confirm the middle, route low to a human. Thresholds scale with the cost of being wrong — try it in the Confidence Lab.</p>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Hard limits</div>
          <div className="space-y-1.5 font-mono text-[12.5px] text-mist-300">
            <div className="flex justify-between"><span>Choice options</span><span>max 255</span></div>
            <div className="flex justify-between"><span>Score levels</span><span>2–10</span></div>
            <div className="flex justify-between"><span>State + questions</span><span>64k tokens</span></div>
            <div className="flex justify-between"><span>State + longest question</span><span>32k tokens</span></div>
            <div className="flex justify-between"><span>Pinned model</span><span>jev-1.13.0</span></div>
            <div className="flex justify-between"><span>Jaggedness reviewed</span><span>2026-09-17</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Price &amp; speed</div>
          <div className="space-y-1.5 font-mono text-[12.5px] text-mist-300">
            <div className="flex justify-between"><span>Input</span><span>$0.042 / M tokens</span></div>
            <div className="flex justify-between"><span>Output</span><span>free</span></div>
            <div className="flex justify-between"><span>Latency</span><span>70–500 ms</span></div>
            <div className="flex justify-between"><span>Doom loop</span><span>~10 calls/s ≈ $7/hr</span></div>
          </div>
          <p className="mt-2 text-[12px] text-mist-500">TypeSafe notes pricing may be subsidized. Track your own burn in the Ledger.</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">The honest debates</div>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-mist-300">
          <li><span className="text-mist-100">“Can&apos;t hallucinate” is narrow.</span> Jev can&apos;t emit an invalid type — it can still pick the wrong valid option. Probe it in the Gauntlet.</li>
          <li><span className="text-mist-100">Calibration is per-question.</span> An independent study measured ECE ≈ 0.107 with overconfident Choice/Score. Reproduce the measurement in the Calibration Workbench.</li>
          <li><span className="text-mist-100">Benchmarks are vendor-run.</span> Test on your own data; compare cost per correct decision, not accuracy alone.</li>
          <li><span className="text-mist-100">Jev sits next to LLMs.</span> Rerank, route, verify, guard — generation stays with generative models.</li>
        </ul>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Ecosystem</div>
        <div className="divide-y divide-line/[0.06]">
          <LinkRow href="https://docs.typesafe.ai" label="Official docs + cookbooks" note="Primitives, confidence, jaggedness, rerank/citation/RAG recipes, llms.txt" />
          <LinkRow href="https://evals.typesafe.ai" label="TypeSafe evals" note="Vendor workflow benchmarks behind the 193×/444× claims" />
          <LinkRow href="https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway" label="Vercel AI Gateway" note="typesafe-ai/jev via AI SDK 7 evaluate, no waitlist" />
          <LinkRow href="https://www.langchain.com/blog/building-a-harness-with-jev" label="LangChain harness guide" note="TypeSafeClassifier, model routing, auto-mode guardrails" />
          <LinkRow href="https://madewithjev.com" label="Made with Jev (official)" note="Community build directory" />
          <LinkRow href="https://jevfinder.com" label="JevFinder" note="420+ independent builds incl. Doom/Mario/Smash loops" />
          <LinkRow href="https://github.com/DevMortimer/pi-warden" label="pi-warden" note="17k-call agent guardrail log that inspired Production Patterns" />
          <LinkRow href="https://github.com/TheoLeeCJ/openjev" label="openjev" note="Open interface reproduction on Qwen logits" />
        </div>
      </Card>
    </div>
  );
}
