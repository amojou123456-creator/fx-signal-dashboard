"use client";

import { useEffect, useRef } from "react";
import { CURRENCIES, FX_PAIRS, GOLD_SYMBOL } from "@/lib/config";
import type { CurrencyStrength } from "@/lib/types";

const GOLD_CODE = "GOLD";

const PAIR_ROWS = [...FX_PAIRS, { symbol: GOLD_SYMBOL, base: GOLD_CODE, quote: "USD" }];

export function FlowDiagram({
  strengths,
  goldChangePct,
}: {
  strengths: CurrencyStrength[];
  goldChangePct: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scoreByNode: Record<string, number> = { [GOLD_CODE]: goldChangePct ?? 0 };
  for (const c of CURRENCIES) {
    scoreByNode[c] = strengths.find((s) => s.currency === c)?.score ?? 0;
  }

  // USD and GOLD are pinned to the middle of the ranking on purpose (not sorted
  // in with the rest): they're the two reference points the user actually cares
  // about, so currencies stronger than USD rank above them and weaker ones rank
  // below — making it immediately visible which way money is flowing relative
  // to the dollar and gold, rather than burying them wherever they'd naturally land.
  const usdScore = scoreByNode["USD"];
  const goldScore = scoreByNode[GOLD_CODE];
  const others = CURRENCIES.filter((c) => c !== "USD").sort((a, b) => scoreByNode[b] - scoreByNode[a]);
  const above = others.filter((c) => scoreByNode[c] > usdScore);
  const below = others.filter((c) => scoreByNode[c] <= usdScore);
  const pinned = goldScore >= usdScore ? [GOLD_CODE, "USD"] : ["USD", GOLD_CODE];
  const order = [...above, ...pinned, ...below];

  const rowsWithGap = PAIR_ROWS.map((p) => {
    const baseScore = scoreByNode[p.base] ?? 0;
    const quoteScore = scoreByNode[p.quote] ?? 0;
    const strong = baseScore >= quoteScore ? p.base : p.quote;
    const weak = strong === p.base ? p.quote : p.base;
    return { ...p, strong, weak, gap: Math.abs(baseScore - quoteScore) };
  }).sort((a, b) => b.gap - a.gap);

  const maxGap = Math.max(0.0001, ...rowsWithGap.map((r) => r.gap));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const nodeStep = H / (order.length + 1);
    const nodeY: Record<string, number> = {};
    order.forEach((code, i) => (nodeY[code] = nodeStep * (i + 1)));

    const rowStep = H / (rowsWithGap.length + 1);
    const mid = W * 0.52;
    const left = 2;
    const right = W - 2;

    function curve(y0: number, y1: number, rgb: string, alpha: number, width: number) {
      ctx!.strokeStyle = `rgba(${rgb},${alpha})`;
      ctx!.lineWidth = width;
      ctx!.beginPath();
      ctx!.moveTo(left, y0);
      ctx!.bezierCurveTo(mid * 0.75, y0, mid, y1, right, y1);
      ctx!.stroke();
    }

    rowsWithGap.forEach((row, i) => {
      const y0 = rowStep * (i + 1);
      const strength = Math.min(1, row.gap / maxGap);
      curve(y0, nodeY[row.strong], "16,185,129", 0.1 + strength * 0.55, 0.6 + strength * 2.2);
      curve(y0, nodeY[row.weak], "236,72,153", 0.08 + strength * 0.4, 0.6 + strength * 1.6);
    });

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, H);
    ctx.stroke();
  }, [order, rowsWithGap, maxGap]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        מפת זרימת כסף — מטבעות וזהב
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        USD ו-GOLD קבועים במרכז העמודה — כך קל לראות אילו מטבעות חזקים מהם כרגע (למעלה) ואילו חלשים מהם (למטה).
      </p>

      <div className="grid grid-cols-[1fr_88px] gap-2 rounded-xl border border-neutral-800 bg-black/40 p-2">
        <canvas ref={canvasRef} className="h-[360px] w-full" />
        <div className="flex flex-col justify-between py-1">
          {order.map((code) => {
            const score = scoreByNode[code];
            const isPinned = code === "USD" || code === GOLD_CODE;
            const positive = score >= 0;
            const tone =
              code === "USD"
                ? "border-sky-400/60 bg-sky-400/10 text-sky-300"
                : code === GOLD_CODE
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                  : positive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-pink-500/40 bg-pink-500/10 text-pink-300";
            return (
              <div
                key={code}
                className={`flex items-center justify-between rounded-md border px-2 py-1 text-[11px] font-bold transition-all ${tone} ${
                  isPinned ? "ring-1 ring-white/10" : ""
                }`}
              >
                <span>{code}</span>
                <span className="text-[10px] font-semibold opacity-90">
                  {score >= 0 ? "+" : ""}
                  {score.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> זורם לכיוון המטבע החזק בזוג
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-pink-500" /> זורם לכיוון המטבע החלש בזוג
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-sky-400" /> USD ו-GOLD קבועים במרכז
        </span>
      </div>

      <h3 className="mb-2 mt-4 text-xs font-semibold text-neutral-400">זוגות עם פער החוזק הגדול ביותר</h3>
      <div className="space-y-1.5">
        {rowsWithGap.slice(0, 8).map((row) => {
          const pct = Math.round((row.gap / maxGap) * 100);
          const buy = row.strong === row.base;
          return (
            <div
              key={row.symbol}
              className="grid grid-cols-[52px_1fr_74px] items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 px-2 py-1.5 text-[11px]"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-center font-bold ${
                  buy
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border border-pink-500/40 bg-pink-500/10 text-pink-400"
                }`}
              >
                {buy ? "קנייה" : "מכירה"}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-pink-500/60">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-left font-mono font-bold text-neutral-300">{row.symbol.replace("/", "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
