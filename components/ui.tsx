"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Copy, Check, Download, Info, ChevronDown } from "lucide-react";
import { cn, copyText, downloadJson } from "@/lib/utils";

export function Button({
  children, onClick, variant = "primary", size = "md", disabled, className, kbd, type,
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger" | "subtle";
  size?: "sm" | "md" | "lg"; disabled?: boolean; className?: string; kbd?: string; type?: "button" | "submit";
}) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-9 px-4 text-[13.5px]",
        size === "lg" && "h-11 px-6 text-[15px]",
        variant === "primary" && "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 active:scale-[0.99] shadow-[0_0_0_1px_rgba(52,211,153,0.4),0_8px_24px_-8px_rgba(52,211,153,0.5)]",
        variant === "outline" && "border border-line/12 bg-wash/[0.02] text-mist-100 hover:border-line/25 hover:bg-wash/[0.05]",
        variant === "ghost" && "text-mist-300 hover:bg-wash/[0.06] hover:text-mist-100",
        variant === "subtle" && "bg-wash/[0.06] text-mist-100 hover:bg-wash/[0.1]",
        variant === "danger" && "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
        className
      )}
    >
      {children}
      {kbd && (
        <kbd className="rounded border border-black/20 bg-black/20 px-1.5 py-0.5 font-mono text-[10px] opacity-70">
          {kbd}
        </kbd>
      )}
    </button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line/[0.08] bg-ink-900 shadow-card", className)}>
      {children}
    </div>
  );
}

export function SectionHead({ eyebrow, title, hint, right }: { eyebrow?: string; title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">{eyebrow}</div>}
        <h2 className="text-[17px] font-semibold tracking-tight text-mist-100">{title}</h2>
        {hint && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-mist-400">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, hint, children, optional }: { label: string; hint?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12.5px] font-medium text-mist-200">{label}</span>
        {optional && <span className="text-[11px] text-mist-500">optional</span>}
        {hint && <span className="ml-auto text-[11.5px] text-mist-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line/10 bg-ink-950 px-3 py-2.5 text-[13.5px] text-mist-100 placeholder:text-mist-500 outline-none transition-colors focus:border-emerald-400/50 focus:bg-ink-900";

export function EmptyState({ title, body, actions }: { title: string; body: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line/12 bg-wash/[0.015] px-8 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line/10 bg-wash/[0.04]">
        <Info size={16} className="text-mist-400" />
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-mist-400">{body}</p>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded-lg bg-wash/[0.06]", className)} />;
}

export function ResultSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function ErrorBox({ title, detail, onDetails }: { title: string; detail: string; onDetails?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-red-200">{title}</div>
          <div className="mt-1 break-words text-[12.5px] leading-relaxed text-red-200/70">{detail}</div>
          {onDetails && (
            <button onClick={onDetails} className="mt-2 text-[12px] font-medium text-red-300 underline underline-offset-2 hover:text-red-200">
              View details
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Edu({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line/10 bg-wash/[0.03] px-2.5 py-1 text-[11.5px] text-mist-400 hover:border-line/20 hover:text-mist-200"
        aria-expanded={open}
      >
        <Info size={12} /> What am I looking at?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-80 rounded-xl border border-line/10 bg-ink-800 p-4 text-[12.5px] leading-relaxed text-mist-300 shadow-pop">
            {text}
          </div>
        </>
      )}
    </div>
  );
}

export function CopyDownload({ data, filename }: { data: unknown; filename: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={async () => {
          const ok = await copyText(JSON.stringify(data, null, 2));
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-mist-400 hover:bg-wash/[0.06] hover:text-mist-100"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy JSON"}
      </button>
      <button
        onClick={() => downloadJson(filename, data)}
        className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-mist-400 hover:bg-wash/[0.06] hover:text-mist-100"
      >
        <Download size={12} /> Download
      </button>
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-line/[0.08] bg-ink-900">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-wash/[0.02]" aria-expanded={open}>
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-mist-400">{title}</span>
        <ChevronDown size={14} className={cn("text-mist-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-line/[0.07] p-4">{children}</div>}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Demo data
    </span>
  );
}
