export type QuestionType = "noul" | "choice" | "score";

export interface NoulCriteria {
  true?: string;
  false?: string;
}

export type ChoiceCriteria = Record<string, string | null>;
export type ScoreCriteria = string[];

export interface Question {
  id: string;
  name: string;
  type: QuestionType;
  instructions: string;
  criteria?: NoulCriteria | ChoiceCriteria | ScoreCriteria | unknown;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  state: unknown;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  kind?: string;
}

export interface ExperimentResult {
  experimentId: string;
  runId: string;
  timestamp: string;
  latencyMs?: number;
  response: JevApiResponse;
  request: JevApiRequest;
  demo?: boolean;
  label?: string;
}

// ---- Jev wire protocol (verified against https://api.typesafe.ai/docs) ----

export interface JevNoulWire {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface JevChoiceWire {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface JevScoreWire {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type JevQuestionWire = JevNoulWire | JevChoiceWire | JevScoreWire;

export interface JevApiRequest {
  model: string;
  state: unknown;
  questions: Record<string, JevQuestionWire>;
}

export interface JevNoulAnswer {
  type: "noul";
  noul: number;
}

export interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface JevScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

export interface JevApiResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
    credits_remaining_usd?: number;
    [k: string]: unknown;
  };
}

export interface RunMeta {
  latencyMs: number;
  status: number;
  model: string;
  demo: boolean;
}
