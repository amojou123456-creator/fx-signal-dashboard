import type { RelationshipStatus } from "@/lib/types";

export function CorrelationTab({ relationships }: { relationships: RelationshipStatus[] }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">קשרי קורלציה מנוטרים</h2>
      <p className="mb-3 text-xs text-neutral-500">מבוסס על אותם נתונים יומיים שמפעילים את מנוע הסיגנלים.</p>
      <div className="space-y-2">
        {relationships.map((rel) => (
          <div
            key={`${rel.a}-${rel.b}`}
            className={`flex items-center justify-between rounded border px-3 py-2 text-xs ${
              rel.triggered ? "border-orange-700 bg-orange-950/30" : "border-neutral-800 bg-neutral-950/40"
            }`}
          >
            <div>
              <div className="font-mono text-neutral-200">
                {rel.a} ↔ {rel.b}
              </div>
              <div className="text-neutral-500">{rel.label}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-neutral-300">
                נוכחי: {rel.rollingCorrelation} / בסיס: {rel.baselineCorrelation}
              </div>
              {rel.triggered && <div className="text-orange-400">⚠ שונות מהקשר הרגיל</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
