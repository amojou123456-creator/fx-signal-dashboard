// Forex-relevant news via Alpha Vantage's free NEWS_SENTIMENT endpoint.
// Free tier is only 25 requests/day total (shared across anything else using
// the same key), so this is cached hard — a few refreshes a day is plenty for
// a news feed; it doesn't need to be "live" the way prices do.

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface AlphaVantageFeedItem {
  title: string;
  url: string;
  time_published: string; // e.g. 20261114T153000
  authors?: string[];
  summary: string;
  source: string;
  overall_sentiment_label?: string;
}

interface AlphaVantageResponse {
  feed?: AlphaVantageFeedItem[];
  Information?: string;
  Note?: string;
  "Error Message"?: string;
}

function parseAlphaVantageTime(t: string): string {
  // "20261114T153000" -> ISO
  const m = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
}

function sentimentFromLabel(label?: string): NewsItem["sentiment"] {
  if (!label) return "neutral";
  if (label.toLowerCase().includes("bullish")) return "bullish";
  if (label.toLowerCase().includes("bearish")) return "bearish";
  return "neutral";
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — Alpha Vantage free tier is 25 req/day total
let cache: { items: NewsItem[]; fetchedAt: number } | null = null;

export async function getForexNews(): Promise<{ items: NewsItem[]; isMockData: boolean; dataFetchedAt: string }> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return { items: [], isMockData: true, dataFetchedAt: new Date().toISOString() };
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { items: cache.items, isMockData: false, dataFetchedAt: new Date(cache.fetchedAt).toISOString() };
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "NEWS_SENTIMENT");
  url.searchParams.set("topics", "forex");
  url.searchParams.set("limit", "20");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as AlphaVantageResponse;

  if (json.Information || json["Error Message"] || !json.feed) {
    if (cache) return { items: cache.items, isMockData: false, dataFetchedAt: new Date(cache.fetchedAt).toISOString() };
    throw new Error(`Alpha Vantage error: ${json.Information ?? json["Error Message"] ?? "no feed returned"}`);
  }

  const items: NewsItem[] = json.feed.map((item) => ({
    title: item.title,
    url: item.url,
    source: item.source,
    publishedAt: parseAlphaVantageTime(item.time_published),
    summary: item.summary,
    sentiment: sentimentFromLabel(item.overall_sentiment_label),
  }));

  cache = { items, fetchedAt: Date.now() };
  return { items, isMockData: false, dataFetchedAt: new Date(cache.fetchedAt).toISOString() };
}
