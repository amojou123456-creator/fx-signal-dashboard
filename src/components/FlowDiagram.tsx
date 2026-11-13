import type { RelationshipStatus } from "@/lib/types";
import { ALL_SYMBOLS } from "@/lib/config";

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 48;

function nodePosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

export function FlowDiagram({ relationships }: { relationships: RelationshipStatus[] }) {
  const positions = Object.fromEntries(
    ALL_SYMBOLS.map((symbol, i) => [symbol, nodePosition(i, ALL_SYMBOLS.length)])
  );

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">Monitored Correlations</h2>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-sm">
        {relationships.map((rel) => {
          const p1 = positions[rel.a];
          const p2 = positions[rel.b];
          if (!p1 || !p2) return null;
          const strokeColor = rel.triggered
            ? "#f97316" // orange: divergence signal active
            : rel.rollingCorrelation >= 0
              ? "#10b981" // green: correlated as expected
              : "#ef4444"; // red: currently anti-correlated
          const strokeWidth = 1 + Math.abs(rel.rollingCorrelation) * 3;
          return (
            <line
              key={`${rel.a}-${rel.b}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeOpacity={0.75}
              strokeDasharray={rel.triggered ? "4 3" : undefined}
            />
          );
        })}
        {ALL_SYMBOLS.map((symbol, i) => {
          const p = nodePosition(i, ALL_SYMBOLS.length);
          return (
            <g key={symbol}>
              <circle cx={p.x} cy={p.y} r={22} fill="#171717" stroke="#404040" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fill="#d4d4d4">
                {symbol.replace("/", "")}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> correlated as expected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> anti-correlated now
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" /> divergence signal active
        </span>
      </div>
    </div>
  );
}
