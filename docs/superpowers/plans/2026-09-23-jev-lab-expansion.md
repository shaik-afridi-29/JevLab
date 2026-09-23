# Jev-Lab Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all 7 researched Jev features (jaggedness, confidence, ledger, calibration, patterns, loop arena, learn hub) as premium lab screens.

**Architecture:** Same proxy pattern (`/api/jev`); new pure helpers in `lib/` (tested), new pages under `app/experiments|games|learn`, usage ledger centralized in the lab store and fed by a shared logging helper at every fetch call site.

**Tech Stack:** Next.js 14, TypeScript, Tailwind (var palette), recharts via existing `components/charts.tsx` dynamic split, chess.js untouched.

**Spec:** Research synthesis in prior conversation (TypeSafe docs confidence formula `(n·peak−1)/(n−1)`, 9 jaggedness modes, $0.042/M input, ECE debate, pi-warden thresholds, Doom $7/hr loop).

## Global Constraints

- `TYPESAFE_API_KEY` never reaches the browser.
- Language discipline: "observed", "argmax", "Jev assessment" — no certainty/causality claims.
- Demo mock labeled DEMO DATA; light theme must work on every new screen (var palette only, no fixed dark hexes except chessboard).
- TDD for pure helpers (cost, confidence, ECE/binning, jaggedness verdicts).

---

### Task 1: Shared usage ledger + cost math

**Files:**
- Create: `lib/cost.ts`, `lib/cost.test.ts`
- Modify: `lib/store.ts` (ledger slice), `components/useJevRun.ts` (log), experiment pages (log via helper)

**Interfaces:**
- Produces: `inputTokensToUsd(t)`, `formatUsd(n)`, `logUsage(entry)` in store; `LedgerEntry {ts, route, inputTokens, latencyMs, demo}`.

- [ ] Step 1: Write failing test for `inputTokensToUsd` (1M → 0.042) and `formatUsd`
- [ ] Step 2: Implement `lib/cost.ts`, run test → pass
- [ ] Step 3: Add ledger slice (append capped at 500, clear) to store
- [ ] Step 4: Log from `useJevRun` + all direct-fetch pages via one `logUsageFromResponse(route, body, latency)` helper in `lib/cost.ts`
- [ ] Step 5: `npm test`, commit

### Task 2: Jaggedness Gauntlet

**Files:** Create `lib/jaggedness.ts`, `lib/jaggedness.test.ts`, `app/experiments/jaggedness/page.tsx`

- [ ] Step 1: Failing tests for code verdicts (negation-sum check, count-from-nouls, hex-vs-name note is static)
- [ ] Step 2: Implement 9 presets (state, questions, expectation, docs ref)
- [ ] Step 3: Page runs presets sequentially, shows observed-vs-expected table
- [ ] Step 4: Build + test, commit

### Task 3: Confidence Lab

**Files:** Create `lib/confidence.ts`, `lib/confidence.test.ts`, `app/experiments/confidence-lab/page.tsx`

- [ ] Step 1: Failing tests for `(n·peak−1)/(n−1)`, margin, entropy measures
- [ ] Step 2: Slider explorer + measure selector + three-path policy simulator on a live Jev Choice
- [ ] Step 3: Build + test, commit

### Task 4: Cost & Latency Ledger page

**Files:** Create `app/experiments/ledger/page.tsx` (charts via `components/charts.tsx` additions: latency histogram)

- [ ] Ledger table, session totals, $/hr projection slider, clear button
- [ ] Build, commit

### Task 5: Calibration Workbench

**Files:** Create `lib/calibration.ts`, `lib/calibration.test.ts`, `app/experiments/calibration-workbench/page.tsx`

- [ ] Step 1: Failing tests for binning + ECE on a known sample
- [ ] Step 2: Trial runner (repeated Noul) + correct/incorrect labeling + reliability diagram + ECE
- [ ] Step 3: Build + test, commit

### Task 6: Production Patterns simulator

**Files:** Create `lib/patterns.ts` (6 presets), `app/experiments/patterns/page.tsx`

- [ ] Preset dropdown (guardrail/router/RAG-gate/citation/rerank/crawl), editable thresholds, verdict log with hold/warn counts
- [ ] Build, commit

### Task 7: Loop Arena game

**Files:** Create `app/games/loop/page.tsx`

- [ ] Grid survival loop, Jev Choice per tick, speed slider, live calls/sec + cost ticker, start/stop
- [ ] Build, commit

### Task 8: Learn hub + nav wiring

**Files:** Create `app/learn/page.tsx`; Modify `components/shell.tsx` (nav + palette), `app/page.tsx` (go-deeper section)

- [ ] Static curated content (docs map, pinning table, limits table, ecosystem links, debate summary)
- [ ] Nav entries + palette actions for all new screens
- [ ] Full `npm test` + `next build` + prod smoke test, commit
