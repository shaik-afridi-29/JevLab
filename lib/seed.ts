import type { Experiment } from "@/lib/jev/types";
import { uid } from "@/lib/utils";

const now = () => new Date().toISOString();

function mk(e: Omit<Experiment, "id" | "createdAt" | "updatedAt">): Experiment {
  const t = now();
  return { ...e, id: uid("exp"), createdAt: t, updatedAt: t };
}

export function seedExperiments(): Experiment[] {
  return [
    mk({
      name: "Customer Escalation",
      description: "Noul gate: does this support situation require escalation?",
      kind: "noul",
      tags: ["noul", "support", "starter"],
      state:
        "The customer has contacted support three times about the same billing issue. The last agent promised a callback that never happened. The customer is asking to speak with a manager.",
      questions: [
        {
          id: uid("q"),
          name: "escalate",
          type: "noul",
          instructions: "Does this situation require escalation to a manager?",
          criteria: { true: "Needs manager intervention", false: "Front-line support can resolve" },
        },
      ],
    }),
    mk({
      name: "Movie Night",
      description: "Choice: which film maximizes group fit?",
      kind: "choice",
      tags: ["choice", "starter"],
      state:
        "Four friends. Ana loves sci-fi and action. Ben wants comedy under two hours. Cara dislikes horror. Dev will watch anything highly rated. Available: a 2h20 sci-fi epic, a 1h35 comedy, a horror film, a slow drama.",
      questions: [
        {
          id: uid("q"),
          name: "pick",
          type: "choice",
          instructions: "Which movie maximizes overall group fit?",
          criteria: {
            movie_a: "Action-heavy science fiction epic, 2h20.",
            movie_b: "Light comedy, 1h35.",
            movie_c: "Horror film, 1h50.",
            movie_d: "Slow character drama, 2h05.",
          },
        },
      ],
    }),
    mk({
      name: "Villain Threat Level",
      description: "Score: rate antagonist threat on an ordered scale.",
      kind: "score",
      tags: ["score", "starter"],
      state:
        "Villain controls the city's power grid, has demanded a ransom, and demonstrated the ability to black out two districts. No casualties yet. Authorities are negotiating.",
      questions: [
        {
          id: uid("q"),
          name: "threat",
          type: "score",
          instructions: "How severe is the threat posed in this situation?",
          criteria: [
            "Harmless",
            "Minor threat",
            "Moderate threat",
            "Serious threat",
            "Extreme threat",
            "Existential threat",
          ],
        },
      ],
    }),
    mk({
      name: "Detective — The Missing Diamond",
      description: "Mixed: suspects and evidence consistency.",
      kind: "mixed",
      tags: ["game", "detective"],
      state:
        "CASE #001 — The Missing Diamond. Evidence: (1) Safe opened with the correct combination, no forced entry. (2) Alice was seen near the gallery at 9pm. (3) Bob's shift log shows he left at 8:30pm but a camera shows him at 9:15pm. (4) Charlie has gambling debts. (5) David's fingerprints are on the safe — he is the curator with legitimate access.",
      questions: [
        { id: uid("q"), name: "alice", type: "noul", instructions: "Is Alice responsible for the missing diamond?" },
        { id: uid("q"), name: "bob_consistent", type: "noul", instructions: "Is Bob's statement consistent with the evidence?" },
        {
          id: uid("q"),
          name: "suspect",
          type: "choice",
          instructions: "Who is most consistent with the evidence as the responsible party?",
          criteria: {
            alice: "Seen near the gallery at 9pm, no other link.",
            bob: "Shift log contradicts camera footage.",
            charlie: "Has gambling debts and motive, no physical evidence.",
            david: "Fingerprints on safe but has legitimate curator access.",
          },
        },
        {
          id: uid("q"),
          name: "suspicion_charlie",
          type: "score",
          instructions: "How suspicious is Charlie given the evidence?",
          criteria: ["Not suspicious", "Mildly suspicious", "Suspicious", "Highly suspicious", "Almost certainly involved"],
        },
      ],
    }),
    mk({
      name: "Question Sensitivity",
      description: "Same state, four phrasings — how does wording move the probability?",
      kind: "sensitivity",
      tags: ["sensitivity", "noul"],
      state: "Customer: 'I've been charged twice and nobody is answering me. This is the third message.'",
      questions: [
        { id: uid("q"), name: "q1", type: "noul", instructions: "Is the customer frustrated?" },
        { id: uid("q"), name: "q2", type: "noul", instructions: "Does the customer express frustration?" },
        { id: uid("q"), name: "q3", type: "noul", instructions: "Is the customer extremely frustrated?" },
        { id: uid("q"), name: "q4", type: "noul", instructions: "Does the customer require urgent assistance?" },
      ],
    }),
    mk({
      name: "Adversarial Negation",
      description: "Negation and conflicting evidence variants of a refund request.",
      kind: "adversarial",
      tags: ["adversarial", "noul"],
      state: "The customer does not want a refund.",
      questions: [
        { id: uid("q"), name: "base", type: "noul", instructions: "Does the customer want a refund?" },
      ],
    }),
    mk({
      name: "Pokémon Battle",
      description: "Choice + Score strategy simulator.",
      kind: "mixed",
      tags: ["game", "pokemon"],
      state:
        "Player: Pikachu, level 24, HP 62/78, Electric, moves: Thunderbolt, Quick Attack. Fast. Enemy: Geodude, level 22, HP 70/70, Rock/Ground, moves: Rock Throw, Tackle. Slow but high defense. No status conditions. Electric is weak vs Ground.",
      questions: [
        {
          id: uid("q"),
          name: "move",
          type: "choice",
          instructions: "Which move should the player select?",
          criteria: {
            thunderbolt: "Strong electric attack, weak against ground/rock.",
            quick_attack: "Fast weak normal attack, always hits first.",
            switch_out: "Withdraw Pikachu for a different Pokémon.",
          },
        },
        { id: uid("q"), name: "attack_ok", type: "noul", instructions: "Is attacking advisable in this position?" },
        {
          id: uid("q"),
          name: "danger",
          type: "score",
          instructions: "How dangerous is the current situation for the player?",
          criteria: ["Safe", "Mild pressure", "Risky", "Very dangerous", "Near wipe"],
        },
      ],
    }),
    mk({
      name: "Repeatability Probe",
      description: "Run the same Noul 20 times and observe variation.",
      kind: "repeated",
      tags: ["repeated", "noul"],
      state: "The customer has contacted support three times about the same issue and is asking for a manager.",
      questions: [
        { id: uid("q"), name: "escalate", type: "noul", instructions: "Does this situation require escalation?" },
      ],
    }),
  ];
}

export const TEMPLATES: { name: string; description: string; tags: string[]; experiment: Omit<Experiment, "id" | "createdAt" | "updatedAt"> }[] = [
  {
    name: "Noul starter",
    description: "Is this statement supported by the evidence?",
    tags: ["noul"],
    experiment: {
      name: "Noul starter",
      description: "Is this statement supported by the evidence?",
      kind: "noul",
      tags: ["noul"],
      state: "Paste the evidence or situation here.",
      questions: [{ id: "q1", name: "supported", type: "noul", instructions: "Is this statement supported by the evidence?" }],
    },
  },
  {
    name: "Choice starter",
    description: "Which category best fits this situation?",
    tags: ["choice"],
    experiment: {
      name: "Choice starter",
      kind: "choice",
      description: "Which category best fits this situation?",
      tags: ["choice"],
      state: "Describe the situation to categorize.",
      questions: [
        {
          id: "q1",
          name: "category",
          type: "choice",
          instructions: "Which category best fits this situation?",
          criteria: { option_a: "Describe option A", option_b: "Describe option B", option_c: "Describe option C" },
        },
      ],
    },
  },
  {
    name: "Score starter",
    description: "How severe is this situation?",
    tags: ["score"],
    experiment: {
      name: "Score starter",
      kind: "score",
      description: "How severe is this situation?",
      tags: ["score"],
      state: "Describe what to rate.",
      questions: [
        {
          id: "q1",
          name: "severity",
          type: "score",
          instructions: "How severe is this situation?",
          criteria: ["Negligible", "Minor", "Moderate", "Serious", "Critical"],
        },
      ],
    },
  },
  {
    name: "Sensitivity probe",
    description: "How does question wording affect the result?",
    tags: ["sensitivity"],
    experiment: {
      name: "Sensitivity probe",
      kind: "sensitivity",
      description: "How does question wording affect the result?",
      tags: ["sensitivity"],
      state: "Fixed state. Vary the phrasing of each question.",
      questions: [
        { id: "q1", name: "v1", type: "noul", instructions: "Is the customer frustrated?" },
        { id: "q2", name: "v2", type: "noul", instructions: "Does the customer express frustration?" },
      ],
    },
  },
  {
    name: "Adversarial probe",
    description: "How does Jev respond to contradictory or manipulative inputs?",
    tags: ["adversarial"],
    experiment: {
      name: "Adversarial probe",
      kind: "adversarial",
      description: "How does Jev respond to contradictory or manipulative inputs?",
      tags: ["adversarial"],
      state: "Base state here.",
      questions: [{ id: "q1", name: "base", type: "noul", instructions: "Does the customer want a refund?" }],
    },
  },
  {
    name: "Repeatability probe",
    description: "How stable is the observed output across repeated runs?",
    tags: ["repeated"],
    experiment: {
      name: "Repeatability probe",
      kind: "repeated",
      description: "How stable is the observed output across repeated runs?",
      tags: ["repeated"],
      state: "Fixed state and question, run 20 times.",
      questions: [{ id: "q1", name: "check", type: "noul", instructions: "Does this situation require escalation?" }],
    },
  },
];
