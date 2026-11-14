import type { Signal } from "@/lib/types";

export function AgainstMajority({ signals }: { signals: Signal[] }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">נגד הרוב</h2>
      {signals.length === 0 ? (
        <p className="text-xs text-neutral-500">
          אין סיגנלים כרגע — זה תקין, האסטרטגיה מדווחת רק כשקשר שבר את ההתנהגות הרגילה שלו.
        </p>
      ) : (
        <div className="space-y-1.5">
          {signals.map((s, i) => {
            const isBuy = s.direction === "BUY";
            return (
              <div
                key={s.pair}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  i === 0 ? "border border-amber-500/60 bg-amber-950/20" : "bg-neutral-950/40"
                }`}
              >
                <span
                  className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                    isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isBuy ? "קנייה" : "מכירה"}
                </span>
                <span className="w-16 shrink-0 font-mono text-neutral-200">{s.pair.replace("/", "")}</span>
                <span className="w-12 shrink-0 text-right font-mono text-neutral-300">
                  {s.winRatePct != null ? `${s.winRatePct}%` : "—"}
                </span>
                <span
                  className={`w-20 shrink-0 text-right font-mono ${
                    s.historicalPips != null && s.historicalPips < 0 ? "text-pink-400" : "text-neutral-300"
                  }`}
                >
                  {s.historicalPips != null
                    ? `${s.historicalPips > 0 ? "+" : ""}${s.historicalPips} פיפס`
                    : "—"}
                </span>
                <span className="flex-1 text-right text-[11px] text-neutral-500">
                  {s.confirmationCount} אישורים
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
