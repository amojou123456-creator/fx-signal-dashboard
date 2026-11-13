import type { CurrencyStrength } from "@/lib/types";

export function StrengthMeter({ strengths }: { strengths: CurrencyStrength[] }) {
  const max = Math.max(1, ...strengths.map((s) => Math.abs(s.score)));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">Currency Strength</h2>
      <div className="space-y-2">
        {strengths.map((s) => {
          const widthPct = (Math.abs(s.score) / max) * 50;
          const isPositive = s.score >= 0;
          return (
            <div key={s.currency} className="flex items-center gap-2 text-xs">
              <span className="w-10 font-mono text-neutral-400">{s.currency}</span>
              <div className="relative h-4 flex-1 bg-neutral-800 rounded">
                <div className="absolute left-1/2 top-0 h-full w-px bg-neutral-600" />
                <div
                  className={`absolute top-0 h-full rounded ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                  style={
                    isPositive
                      ? { left: "50%", width: `${widthPct}%` }
                      : { right: "50%", width: `${widthPct}%` }
                  }
                />
              </div>
              <span className="w-14 text-right font-mono text-neutral-400">{s.score.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
