// Fetches daily close history for every tracked symbol from Twelve Data.
// Falls back to deterministic mock data when no API key is configured, so the
// dashboard is fully explorable before you pay for a data subscription.

import { ALL_SYMBOLS, BACKTEST_LOOKBACK_DAYS, LOOKBACK_BASELINE } from "./config";
import { generateMockSeries } from "./mock";
import type { Bar, SeriesBySymbol } from "./types";

const TWELVE_DATA_BASE = "https://api.twelvedata.com/time_series";

// Enough history for the 90-bar baseline correlation plus the 90-day backtest window.
const OUTPUT_SIZE = LOOKBACK_BASELINE + BACKTEST_LOOKBACK_DAYS + 10;

interface TwelveDataResponse {
  status?: string;
  message?: string;
  values?: { datetime: string; close: string }[];
}

async function fetchOneSymbol(symbol: string, apiKey: string): Promise<Bar[]> {
  const url = new URL(TWELVE_DATA_BASE);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(OUTPUT_SIZE));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  const json = (await res.json()) as TwelveDataResponse;

  if (!json.values) {
    throw new Error(`Twelve Data error for ${symbol}: ${json.message ?? "no values returned"}`);
  }

  return json.values
    .map((v) => ({ date: v.datetime, close: Number(v.close) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMarketData(): Promise<{ series: SeriesBySymbol; isMockData: boolean }> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return { series: generateMockSeries(), isMockData: true };
  }

  const entries = await Promise.all(
    ALL_SYMBOLS.map(async (symbol) => {
      const bars = await fetchOneSymbol(symbol, apiKey);
      return [symbol, bars] as const;
    })
  );

  return { series: Object.fromEntries(entries), isMockData: false };
}
