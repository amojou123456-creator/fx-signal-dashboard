import type { GoldPoint } from "@/lib/types";

const WIDTH = 900;
const HEIGHT = 200;
const PADDING = 30;

export function GoldChart({ points }: { points: GoldPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">זהב (XAU/USD)</h2>
        <p className="text-xs text-neutral-500">אין עדיין מספיק נתונים.</p>
      </div>
    );
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const open = points[0].close;
  const last = points[points.length - 1];
  const changePct = ((last.close - open) / open) * 100;
  const isUp = changePct >= 0;

  const toX = (i: number) => PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
  const toY = (close: number) => HEIGHT - PADDING - ((close - min) / range) * (HEIGHT - PADDING * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.close).toFixed(1)}`).join(" ");
  const lastX = toX(points.length - 1);
  const lastY = toY(last.close);
  const lineColor = isUp ? "#34d399" : "#fbbf24";

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-neutral-300">מחיר זהב (XAU/USD)</h2>
        <div className="flex flex-wrap gap-x-4 text-[11px] text-neutral-500">
          <span>
            פתיחה: <span className="font-mono text-neutral-300">{open.toFixed(2)}</span>
          </span>
          <span>
            גבוה: <span className="font-mono text-neutral-300">{max.toFixed(2)}</span>
          </span>
          <span>
            נמוך: <span className="font-mono text-neutral-300">{min.toFixed(2)}</span>
          </span>
          <span>
            שינוי:{" "}
            <span className={`font-mono ${isUp ? "text-emerald-400" : "text-pink-400"}`}>
              {isUp ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <defs>
          <filter id="price-dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path} fill="none" stroke={lineColor} strokeWidth={2} />
        <circle cx={lastX} cy={lastY} r={4} fill={lineColor} filter="url(#price-dot-glow)" />
        <text x={PADDING} y={PADDING - 10} fontSize={10} fill="#737373">
          {max.toFixed(0)}
        </text>
        <text x={PADDING} y={HEIGHT - PADDING + 16} fontSize={10} fill="#737373">
          {min.toFixed(0)}
        </text>
        <rect x={lastX - 45} y={lastY - 26} width={90} height={18} rx={4} fill="#0a0a0a" stroke={lineColor} />
        <text x={lastX} y={lastY - 13} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={lineColor}>
          ${last.close.toFixed(2)}
        </text>
      </svg>
      <p className="text-xs text-neutral-500">
        {points[0].date} ← {last.date}
      </p>
    </div>
  );
}
