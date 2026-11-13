// Currency Strength Meter: for each currency, average the %-change contribution
// across every major pair it appears in. If a pair's base currency rises, the
// base gets +change and the quote gets -change (and vice versa for a fall).
// This mirrors the sibling market-analysis-system's "simple, transparent,
// mechanically generated" philosophy — it's a descriptive snapshot, not a
// validated trading strategy on its own.

import { CURRENCIES, FX_PAIRS } from "./config";
import type { CurrencyStrength, SeriesBySymbol } from "./types";

function pctChange(bars: { close: number }[], lookback: number): number {
  if (bars.length < lookback + 1) return 0;
  const recent = bars[bars.length - 1].close;
  const past = bars[bars.length - 1 - lookback].close;
  return (recent - past) / past;
}

export function computeCurrencyStrength(series: SeriesBySymbol, lookbackBars = 5): CurrencyStrength[] {
  const contributions: Record<string, number[]> = Object.fromEntries(CURRENCIES.map((c) => [c, []]));

  for (const pair of FX_PAIRS) {
    const bars = series[pair.symbol];
    if (!bars) continue;
    const change = pctChange(bars, lookbackBars);
    contributions[pair.base].push(change);
    contributions[pair.quote].push(-change);
  }

  return CURRENCIES.map((currency) => {
    const values = contributions[currency];
    const score = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return { currency, score: Number((score * 100).toFixed(3)) }; // scaled to roughly -2..+2 range
  }).sort((a, b) => b.score - a.score);
}
