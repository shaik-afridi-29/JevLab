"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function MoviePage() {
  return (
    <Playground
      draftKey="movie"
      title="Movie Night"
      subtitle="Group fit as a Choice distribution. Change preferences or the lineup and rerun — watch the mass move."
      edu="Choice returns one probability per option, summing to 1. Editing state (preferences) or criteria (the lineup) redistributes mass — the demo of state-sensitivity in a fun setting."
      initial={{
        id: uid("exp"), name: "Movie Night", description: "Group fit",
        state: "Friends: Ana loves sci-fi/action. Ben wants comedy under two hours. Cara dislikes horror. Dev follows ratings. Movies: A: 2h20 sci-fi epic (8.8). B: 1h35 comedy (7.4). C: 1h50 horror (7.9). D: 2h05 slow drama (8.1).",
        questions: [
          { id: uid("q"), name: "group_fit", type: "choice", instructions: "Which movie maximizes overall group fit?", criteria: { movie_a: "Action-heavy sci-fi epic, 2h20, rated 8.8.", movie_b: "Light comedy, 1h35, rated 7.4.", movie_c: "Horror, 1h50, rated 7.9.", movie_d: "Slow drama, 2h05, rated 8.1." } },
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: ["game", "movie"], kind: "choice",
      }}
    />
  );
}
