"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";

interface NewsResponse {
  items: NewsItem[];
  isMockData: boolean;
  dataFetchedAt: string;
}

const SENTIMENT_LABEL: Record<NewsItem["sentiment"], string> = {
  bullish: "חיובי",
  bearish: "שלילי",
  neutral: "נייטרלי",
};

export function NewsTab() {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/news");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "שגיאה בטעינת חדשות");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינת חדשות");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-xs text-red-300">{error}</div>
    );
  }

  if (!data) {
    return <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-xs text-neutral-500">טוען חדשות…</div>;
  }

  if (data.isMockData) {
    return (
      <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-4 text-xs text-amber-300">
        טאב החדשות דורש מפתח ALPHA_VANTAGE_API_KEY (חינמי, מיידי) ב-.env.local / משתני הסביבה.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">חדשות פורקס</h2>
      <div className="space-y-3">
        {data.items.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded border border-neutral-800 bg-neutral-950/40 p-3 hover:border-neutral-700"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-neutral-200">{item.title}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                  item.sentiment === "bullish"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : item.sentiment === "bearish"
                      ? "bg-pink-500/20 text-pink-400"
                      : "bg-neutral-700/40 text-neutral-400"
                }`}
              >
                {SENTIMENT_LABEL[item.sentiment]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{item.summary}</p>
            <div className="mt-1 text-[10px] text-neutral-600">
              {item.source} · {new Date(item.publishedAt).toLocaleString("he-IL")}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
