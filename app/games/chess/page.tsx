"use client";

import React from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { motion } from "framer-motion";
import { Play, RotateCcw, Undo2, ArrowLeftRight, Crown } from "lucide-react";
import { Button, Card, Edu, ErrorBox, EmptyState, SectionHead, DemoBadge, Field } from "@/components/ui";
import { AnswerCard, RawInspector, ProbBar } from "@/components/visuals";
import { useLab } from "@/lib/store";
import { fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  describePosition,
  buildMoveCriteria,
  moveChoiceInstructions,
  WHITE_WINNING_INSTRUCTIONS,
  DANGER_INSTRUCTIONS,
  DANGER_LEVELS,
  type JevStyle,
  type Side,
} from "@/lib/chess";
import type { JevApiRequest, JevApiResponse } from "@/lib/jev/types";
import { logUsageFromResponse } from "@/lib/cost";

const GLYPHS: Record<string, { w: string; b: string }> = {
  k: { w: "♔", b: "♚" },
  q: { w: "♕", b: "♛" },
  r: { w: "♖", b: "♜" },
  b: { w: "♗", b: "♝" },
  n: { w: "♘", b: "♞" },
  p: { w: "♙", b: "♟" },
};

type Phase = "setup" | "playing";

export default function ChessPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const gameRef = React.useRef(new Chess());
  const [, setTick] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [humanSide, setHumanSide] = React.useState<Side>("w");
  const [sideChoice, setSideChoice] = React.useState<"w" | "b" | "random">("w");
  const [style, setStyle] = React.useState<JevStyle>("balanced");
  const [flipped, setFlipped] = React.useState(false);
  const [selected, setSelected] = React.useState<Square | null>(null);
  const [promo, setPromo] = React.useState<{ from: Square; to: Square } | null>(null);
  const [lastMove, setLastMove] = React.useState<{ from: string; to: string } | null>(null);
  const [thinking, setThinking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assess, setAssess] = React.useState<{ response: JevApiResponse; request: JevApiRequest; moveSan: string } | null>(null);
  const pendingMap = React.useRef<Record<string, string>>({});

  const game = gameRef.current;
  const rerender = () => setTick((t) => t + 1);

  const orientation: Side = flipped ? (humanSide === "w" ? "b" : "w") : humanSide;
  const turn: Side = game.turn();
  const gameOver = game.isGameOver();
  const humanTurn = phase === "playing" && !gameOver && !thinking && turn === humanSide;

  const outcome = gameOver
    ? game.isCheckmate()
      ? `Checkmate — ${turn === "w" ? "Black" : "White"} wins`
      : "Draw — " + (game.isStalemate() ? "stalemate" : game.isInsufficientMaterial() ? "insufficient material" : game.isThreefoldRepetition() ? "threefold repetition" : "fifty-move rule")
    : null;

  const startGame = (side: Side) => {
    gameRef.current = new Chess();
    pendingMap.current = {};
    setHumanSide(side);
    setSelected(null);
    setPromo(null);
    setLastMove(null);
    setAssess(null);
    setError(null);
    setPhase("playing");
    setTick((t) => t + 1);
    if (side !== "w") {
      const jevSide: Side = "w";
      setTimeout(() => void jevMove(gameRef.current, jevSide), 350);
    }
  };

  const jevMove = async (g: Chess, jevSide: Side) => {
    if (g.isGameOver()) return;
    setThinking(true);
    setError(null);
    try {
      const { criteria, indexToSan } = buildMoveCriteria(g);
      const colorName = jevSide === "w" ? "White" : "Black";
      const req: JevApiRequest = {
        model,
        state: describePosition(g, jevSide),
        questions: {
          move_pick: { type: "choice", instructions: moveChoiceInstructions(colorName, style), criteria },
          white_winning: { type: "noul", instructions: WHITE_WINNING_INSTRUCTIONS },
          danger: { type: "score", instructions: DANGER_INSTRUCTIONS, criteria: DANGER_LEVELS },
        },
      };
      pendingMap.current = indexToSan;
      const res = await fetch("/api/jev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, demo: demoMode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Jev move failed");
        logUsageFromResponse("chess", body);
      const pick = body.answers?.move_pick;
      const key = pick?.type === "choice" ? pick.choice : null;
      const san = (key && pendingMap.current[key]) || pick?.choice;
      const mv = g.move(san);
      setLastMove({ from: mv.from, to: mv.to });
      setAssess({ response: body, request: req, moveSan: mv.san });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Jev move failed");
    } finally {
      setThinking(false);
      rerender();
    }
  };

  const onSquare = (sq: Square) => {
    if (!humanTurn) return;
    setError(null);
    if (promo) return;
    if (selected) {
      const opts = game.moves({ square: selected, verbose: true }).filter((m) => m.to === sq);
      if (opts.length > 1 && opts[0].promotion) {
        setPromo({ from: selected, to: sq });
        return;
      }
      if (opts.length === 1) {
        humanApply(selected, sq, opts[0].promotion);
        return;
      }
    }
    const piece = game.get(sq);
    if (piece && piece.color === humanSide) {
      setSelected(selected === sq ? null : sq);
    } else {
      setSelected(null);
    }
  };

  const humanApply = (from: Square, to: Square, promotion?: string) => {
    try {
      const mv = game.move({ from, to, promotion });
      setLastMove({ from: mv.from, to: mv.to });
      setSelected(null);
      setPromo(null);
      rerender();
      if (!game.isGameOver()) setTimeout(() => void jevMove(game, humanSide === "w" ? "b" : "w"), 350);
    } catch {
      setSelected(null);
    }
  };

  const undo = () => {
    // Take back until it is the human's turn again (both half-moves).
    game.undo();
    if (game.turn() !== humanSide && game.history().length > 0) game.undo();
    setSelected(null);
    setPromo(null);
    setLastMove(null);
    rerender();
  };

  const legalTargets: Set<string> = React.useMemo(() => {
    if (!selected || !humanTurn) return new Set();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, humanTurn, game.fen()]);

  const kingInCheck: string | null = React.useMemo(() => {
    if (!game.isCheck()) return null;
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === turn) return cell.square;
      }
    }
    return null;
  }, [game, turn]);

  const history = game.history();
  const material = materialDiff(game);

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
            <Crown size={22} />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight">Chess vs Jev</h1>
          <p className="mt-1 text-[14px] text-mist-400">You play the moves. Jev picks its replies with Choice — and tells you who it thinks is winning.</p>
          <div className="mt-2.5 flex justify-center gap-2"><Edu text="Each Jev turn sends the position (FEN + history + captured material) with three parallel questions: a Choice over every legal move, a Noul for whether White is winning, and a Score for danger. Jev's move is the argmax of the Choice distribution." />{demoMode && <DemoBadge />}</div>
        </div>
        <Card className="space-y-4 p-5">
          <Field label="Your side">
            <div className="grid grid-cols-3 gap-2">
              {(["w", "b", "random"] as const).map((s) => (
                <button key={s} onClick={() => setSideChoice(s)} className={cn("rounded-lg border px-3 py-2.5 text-[13.5px] font-medium capitalize", sideChoice === s ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25")}>
                  {s === "w" ? "White ♙" : s === "b" ? "Black ♟" : "Random"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Jev style" hint="rewords instructions only">
            <div className="grid grid-cols-3 gap-2">
              {(["solid", "balanced", "aggressive"] as const).map((s) => (
                <button key={s} onClick={() => setStyle(s)} className={cn("rounded-lg border px-3 py-2.5 text-[13.5px] font-medium capitalize", style === s ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-line/10 text-mist-400 hover:border-line/25")}>{s}</button>
              ))}
            </div>
          </Field>
          <Button size="lg" className="w-full" onClick={() => startGame(sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice)} kbd="⌘⏎">
            <Play size={15} /> Start game
          </Button>
        </Card>
      </div>
    );
  }

  const pick = assess?.response.answers?.move_pick;
  const topMoves =
    pick?.type === "choice"
      ? Object.entries(pick.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, p]) => ({ san: pendingMap.current[k] ?? k, p }))
      : [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Chess vs Jev</h1>
          <p className="mt-1 text-[14px] text-mist-400">
            You are <span className="font-semibold text-mist-100">{humanSide === "w" ? "White ♙" : "Black ♟"}</span> · Jev plays {style} ·{" "}
            {gameOver ? <span className="text-amber-300">{outcome}</span> : thinking ? <span className="animate-pulse-soft text-emerald-300">Jev is thinking…</span> : turn === humanSide ? "Your move" : "Jev to move"}
          </p>
          <div className="mt-2 flex gap-2"><Edu text="Jev sees FEN, move history and captured material, then distributes probability over every legal move. The played move is the highest-probability option — the bars show what else it considered." />{demoMode && <DemoBadge />}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setFlipped((f) => !f)}><ArrowLeftRight size={13} /> Flip</Button>
          <Button size="sm" variant="outline" onClick={undo} disabled={thinking || history.length === 0}><Undo2 size={13} /> Undo</Button>
          <Button size="sm" variant="outline" onClick={() => setPhase("setup")}><RotateCcw size={13} /> New</Button>
        </div>
      </div>

      {outcome && (
        <div className="mb-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-center text-[14px] font-semibold text-amber-200">{outcome} · Jev assessment, played to the final position.</div>
      )}
      {error && <div className="mb-4"><ErrorBox title="Jev move failed" detail={error} /></div>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,560px)_1fr]">
        {/* Board */}
        <Card className="p-4">
          <div className="grid grid-cols-8 overflow-hidden rounded-lg border border-line/10" role="grid" aria-label="Chess board">
            {Array.from({ length: 8 }, (_, r) =>
              Array.from({ length: 8 }, (_, c) => {
                const file = orientation === "w" ? c : 7 - c;
                const rankIdx = orientation === "w" ? 7 - r : r;
                const sq = (`${"abcdefgh"[file]}${rankIdx + 1}`) as Square;
                const piece = game.get(sq);
                const light = (file + rankIdx) % 2 === 1;
                const isSel = selected === sq;
                const isTarget = legalTargets.has(sq);
                const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
                const isCheck = kingInCheck === sq;
                return (
                  <button
                    key={sq}
                    role="gridcell"
                    aria-label={`${sq}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
                    onClick={() => onSquare(sq)}
                    className={cn(
                      "relative flex aspect-square items-center justify-center text-[clamp(22px,4.5vw,40px)] leading-none transition-colors",
                      light ? "bg-[#d6cfbd]" : "bg-[#6f665a]",
                      isSel && "bg-emerald-400/60",
                      isCheck && "!bg-red-400/70"
                    )}
                    style={isLast && !isSel ? { boxShadow: "inset 0 0 0 3px rgba(52,211,153,0.55)" } : undefined}
                  >
                    {c === 0 && <span className={cn("absolute left-1 top-0.5 font-mono text-[10px]", light ? "text-[#6f665a]" : "text-[#d6cfbd]")}>{rankIdx + 1}</span>}
                    {r === 7 && <span className={cn("absolute bottom-0.5 right-1 font-mono text-[10px]", light ? "text-[#6f665a]" : "text-[#d6cfbd]")}>{"abcdefgh"[file]}</span>}
                    {piece && (
                      <span style={{ color: piece.color === "w" ? "#f7f4ea" : "#201c17", textShadow: piece.color === "w" ? "0 1px 2px rgba(0,0,0,0.75), 0 0 1px #000" : "0 1px 1px rgba(255,255,255,0.25)" }}>
                        {GLYPHS[piece.type][piece.color]}
                      </span>
                    )}
                    {!piece && isTarget && <span className="h-[26%] w-[26%] rounded-full bg-emerald-500/50" />}
                    {piece && isTarget && <span className="absolute inset-1 rounded-md border-[3px] border-emerald-500/60" />}
                  </button>
                );
              })
            )}
          </div>
          {promo && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-line/10 bg-ink-950 p-3">
              <span className="text-[13px] text-mist-300">Promote to:</span>
              {(["q", "r", "b", "n"] as const).map((p) => (
                <button key={p} onClick={() => humanApply(promo.from, promo.to, p)} className="rounded-lg border border-line/12 bg-wash/[0.04] px-4 py-2 text-2xl hover:border-emerald-400/40">
                  {GLYPHS[p][humanSide]}
                </button>
              ))}
              <button onClick={() => setPromo(null)} className="text-[12px] text-mist-500 hover:text-mist-200">cancel</button>
            </div>
          )}
          <div className="mono-num mt-3 flex items-center justify-between font-mono text-[12px] text-mist-400">
            <span>Move {Math.floor(history.length / 2) + 1} · {turn === "w" ? "White" : "Black"} to move</span>
            <span>{material === 0 ? "Material even" : material > 0 ? `White +${material}` : `Black +${-material}`}</span>
          </div>
          {/* Move list */}
          <div className="mono-num mt-2 max-h-28 overflow-y-auto rounded-lg bg-wash/[0.02] p-2.5 font-mono text-[12px] leading-relaxed text-mist-300">
            {history.length === 0 ? <span className="text-mist-500">No moves yet.</span> : pairMoves(history).map((pair, i) => (
              <span key={i} className="mr-3"><span className="text-mist-500">{i + 1}.</span> {pair}</span>
            ))}
          </div>
        </Card>

        {/* Jev panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHead eyebrow="Jev assessment" title={assess ? `Jev played ${assess.moveSan}` : "Awaiting Jev"} hint={assess ? "Choice argmax over all legal moves in that position." : "Make your move — Jev replies with its distribution."} />
            {!assess && <EmptyState title="No Jev moves yet" body="Jev's chosen move and the full candidate distribution appear here after its first reply." />}
            {assess && topMoves.length > 0 && (
              <div className="space-y-2">
                {topMoves.map(({ san, p }, i) => (
                  <div key={san}>
                    <div className="mb-1 flex justify-between font-mono text-[12.5px]">
                      <span className={i === 0 ? "font-semibold text-emerald-200" : "text-mist-300"}>{san}{i === 0 && <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">played</span>}</span>
                      <span className="mono-num font-semibold">{fmtPct(p)}</span>
                    </div>
                    <ProbBar value={p} tone={i === 0 ? "emerald" : "blue"} height={7} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {assess && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
              {Object.entries(assess.response.answers)
                .filter(([k]) => k !== "move_pick")
                .map(([k, a]) => (
                  <AnswerCard key={k} qKey={k} answer={a} />
                ))}
              <RawInspector response={assess.response} request={assess.request} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function pairMoves(history: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < history.length; i += 2) {
    out.push(history[i + 1] ? `${history[i]} ${history[i + 1]}` : history[i]);
  }
  return out;
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function materialDiff(game: Chess): number {
  let diff = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      diff += (cell.color === "w" ? 1 : -1) * (VALUES[cell.type] ?? 0);
    }
  }
  return diff;
}
