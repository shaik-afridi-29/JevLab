"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function ScorePage() {
  return (
    <Playground
      draftKey="score"
      title="Score Playground"
      subtitle="Evaluate something against an ordered scale."
      edu="Score evaluates an item against an ordered scale. The resulting score is derived from the distribution — it can land between levels. Levels are ordered, not metric: do not treat 1.6 as '80% frustrated'."
      singleType="score"
      allowed={["score"]}
      initial={{
        id: uid("exp"),
        name: "Untitled Score",
        description: "",
        state: "The customer has written three increasingly angry messages about a double charge. No threats, but caps-lock and demands for a manager.",
        questions: [
          {
            id: uid("q"), name: "threat", type: "score",
            instructions: "How severe is this situation?",
            criteria: ["Harmless", "Minor threat", "Moderate threat", "Serious threat", "Extreme threat", "Existential threat"],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["score"],
        kind: "score",
      }}
    />
  );
}
