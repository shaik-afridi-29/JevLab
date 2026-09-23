"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StepForward, Users, Swords, Trophy, Brain, X } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field, inputCls } from "@/components/ui";
import { ProbBar } from "@/components/visuals";
import { logUsageFromResponse } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ROLES,
  newGame,
  holderOf,
  validTargets,
  observableState,
  beliefs,
  guess,
  choiceCriteria,
  moveChoiceInstructions,
  scoreGame,
  type KingdomGame,
  type RoundEvent,
} from "@/lib/kingdom";

type Mode = "watch" | "human";

interface TurnTrace {
  round: number;
  role: string;
  actor: string;
  jevPick: string;
  jevProbs: Record<string, number>;
  appliedPick: string;
  event: RoundEvent;
}

interface BatchRow {
  seed: number;
  guesses: number;
  accuracy: number;
  swaps: number;
  rationality: number;
}

const ROLE_TONE: Record<string, string> = {
  King: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  Queen: "text-violet-400 border-violet-400/40 bg-violet-400/10",
  Minister: "text-blue-300 border-blue-400/40 bg-blue-400/10",
  Soldier: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  Police: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  Thief: "text-red-300 border-red-400/40 bg-red-400/10",
};

export default function KingdomPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const [phase, setPhase] = React.useState<"setup" | "playing">("setup");
  const [mode, setMode] = React.useState<Mode>("watch");
  const [seed, setSeed] = React.useState(42);
  const [game, setGame] = React.useState<KingdomGame>(() => newGame(42));
  const [thinking, setThinking] = React.useState(false);
  const [auto, setAuto] = React.useState(false);
  const [banner, setBanner] = React.useState<{ kind: "correct" | "wrong"; text: string; sub: string } | null>(null);
  const [traces, setTraces] = React.useState<TurnTrace[]>([]);
  const [traceOpen, setTraceOpen] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [batchN, setBatchN] = React.useState(5);
  const [batchSeed, setBatchSeed] = React.useState(100);
  const [batchRunning, setBatchRunning] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState(0);
  const [batchRows, setBatchRows] = React.useState<BatchRow[] | null>(null);
  const busyRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const gameRef = React.useRef(game);
  gameRef.current = game;

  const start = (seedV: number, modeV: Mode) => {
    abortRef.current?.abort();
    setGame(newGame(seedV));
    setMode(modeV);
    setTraces([]);
    setTraceOpen(null);
    setBanner(null);
    setError(null);
    setAuto(false);
    setBatchRows(null);
    setPhase("playing");
  };

  const askJev = async (g: KingdomGame, signal?: AbortSignal) => {
    const { criteria } = choiceCriteria(g);
    const role = ROLES[g.activeRoleIdx];
    const next = ROLES[g.activeRoleIdx + 1];
    const b = beliefs(g);
    const req = {
      model,
      state: {
        ...observableState(g),
        belief_state: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Number(v.toFixed(3))])),
        note: "belief_state is code-computed from history (uniform over unruled-out candidates). Use it with the history.",
      },
      questions: { pick: { type: "choice" as const, instructions: moveChoiceInstructions(role, next), criteria } },
    };
    const res = await fetch("/api/jev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, demo: demoMode }),
      signal,
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Jev decision failed");
    logUsageFromResponse("kingdom", body);
    const pick = body.answers?.pick;
    const probs = (pick?.type === "choice" ? pick.probabilities : {}) as Record<string, number>;
    const jevPick = pick?.type === "choice" ? (pick.choice as string) : validTargets(g)[0];
    return { jevPick: validTargets(g).includes(jevPick) ? jevPick : validTargets(g)[0], probs };
  };

  const applyTurn = async (humanPick: string | null, signal?: AbortSignal) => {
    const g = gameRef.current;
    if (g.completed || busyRef.current) return;
    busyRef.current = true;
    setThinking(true);
    setError(null);
    try {
      const { jevPick, probs } = await askJev(g, signal);
      const applied = humanPick ?? jevPick;
      const { game: ng, event } = guess(gameRef.current, applied);
      setGame(ng);
      setTraces((t) => [...t, {
        round: event.round, role: event.activeRole, actor: event.actingPlayer,
        jevPick, jevProbs: probs, appliedPick: applied, event,
      }]);
      const holder = event.actingPlayer;
      if (event.result === "correct") {
        const placed = ng.players.find((p) => p.id === holder)!;
        setBanner({ kind: "correct", text: "CORRECT", sub: `${event.activeRole} completed — ${holder} takes ${ordinal(placed.placement!)} place` });
      } else {
        setBanner({ kind: "wrong", text: "INCORRECT", sub: `Roles swapped — ${holder} ↔ ${event.guessedPlayer}. ${event.activeRole} searches on.` });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "Turn failed");
    } finally {
      busyRef.current = false;
      setThinking(false);
    }
  };

  // Watch-mode autoplay
  React.useEffect(() => {
    if (!auto || phase !== "playing") return;
    if (game.completed) {
      setAuto(false);
      return;
    }
    const id = setTimeout(() => void applyTurn(null), 900);
    return () => clearTimeout(id);
  }, [auto, game, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const runBatch = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBatchRunning(true);
    setBatchRows(null);
    setBatchProgress(0);
    const rows: BatchRow[] = [];
    try {
      for (let i = 0; i < batchN; i++) {
        let g = newGame(batchSeed + i);
        let guard = 0;
        while (!g.completed && guard++ < 60) {
          const { jevPick } = await askJev(g, ctrl.signal);
          g = guess(g, jevPick).game;
        }
        const s = scoreGame(g);
        rows.push({ seed: batchSeed + i, guesses: s.totalGuesses, accuracy: s.accuracy, swaps: s.totalSwaps, rationality: s.meanRationality });
        setBatchRows([...rows]);
        setBatchProgress(i + 1);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "Batch failed");
    } finally {
      setBatchRunning(false);
    }
  };

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
            <Trophy size={22} />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">Kingdom Guessing Game</h1>
          <p className="mt-1 text-[14px] text-mist-400">Six players, six hidden roles. Each role must find the next — a wrong guess swaps the cards. Jev decides under uncertainty; rationality is scored, not just hits.</p>
          <div className="mt-2.5 flex justify-center gap-2"><Edu text="The agent never sees the hidden assignment — only the acting role, active players, failed guesses, and round history. Code maintains uniform beliefs over unruled-out candidates and scores each pick by the belief mass it carried. A swap changes the world, so information quality beats luck." />{demoMode && <DemoBadge />}</div>
        </div>
        <Card className="space-y-4 p-5">
          <Field label="Mode">
            <div className="grid grid-cols-2 gap-2">
              {(["watch", "human"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn("rounded-lg border px-3 py-2.5 text-[13.5px] font-medium", mode === m ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25")}>
                  {m === "watch" ? "Watch Jev play" : "You play, Jev judges"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Seed" hint="same seed replays the deal">
            <div className="flex gap-2">
              <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} className={cn(inputCls, "font-mono")} />
              <Button variant="outline" onClick={() => setSeed(Math.floor(Math.random() * 100000))}>Random</Button>
            </div>
          </Field>
          <Button size="lg" className="w-full" onClick={() => start(seed, mode)}><Play size={15} /> Deal the cards</Button>
        </Card>
      </div>
    );
  }

  const role = game.completed ? null : ROLES[game.activeRoleIdx];
  const holder = role ? holderOf(game, role) : null;
  const targets = validTargets(game);
  const b = beliefs(game);
  const score = scoreGame(game);
  const placed = [...game.players].filter((p) => p.placement !== null).sort((a, z) => a.placement! - z.placement!);
  const agg = batchRows && batchRows.length > 0 ? {
    acc: batchRows.reduce((a, r) => a + r.accuracy, 0) / batchRows.length,
    swaps: batchRows.reduce((a, r) => a + r.swaps, 0) / batchRows.length,
    rat: batchRows.reduce((a, r) => a + r.rationality, 0) / batchRows.length,
  } : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Kingdom <span className="text-mist-500">· {mode === "watch" ? "Jev plays" : "You play"}</span></h1>
          <p className="mt-1 font-mono text-[12.5px] text-mist-400">
            Round {game.round} · {game.completed ? "Game complete" : <>Active role <span className="font-semibold text-mist-100">{role}</span> · Holder <span className="font-semibold text-mist-100">{holder}</span></>} · Seed {game.seed}
          </p>
          <div className="mt-2 flex gap-2"><Edu text="Wrong guesses swap cards, so the same role can change hands many times. Beliefs reset only when a role completes — the search continues, only the actor changes." />{demoMode && <DemoBadge />}</div>
        </div>
        <div className="flex gap-2">
          {mode === "watch" && !game.completed && (
            <Button size="sm" variant="outline" onClick={() => setAuto((a) => !a)} disabled={thinking && !auto}>{auto ? <Pause size={13} /> : <Play size={13} />} {auto ? "Pause" : "Auto-play"}</Button>
          )}
          {mode === "watch" && !game.completed && !auto && (
            <Button size="sm" variant="outline" onClick={() => void applyTurn(null)} disabled={thinking}><StepForward size={13} /> {thinking ? "Thinking…" : "Step Jev"}</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setAuto(false); setPhase("setup"); }}><RotateCcw size={13} /> New</Button>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5" aria-label="Role hierarchy">
        {ROLES.map((r, i) => {
          const doneIdx = game.players.find((p) => p.completedRole === r);
          const isActive = !game.completed && ROLES[game.activeRoleIdx] === r;
          return (
            <React.Fragment key={r}>
              <span className={cn("rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-wider", isActive ? ROLE_TONE[r] : doneIdx ? "border-line/10 text-mist-500 line-through" : "border-line/10 text-mist-400")}>
                {isActive ? `▶ ${r}` : r}
              </span>
              {i < ROLES.length - 1 && <span className="text-mist-500">→</span>}
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div key={`${banner.text}-${game.round}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={cn("mb-4 rounded-xl border px-4 py-3 text-center", banner.kind === "correct" ? "border-emerald-400/30 bg-emerald-400/10" : "border-red-400/30 bg-red-400/10")}>
            <div className={cn("text-[15px] font-bold tracking-[0.12em]", banner.kind === "correct" ? "text-emerald-200" : "text-red-200")}>{banner.text}</div>
            <div className="mt-0.5 text-[12.5px] text-mist-300">{banner.sub}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <div className="mb-4"><ErrorBox title="Turn failed" detail={error} /></div>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Players */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500"><Users size={12} /> Players — roles hidden until completed</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {game.players.map((p) => {
                const isHolder = holder === p.id;
                const ruledOut = game.failedGuesses.includes(p.id);
                const clickable = mode === "human" && !game.completed && !thinking && targets.includes(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={!clickable}
                    onClick={() => void applyTurn(p.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      !p.active && "border-line/10 bg-wash/[0.02] opacity-80",
                      p.active && isHolder && "border-amber-400/50 bg-amber-400/[0.07] shadow-pop",
                      p.active && !isHolder && "border-line/10 bg-ink-950",
                      clickable && "cursor-pointer hover:border-emerald-400/50 hover:bg-emerald-400/[0.05]",
                      !clickable && p.active && "cursor-default"
                    )}
                    aria-label={`${p.id}${isHolder ? `, holds ${role}` : ""}${p.active ? "" : `, completed ${p.completedRole}`}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[14px] font-bold">{p.id}</span>
                      {isHolder && p.active && <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200">{role}</span>}
                    </div>
                    <div className="mt-1 text-[11.5px] text-mist-400">
                      {!p.active ? <span className="text-emerald-300 font-semibold">{ordinal(p.placement!)} · was {p.completedRole}</span>
                        : ruledOut ? <span className="text-mist-500">ruled out this search</span>
                        : isHolder ? <span>deciding…</span> : <span>active</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {mode === "human" && !game.completed && (
              <p className="mt-2 text-[12px] text-mist-500">{thinking ? "Jev is scoring the position…" : `Click a highlighted card to guess who holds the ${ROLES[game.activeRoleIdx + 1]} card.`}</p>
            )}
          </Card>

          {/* Decision panel */}
          <Card className="p-5">
            <SectionHead eyebrow="Decision" title={game.completed ? "Game complete" : `Who holds the ${ROLES[game.activeRoleIdx + 1]} card?`} hint={game.completed ? scoreSummary(score) : "Code beliefs from history — uniform over unruled-out candidates."} />
            {!game.completed && (
              <div className="space-y-2">
                {targets.map((t) => (
                  <div key={t}>
                    <div className="mb-1 flex justify-between font-mono text-[12.5px]">
                      <span className={cn("text-mist-300", game.failedGuesses.includes(t) && "line-through opacity-60")}>{t}{t === holder ? "" : ""}</span>
                      <span className="mono-num font-semibold">{fmtPct(b[t] ?? 0)}</span>
                    </div>
                    <ProbBar value={b[t] ?? 0} tone={game.failedGuesses.includes(t) ? "red" : "violet"} height={7} />
                  </div>
                ))}
              </div>
            )}
            {game.completed && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4 text-[13.5px]">
                <span className="font-semibold text-emerald-200">{scoreSummary(score)}</span>
                <span className="text-mist-300"> Mean rationality {score.meanRationality.toFixed(2)} — did the decider use its information well?</span>
              </div>
            )}
          </Card>

          {/* Batch */}
          <Card className="p-5">
            <SectionHead eyebrow="Evaluation" title="Batch games" hint="Same engine, fresh seeds. Sequential with cancel; costs log to the Ledger." />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Games (2–20)"><input type="number" min={2} max={20} value={batchN} onChange={(e) => setBatchN(Math.max(2, Math.min(20, Number(e.target.value) || 5)))} className={cn(inputCls, "w-24 font-mono")} /></Field>
              <Field label="First seed"><input type="number" value={batchSeed} onChange={(e) => setBatchSeed(Number(e.target.value) || 0)} className={cn(inputCls, "w-32 font-mono")} /></Field>
              {!batchRunning ? (
                <Button onClick={runBatch}><Swords size={14} /> Run {batchN} games</Button>
              ) : (
                <Button variant="outline" onClick={() => abortRef.current?.abort()}>Stop ({batchProgress}/{batchN})</Button>
              )}
            </div>
            {batchRunning && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-wash/[0.07]"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${(batchProgress / batchN) * 100}%` }} /></div>}
            {agg && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Accuracy</div><div className="mono-num font-mono text-[19px] font-semibold">{fmtPct(agg.acc)}</div></div>
                <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Swaps/game</div><div className="mono-num font-mono text-[19px] font-semibold">{agg.swaps.toFixed(1)}</div></div>
                <div className="rounded-lg bg-ink-950 p-3"><div className="text-[10.5px] uppercase tracking-wider text-mist-500">Rationality</div><div className="mono-num font-mono text-[19px] font-semibold">{agg.rat.toFixed(2)}</div></div>
              </div>
            )}
            {batchRows && batchRows.length > 0 && (
              <div className="mono-num mt-3 grid max-h-32 grid-cols-2 gap-1 overflow-y-auto font-mono text-[11px] sm:grid-cols-4">
                {batchRows.map((r) => (
                  <div key={r.seed} className="rounded-md bg-wash/[0.03] px-2 py-1.5 text-mist-300">#{r.seed} acc {r.accuracy.toFixed(2)} · {r.swaps}⇄ · ρ {r.rationality.toFixed(2)}</div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* Leaderboard */}
          <Card className="p-5">
            <SectionHead eyebrow="Standings" title="Leaderboard" />
            {placed.length === 0 ? <p className="text-[13px] text-mist-500">No placements yet — complete a role to take a place.</p> : (
              <div className="space-y-1.5">
                {placed.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-lg bg-wash/[0.03] px-3 py-2 text-[13px]">
                    <span className="mono-num w-7 font-mono font-bold text-amber-200">{p.placement}</span>
                    <span className="font-mono font-semibold">{p.id}</span>
                    <span className="text-mist-400">{p.completedRole}</span>
                    <span className="mono-num ml-auto font-mono text-[11.5px] text-mist-500">{p.attempts} attempt{p.attempts === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
            {!game.completed && game.players.some((p) => p.active) && (
              <p className="mt-2 text-[11.5px] text-mist-500">Thief takes the final place automatically.</p>
            )}
          </Card>

          {/* History + traces */}
          <Card className="p-5">
            <SectionHead eyebrow="Trace" title="Round history" hint="Select a round for the full decision trace." />
            {traces.length === 0 ? <p className="text-[13px] text-mist-500">No rounds yet.</p> : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {traces.map((t, i) => (
                  <div key={i}>
                    <button onClick={() => setTraceOpen(traceOpen === i ? null : i)} className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px]", t.event.result === "correct" ? "border-emerald-400/20" : "border-line/10")}>
                      <span className="mono-num font-mono text-mist-500">R{t.round}</span>
                      <span className={t.event.result === "correct" ? "text-emerald-300" : "text-red-300"}>{t.event.result === "correct" ? "✓" : "✕"}</span>
                      <span className="truncate">{t.actor} → {t.appliedPick} <span className="text-mist-500">({t.role})</span></span>
                      <span className="mono-num ml-auto shrink-0 font-mono text-[11px] text-mist-500">ρ {t.event.beliefOnTarget.toFixed(2)}</span>
                    </button>
                    {traceOpen === i && (
                      <div className="mt-1.5 rounded-lg bg-ink-950 p-3">
                        <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-mist-500">Jev distribution</div>
                        {Object.entries(t.jevProbs).sort((a, z) => z[1] - a[1]).map(([k, v]) => (
                          <div key={k} className="mb-1.5">
                            <div className="mb-0.5 flex justify-between font-mono text-[11.5px]">
                              <span className={k === t.jevPick ? "font-bold text-emerald-200" : "text-mist-300"}>{k}{mode === "human" && k === t.appliedPick && k !== t.jevPick ? " (you)" : ""}</span>
                              <span className="mono-num">{fmtPct(v)}</span>
                            </div>
                            <ProbBar value={v} tone={k === t.jevPick ? "emerald" : "blue"} height={6} />
                          </div>
                        ))}
                        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mist-400"><Brain size={12} />
                          {mode === "human" && t.appliedPick !== t.jevPick
                            ? `You picked ${t.appliedPick} at ρ ${t.event.beliefOnTarget.toFixed(2)}; Jev preferred ${t.jevPick}.`
                            : `Rationality ρ ${t.event.beliefOnTarget.toFixed(2)} — belief mass on the pick at decision time.`}
                        </div>
                        {t.event.swapOccurred && <div className="mt-1 text-[11.5px] text-amber-300">Swap: {t.actor} ↔ {t.event.guessedPlayer} — role continues under {t.event.guessedPlayer}.</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function scoreSummary(s: ReturnType<typeof scoreGame>): string {
  return `${s.correctGuesses}/${s.totalGuesses} correct (${fmtPct(s.accuracy)}) · ${s.totalSwaps} swaps.`;
}
