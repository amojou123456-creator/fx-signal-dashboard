"use client";

import { useEffect, useState } from "react";

// Surfaces how old the underlying market data actually is, not just when the
// page last rendered — the council flagged that a stale/cached quote could
// otherwise be acted on silently (e.g. after an API rate-limit hiccup). The
// threshold is a few multiples of the data's own 5-minute cache TTL (see
// marketData.ts), so a normal cache hit never shows as stale.
const STALE_WARNING_MINUTES = 20;

export function DataFreshness({
  dataFetchedAt,
  isMockData,
}: {
  dataFetchedAt: string;
  isMockData: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isMockData) return null;

  const ageMinutes = Math.max(0, Math.round((now - new Date(dataFetchedAt).getTime()) / 60000));
  const isStale = ageMinutes > STALE_WARNING_MINUTES;

  return (
    <p className={`text-right text-[10px] ${isStale ? "text-amber-400" : "text-neutral-600"}`}>
      {isStale && "⚠ "}
      נתוני שוק: {new Date(dataFetchedAt).toLocaleString("he-IL")} (לפני {ageMinutes} דק&apos;)
      {isStale && " — ישן מהצפוי, ייתכן עיכוב במכסת ה-API"}
    </p>
  );
}
