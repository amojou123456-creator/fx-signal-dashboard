import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TIMEFRAME, GOLD_SYMBOL, TIMEFRAME_OPTIONS } from "@/lib/config";
import { getDailySeries, getIntradaySeries } from "@/lib/marketData";
import { computeCurrencyStrength } from "@/lib/strength";
import { computeMarketOverview } from "@/lib/marketOverview";
import { computeRelationshipStatuses, computeSignals } from "@/lib/signals";
import type { DashboardData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const requestedLabel = request.nextUrl.searchParams.get("timeframe") ?? DEFAULT_TIMEFRAME;
    const timeframe =
      TIMEFRAME_OPTIONS.find((t) => t.label === requestedLabel) ??
      TIMEFRAME_OPTIONS.find((t) => t.label === DEFAULT_TIMEFRAME)!;

    const [daily, intraday] = await Promise.all([getDailySeries(), getIntradaySeries(timeframe)]);
    const asOf = new Date().toISOString();

    const signals = computeSignals(daily.series, asOf);
    const relationships = computeRelationshipStatuses(daily.series);
    const gold = (daily.series[GOLD_SYMBOL] ?? []).map((b) => ({ date: b.date, close: b.close }));

    const strengths = computeCurrencyStrength(intraday.series, timeframe.strengthLookbackBars);
    const marketOverview = computeMarketOverview(intraday.series, timeframe.strengthLookbackBars);

    const payload: DashboardData = {
      asOf,
      isMockData: daily.isMockData,
      timeframe: timeframe.label,
      dailyDataFetchedAt: daily.dataFetchedAt,
      signals,
      relationships,
      intradayDataFetchedAt: intraday.dataFetchedAt,
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
