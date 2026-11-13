"use client";

import { useEffect, useState } from "react";
import { StrengthMeter } from "@/components/StrengthMeter";
import { SignalCard } from "@/components/SignalCard";
import { FlowDiagram } from "@/components/FlowDiagram";
import { GoldChart } from "@/components/GoldChart";
import type { DashboardData } from "@/lib/types";

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/signals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    // Simple poll-on-mount + interval for this MVP; revisit with SWR/React Query
    // if the data-fetching needs grow beyond this one endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 bg-black text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">FX &amp; Gold Signal Dashboard</h1>
          <p className="text-xs text-neutral-500">
            Personal informational tool only — not professional financial or investment advice.
            Signals are mechanically generated from correlation-divergence rules and may be wrong,
            delayed, or incomplete. Win rates come from a real backtest over recent history, not a
            promise about the future. Always verify before acting on real money.
          </p>
        </header>

        {data?.isMockData && (
          <div className="mb-4 rounded border border-amber-700 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
            Showing mock data — set TWELVE_DATA_API_KEY in .env.local to see real market data.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!data && !error && <p className="text-sm text-neutral-500">Loading…</p>}

        {data && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <StrengthMeter strengths={data.strengths} />
              <FlowDiagram relationships={data.relationships} />
            </div>

            <GoldChart points={data.gold} />

            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral-300">Active Signals</h2>
              {data.signals.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No correlation-divergence signals right now. That&apos;s normal — this strategy
                  only flags setups when a monitored relationship actually breaks down.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.signals.map((s) => (
                    <SignalCard key={s.pair} signal={s} />
                  ))}
                </div>
              )}
            </div>

            <p className="text-right text-[10px] text-neutral-600">
              As of {new Date(data.asOf).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
