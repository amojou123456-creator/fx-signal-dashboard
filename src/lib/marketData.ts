// Fetches daily close history for every tracked symbol from Twelve Data, in a
// single batched request (one HTTP call, multiple symbols comma-separated).
// Falls back to deterministic mock data when no API key is configured, so the
// dashboard is fully explorable before you pay for a data subscription.
//
// Credit note: Twelve Data's free "Basic" tier allows 8 API credits/minute,
// and each symbol in a request — even batched into one HTTP call — costs its
// own credit. With 9 tracked symbols that's 1 over budget, so EUR/GBP is not
// fetched directly: it's derived as EUR/USD ÷ GBP/USD (a standard cross-rate
// identity), which brings this down to exactly 8 fetched symbols. If you
// upgrade to a paid plan, fetching EUR/GBP directly is a one-line change
// (add it back to FETCHED_PAIRS below) but is not required.

import { FX_PAIRS, GOLD_SYMBOL, BACKTEST_LOOKBACK_DAYS, LOOKBACK_BASELINE } from "./config";
import { generateMockSeries } from "./mock";
import type { Bar, SeriesBySymbol } from "./types";

const TWELVE_DATA_BASE = "https://api.twelvedata.com/time_series";

// Enough history for the 90-bar baseline correlation plus the 90-day backtest window.
const OUTPUT_SIZE = LOOKBACK_BASELINE + BACKTEST_LOOKBACK_DAYS + 10;

const DERIVED_CROSS = "EUR/GBP";
const FETCHED_SYMBOLS = [
  ...FX_PAIRS.map((p) => p.symbol).filter((s) => s !== DERIVED_CROSS),
  GOLD_SYMBOL,
];

interface SingleSymbolSeries {
  status?: string;
  message?: string;
  values?: { datetime: string; close: string }[];
}

type TwelveDataBatchResponse = SingleSymbolSeries | Record<string, SingleSymbolSeries>;

function parseSeries(raw: SingleSymbolSeries, symbol: string): Bar[] {
  if (!raw.values) {
    throw new Error(`Twelve Data error for ${symbol}: ${raw.message ?? "no values returned"}`);
  }
  return raw.values
    .map((v) => ({ date: v.datetime, close: Number(v.close) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function deriveCross(baseSeries: Bar[], quoteSeries: Bar[]): Bar[] {
  // Position-aligned, consistent with the simplification documented in signals.ts.
  const len = Math.min(baseSeries.length, quoteSeries.length);
  const out: Bar[] = [];
  for (let i = 0; i < len; i++) {
    out.push({ date: baseSeries[i].date, close: baseSeries[i].close / quoteSeries[i].close });
  }
  return out;
}

// Explicit in-memory cache (on top of Next's own fetch cache, which doesn't
// reliably survive across serverless invocations for this route). The free
// Twelve Data tier allows only 8 credits/minute and this call costs exactly
// 8, so any two fetches within the same minute — e.g. two page loads, or a
// cold start right after another — exhaust it. A 5-minute TTL matches the
// dashboard's own polling interval (see page.tsx) and leaves real headroom.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedResult: { series: SeriesBySymbol; fetchedAt: number } | null = null;

export async function getMarketData(): Promise<{ series: SeriesBySymbol; isMockData: boolean }> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return { series: generateMockSeries(), isMockData: true };
  }

  if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL_MS) {
    return { series: cachedResult.series, isMockData: false };
  }

  const url = new URL(TWELVE_DATA_BASE);
  url.searchParams.set("symbol", FETCHED_SYMBOLS.join(","));
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(OUTPUT_SIZE));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as TwelveDataBatchResponse;

  if ("status" in json && json.status === "error") {
    // Serve stale cached data rather than a hard error, if we have any.
    if (cachedResult) return { series: cachedResult.series, isMockData: false };
    throw new Error(`Twelve Data error: ${json.message ?? "request failed"}`);
  }

  const series: SeriesBySymbol = {};
  for (const symbol of FETCHED_SYMBOLS) {
    const raw: SingleSymbolSeries =
      FETCHED_SYMBOLS.length === 1 ? (json as SingleSymbolSeries) : (json as Record<string, SingleSymbolSeries>)[symbol];
    series[symbol] = parseSeries(raw, symbol);
  }

  series[DERIVED_CROSS] = deriveCross(series["EUR/USD"], series["GBP/USD"]);

  cachedResult = { series, fetchedAt: Date.now() };
  return { series, isMockData: false };
}
