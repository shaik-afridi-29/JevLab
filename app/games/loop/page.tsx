"use client";

import React from "react";
import { Play, Square, Plus } from "lucide-react";
import { Button, Card, Edu, ErrorBox, SectionHead, DemoBadge } from "@/components/ui";
import { logUsageFromResponse, inputTokensToUsd, formatUsd } from "@/lib/cost";
import { useLab } from "@/lib/store";
import { cn } from "@/lib/utils";

const W = 12;
const H = 8;

interface Hazard {
  x: number;
  y: number;
}

export default function LoopArenaPage() {
  const demoMode = useLab((s) => s.demoMode);
  const model = useLab((s) => s.model);

  const [running, setRunning] = React.useState(false);
  const [speedMs, setSpeedMs] = React.useState(600);
  const [player, setPlayer] = React.useState(5);
  const [hazards, setHazards] = React.useState<Hazard[]>([]);
  const [tick, setTick] = React.useState(0);
  const [alive, setAlive] = React.useState(true);
  const [calls, setCalls] = React.useState(0);
  const [tokens, setTokens] = React.useState(0);
  const [thinking, setThinking] = React.useState(false);
  const [lastMove, setLastMove] = React.useState<string>("—");
  const [error, setError] = React.useState<string | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);

  const stateRef = React.useRef({ player: 5, hazards: [] as Hazard[], tick: 0, alive: true });
  const busyRef = React.useRef(false);

  const reset = (keepRunning: boolean) => {
    const s = { player: 5, hazards: [], tick: 0, alive: true };
    stateRef.current = s;
    setPlayer(5);
    setHazards([]);
    setTick(0);
    setAlive(true);
    setCalls(0);
    setTokens(0);
    setLastMove("—");
    setError(null);
    setStartedAt(keepRunning ? Date.now() : null);
    setRunning(keepRunning);
  };

  const step = React.useCallback(async () => {
    const s = stateRef.current;
    if (!s.alive || busyRef.current) return;
    busyRef.current = true;
    setThinking(true);
    try {
      const req = {
        model,
        state: { player_x: s.player, width: W, height: H, tick: s.tick, hazards: s.hazards.map((h) => ({ x: h.x, y: h.y })) },
        questions: {
          move: {
            type: "choice" as const,
            instructions: "Which move best avoids the falling hazards? The bottom row is where the player stands.",
            criteria: {
              left: s.player === 0 ? "Move left (ILLEGAL at left edge — do not pick)" : `Move to x=${s.player - 1}`,
              stay: `Stay at x=${s.player}`,
              right: s.player === W - 1 ? "Move right (ILLEGAL at right edge — do not pick)" : `Move to x=${s.player + 1}`,
            },
          },
        },
      };
      const res = await fetch("/api/jev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, demo: demoMode }) });
      const body = await res.json();
      if (res.ok) {
        logUsageFromResponse("loop-arena", body);
        setTokens((t) => t + (body.usage?.input_tokens ?? 0));
        setCalls((c) => c + 1);
      }
      const pick = res.ok ? body.answers?.move?.choice : "stay";
      const cur = stateRef.current;
      let nx = cur.player;
      if (pick === "left") nx = Math.max(0, cur.player - 1);
      if (pick === "right") nx = Math.min(W - 1, cur.player + 1);
      setLastMove(pick ?? "stay");
      // Code owns the game truth: advance hazards, spawn, collide.
      const moved = cur.hazards.map((h) => ({ ...h, y: h.y + 1 })).filter((h) => h.y < H);
      const spawn: Hazard = { x: Math.floor(Math.random() * W), y: 0 };
      const next = [...moved, spawn];
      const dead = next.some((h) => h.y === H - 1 && h.x === nx);
      stateRef.current = { player: nx, hazards: next, tick: cur.tick + 1, alive: !dead };
      setPlayer(nx);
      setHazards(next);
      setTick(cur.tick + 1);
      if (dead) {
        setAlive(false);
        setRunning(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loop failed");
      setRunning(false);
    } finally {
      busyRef.current = false;
      setThinking(false);
    }
  }, [demoMode, model]);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => void step(), speedMs);
    return () => clearInterval(id);
  }, [running, speedMs, step]);

  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const cps = elapsed > 1 ? calls / elapsed : 0;
  const projHr = cps > 0 ? formatUsd(inputTokensToUsd((cps * 3600 * (calls ? tokens / calls : 400)) )) : "$0";

  const dropHazard = () => {
    const s = stateRef.current;
    if (!s.alive) return;
    const next = [...s.hazards, { x: s.player, y: 0 }];
    stateRef.current = { ...s, hazards: next };
    setHazards(next);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Loop Arena</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-mist-400">Jev plays a real-time survival loop: one Choice per tick, code enforces the rules. This is the Doom pattern — decisions cheap enough to make every tick.</p>
          <div className="mt-2.5 flex gap-2"><Edu text="Jev only picks left/stay/right. Collision, spawning, scoring and illegal-move clamping all live in code — the exact division the jaggedness catalog prescribes. Watch calls/sec and projected $/hr as you change tick speed." />{demoMode && <DemoBadge />}</div>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <Button onClick={() => reset(true)}><Play size={14} /> {tick > 0 && !alive ? "Play again" : "Start loop"}</Button>
          ) : (
            <Button variant="outline" onClick={() => setRunning(false)}><Square size={14} /> Stop</Button>
          )}
          <Button variant="outline" onClick={dropHazard}><Plus size={14} /> Hazard</Button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorBox title="Loop failed" detail={error} /></div>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-4">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${W}, minmax(0,1fr))` }} role="grid" aria-label="Arena">
            {Array.from({ length: H }, (_, y) =>
              Array.from({ length: W }, (_, x) => {
                const isPlayer = y === H - 1 && x === player;
                const isHaz = hazards.some((h) => h.x === x && h.y === y);
                return (
                  <div key={`${x}-${y}`} className={cn("flex aspect-square items-center justify-center rounded-[4px] text-lg", y === H - 1 ? "bg-wash/[0.05]" : "bg-wash/[0.02]")}>
                    {isHaz && <span className={isPlayer ? "text-red-300" : "text-amber-300"}>●</span>}
                    {isPlayer && !isHaz && <span className="text-emerald-300">▲</span>}
                    {isPlayer && isHaz && <span className="font-bold text-red-300">✕</span>}
                  </div>
                );
              })
            )}
          </div>
          <div className="mono-num mt-3 flex flex-wrap justify-between gap-2 font-mono text-[12px] text-mist-400">
            <span>Tick {tick} · Jev: {thinking ? "thinking…" : lastMove}</span>
            <span>{!alive ? <span className="font-semibold text-red-300">WRECKED at tick {tick}</span> : running ? "surviving" : "paused"}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[12.5px] text-mist-400">Tick every {speedMs}ms</span>
            <input type="range" min={150} max={2000} step={50} value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))} className="flex-1 accent-emerald-400" aria-label="Tick interval" />
          </div>
        </Card>

        <Card className="p-5">
          <SectionHead eyebrow="Live" title="Loop economics" />
          <dl className="grid grid-cols-2 gap-2">
            {[
              ["Calls", String(calls)],
              ["Calls/sec", cps.toFixed(1)],
              ["Tokens", tokens.toLocaleString()],
              ["Spend", formatUsd(inputTokensToUsd(tokens))],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-ink-950 px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wider text-mist-500">{k}</dt>
                <dd className="mono-num font-mono text-[18px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-xl border border-line/10 bg-ink-950 p-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-mist-500">Projected at this pace</div>
            <div className="mono-num font-mono text-[26px] font-semibold">{projHr}<span className="text-[14px] text-mist-500">/hr</span></div>
            <div className="mt-1 text-[11.5px] text-mist-500">Doom runs ~10 calls/sec ≈ $7/hr</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
