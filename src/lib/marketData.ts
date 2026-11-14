// Fetches daily close history for every tracked symbol from Twelve Data, in a
// single batched request (one HTTP call, multiple symbols comma-separated).
// Falls back to deterministic mock data when no API key is configured.
//
// This one call serves both the long-history backtest/signal engine AND the
// "live" Currency Flow Map / Strength Ranking / Market Overview panels (with
// a short lookback — see LIVE_LOOKBACK_BARS in config.ts). A separate
// intraday feed would need its own batched call, and on Twelve Data's free
// Basic plan (8 credits/minute) even this single 8-symbol call already uses
// the full budget — a second call in the same minute would 429. This app
// stays on one call by choice, matching the plan the user is on.

import { FX_PAIRS, GOLD_SYMBOL, BACKTEST_LOOKBACK_DAYS, LOOKBACK_BASELINE } from "./config";
import { generateMockSeries } from "./mock";
import type { Bar, SeriesBySymbol } from "./types";

const TWELVE_DATA_BASE = "https://api.twelvedata.com/time_series";

// Enough history for the 90-bar baseline correlation plus the backtest window.
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

// Fixes the index-alignment bug the review council flagged: bars were
// previously zipped by array position, so a missing/extra bar for any one
// symbol (a data-provider gap, a holiday handled inconsistently) silently
// shifted every downstream correlation and signal calculation without any
// error. This keeps only the dates present in every tracked symbol, in order.
function alignByCalendarDate(series: SeriesBySymbol): SeriesBySymbol {
  const symbols = Object.keys(series);
  if (symbols.length === 0) return series;

  const dateSetsPerSymbol: Set<string>[] = symbols.map(
    (symbol) => new Set(series[symbol].map((b) => b.date))
  );
  const [firstDateSet, ...restDateSets] = dateSetsPerSymbol;
  const commonDates = [...firstDateSet].filter((d) => restDateSets.every((s) => s.has(d)));
  const sortedDates = commonDates.sort((a, b) => a.localeCompare(b));

  const aligned: SeriesBySymbol = {};
  for (const symbol of symbols) {
    const bySymbolDate = new Map(series[symbol].map((b) => [b.date, b.close]));
    aligned[symbol] = sortedDates.map((date) => ({ date, close: bySymbolDate.get(date)! }));
  }
  return aligned;
}

function deriveCross(baseSeries: Bar[], quoteSeries: Bar[]): Bar[] {
  // Called after alignByCalendarDate, so both arrays already share the same
  // dates in the same order — safe to zip by position here.
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
// dashboard's own polling interval and leaves real headroom.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedResult: { series: SeriesBySymbol; fetchedAt: number } | null = null;

export async function getMarketData(): Promise<{
  series: SeriesBySymbol;
  isMockData: boolean;
  dataFetchedAt: string;
}> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return { series: generateMockSeries(), isMockData: true, dataFetchedAt: new Date().toISOString() };
  }

  if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL_MS) {
    return {
      series: cachedResult.series,
      isMockData: false,
      dataFetchedAt: new Date(cachedResult.fetchedAt).toISOString(),
    };
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
    if (cachedResult) {
      return {
        series: cachedResult.series,
        isMockData: false,
        dataFetchedAt: new Date(cachedResult.fetchedAt).toISOString(),
      };
    }
    throw new Error(`Twelve Data error: ${json.message ?? "request failed"}`);
  }

  const rawSeries: SeriesBySymbol = {};
  for (const symbol of FETCHED_SYMBOLS) {
    const raw: SingleSymbolSeries =
      FETCHED_SYMBOLS.length === 1 ? (json as SingleSymbolSeries) : (json as Record<string, SingleSymbolSeries>)[symbol];
    rawSeries[symbol] = parseSeries(raw, symbol);
  }

  const series = alignByCalendarDate(rawSeries);
  series[DERIVED_CROSS] = deriveCross(series["EUR/USD"], series["GBP/USD"]);

  const fetchedAt = Date.now();
  cachedResult = { series, fetchedAt };
  return { series, isMockData: false, dataFetchedAt: new Date(fetchedAt).toISOString() };
}
