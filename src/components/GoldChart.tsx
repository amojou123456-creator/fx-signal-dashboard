import type { GoldPoint } from "@/lib/types";

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 24;

export function GoldChart({ points }: { points: GoldPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">Gold (XAU/USD)</h2>
        <p className="text-xs text-neutral-500">Not enough data yet.</p>
      </div>
    );
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const toX = (i: number) => PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
  const toY = (close: number) => HEIGHT - PADDING - ((close - min) / range) * (HEIGHT - PADDING * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.close).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-300">Gold (XAU/USD)</h2>
        <span className="font-mono text-sm text-neutral-200">{last.close.toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <path d={path} fill="none" stroke="#fbbf24" strokeWidth={2} />
        <text x={PADDING} y={PADDING - 8} fontSize={10} fill="#737373">
          {max.toFixed(0)}
        </text>
        <text x={PADDING} y={HEIGHT - PADDING + 14} fontSize={10} fill="#737373">
          {min.toFixed(0)}
        </text>
      </svg>
      <p className="text-xs text-neutral-500">
        {points[0].date} → {last.date}
      </p>
    </div>
  );
}
