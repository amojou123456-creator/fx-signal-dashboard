// Per-symbol snapshot (last price, % change over the selected timeframe's
// lookback) for the Market Overview tab. Reuses the same intraday series as
// the Flow Map / Strength Ranking — no separate data fetch.

import { ALL_SYMBOLS } from "./config";
import type { MarketOverviewRow, SeriesBySymbol } from "./types";

export function computeMarketOverview(series: SeriesBySymbol, lookbackBars: number): MarketOverviewRow[] {
  return ALL_SYMBOLS.map((symbol) => {
    const bars = series[symbol];
    if (!bars || bars.length < 2) {
      return { symbol, lastPrice: null, changePct: null };
    }
    const last = bars[bars.length - 1].close;
    const pastIndex = Math.max(0, bars.length - 1 - lookbackBars);
    const past = bars[pastIndex].close;
    const changePct = past === 0 ? 0 : ((last - past) / past) * 100;
    return { symbol, lastPrice: last, changePct: Number(changePct.toFixed(3)) };
  });
}
