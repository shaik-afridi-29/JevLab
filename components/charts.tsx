"use client";

// Recharts lives in its own chunk so tab navigation never pays its
// parse/evaluate cost. Loaded on demand via next/dynamic in visuals.tsx.
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { fmtPct } from "@/lib/utils";

export interface ScoreDatum {
  level: string;
  p: number;
  label: string;
}

export function ScoreChart({ data, score }: { data: ScoreDatum[]; score: number }) {
  return (
    <div className="mt-4 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="level" tick={{ fill: "var(--chart-tick)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
          <Tooltip
            contentStyle={{ background: "var(--chart-tip-bg)", border: "1px solid var(--chart-tip-border)", borderRadius: 10, fontSize: 12 }}
            formatter={(value, _name, props) => [`${fmtPct(Number(value))}`, `${props?.payload?.label ?? ""}`]}
            labelFormatter={(l) => `Level ${l}`}
          />
          <Bar dataKey="p" radius={[5, 5, 2, 2]}>
            {data.map((d) => (
              <Cell key={d.level} fill={Math.abs(Number(d.level) - score) < 0.51 ? "#34d399" : "var(--chart-bar-dim)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RunsChart({ values }: { values: number[] }) {  const data = values.map((v, i) => ({ run: i + 1, p: v }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" />
          <XAxis dataKey="run" tick={{ fill: "var(--chart-tick)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 11 }} domain={[0, 1]} axisLine={false} tickLine={false} tickFormatter={(v: number) => v.toFixed(2)} />
          <Tooltip contentStyle={{ background: "var(--chart-tip-bg)", border: "1px solid var(--chart-tip-border)", borderRadius: 10, fontSize: 12 }} formatter={(v) => [Number(v).toFixed(3), "probability"]} />
          <Line type="monotone" dataKey="p" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LatencyHist({ latencies }: { latencies: number[] }) {
  const buckets = [0, 250, 500, 1000, 2000, 4000, 8000];
  const data = buckets.slice(0, -1).map((lo, i) => {
    const hi = buckets[i + 1];
    const label = lo >= 1000 ? `${lo / 1000}s` : `${lo}ms`;
    const hiLabel = hi >= 1000 ? `${hi / 1000}s` : `${hi}ms`;
    return { bin: `${label}–${hiLabel}`, n: latencies.filter((l) => l >= lo && l < hi).length };
  });
  const overflow = latencies.filter((l) => l >= buckets[buckets.length - 1]).length;
  if (overflow > 0) data.push({ bin: "8s+", n: overflow });
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="bin" tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} dy={8} height={44} />
          <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "var(--chart-tip-bg)", border: "1px solid var(--chart-tip-border)", borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="n" radius={[5, 5, 2, 2]} fill="#34d399" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReliabilityChart({ bins }: { bins: { lo: number; hi: number; n: number; acc: number; meanConf: number }[] }) {
  const data = bins.map((b) => ({
    bin: `${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}`,
    acc: b.n > 0 ? Number(b.acc.toFixed(3)) : null,
    conf: b.n > 0 ? Number(b.meanConf.toFixed(3)) : null,
    n: b.n,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="bin" tick={{ fill: "var(--chart-tick)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
          <YAxis tick={{ fill: "var(--chart-tick)", fontSize: 11 }} domain={[0, 1]} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)}`} />
          <Tooltip
            contentStyle={{ background: "var(--chart-tip-bg)", border: "1px solid var(--chart-tip-border)", borderRadius: 10, fontSize: 12 }}
            formatter={(v, name, props) => [`${v}`, `${name} (n=${props?.payload?.n ?? 0})`]}
          />
          <Bar dataKey="acc" name="observed accuracy" fill="#34d399" radius={[4, 4, 1, 1]} />
          <Bar dataKey="conf" name="mean confidence" fill="var(--chart-bar-dim)" radius={[4, 4, 1, 1]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
