// Deterministic mock market data, used only when TWELVE_DATA_API_KEY is not set.
// Lets you see the whole dashboard working before paying for/wiring a real feed.
// Built with a shared "USD strength" factor plus per-symbol noise so pairs that
// are normally correlated actually look correlated here too, and an injected
// break near the end of the series so at least one signal fires in the demo.

import { ALL_SYMBOLS, GOLD_SYMBOL } from "./config";
import type { Bar, SeriesBySymbol } from "./types";

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return h;
}

const BASE_PRICE: Record<string, number> = {
  "EUR/USD": 1.08,
  "GBP/USD": 1.27,
  "USD/JPY": 151.5,
  "USD/CHF": 0.88,
  "USD/CAD": 1.36,
  "AUD/USD": 0.65,
  "NZD/USD": 0.6,
  "EUR/GBP": 0.85,
  [GOLD_SYMBOL]: 2350,
};

const DAYS = 120;

export function generateMockSeries(): SeriesBySymbol {
  const rngUsd = mulberry32(42);
  const usdFactor: number[] = [0];
  for (let i = 1; i < DAYS; i++) {
    usdFactor.push(usdFactor[i - 1] + (rngUsd() - 0.5) * 0.004);
  }
  // Inject a divergence in the last week: USD/CHF stops following USD/CAD.
  const breakStart = DAYS - 7;

  const out: SeriesBySymbol = {};
  for (const symbol of ALL_SYMBOLS) {
    const rng = mulberry32(seedFromSymbol(symbol));
    const base = BASE_PRICE[symbol] ?? 1;
    const isUsdBase = symbol.startsWith("USD/");
    const isUsdQuote = symbol.endsWith("/USD");
    const bars: Bar[] = [];
    let drift = 0;
    for (let i = 0; i < DAYS; i++) {
      const noise = (rng() - 0.5) * 0.006;
      let usdContribution = 0;
      if (isUsdBase) usdContribution = usdFactor[i] * 0.5;
      if (isUsdQuote) usdContribution = -usdFactor[i] * 0.5;

      // Break the normal USD-base safe-haven co-movement for USD/CHF near the end.
      if (symbol === "USD/CHF" && i >= breakStart) {
        usdContribution = -usdFactor[i] * 0.5 + (i - breakStart) * 0.01;
      }

      drift += noise + usdContribution * 0.02;
      const close = base * (1 + drift);
      const date = new Date(Date.now() - (DAYS - i) * 86400000).toISOString().slice(0, 10);
      bars.push({ date, close: Number(close.toFixed(5)) });
    }
    out[symbol] = bars;
  }
  return out;
}
