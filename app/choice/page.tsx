"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function ChoicePage() {
  return (
    <Playground
      title="Choice Playground"
      subtitle="Ask Jev to select among defined alternatives."
      edu="Choice evaluates several predefined alternatives and returns a probability distribution over them. The highlighted option is the argmax — read the full distribution, not just the winner. Add a none/other option when the list may not cover every input."
      singleType="choice"
      allowed={["choice"]}
      initial={{
        id: uid("exp"),
        name: "Untitled Choice",
        description: "",
        state: "Four friends choosing a film. Ana loves sci-fi. Ben wants comedy under two hours. Cara dislikes horror.",
        questions: [
          {
            id: uid("q"), name: "pick", type: "choice",
            instructions: "Which movie maximizes overall group fit?",
            criteria: { movie_a: "Action-heavy science fiction.", movie_b: "Comedy under two hours.", movie_c: "Horror film." },
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["choice"],
        kind: "choice",
      }}
    />
  );
}
