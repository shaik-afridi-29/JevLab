"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { TEMPLATES } from "@/lib/seed";
import { useLab } from "@/lib/store";
import { uid } from "@/lib/utils";
import type { Experiment } from "@/lib/jev/types";

export default function TemplatesPage() {
  const upsert = useLab((s) => s.upsertExperiment);
  const router = useRouter();

  const use = (i: number) => {
    const t = TEMPLATES[i];
    const now = new Date().toISOString();
    const exp: Experiment = {
      ...JSON.parse(JSON.stringify(t.experiment)),
      id: uid("exp"), createdAt: now, updatedAt: now,
      questions: t.experiment.questions.map((q, n) => ({ ...q, id: uid("q") })),
    };
    upsert(exp);
    router.push("/library");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-[14px] text-mist-400">Starter configurations. One click copies them into your library.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t, i) => (
          <Card key={t.name} className="flex flex-col p-5">
            <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">{t.tags.join(" · ")}</div>
            <div className="mt-1 text-[15.5px] font-semibold tracking-tight">{t.name}</div>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-mist-400">{t.description}</p>
            <div className="mt-2 font-mono text-[11.5px] text-mist-500">{t.experiment.questions.length} question{t.experiment.questions.length === 1 ? "" : "s"}</div>
            <Button size="sm" className="mt-4" onClick={() => use(i)}>Use template <ArrowRight size={13} /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
