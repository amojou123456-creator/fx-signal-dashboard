import { NextResponse } from "next/server";
import { GOLD_SYMBOL, LIVE_LOOKBACK_BARS } from "@/lib/config";
import { getMarketData } from "@/lib/marketData";
import { computeCurrencyStrength } from "@/lib/strength";
import { computeMarketOverview } from "@/lib/marketOverview";
import { computeRelationshipStatuses, computeSignals } from "@/lib/signals";
import type { DashboardData } from "@/lib/types";

export async function GET() {
  try {
    const { series, isMockData, dataFetchedAt } = await getMarketData();
    const asOf = new Date().toISOString();

    const signals = computeSignals(series, asOf);
    const relationships = computeRelationshipStatuses(series);
    const gold = (series[GOLD_SYMBOL] ?? []).map((b) => ({ date: b.date, close: b.close }));

    const strengths = computeCurrencyStrength(series, LIVE_LOOKBACK_BARS);
    const marketOverview = computeMarketOverview(series, LIVE_LOOKBACK_BARS);

    const goldBars = series[GOLD_SYMBOL] ?? [];
    const latestBarDate = goldBars.length > 0 ? goldBars[goldBars.length - 1].date : asOf;

    const payload: DashboardData = {
      asOf,
      isMockData,
      dataFetchedAt,
      latestBarDate,
      signals,
      relationships,
      strengths,
      marketOverview,
      gold,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
