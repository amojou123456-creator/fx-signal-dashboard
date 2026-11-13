import type { Signal } from "@/lib/types";

export function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === "BUY";
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-neutral-200">{signal.pair}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {signal.direction}
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{signal.relationshipLabel}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-neutral-500">Win rate (backtest)</div>
          <div className="font-mono text-neutral-200">
            {signal.winRatePct != null ? `${signal.winRatePct}%` : "insufficient history"}
          </div>
        </div>
        <div>
          <div className="text-neutral-500">Sample size</div>
          <div className="font-mono text-neutral-200">{signal.sampleSize}</div>
        </div>
        <div>
          <div className="text-neutral-500">Rolling correlation</div>
          <div className="font-mono text-neutral-200">{signal.rollingCorrelation}</div>
        </div>
        <div>
          <div className="text-neutral-500">Baseline correlation</div>
          <div className="font-mono text-neutral-200">{signal.baselineCorrelation}</div>
        </div>
      </div>
    </div>
  );
}
