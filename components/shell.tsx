"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import {
  FlaskConical, LayoutDashboard, SplitSquareHorizontal, ListChecks, Gauge,
  Layers, Repeat, Swords, GitCompareArrows, Library, BookOpen, Settings,
  Search, Command, Zap, Clapperboard, Ghost, Gamepad2, TestTube2, Crown, TriangleAlert, Scale, Crosshair, Coins, Workflow, Timer, GraduationCap,
  CircleDot, ChevronDown, FlaskConical as LabIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLab } from "@/lib/store";
import { ThemeToggle } from "./theme-toggle";

const NAV: { section?: string; items: { href: string; label: string; icon: React.ReactNode; kbd?: string }[] }[] = [
  { items: [{ href: "/", label: "Overview", icon: <LayoutDashboard size={15} /> }] },
  {
    section: "Playground",
    items: [
      { href: "/noul", label: "Noul", icon: <CircleDot size={15} /> },
      { href: "/choice", label: "Choice", icon: <SplitSquareHorizontal size={15} /> },
      { href: "/score", label: "Score", icon: <Gauge size={15} /> },
      { href: "/multi", label: "Multi Question", icon: <Layers size={15} /> },
    ],
  },
  {
    section: "Experiments",
    items: [
      { href: "/experiments/question-sensitivity", label: "Question Sensitivity", icon: <FlaskConical size={15} /> },
      { href: "/experiments/state-sensitivity", label: "State Sensitivity", icon: <GitCompareArrows size={15} /> },
      { href: "/experiments/repeated", label: "Repeated Runs", icon: <Repeat size={15} /> },
      { href: "/experiments/adversarial", label: "Adversarial Testing", icon: <Swords size={15} /> },
      { href: "/experiments/calibration", label: "Calibration", icon: <ListChecks size={15} /> },
      { href: "/experiments/jaggedness", label: "Jaggedness Gauntlet", icon: <TriangleAlert size={15} /> },
      { href: "/experiments/confidence-lab", label: "Confidence Lab", icon: <Scale size={15} /> },
      { href: "/experiments/calibration-workbench", label: "Calibration Workbench", icon: <Crosshair size={15} /> },
      { href: "/experiments/ledger", label: "Cost & Latency Ledger", icon: <Coins size={15} /> },
      { href: "/experiments/patterns", label: "Production Patterns", icon: <Workflow size={15} /> },
    ],
  },
  {
    section: "Games",
    items: [
      { href: "/games/detective", label: "Detective", icon: <Search size={15} /> },
      { href: "/games/movie", label: "Movie Night", icon: <Clapperboard size={15} /> },
      { href: "/games/pokemon", label: "Pokémon Battle", icon: <Zap size={15} /> },
      { href: "/games/chess", label: "Chess vs Jev", icon: <Crown size={15} /> },
      { href: "/games/loop", label: "Loop Arena", icon: <Timer size={15} /> },
      { href: "/games/custom", label: "Custom Game", icon: <Gamepad2 size={15} /> },
    ],
  },
  {
    section: "Library",
    items: [
      { href: "/library", label: "Saved Experiments", icon: <Library size={15} /> },
      { href: "/templates", label: "Templates", icon: <BookOpen size={15} /> },
      { href: "/learn", label: "Learn Jev", icon: <GraduationCap size={15} /> },
    ],
  },
  {
    section: "Settings",
    items: [
      { href: "/settings", label: "API Configuration", icon: <Settings size={15} /> },
    ],
  },
];

const PALETTE_ACTIONS = [
  { label: "Run experiment", hint: "⌘⏎", run: () => window.dispatchEvent(new CustomEvent("jev:run")) },
  { label: "New Noul", href: "/noul" },
  { label: "New Choice", href: "/choice" },
  { label: "New Score", href: "/score" },
  { label: "New Experiment", href: "/experiments/question-sensitivity" },
  { label: "Open Detective", href: "/games/detective" },
  { label: "Open Movie Night", href: "/games/movie" },
  { label: "Open Pokémon", href: "/games/pokemon" },
  { label: "Open Chess vs Jev", href: "/games/chess" },
  { label: "Open Loop Arena", href: "/games/loop" },
  { label: "Open Jaggedness Gauntlet", href: "/experiments/jaggedness" },
  { label: "Open Confidence Lab", href: "/experiments/confidence-lab" },
  { label: "Open Calibration Workbench", href: "/experiments/calibration-workbench" },
  { label: "Open Cost Ledger", href: "/experiments/ledger" },
  { label: "Open Production Patterns", href: "/experiments/patterns" },
  { label: "Open Learn Jev", href: "/learn" },
  { label: "View Saved Experiments", href: "/library" },
  { label: "Open Settings", href: "/settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [palette, setPalette] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [conn, setConn] = React.useState<{ state: "checking" | "ok" | "fail"; latencyMs?: number }>({ state: "checking" });
  const demoMode = useLab((s) => s.demoMode);
  const setDemoMode = useLab((s) => s.setDemoMode);
  const model = useLab((s) => s.model);
  const ensureSeeded = useLab((s) => s.ensureSeeded);
  const [mobileNav, setMobileNav] = React.useState(false);

  React.useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/jev/test").then(async (r) => {
      const b = await r.json().catch(() => ({}));
      if (!cancelled) setConn(b.connected ? { state: "ok", latencyMs: b.latencyMs } : { state: "fail" });
    }).catch(() => { if (!cancelled) setConn({ state: "fail" }); });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => {
          if (!v) {
            setQuery("");
            setActiveIdx(0);
          }
          return !v;
        });
      }
      if (e.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = PALETTE_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
  const [activeIdx, setActiveIdx] = React.useState(0);
  const activeRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const openPalette = () => {
    setQuery("");
    setActiveIdx(0);
    setPalette(true);
  };

  const runAction = (a: (typeof PALETTE_ACTIONS)[number]) => {
    setPalette(false);
    setQuery("");
    if (a.href) router.push(a.href);
    else a.run?.();
  };

  React.useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  React.useEffect(() => {
    activeRefs.current[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line/[0.07] bg-ink-900 transition-transform lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950">
            <TestTube2 size={17} strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[14.5px] font-semibold tracking-tight">Jev Lab</div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-mist-500">TypeSafe · Jev</div>
          </div>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors", demoMode ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200")}
            title="Toggle demo mode"
          >
            <span className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", demoMode ? "bg-amber-300" : "bg-emerald-300")} />
              {demoMode ? "Demo Mode" : "Live Jev"}
            </span>
            <Ghost size={13} className="opacity-60" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
          {NAV.map((group, gi) => (
            <div key={gi} className="mb-4">
              {group.section && (
                <div className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">{group.section}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNav(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors",
                        active ? "bg-wash/[0.08] font-medium text-mist-100" : "text-mist-400 hover:bg-wash/[0.04] hover:text-mist-100"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={cn(active ? "text-emerald-300" : "text-mist-500")}>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line/[0.07] p-4">
          <button
            onClick={() => { setConn({ state: "checking" }); fetch("/api/jev/test").then(async (r) => { const b = await r.json().catch(() => ({})); setConn(b.connected ? { state: "ok", latencyMs: b.latencyMs } : { state: "fail" }); }).catch(() => setConn({ state: "fail" })); }}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-wash/[0.03]"
            title="Test connection"
          >
            <span className={cn("h-2 w-2 rounded-full", conn.state === "ok" ? "bg-emerald-400" : conn.state === "checking" ? "animate-pulse-soft bg-amber-300" : "bg-red-400")} />
            <span className="text-[12px] font-medium text-mist-200">{conn.state === "ok" ? "Jev Connected" : conn.state === "checking" ? "Checking…" : demoMode ? "Demo (no key needed)" : "Jev Unreachable"}</span>
          </button>
          <div className="mt-1 px-1 font-mono text-[11px] text-mist-500">Model: {model}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/[0.07] bg-ink-950/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 hover:bg-wash/[0.06] lg:hidden" onClick={() => setMobileNav((v) => !v)} aria-label="Toggle navigation">
            <LabIcon size={16} />
          </button>
          <button
            onClick={openPalette}
            className="focus-ring flex h-9 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-line/10 bg-wash/[0.03] px-3 text-[13px] text-mist-500 hover:border-line/20 hover:text-mist-300"
          >
            <Search size={14} /> <span className="hidden sm:inline">Search, run, navigate…</span><span className="sm:hidden">Search…</span>
            <kbd className="ml-auto hidden rounded border border-line/10 bg-wash/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] sm:block">⌘K</kbd>
          </button>
          <div className="ml-auto hidden items-center gap-2 text-[11.5px] text-mist-500 md:flex">
            <kbd className="rounded border border-line/10 bg-wash/[0.04] px-1.5 py-0.5 font-mono">⌘⏎</kbd> run
            <kbd className="ml-2 rounded border border-line/10 bg-wash/[0.04] px-1.5 py-0.5 font-mono">⌘S</kbd> save
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6">{children}</main>
      </div>

      {mobileNav && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* Command palette */}
      {palette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPalette(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line/12 bg-ink-850 shadow-pop">
            <div className="flex items-center gap-2 border-b border-line/[0.08] px-4 py-3">
              <Command size={14} className="text-mist-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const a = filtered[activeIdx];
                    if (a) runAction(a);
                  }
                }}
                placeholder="Search Jev Lab…"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-mist-500"
                aria-label="Command palette"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-listbox"
                aria-activedescendant={filtered[activeIdx] ? `palette-${activeIdx}` : undefined}
              />
              <kbd className="rounded border border-line/10 px-1.5 font-mono text-[10px] text-mist-500">esc</kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5" role="listbox" id="palette-listbox">
              {filtered.map((a, i) => (
                <button
                  key={a.label}
                  id={`palette-${i}`}
                  ref={(el) => {
                    activeRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseMove={() => setActiveIdx(i)}
                  onClick={() => runAction(a)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13.5px] ${i === activeIdx ? "bg-wash/[0.08] text-mist-100" : "hover:bg-wash/[0.06]"}`}
                >
                  <span>{a.label}</span>
                  {a.hint && <kbd className="font-mono text-[11px] text-mist-500">{a.hint}</kbd>}
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-mist-500">No matches.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
