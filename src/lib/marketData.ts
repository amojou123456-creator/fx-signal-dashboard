// Fetches market data from Twelve Data in two separate tracks:
//   - Daily bars, long history: feeds the correlation-divergence signal
//     engine and its backtest. Kept on daily bars deliberately (not
//     intraday) so the backtest stays statistically meaningful — see
//     signals.ts for why a short/noisy sample was the council's top concern.
//   - Intraday bars, short history: feeds the "live" Currency Flow Map and
//     Strength Ranking display only. Needs a paid plan with intraday access.
// Falls back to deterministic mock data when no API key is configured.

import { ALL_SYMBOLS, BACKTEST_LOOKBACK_DAYS, LOOKBACK_BASELINE, TimeframeOption } from "./config";
import { generateMockIntradaySeries, generateMockSeries } from "./mock";
import type { Bar, SeriesBySymbol } from "./types";

const TWELVE_DATA_BASE = "https://api.twelvedata.com/time_series";

// Enough daily history for the 90-bar baseline correlation plus the backtest window.
const DAILY_OUTPUT_SIZE = LOOKBACK_BASELINE + BACKTEST_LOOKBACK_DAYS + 10;

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
// error. This keeps only the dates/timestamps present in every tracked
// symbol, in order — used for both the daily and intraday series.
function alignByDateKey(series: SeriesBySymbol): SeriesBySymbol {
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

async function fetchBatch(interval: string, outputsize: number, apiKey: string): Promise<SeriesBySymbol> {
  const url = new URL(TWELVE_DATA_BASE);
  url.searchParams.set("symbol", ALL_SYMBOLS.join(","));
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as TwelveDataBatchResponse;

  if ("status" in json && json.status === "error") {
    throw new Error(`Twelve Data error: ${json.message ?? "request failed"}`);
  }

  const rawSeries: SeriesBySymbol = {};
  for (const symbol of ALL_SYMBOLS) {
    const raw: SingleSymbolSeries =
      ALL_SYMBOLS.length === 1 ? (json as SingleSymbolSeries) : (json as Record<string, SingleSymbolSeries>)[symbol];
    rawSeries[symbol] = parseSeries(raw, symbol);
  }
  return alignByDateKey(rawSeries);
}

// Explicit in-memory caches (on top of Next's own fetch cache, which doesn't
// reliably survive across serverless invocations for this route).
interface CacheEntry {
  series: SeriesBySymbol;
  fetchedAt: number;
}
const DAILY_CACHE_TTL_MS = 15 * 60 * 1000; // daily bars don't need refreshing often
const INTRADAY_CACHE_TTL_MS = 2 * 60 * 1000; // short, for a "live" feel
let dailyCache: CacheEntry | null = null;
const intradayCacheByInterval = new Map<string, CacheEntry>();

async function getCached(
  cache: CacheEntry | null,
  ttlMs: number,
  fetcher: () => Promise<SeriesBySymbol>
): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt < ttlMs) return cache;
  try {
    const series = await fetcher();
    return { series, fetchedAt: Date.now() };
  } catch (err) {
    if (cache) return cache; // serve stale data rather than a hard error, if we have any
    throw err;
  }
}

export async function getDailySeries(): Promise<{
  series: SeriesBySymbol;
  isMockData: boolean;
  dataFetchedAt: string;
}> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return { series: generateMockSeries(), isMockData: true, dataFetchedAt: new Date().toISOString() };
  }

  const entry = await getCached(dailyCache, DAILY_CACHE_TTL_MS, () =>
    fetchBatch("1day", DAILY_OUTPUT_SIZE, apiKey)
  );
  dailyCache = entry;
  return { series: entry.series, isMockData: false, dataFetchedAt: new Date(entry.fetchedAt).toISOString() };
}

export async function getIntradaySeries(timeframe: TimeframeOption): Promise<{
  series: SeriesBySymbol;
  isMockData: boolean;
  dataFetchedAt: string;
}> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return {
      series: generateMockIntradaySeries(timeframe.bars),
      isMockData: true,
      dataFetchedAt: new Date().toISOString(),
    };
  }

  const cached = intradayCacheByInterval.get(timeframe.interval) ?? null;
  const entry = await getCached(cached, INTRADAY_CACHE_TTL_MS, () =>
    fetchBatch(timeframe.interval, timeframe.bars, apiKey)
  );
  intradayCacheByInterval.set(timeframe.interval, entry);
  return { series: entry.series, isMockData: false, dataFetchedAt: new Date(entry.fetchedAt).toISOString() };
}
