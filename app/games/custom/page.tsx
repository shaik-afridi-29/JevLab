"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function CustomGamePage() {
  return (
    <Playground
      draftKey="custom"
      title="Custom Game"
      subtitle="Design your own scenario: state is the world, questions are the mechanics. Save it to the library when it plays well."
      edu="A custom experiment with a name, description, state, questions, variables and tags. Run, duplicate, edit, delete, compare and export as JSON from the library."
      initial={{
        id: uid("exp"), name: "Untitled Custom Game", description: "",
        state: "Describe your scenario: characters, resources, constraints, goal.",
        questions: [
          { id: uid("q"), name: "viable", type: "noul", instructions: "Is the current plan viable?", criteria: {} },
          { id: uid("q"), name: "best_move", type: "choice", instructions: "Which move is best?", criteria: { move_a: "Describe move A", move_b: "Describe move B" } },
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: ["game", "custom"], kind: "mixed",
      }}
    />
  );
}
