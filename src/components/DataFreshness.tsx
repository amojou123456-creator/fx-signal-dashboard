"use client";

import { useEffect, useState } from "react";

// Surfaces how old the underlying market data actually is, not just when the
// page last rendered — the council flagged that a stale/cached quote could
// otherwise be acted on silently (e.g. after an API rate-limit hiccup).
const STALE_WARNING_MINUTES = 10;

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
      Market data as of {new Date(dataFetchedAt).toLocaleString()} ({ageMinutes}m ago)
      {isStale && " — older than expected, may be rate-limited"}
    </p>
  );
}
