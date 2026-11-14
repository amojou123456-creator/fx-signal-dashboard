import { ALL_SYMBOLS, GOLD_SYMBOL } from "@/lib/config";
import type { MarketOverviewRow } from "@/lib/types";

const WIDTH = 640;
const HEIGHT = 420;
const LABEL_X = 70;
const HUB_X = WIDTH / 2;
const USD_HUB_Y = HEIGHT * 0.28;
const GOLD_HUB_Y = HEIGHT * 0.74;

const PAIRS = ALL_SYMBOLS.filter((s) => s !== GOLD_SYMBOL);

export function FlowDiagram({ rows }: { rows: MarketOverviewRow[] }) {
  const rowBySymbol = Object.fromEntries(rows.map((r) => [r.symbol, r]));
  const topMargin = 24;
  const step = (HEIGHT - topMargin * 2) / (PAIRS.length - 1 || 1);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">מפת זרימת מטבעות וזהב</h2>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full">
        <defs>
          <filter id="hub-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* central vertical hub line */}
        <line x1={HUB_X} y1={10} x2={HUB_X} y2={HEIGHT - 10} stroke="#262626" strokeWidth={2} />

        {PAIRS.map((symbol, i) => {
          const y = topMargin + i * step;
          const row = rowBySymbol[symbol];
          const isUp = (row?.changePct ?? 0) >= 0;
          const targetY = isUp ? USD_HUB_Y : GOLD_HUB_Y;
          const color = isUp ? "#10b981" : "#ec4899";
          const midX = (LABEL_X + HUB_X) / 2;
          const path = `M ${LABEL_X + 58} ${y} C ${midX} ${y}, ${midX} ${targetY}, ${HUB_X - 36} ${targetY}`;
          return (
            <g key={symbol}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={1.4}
                strokeOpacity={0.55}
                strokeLinecap="round"
                strokeDasharray="5 5"
                className="flow-line"
                filter="url(#line-glow)"
              />
              <circle cx={LABEL_X + 50} cy={y} r={3} fill={color} />
              <text x={LABEL_X + 40} y={y + 3} textAnchor="end" fontSize={10} fill="#d4d4d4" fontFamily="monospace">
                {symbol.replace("/", "")}
              </text>
            </g>
          );
        })}

        {/* USD hub */}
        <rect
          x={HUB_X - 36}
          y={USD_HUB_Y - 16}
          width={72}
          height={32}
          rx={16}
          fill="#0c1a24"
          stroke="#38bdf8"
          strokeWidth={1.5}
          filter="url(#hub-glow)"
        />
        <text x={HUB_X} y={USD_HUB_Y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#7dd3fc">
          USD
        </text>

        {/* GOLD hub */}
        <rect
          x={HUB_X - 40}
          y={GOLD_HUB_Y - 16}
          width={80}
          height={32}
          rx={16}
          fill="#241c06"
          stroke="#fbbf24"
          strokeWidth={1.5}
          filter="url(#hub-glow)"
        />
        <text x={HUB_X} y={GOLD_HUB_Y + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fde047">
          GOLD
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> עולה (זורם ל-USD)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-pink-500" /> יורד (זורם ל-GOLD)
        </span>
      </div>
    </div>
  );
}
