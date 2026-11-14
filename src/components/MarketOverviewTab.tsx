import type { MarketOverviewRow } from "@/lib/types";

export function MarketOverviewTab({ rows }: { rows: MarketOverviewRow[] }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">סקירת שוק</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500">
              <th className="py-2 text-right font-normal">סמל</th>
              <th className="py-2 text-right font-normal">מחיר אחרון</th>
              <th className="py-2 text-right font-normal">שינוי %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isUp = (row.changePct ?? 0) >= 0;
              return (
                <tr key={row.symbol} className="border-b border-neutral-900">
                  <td className="py-2 font-mono text-neutral-200">{row.symbol}</td>
                  <td className="py-2 font-mono text-neutral-300">
                    {row.lastPrice != null ? row.lastPrice.toFixed(row.lastPrice > 50 ? 2 : 5) : "—"}
                  </td>
                  <td className={`py-2 font-mono ${isUp ? "text-emerald-400" : "text-pink-400"}`}>
                    {row.changePct != null ? `${isUp ? "+" : ""}${row.changePct}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
