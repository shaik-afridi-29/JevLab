"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Experiment, ExperimentResult } from "@/lib/jev/types";
import { seedExperiments } from "@/lib/seed";
import { uid } from "@/lib/utils";

export interface LedgerEntry {
  ts: string;
  route: string;
  inputTokens: number;
  latencyMs?: number;
  demo: boolean;
}

interface LabState {
  experiments: Experiment[];
  results: ExperimentResult[];
  ledger: LedgerEntry[];
  /** Autosaved work-in-progress, keyed by playground. Never shown in the library. */
  drafts: Record<string, Experiment>;
  /** One-shot id of a library experiment a playground should load on mount. */
  openRequest: string | null;
  demoMode: boolean;
  model: string;
  hydrated: boolean;
  setDemoMode: (v: boolean) => void;
  setModel: (m: string) => void;
  upsertExperiment: (e: Experiment) => void;
  removeExperiment: (id: string) => void;
  duplicateExperiment: (id: string) => string | null;
  addResult: (r: ExperimentResult) => void;
  logUsage: (e: LedgerEntry) => void;
  clearLedger: () => void;
  saveDraft: (key: string, e: Experiment) => void;
  requestOpen: (id: string) => void;
  consumeOpenRequest: () => string | null;
  clearResultsFor: (experimentId: string) => void;
  ensureSeeded: () => void;
}

function withTimestamp(e: Experiment): Experiment {
  return { ...e, updatedAt: new Date().toISOString() };
}

export const useLab = create<LabState>()(
  persist(
    (set, get) => ({
      experiments: [],
      results: [],
      ledger: [],
      drafts: {},
      openRequest: null,
      demoMode: false,
      model: "jev-latest",
      hydrated: false,
      setDemoMode: (v) => set({ demoMode: v }),
      setModel: (m) => set({ model: m }),
      upsertExperiment: (e) =>
        set((s) => {
          const exists = s.experiments.some((x) => x.id === e.id);
          const next = exists
            ? s.experiments.map((x) => (x.id === e.id ? withTimestamp(e) : x))
            : [withTimestamp(e), ...s.experiments];
          return { experiments: next };
        }),
      removeExperiment: (id) =>
        set((s) => ({
          experiments: s.experiments.filter((x) => x.id !== id),
          results: s.results.filter((r) => r.experimentId !== id),
        })),
      duplicateExperiment: (id) => {
        const src = get().experiments.find((x) => x.id === id);
        if (!src) return null;
        const t = new Date().toISOString();
        const copy: Experiment = {
          ...JSON.parse(JSON.stringify(src)),
          id: uid("exp"),
          name: `${src.name} (copy)`,
          createdAt: t,
          updatedAt: t,
        };
        set((s) => ({ experiments: [copy, ...s.experiments] }));
        return copy.id;
      },
      addResult: (r) => set((s) => ({ results: [r, ...s.results].slice(0, 400) })),
      logUsage: (e) => set((s) => ({ ledger: [...s.ledger, e].slice(-500) })),
      clearLedger: () => set({ ledger: [] }),
      saveDraft: (key, e) =>
        set((s) => ({ drafts: { ...s.drafts, [key]: { ...e, updatedAt: new Date().toISOString() } } })),
      requestOpen: (id) => set({ openRequest: id }),
      consumeOpenRequest: () => {
        const id = get().openRequest;
        if (id) set({ openRequest: null });
        return id;
      },
      clearResultsFor: (experimentId) =>
        set((s) => ({ results: s.results.filter((r) => r.experimentId !== experimentId) })),
      ensureSeeded: () => {
        if (get().hydrated) return;
        if (get().experiments.length === 0) {
          set({ experiments: seedExperiments(), hydrated: true });
        } else {
          set({ hydrated: true });
        }
      },
    }),
    { name: "jev-lab-v1" }
  )
);
