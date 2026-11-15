"use client";

import { useEffect, useState } from "react";
import { NavBar, type TabKey } from "@/components/NavBar";
import { StrengthMeter } from "@/components/StrengthMeter";
import { AgainstMajority } from "@/components/AgainstMajority";
import { FlowDiagram } from "@/components/FlowDiagram";
import { GoldChart } from "@/components/GoldChart";
import { DataFreshness } from "@/components/DataFreshness";
import { MarketOverviewTab } from "@/components/MarketOverviewTab";
import { CorrelationTab } from "@/components/CorrelationTab";
import { NewsTab } from "@/components/NewsTab";
import { EconomicCalendarTab } from "@/components/EconomicCalendarTab";
import { GOLD_SYMBOL } from "@/lib/config";
import type { DashboardData } from "@/lib/types";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("strength");

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/signals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "טעינה נכשלה");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "טעינה נכשלה");
    }
  }

  useEffect(() => {
    // Matches the data cache's 5-minute TTL in marketData.ts, so this poll
    // reuses the cache rather than triggering a fresh (credit-costing) fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const goldRow = data?.marketOverview.find((r) => r.symbol === GOLD_SYMBOL);

  return (
    <div className="flex-1 bg-black text-neutral-100">
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">לוח סיגנלים — פורקס וזהב</h1>
          <p className="text-xs text-neutral-500">
            כלי מידע אישי בלבד — לא ייעוץ השקעות מקצועי. הסיגנלים מחושבים אוטומטית מכללי
            קורלציה-שונות ועלולים להיות שגויים, מאוחרים או חלקיים. אחוזי ההצלחה מגיעים מ-Backtest
            אמיתי על היסטוריה, לא הבטחה לעתיד. תמיד לוודא לפני פעולה בכסף אמיתי.
          </p>
        </header>

        {data?.isMockData && (
          <div className="mb-4 rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
            מוצגים נתוני דמה — יש להגדיר TWELVE_DATA_API_KEY ב-.env.local כדי לראות נתוני שוק אמיתיים.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!data && !error && <p className="text-sm text-neutral-500">טוען…</p>}

        {data && (
          <div className="space-y-4">
            {activeTab === "strength" && (
              <>
                <FlowDiagram strengths={data.strengths} goldChangePct={goldRow?.changePct ?? null} />
                <StrengthMeter strengths={data.strengths} goldChangePct={goldRow?.changePct ?? null} />
                <GoldChart points={data.gold} />
                <AgainstMajority signals={data.signals} />
              </>
            )}

            {activeTab === "overview" && <MarketOverviewTab rows={data.marketOverview} />}
            {activeTab === "correlation" && <CorrelationTab relationships={data.relationships} />}
            {activeTab === "news" && <NewsTab />}
            {activeTab === "calendar" && <EconomicCalendarTab />}

            <DataFreshness dataFetchedAt={data.dataFetchedAt} isMockData={data.isMockData} />
          </div>
        )}
      </div>
    </div>
  );
}
