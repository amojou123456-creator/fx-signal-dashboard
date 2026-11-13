// Correlation-divergence signal: for each pair of symbols that normally move
// together (or opposite), compare the recent rolling correlation to their
// longer-term baseline. When it breaks down past a threshold, flag the symbol
// that lagged its usual partner as a mean-reversion candidate.
//
// This is a known, simple heuristic (FX correlation/divergence trading) — not
// a validated or guaranteed strategy. The win rate shown is computed from an
// actual walk-forward backtest over real history, not an assumed number.
//
// Simplification (documented, to revisit in a later phase): bars across
// symbols are aligned by array position, not by calendar date. Daily FX/gold
// series are mostly aligned day-for-day; small date-key mismatches around
// holidays are not corrected for in this version.

import {
  BACKTEST_HORIZON_BARS,
  BACKTEST_LOOKBACK_DAYS,
  DIVERGENCE_THRESHOLD,
  LOOKBACK_BASELINE,
  LOOKBACK_SHORT,
  RELATIONSHIPS,
} from "./config";
import type { Bar, SeriesBySymbol, Signal } from "./types";

function toReturns(bars: Bar[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    out.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
  }
  return out;
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(x.length - n);
  const ys = y.slice(y.length - n);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function correlationEndingAt(returnsA: number[], returnsB: number[], endExclusive: number, window: number): number {
  const start = Math.max(0, endExclusive - window);
  return pearson(returnsA.slice(start, endExclusive), returnsB.slice(start, endExclusive));
}

function cumulativeReturn(returns: number[], endExclusive: number, window: number): number {
  const start = Math.max(0, endExclusive - window);
  let total = 0;
  for (let i = start; i < endExclusive; i++) total += returns[i];
  return total;
}

interface DivergenceCheck {
  triggered: boolean;
  direction: "BUY" | "SELL" | null;
  rolling: number;
  baseline: number;
  divergence: number;
}

function checkDivergence(
  returnsA: number[],
  returnsB: number[],
  sign: 1 | -1,
  endExclusive: number
): DivergenceCheck {
  const rolling = correlationEndingAt(returnsA, returnsB, endExclusive, LOOKBACK_SHORT);
  const baseline = correlationEndingAt(returnsA, returnsB, endExclusive, LOOKBACK_BASELINE);
  const divergence = baseline - rolling; // positive = relationship weakened recently

  if (Math.abs(divergence) < DIVERGENCE_THRESHOLD) {
    return { triggered: false, direction: null, rolling, baseline, divergence };
  }

  const retA = cumulativeReturn(returnsA, endExclusive, LOOKBACK_SHORT);
  const retB = cumulativeReturn(returnsB, endExclusive, LOOKBACK_SHORT);
  const adjB = sign * retB;

  const direction: "BUY" | "SELL" = retA < adjB ? "BUY" : "SELL";
  return { triggered: true, direction, rolling, baseline, divergence };
}

function backtestWinRate(
  bars: Bar[],
  returnsA: number[],
  returnsB: number[],
  sign: 1 | -1
): { winRatePct: number | null; sampleSize: number } {
  const minStart = LOOKBACK_BASELINE;
  const maxEnd = returnsA.length - BACKTEST_HORIZON_BARS;
  const earliestEnd = Math.max(minStart, returnsA.length - BACKTEST_LOOKBACK_DAYS);

  let wins = 0;
  let total = 0;

  for (let end = earliestEnd; end < maxEnd; end++) {
    const check = checkDivergence(returnsA, returnsB, sign, end);
    if (!check.triggered || !check.direction) continue;

    // bars[end] is the close at the moment the signal would have fired
    // (returns[end-1] is the change from bars[end-1] to bars[end]).
    const priceAtSignal = bars[end]?.close;
    const priceAfter = bars[end + BACKTEST_HORIZON_BARS]?.close;
    if (priceAtSignal == null || priceAfter == null) continue;

    const moved = priceAfter > priceAtSignal;
    const won = check.direction === "BUY" ? moved : !moved;
    total += 1;
    if (won) wins += 1;
  }

  return { winRatePct: total > 0 ? Number(((wins / total) * 100).toFixed(1)) : null, sampleSize: total };
}

export interface RelationshipStatus {
  a: string;
  b: string;
  label: string;
  rollingCorrelation: number;
  baselineCorrelation: number;
  triggered: boolean;
}

export function computeRelationshipStatuses(series: SeriesBySymbol): RelationshipStatus[] {
  const out: RelationshipStatus[] = [];
  for (const rel of RELATIONSHIPS) {
    const barsA = series[rel.a];
    const barsB = series[rel.b];
    if (!barsA || !barsB) continue;
    const returnsA = toReturns(barsA);
    const returnsB = toReturns(barsB);
    const live = checkDivergence(returnsA, returnsB, rel.sign, returnsA.length);
    out.push({
      a: rel.a,
      b: rel.b,
      label: rel.label,
      rollingCorrelation: Number(live.rolling.toFixed(2)),
      baselineCorrelation: Number(live.baseline.toFixed(2)),
      triggered: live.triggered,
    });
  }
  return out;
}

export function computeSignals(series: SeriesBySymbol, asOf: string): Signal[] {
  const signals: Signal[] = [];

  for (const rel of RELATIONSHIPS) {
    const barsA = series[rel.a];
    const barsB = series[rel.b];
    if (!barsA || !barsB) continue;

    const returnsA = toReturns(barsA);
    const returnsB = toReturns(barsB);

    const live = checkDivergence(returnsA, returnsB, rel.sign, returnsA.length);
    if (!live.triggered || !live.direction) continue;

    const { winRatePct, sampleSize } = backtestWinRate(barsA, returnsA, returnsB, rel.sign);

    signals.push({
      pair: rel.a,
      direction: live.direction,
      relationshipLabel: rel.label,
      rollingCorrelation: Number(live.rolling.toFixed(2)),
      baselineCorrelation: Number(live.baseline.toFixed(2)),
      divergence: Number(live.divergence.toFixed(2)),
      winRatePct,
      sampleSize,
      asOf,
    });
  }

  return signals;
}
