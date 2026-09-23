"use client";

import { useTheme } from "@/lib/theme";

import React from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, inputCls } from "./ui";
import type { Question, QuestionType } from "@/lib/jev/types";
import { uid } from "@/lib/utils";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function StateEditor({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  const [mode, setMode] = React.useState<"text" | "json">("text");
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">State</span>
        <div className="flex rounded-lg border border-line/10 bg-ink-950 p-0.5 text-[12px]" role="tablist" aria-label="State format">
          {(["text", "json"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-md px-3 py-1 font-medium capitalize transition-colors", mode === m ? "bg-wash/[0.09] text-mist-100" : "text-mist-500 hover:text-mist-300")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {mode === "text" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder="Describe the situation Jev should judge — plain text, or switch to JSON for structured state."
          className={cn(inputCls, "min-h-[240px] resize-y leading-relaxed")}
          aria-label="State (text)"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line/10">
          <Monaco
            height="240px"
            language="json"
            theme={monacoTheme}
            value={value}
            onChange={(v) => {
              onChange(v ?? "");
              try {
                if ((v ?? "").trim()) JSON.parse(v ?? "");
                setJsonError(null);
              } catch (e) {
                setJsonError(e instanceof Error ? e.message : "Invalid JSON");
              }
            }}
            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, tabSize: 2 }}
          />
        </div>
      )}
      {jsonError && <p className="mt-1.5 text-[12px] text-amber-300">JSON note: {jsonError} — will be sent as text.</p>}
      <p className="mt-1.5 text-[11.5px] text-mist-500">{value.length} chars · sent as <span className="font-mono">state</span></p>
    </div>
  );
}

export function parseStateValue(raw: string): unknown {
  const t = raw.trim();
  if (!t) return "";
  if ((t.startsWith("{") || t.startsWith("[")) && t.endsWith(t.startsWith("{") ? "}" : "]")) {
    try {
      return JSON.parse(t);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function QuestionCardEditor({ q, onChange, onRemove }: { q: Question; onChange: (q: Question) => void; onRemove?: () => void }) {
  return (
    <div className="rounded-xl border border-line/[0.08] bg-ink-950 p-4">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical size={14} className="text-mist-500" />
        <input
          value={q.name}
          onChange={(e) => onChange({ ...q, name: e.target.value.replace(/\s+/g, "_") })}
          className="w-36 rounded-md border border-line/10 bg-ink-900 px-2 py-1 font-mono text-[12px] outline-none focus:border-emerald-400/50"
          aria-label="Question key"
        />
        <span className="rounded-full border border-line/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mist-400">{q.type}</span>
        <div className="ml-auto flex gap-1" role="tablist" aria-label="Question type">
          {(["noul", "choice", "score"] as QuestionType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === q.type) return;
                const base: Question = { ...q, type: t };
                if (t === "choice") base.criteria = { option_a: "Describe option A", option_b: "Describe option B" };
                if (t === "score") base.criteria = ["Low", "Medium", "High"];
                if (t === "noul") base.criteria = { true: "", false: "" };
                onChange(base);
              }}
              className={cn("rounded-md px-2 py-1 text-[11px] font-medium capitalize", q.type === t ? "bg-emerald-400/15 text-emerald-200" : "text-mist-500 hover:bg-wash/[0.06]")}
            >
              {t}
            </button>
          ))}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="rounded-md p-1.5 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove question">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <Field label="Instructions">
        <textarea
          value={q.instructions}
          onChange={(e) => onChange({ ...q, instructions: e.target.value })}
          rows={2}
          placeholder={q.type === "noul" ? "e.g. Does this situation require escalation?" : q.type === "choice" ? "e.g. Which team should handle this?" : "e.g. How severe is this situation?"}
          className={cn(inputCls, "resize-y")}
        />
      </Field>
      <div className="mt-3">
        {q.type === "noul" && <NoulCriteriaEditor q={q} onChange={onChange} />}
        {q.type === "choice" && <ChoiceCriteriaEditor q={q} onChange={onChange} />}
        {q.type === "score" && <ScoreCriteriaEditor q={q} onChange={onChange} />}
      </div>
    </div>
  );
}

function NoulCriteriaEditor({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const c = (q.criteria ?? {}) as { true?: string; false?: string };
  const [advanced, setAdvanced] = React.useState(Boolean(c.true || c.false));
  if (!advanced) {
    return (
      <button onClick={() => setAdvanced(true)} className="text-[12px] text-mist-500 underline underline-offset-2 hover:text-mist-300">
        + Define what true / false mean (optional)
      </button>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="true means" optional>
        <input value={c.true ?? ""} onChange={(e) => onChange({ ...q, criteria: { ...c, true: e.target.value } })} placeholder="e.g. Needs manager intervention" className={inputCls} />
      </Field>
      <Field label="false means" optional>
        <input value={c.false ?? ""} onChange={(e) => onChange({ ...q, criteria: { ...c, false: e.target.value } })} placeholder="e.g. Front-line can resolve" className={inputCls} />
      </Field>
    </div>
  );
}

function ChoiceCriteriaEditor({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const c = (q.criteria ?? {}) as Record<string, string | null>;
  const entries = Object.entries(c);
  const set = (next: Record<string, string | null>) => onChange({ ...q, criteria: next });
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-mist-200">Options <span className="ml-1 text-[11px] font-normal text-mist-500">{entries.length} · max 255</span></div>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <input
              value={k}
              onChange={(e) => {
                const nk = e.target.value.replace(/\s+/g, "_");
                const next: Record<string, string | null> = {};
                for (const [ok, ov] of entries) next[ok === k ? nk : ok] = ov;
                set(next);
              }}
              className="w-28 shrink-0 rounded-lg border border-line/10 bg-ink-900 px-2.5 py-2 font-mono text-[12px] outline-none focus:border-emerald-400/50"
              aria-label="Option key"
            />
            <input
              value={v ?? ""}
              onChange={(e) => set({ ...c, [k]: e.target.value })}
              placeholder="What this option means (or blank)"
              className={cn(inputCls, "!py-2")}
              aria-label={`Description for ${k}`}
            />
            <button onClick={() => { const next = { ...c }; delete next[k]; set(next); }} className="shrink-0 rounded-lg px-2 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove ${k}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => set({ ...c, [`option_${entries.length + 1}`]: "" })}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line/15 px-3 py-1.5 text-[12.5px] text-mist-300 hover:border-line/30 hover:text-mist-100"
      >
        <Plus size={13} /> Add option
      </button>
    </div>
  );
}

function ScoreCriteriaEditor({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const levels = ((q.criteria ?? []) as unknown[]).map(String);
  const set = (next: string[]) => onChange({ ...q, criteria: next });
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-mist-200">Ordered scale <span className="ml-1 text-[11px] font-normal text-mist-500">low → high · {levels.length}/10</span></div>
      <div className="space-y-2">
        {levels.map((lvl, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="mono-num w-6 shrink-0 text-center font-mono text-[12px] text-mist-500">{i}</span>
            <input value={lvl} onChange={(e) => { const n = [...levels]; n[i] = e.target.value; set(n); }} placeholder={`Level ${i} — describe concretely`} className={cn(inputCls, "!py-2")} aria-label={`Level ${i}`} />
            <button onClick={() => set(levels.filter((_, j) => j !== i))} className="shrink-0 rounded-lg px-2 py-2 text-mist-500 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove level ${i}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          disabled={levels.length >= 10}
          onClick={() => set([...levels, ""])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line/15 px-3 py-1.5 text-[12.5px] text-mist-300 hover:border-line/30 disabled:opacity-40"
        >
          <Plus size={13} /> Add level
        </button>
      </div>
    </div>
  );
}

export function newQuestion(type: QuestionType, n: number): Question {
  const base = { id: uid("q"), name: `q${n}`, instructions: "" };
  if (type === "choice") return { ...base, type, criteria: { option_a: "", option_b: "" } };
  if (type === "score") return { ...base, type, criteria: ["Low", "High"] };
  return { ...base, type, criteria: { true: "", false: "" } };
}

export function PreviewPill({ ok, issues }: { ok: boolean; issues: string[] }) {
  if (ok) return <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={13} /> Ready to run</span>;
  return <span className="text-[12px] text-amber-300">{issues.length} issue{issues.length === 1 ? "" : "s"} to fix</span>;
}
