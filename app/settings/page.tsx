"use client";

import React from "react";
import { CheckCircle2, XCircle, Loader2, FlaskConical, Sun, Moon, MonitorSmartphone } from "lucide-react";
import { Button, Card, SectionHead, Field, inputCls } from "@/components/ui";
import { useLab } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODELS = ["jev-latest", "jev-1.13.0", "jev-preview"];

export default function SettingsPage() {
  const model = useLab((s) => s.model);
  const setModel = useLab((s) => s.setModel);
  const demoMode = useLab((s) => s.demoMode);
  const setDemoMode = useLab((s) => s.setDemoMode);
  const [status, setStatus] = React.useState<{ state: "idle" | "checking" | "ok" | "fail"; latencyMs?: number; detail?: string; model?: string }>({ state: "idle" });

  const test = async () => {
    setStatus({ state: "checking" });
    try {
      const r = await fetch("/api/jev/test");
      const b = await r.json();
      if (b.connected) setStatus({ state: "ok", latencyMs: b.latencyMs, model: b.model });
      else setStatus({ state: "fail", detail: b.reason ?? "Connection failed" });
    } catch (e) {
      setStatus({ state: "fail", detail: e instanceof Error ? e.message : "Failed" });
    }
  };

  React.useEffect(() => { test(); }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[14px] text-mist-400">API configuration, model and appearance. The key never leaves the server.</p>
      </div>

      <Card className="mb-4 p-5">
        <SectionHead eyebrow="TypeSafe / Jev" title="Jev Configuration" />
        <div className="flex items-center gap-2.5 rounded-xl border border-line/[0.08] bg-ink-950 px-4 py-3">
          {status.state === "ok" ? <CheckCircle2 size={16} className="text-emerald-300" /> : status.state === "fail" ? <XCircle size={16} className="text-red-300" /> : <Loader2 size={16} className="animate-spin text-mist-400" />}
          <div className="text-[13.5px]">
            <span className="font-medium">API Status · </span>
            {status.state === "ok" && <span className="text-emerald-300">Connected{status.latencyMs ? ` · ${status.latencyMs}ms` : ""}{status.model ? ` · resolved ${status.model}` : ""}</span>}
            {status.state === "fail" && <span className="text-red-300">Not connected — {status.detail}</span>}
            {(status.state === "checking" || status.state === "idle") && <span className="text-mist-400">Checking…</span>}
          </div>
          <Button size="sm" variant="outline" onClick={test} className="ml-auto">Test Connection</Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} className={cn(inputCls, "appearance-none")} aria-label="Model">
              {MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </Field>
          <Field label="API Key" hint="server env">
            <input value="••••••••••••••••" readOnly className={cn(inputCls, "font-mono")} aria-label="API key (masked)" />
          </Field>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-mist-500">Reads <span className="font-mono">TYPESAFE_API_KEY</span> from the server environment. The raw key is never sent to the browser — the frontend calls <span className="font-mono">/api/jev</span>, which attaches the key server-side.</p>
      </Card>

      <Card className="mb-4 p-5">
        <SectionHead eyebrow="Exploration" title="Demo Mode" hint="Deterministic mock responses for UI exploration without a key." />
        <button onClick={() => setDemoMode(!demoMode)} className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left", demoMode ? "border-amber-400/30 bg-amber-400/[0.07]" : "border-line/10 bg-wash/[0.02]")}>
          <span className="flex items-center gap-2.5 text-[13.5px]"><FlaskConical size={15} className={demoMode ? "text-amber-300" : "text-mist-400"} />{demoMode ? "Demo Mode is ON — responses are mock data" : "Demo Mode is OFF — using live Jev"}</span>
          <span className={cn("relative h-6 w-11 rounded-full transition-colors", demoMode ? "bg-amber-400" : "bg-wash/15")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", demoMode ? "left-[22px]" : "left-0.5")} />
          </span>
        </button>
      </Card>

      <Card className="p-5">
        <SectionHead eyebrow="Interface" title="Appearance" hint="Dark-first design, with a full light theme. First visit follows your OS." />
        <ThemeSettings />
        <div className="mt-3 text-[13px] text-mist-400">Keyboard: <kbd className="rounded border border-line/10 px-1 font-mono text-[11px]">⌘K</kbd> palette · <kbd className="rounded border border-line/10 px-1 font-mono text-[11px]">⌘⏎</kbd> run · <kbd className="rounded border border-line/10 px-1 font-mono text-[11px]">⌘S</kbd> save</div>
      </Card>
    </div>
  );
}

function ThemeSettings() {
  const { theme, setTheme, resetToSystem, isSystem } = useTheme();
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { v: "dark", label: "Dark", icon: <Moon size={14} /> },
            { v: "light", label: "Light", icon: <Sun size={14} /> },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            onClick={() => setTheme(o.v)}
            aria-pressed={theme === o.v && !isSystem}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium",
              theme === o.v && !isSystem
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : "border-line/10 text-mist-400 hover:border-line/25"
            )}
          >
            {o.icon} {o.label}
          </button>
        ))}
        <button
          onClick={resetToSystem}
          aria-pressed={isSystem}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13.5px] font-medium",
            isSystem
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : "border-line/10 text-mist-400 hover:border-line/25"
          )}
        >
          <MonitorSmartphone size={14} /> System
        </button>
      </div>
      <p className="mt-2 text-[12px] text-mist-500">
        {isSystem ? "Following your OS setting." : `Locked to ${theme} mode. Pick System to follow the OS again.`}
      </p>
    </div>
  );
}
