"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function NoulPage() {
  return (
    <Playground
      draftKey="noul"
      title="Noul Playground"
      subtitle="Ask Jev whether something is true."
      edu="A Noul represents a proposition and returns Jev's estimated probability that the proposition is true. It is not the same thing as certainty. A value near 0.5 means Jev cannot tell — not a middle rating."
      singleType="noul"
      allowed={["noul"]}
      initial={{
        id: uid("exp"),
        name: "Untitled Noul",
        description: "",
        state: "The customer has contacted support three times about the same issue. The last agent promised a callback that never happened.",
        questions: [
          { id: uid("q"), name: "escalate", type: "noul", instructions: "Does this situation require escalation?", criteria: { true: "", false: "" } },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["noul"],
        kind: "noul",
      }}
    />
  );
}
