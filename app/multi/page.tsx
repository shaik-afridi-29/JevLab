"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function MultiPage() {
  return (
    <Playground
      title="Multi-Question Playground"
      subtitle="Run Noul, Choice and Score against the same state in one round trip."
      edu="Every question in a request sees the same state and is evaluated in parallel. Mixing types is encouraged: route with Choice, gate with Noul, rate with Score."
      initial={{
        id: uid("exp"),
        name: "Untitled Multi",
        description: "",
        state: "Customer: “I've been charged twice for my annual plan this morning. Please refund one of the charges today.”",
        questions: [
          { id: uid("q"), name: "is_billing", type: "noul", instructions: "Is this a billing issue?", criteria: {} },
          { id: uid("q"), name: "department", type: "choice", instructions: "Which department should handle it?", criteria: { billing: "Payment issues", technical: "Bugs", sales: "Pricing questions" } },
          { id: uid("q"), name: "frustration", type: "score", instructions: "How frustrated is the customer?", criteria: ["Calm", "Frustrated", "Very angry"] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["multi"],
        kind: "mixed",
      }}
    />
  );
}
