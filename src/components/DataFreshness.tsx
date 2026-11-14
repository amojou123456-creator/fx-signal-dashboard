"use client";

import { useEffect, useState } from "react";

// Surfaces how old the underlying market data actually is, not just when the
// page last rendered — the council flagged that a stale/cached quote could
// otherwise be acted on silently (e.g. after an API rate-limit hiccup). The
// threshold is a few multiples of each series' own cache TTL (2min / 15min
// in marketData.ts), so a normal cache hit never shows as stale.
function Row({
  label,
  dataFetchedAt,
  staleAfterMinutes,
}: {
  label: string;
  dataFetchedAt: string;
  staleAfterMinutes: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const ageMinutes = Math.max(0, Math.round((now - new Date(dataFetchedAt).getTime()) / 60000));
  const isStale = ageMinutes > staleAfterMinutes;

  return (
    <p className={`text-right text-[10px] ${isStale ? "text-amber-400" : "text-neutral-600"}`}>
      {isStale && "⚠ "}
      {label}: {new Date(dataFetchedAt).toLocaleString("he-IL")} (לפני {ageMinutes} דק&apos;)
      {isStale && " — ישן מהצפוי, ייתכן עיכוב במכסת ה-API"}
    </p>
  );
}

export function DataFreshness({
  dailyDataFetchedAt,
  intradayDataFetchedAt,
  isMockData,
}: {
  dailyDataFetchedAt: string;
  intradayDataFetchedAt: string;
  isMockData: boolean;
}) {
  if (isMockData) return null;

  return (
    <div className="space-y-0.5">
      <Row label="נתונים חיים (תוך-יומי)" dataFetchedAt={intradayDataFetchedAt} staleAfterMinutes={10} />
      <Row label="נתוני סיגנל/Backtest (יומי)" dataFetchedAt={dailyDataFetchedAt} staleAfterMinutes={60} />
    </div>
  );
}
