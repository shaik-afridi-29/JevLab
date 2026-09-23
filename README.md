# Jev Lab

![Next.js 14](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tests](https://img.shields.io/badge/tests-55_passing-brightgreen)

Run Jev — TypeSafe AI's decision model — through its paces without writing code: ask Noul, Choice, and Score questions, inspect calibrated probabilities, stress-test failure modes, and track every cent of API spend.

## Contents

- [What this is](#what-this-is)
- [Who this is for](#who-this-is-for)
- [Prerequisites](#prerequisites)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Feature map](#feature-map)
- [Core workflow](#core-workflow)
- [Cost awareness](#cost-awareness)
- [Project structure](#project-structure)
- [Internal API reference](#internal-api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Troubleshooting](#troubleshooting)
- [Glossary](#glossary)
- [License and version](#license-and-version)

## What this is

Jev Lab is an experimentation environment for [Jev](https://docs.typesafe.ai), TypeSafe AI's System One decision model. Jev does not generate text: you send a **state** plus typed **questions**, and it returns structured answers — a yes/no probability (**Noul**), a pick from a fixed set (**Choice**), or a position on an ordered scale (**Score**) — each with calibrated probabilities your code can branch on.

Jev Lab wraps that API in a visual laboratory so you can:

- Ask questions and see full probability distributions alongside the top answer.
- Vary wording, state, and thresholds to observe how outputs move.
- Reproduce the nine documented failure modes and calibration debates interactively.
- Apply proven production patterns (guardrails, routers, RAG gates) to your own inputs.
- Account for every API call in tokens, latency, and dollars.

## Who this is for

| Reader | Starting point |
|---|---|
| Engineer evaluating Jev for production | [Quickstart](#quickstart), then Production Patterns and the Ledger |
| Researcher studying calibrated decisions | Calibration Workbench, Jaggedness Gauntlet, Confidence Lab |
| Product stakeholder | Overview page, Learn Jev, Movie Night and Detective games |
| New team member onboarding to the repo | This file, top to bottom (about 10 minutes) |

## Prerequisites

- Node.js 18.17 or later (`node --version`).
- npm (ships with Node).
- A TypeSafe API key with Jev access ([get access](https://typesafe.ai)). The lab also runs without one in Demo Mode.

## Quickstart

> **Warning:** Never commit your real API key. Keep it in `.env.local` (git-ignored), not in `.env` or in chat.

1. Clone the repository and enter it:
   ```bash
   git clone <repo-url> jev-lab && cd jev-lab
   ```
   Expected result: the project files are on disk, including `package.json`.

2. Install dependencies:
   ```bash
   npm install
   ```
   Expected result: `node_modules/` is created with no errors.

3. Provide your API key:
   ```bash
   cp .env.example .env.local
   # edit .env.local and set TYPESAFE_API_KEY=<your key>
   ```
   Expected result: `TYPESAFE_API_KEY` is set in the local environment only. If no `.env.example` exists yet, create `.env.local` containing a single line: `TYPESAFE_API_KEY=<your key>`.

   No key? Skip this step — the sidebar toggle switches the whole lab to deterministic **Demo Mode** (every mock response is badged `DEMO DATA`).

4. Start the application:
   ```bash
   npm run dev
   ```
   Expected result: `✓ Ready` and the lab opens at [http://localhost:3000](http://localhost:3000).

5. Confirm the live connection: open **Settings → Test Connection**.
   Expected result: `API Status · Connected` with a resolved model such as `jev-1.13.0`.

6. Run your first question: open **Noul**, keep the sample state, press **Run with Jev** (or `⌘⏎`).
   Expected result: an animated probability readout plus the raw JSON response.

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TYPESAFE_API_KEY` | For live calls | — | Server-side credential for `api.typesafe.ai`. Read only by API routes; never sent to the browser. |

In-app settings (persisted in the browser, survive restarts):

| Setting | Location | Default | Purpose |
|---|---|---|---|
| Model | Settings, sidebar footer | `jev-latest` | Model string sent with every request. Pin `jev-1.13.0` for reproducible evals. |
| Live / Demo | Sidebar | Live | Demo uses a deterministic mock; safe for UI exploration at zero cost. |
| Theme | Header, Settings | Follows OS | Dark-first design with a full light theme and a System option. |

## Feature map

| Area | Route | What you do there |
|---|---|---|
| Overview | `/` | Entry dashboard, quick starts, recent experiments |
| Noul / Choice / Score playgrounds | `/noul`, `/choice`, `/score` | Single-type questions with distributions and threshold explorer |
| Multi-Question | `/multi` | Noul + Choice + Score against one state in a single round trip |
| Question Sensitivity | `/experiments/question-sensitivity` | Fixed state, varied phrasing |
| State Sensitivity | `/experiments/state-sensitivity` | Fixed question, varied states |
| Repeated Runs | `/experiments/repeated` | Same request N times with summary statistics |
| Adversarial Testing | `/experiments/adversarial` | Negation, contradiction, injection, and five more attack classes |
| Calibration (thresholds) | `/experiments/calibration` | Threshold explorer and A/B wording comparison |
| Jaggedness Gauntlet | `/experiments/jaggedness` | All nine official jev-1.13 failure modes, runnable with code-judged verdicts |
| Confidence Lab | `/experiments/confidence-lab` | Distribution→confidence math plus a three-path action gate |
| Calibration Workbench | `/experiments/calibration-workbench` | Declare ground truth, measure reliability diagram and ECE |
| Cost & Latency Ledger | `/experiments/ledger` | Per-call tokens, latency histogram, session spend, $/hr projections |
| Production Patterns | `/experiments/patterns` | Guardrail, router, RAG gate, citation checker, reranker, crawl classifier |
| Detective / Movie Night / Pokémon / Chess / Loop Arena | `/games/*` | Turn-based and real-time games driven by live Jev judgments |
| Saved Experiments / Templates | `/library`, `/templates` | Persist, duplicate, compare, import/export as JSON |
| Learn Jev | `/learn` | Model background, limits, pricing, debates, ecosystem links |
| Settings | `/settings` | Connection test, model pinning, demo mode, appearance |

## Core workflow

Every screen follows the same mental model: **State → Question → Run → Result → Experiment → Compare**.

1. Enter a **state**: the text or JSON Jev should judge (Text/JSON toggle in the editor).
2. Write **instructions**: the literal question. Jev answers what you wrote, not what you meant — boundary cases belong in the criteria.
3. Add **criteria** where the type requires it: 2–255 labeled options for Choice, 2–10 ordered levels for Score, optional true/false glosses for Noul.
4. Press **Run with Jev**. Results animate in as separate cards: Jev output, app visualization, and observed interpretation — never presented as certainty.
5. Open **Raw Jev Response** on any result to see the exact wire payload (copy/download supported).
6. Save to the **Library** to keep, duplicate, export, or A/B-compare the experiment later.

Keyboard: `⌘K` command palette · `⌘⏎` run · `⌘S` save.

## Cost awareness

Jev list pricing is $0.042 per million input tokens; output tokens are free. The lab prices every call from the `usage.input_tokens` field in each response and records it in the Ledger (live and demo calls are labeled separately). Use the $/hr projector before running high-frequency loops: the Loop Arena at ~10 calls/second is the shape of workload the Doom demo priced near $7/hour.

## Project structure

```text
app/                  Next.js App Router pages and API routes
  api/jev/            Server-side proxy (attaches the key) + connection test
  experiments/        Sensitivity, repeated, adversarial, calibration,
                      jaggedness, confidence, ledger, patterns
  games/              Detective, movie, Pokémon, chess, loop arena
  library|templates   Persistence, import/export, comparison, starters
  learn|settings      Curated Jev reference; connection/model/appearance
components/           Shell, editors, visualizations (charts code-split),
                      question builders, inspectors, command palette
lib/
  jev/                Wire types, server client, request builder, validators
  cost|confidence|    Pure helpers: pricing, confidence math, ECE/binning,
  calibration|        failure-mode judges, pattern policies, chess helpers,
  jaggedness|         theme resolution, stats, seed data, persisted store
  patterns|chess|
  theme|stats|seed|
  store.ts
docs/superpowers/plans/  Implementation plans for each build phase
```

## Internal API reference

The browser never calls TypeSafe directly. It calls these same-origin routes; the server attaches the key.

| Route | Method | Request body | Response |
|---|---|---|---|
| `/api/jev` | POST | `{ model, state, questions, demo? }` | Jev `answers` map plus `_meta { demo, latencyMs, status }`, or `{ error, detail }` |
| `/api/jev/test` | GET | — | `{ connected, model?, latencyMs? }` or `{ connected: false, reason }` |

The request/response shapes follow the [official API](https://docs.typesafe.ai): Noul returns `{ noul }`; Choice returns `{ choice, probabilities, confidence }`; Score returns `{ score, legend, probabilities, confidence }`.

## Development

| Command | Purpose | Expected result |
|---|---|---|
| `npm run dev` | Local development server | Lab at `http://localhost:3000` with hot reload |
| `npm test` | Vitest suite (`lib/**/*.test.ts`) | All tests passing (currently 55) |
| `npx tsc --noEmit` | Type check | No output (clean) |
| `npm run build` | Production build | All routes prerendered with no errors |
| `npm start` | Serve the production build | Fast responses; use this to judge real performance |

Conventions contributors follow:

- **Test-driven helpers.** Pure logic in `lib/` ships with a failing-first Vitest file; UI pages are verified by build plus live API smoke tests.
- **Service-layer discipline.** Jev calls go through `lib/jev/` and `/api/jev` only — never scattered across components.
- **Language discipline.** UI copy says *Jev assessment*, *highest-probability option*, and *observed difference*. Never certainty, never causality.
- **Theme discipline.** Colors come from the CSS-variable palette (`ink`, `mist`, `line`, `wash`); no fixed dark hexes outside the chessboard; charts read `var(--chart-*)`.
- **Cost discipline.** Every new fetch call site logs via `logUsageFromResponse(route, body)`.

## Deployment

**Vercel (recommended).** Import the repo, set `TYPESAFE_API_KEY` in Project Settings → Environment Variables (all environments), deploy. No other configuration is required.

**Standalone Node.** On any host with Node 18.17+:

```bash
npm ci
TYPESAFE_API_KEY=<your key> npm run build
TYPESAFE_API_KEY=<your key> npm start -- -p 3000
```

**Docker.** A minimal image:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
```

Pass the key at runtime (`-e TYPESAFE_API_KEY=...` or your orchestrator's secret store), never bake it into the image.

## Security model

- The API key lives in the server environment only. The Settings page displays a mask; the raw value is never serialized to the client.
- All TypeSafe traffic is server-to-server over HTTPS with a Bearer token.
- Experiment data persists in the browser's `localStorage` (zustand). Treat shared machines accordingly; there is no server-side user data to breach.
- Demo Mode performs zero external calls and spends nothing.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Jev rejected the API key` (401/403) | Missing or wrong `TYPESAFE_API_KEY` | Set it in `.env.local`, restart `npm run dev`, re-run Settings → Test Connection |
| `did not accept this configuration` (422) | Invalid question shape (e.g. one Choice option, eleven Score levels) | The UI validators flag these inline before sending; check criteria counts |
| `Rate limited` (429) | Too many calls in a short window | Wait, then retry; lower Loop Arena tick speed |
| First tab visit takes 1–4s in dev | On-demand compilation of ~2,400 modules | Normal for `npm run dev`; judge speed on `npm start` after `npm run build` |
| `Fast Refresh had to perform a full reload` | Two dev servers watching one directory, or edits mid-session | Keep one server running; hard-refresh the browser |
| Ledger shows $0 for a run | Demo Mode call, or a response without `usage` | Switch to Live Jev; demo calls are intentionally free |
| `⌘⏎` does nothing | Focus is outside a runnable page, or validation issues block the run | Resolve the inline warnings, then retry |

## Glossary

- **System One model** — TypeSafe's term (after Kahneman) for a model that returns fast, bounded judgments instead of generated text.
- **State** — the text or JSON under judgment; every question in a request sees the same state.
- **Noul** — a yes/no question returning the probability the proposition is true. Short for Bernoulli. Carries no separate confidence value.
- **Choice** — a pick from up to 255 labeled options; returns the argmax plus the full distribution and a confidence score.
- **Score** — a rating against 2–10 ordered levels; returns a possibly fractional expectation plus distribution, legend, and confidence. Ordered, not metric.
- **Confidence** — a 0–1 statistic derived from distribution shape, `(n·peak−1)/(n−1)`; flat distributions score low.
- **ECE (Expected Calibration Error)** — mean gap between stated confidence and observed accuracy across bins; 0 is perfect.
- **Jaggedness** — TypeSafe's term for Jev's uneven capability edges (counting, dates, literal reading, and six more).
- **Threshold** — application-side cutoff converting a probability into a decision. Jev never sets it; your code does.

## License and version

- **App version:** 1.0.0 (Next.js 14, React 18, TypeSafe Jev `jev-latest` with `jev-1.13.0` resolution).
- **License:** MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Shaik Afridi.
- **Upstream references:** [TypeSafe docs](https://docs.typesafe.ai) · [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev) · [jaggedness notes](https://docs.typesafe.ai/model-jaggedness/jev-1.13) · [in-app Learn hub](/learn).
