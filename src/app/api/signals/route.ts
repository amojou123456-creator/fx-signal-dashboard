import { NextResponse } from "next/server";
import { GOLD_SYMBOL } from "@/lib/config";
import { getMarketData } from "@/lib/marketData";
import { computeCurrencyStrength } from "@/lib/strength";
import { computeRelationshipStatuses, computeSignals } from "@/lib/signals";
import type { DashboardData } from "@/lib/types";

export async function GET() {
  try {
    const { series, isMockData, dataFetchedAt } = await getMarketData();
    const asOf = new Date().toISOString();

    const strengths = computeCurrencyStrength(series);
    const signals = computeSignals(series, asOf);
    const relationships = computeRelationshipStatuses(series);
    const gold = (series[GOLD_SYMBOL] ?? []).map((b) => ({ date: b.date, close: b.close }));

    const payload: DashboardData = { asOf, dataFetchedAt, isMockData, strengths, signals, relationships, gold };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
