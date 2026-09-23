"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

const STATE = `CASE #001 — The Missing Diamond.

EVIDENCE #1: Safe opened with the correct combination. No forced entry.
EVIDENCE #2: Alice seen near the gallery at 9pm.
EVIDENCE #3: Bob's shift log says he left at 8:30pm, but a camera shows him at 9:15pm.
EVIDENCE #4: Charlie has gambling debts.
EVIDENCE #5: David's fingerprints are on the safe — he is the curator with legitimate access.`;

export default function DetectivePage() {
  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-2xl border border-line/[0.08] bg-ink-900">
        <div className="border-b border-line/[0.07] bg-wash/[0.015] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-mist-500">Case file · Jev assessment — not objective truth</div>
        <div className="grid gap-0 sm:grid-cols-[1fr_220px]">
          <div className="whitespace-pre-line px-5 py-4 text-[13px] leading-relaxed text-mist-300">{STATE}</div>
          <div className="border-t border-line/[0.07] px-5 py-4 sm:border-l sm:border-t-0">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">Suspects</div>
            {["Alice", "Bob", "Charlie", "David"].map((s) => (
              <div key={s} className="mb-1.5 rounded-lg bg-wash/[0.03] px-3 py-2 text-[13px] font-medium">{s}</div>
            ))}
          </div>
        </div>
      </div>
      <Playground
        title="Jev Detective"
        subtitle="Interrogate the evidence. Every answer is a Jev assessment, not the actual culprit."
        edu="Ask Noul (is Alice responsible?), Choice (who is most consistent with the evidence?) and Score (how suspicious is Charlie?) against the same case file. The game has no predefined answer — probabilities describe Jev's reading of the evidence."
        initial={{
          id: uid("exp"), name: "Detective — Missing Diamond", description: "Case #001", state: STATE,
          questions: [
            { id: uid("q"), name: "alice", type: "noul", instructions: "Is Alice responsible for the missing diamond?", criteria: {} },
            { id: uid("q"), name: "bob_consistent", type: "noul", instructions: "Is Bob's statement consistent with the evidence?", criteria: {} },
            { id: uid("q"), name: "suspect", type: "choice", instructions: "Who is most consistent with the evidence as the responsible party?", criteria: { alice: "Seen near gallery, no other link.", bob: "Shift log contradicts camera.", charlie: "Gambling debts, motive only.", david: "Prints on safe, legitimate access." } },
            { id: uid("q"), name: "charlie_danger", type: "score", instructions: "How suspicious is Charlie?", criteria: ["Not suspicious", "Mildly suspicious", "Suspicious", "Highly suspicious", "Almost certainly involved"] },
          ],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: ["game", "detective"], kind: "mixed",
        }}
      />
    </div>
  );
}
