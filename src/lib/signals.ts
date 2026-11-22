// Correlation-divergence signal: for each pair of symbols that normally move
// together (or opposite), compare the recent rolling correlation to their
// longer-term baseline. When it breaks down past a threshold, flag the symbol
// that lagged its usual partner as a mean-reversion candidate.
//
// This is a known, simple heuristic (FX correlation/divergence trading) — not
// a validated or guaranteed strategy. The win rate shown is computed from an
// actual walk-forward backtest over real history, not an assumed number.
// Bars across symbols are aligned by calendar date (see marketData.ts
// alignByCalendarDate), not array position — fixed after an earlier version
// aligned by index, which could silently misattribute a return on one symbol
// to the wrong date on another if a provider gap ever desynced the arrays.
//
// Still open (flagged by the review council, not yet addressed): no
// null-baseline comparison, no expectancy/risk-reward accounting alongside
// win rate, and no handling for a correlation relationship breaking down for
// a real structural reason rather than reverting.

import {
  BACKTEST_HORIZON_BARS,
  BACKTEST_LOOKBACK_DAYS,
  DIVERGENCE_THRESHOLD,
  LOOKBACK_BASELINE,
  LOOKBACK_SHORT,
  MIN_CONFIRMATIONS,
  MIN_SAMPLE_SIZE,
  RELATIONSHIPS,
} from "./config";
import type { Bar, SeriesBySymbol, Signal } from "./types";

// Standard FX pip conventions: 0.01 for JPY crosses and gold, 0.0001 otherwise.
function pipSize(symbol: string): number {
  return symbol.includes("JPY") || symbol.startsWith("XAU") ? 0.01 : 0.0001;
}

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
  pairSymbol: string,
  bars: Bar[],
  returnsA: number[],
  returnsB: number[],
  sign: 1 | -1
): {
  winRatePct: number | null;
  sampleSize: number;
  historicalPips: number | null;
  payoffRatio: number | null;
} {
  const minStart = LOOKBACK_BASELINE;
  const maxEnd = returnsA.length - BACKTEST_HORIZON_BARS;
  const earliestEnd = Math.max(minStart, returnsA.length - BACKTEST_LOOKBACK_DAYS);
  const pip = pipSize(pairSymbol);

  let wins = 0;
  let total = 0;
  let totalPips = 0;
  // Tracked separately from totalPips so the UI can show a payoff ratio
  // (avg win size vs avg loss size) alongside win rate — the council flagged
  // that a bare win-rate % is meaningless without it: a high win rate with
  // small wins and rare-but-large losses can still lose money on average.
  let winPipsSum = 0;
  let lossPipsSum = 0; // stored as a positive magnitude

  for (let end = earliestEnd; end < maxEnd; end++) {
    const check = checkDivergence(returnsA, returnsB, sign, end);
    if (!check.triggered || !check.direction) continue;

    // bars[end] is the close at the moment the signal would have fired
    // (returns[end-1] is the change from bars[end-1] to bars[end]).
    const priceAtSignal = bars[end]?.close;
    const priceAfter = bars[end + BACKTEST_HORIZON_BARS]?.close;
    if (priceAtSignal == null || priceAfter == null) continue;

    const priceDiff = priceAfter - priceAtSignal;
    const moved = priceDiff > 0;
    const won = check.direction === "BUY" ? moved : !moved;
    const signedPips = (check.direction === "BUY" ? priceDiff : -priceDiff) / pip;

    total += 1;
    totalPips += signedPips;
    if (won) {
      wins += 1;
      winPipsSum += signedPips;
    } else {
      lossPipsSum += Math.abs(signedPips);
    }
  }

  // Below MIN_SAMPLE_SIZE fired events, a win rate (and pip total) is
  // statistically unreliable and showing a confident-looking number would be
  // misleading — the UI shows "insufficient history" instead.
  const reliable = total >= MIN_SAMPLE_SIZE;
  const losses = total - wins;
  const avgWinPips = wins > 0 ? winPipsSum / wins : 0;
  const avgLossPips = losses > 0 ? lossPipsSum / losses : 0;

  return {
    winRatePct: reliable ? Number(((wins / total) * 100).toFixed(1)) : null,
    sampleSize: total,
    historicalPips: reliable ? Number(totalPips.toFixed(1)) : null,
    payoffRatio: reliable && avgLossPips > 0 ? Number((avgWinPips / avgLossPips).toFixed(2)) : null,
  };
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
  const candidates: Signal[] = [];

  for (const rel of RELATIONSHIPS) {
    const barsA = series[rel.a];
    const barsB = series[rel.b];
    if (!barsA || !barsB) continue;

    const returnsA = toReturns(barsA);
    const returnsB = toReturns(barsB);

    const live = checkDivergence(returnsA, returnsB, rel.sign, returnsA.length);
    if (!live.triggered || !live.direction) continue;

    const { winRatePct, sampleSize, historicalPips, payoffRatio } = backtestWinRate(
      rel.a,
      barsA,
      returnsA,
      returnsB,
      rel.sign
    );

    candidates.push({
      pair: rel.a,
      direction: live.direction,
      relationshipLabel: rel.label,
      rollingCorrelation: Number(live.rolling.toFixed(2)),
      baselineCorrelation: Number(live.baseline.toFixed(2)),
      divergence: Number(live.divergence.toFixed(2)),
      winRatePct,
      sampleSize,
      historicalPips,
      payoffRatio,
      confirmationCount: 0, // filled below, once every candidate is known
      asOf,
    });
  }

  // "Confirmation" (Module 5 spec: "Reject weak signals without sufficient
  // confirmation") is computed here as real market breadth, not fabricated:
  // how many OTHER monitored relationships are independently also showing a
  // live divergence right now. Several unrelated relationships diverging at
  // once is a broader, more meaningful signal than just one in isolation.
  const confirmationCount = Math.max(0, candidates.length - 1);
  return candidates
    .map((c) => ({ ...c, confirmationCount }))
    .filter((c) => c.confirmationCount >= MIN_CONFIRMATIONS);
}
