import { CURRENCIES, FX_PAIRS, GOLD_SYMBOL } from "@/lib/config";
import type { CurrencyStrength } from "@/lib/types";

const WIDTH = 640;
const HEIGHT = 480;
const LABEL_X = 70;
const NODE_X = WIDTH - 60;
const TOP_MARGIN = 20;

const GOLD_CODE = "GOLD";

const PAIR_ROWS = [...FX_PAIRS, { symbol: GOLD_SYMBOL, base: GOLD_CODE, quote: "USD" }];

export function FlowDiagram({
  strengths,
  goldChangePct,
}: {
  strengths: CurrencyStrength[];
  goldChangePct: number | null;
}) {
  const scoreByNode: Record<string, number> = { [GOLD_CODE]: goldChangePct ?? 0 };
  for (const c of CURRENCIES) {
    scoreByNode[c] = strengths.find((s) => s.currency === c)?.score ?? 0;
  }

  // USD and GOLD are pinned to the middle of the ranking on purpose (not sorted
  // in with the rest): they're the two reference points the user actually cares
  // about, so currencies stronger than USD rank above them and weaker ones rank
  // below — making it immediately visible which way money is flowing relative
  // to the dollar and gold, rather than burying them wherever they'd naturally land.
  const usdScore = scoreByNode["USD"];
  const goldScore = scoreByNode[GOLD_CODE];
  const others = CURRENCIES.filter((c) => c !== "USD").sort((a, b) => scoreByNode[b] - scoreByNode[a]);
  const above = others.filter((c) => scoreByNode[c] > usdScore);
  const below = others.filter((c) => scoreByNode[c] <= usdScore);
  const pinned = goldScore >= usdScore ? [GOLD_CODE, "USD"] : ["USD", GOLD_CODE];
  const order = [...above, ...pinned, ...below];

  const nodeIndex: Record<string, number> = {};
  order.forEach((code, i) => (nodeIndex[code] = i));
  const nodeStep = (HEIGHT - TOP_MARGIN * 2) / (order.length - 1 || 1);
  const nodeY = (code: string) => TOP_MARGIN + nodeIndex[code] * nodeStep;

  const rowsWithGap = PAIR_ROWS.map((p) => {
    const baseScore = scoreByNode[p.base] ?? 0;
    const quoteScore = scoreByNode[p.quote] ?? 0;
    const strong = baseScore >= quoteScore ? p.base : p.quote;
    const weak = strong === p.base ? p.quote : p.base;
    return { ...p, strong, weak, gap: Math.abs(baseScore - quoteScore) };
  }).sort((a, b) => b.gap - a.gap);

  const rowStep = (HEIGHT - TOP_MARGIN * 2) / (rowsWithGap.length - 1 || 1);
  const midX = (LABEL_X + NODE_X) / 2;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-300">מפת זרימת כסף — מטבעות וזהב</h2>
      <p className="mb-3 text-xs text-neutral-500">
        USD ו-GOLD קבועים במרכז העמודה — כך קל לראות אילו מטבעות חזקים מהם כרגע (למעלה) ואילו חלשים מהם (למטה).
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full">
        <defs>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hub-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={NODE_X - 46}
          y={Math.min(nodeY("USD"), nodeY(GOLD_CODE)) - 20}
          width={92}
          height={Math.abs(nodeY("USD") - nodeY(GOLD_CODE)) + 40}
          rx={18}
          fill="rgba(14,165,233,0.08)"
          stroke="rgba(14,165,233,0.35)"
          strokeDasharray="3 3"
        />

        {rowsWithGap.map((row, i) => {
          const y = TOP_MARGIN + i * rowStep;
          const strongY = nodeY(row.strong);
          const weakY = nodeY(row.weak);
          const strongPath = `M ${LABEL_X + 58} ${y} C ${midX} ${y}, ${midX} ${strongY}, ${NODE_X - 34} ${strongY}`;
          const weakPath = `M ${LABEL_X + 58} ${y} C ${midX} ${y}, ${midX} ${weakY}, ${NODE_X - 34} ${weakY}`;
          return (
            <g key={row.symbol}>
              <path
                d={strongPath}
                fill="none"
                stroke="#10b981"
                strokeWidth={1.2}
                strokeOpacity={0.5}
                strokeLinecap="round"
                strokeDasharray="5 5"
                className="flow-line"
                filter="url(#line-glow)"
              />
              <path
                d={weakPath}
                fill="none"
                stroke="#ec4899"
                strokeWidth={1.2}
                strokeOpacity={0.4}
                strokeLinecap="round"
                strokeDasharray="5 5"
                className="flow-line"
                filter="url(#line-glow)"
              />
              <circle cx={LABEL_X + 50} cy={y} r={3} fill="#a3a3a3" />
              <text x={LABEL_X + 40} y={y + 3} textAnchor="end" fontSize={10} fill="#d4d4d4" fontFamily="monospace">
                {row.symbol.replace("/", "")}
              </text>
            </g>
          );
        })}

        {order.map((code) => {
          const y = nodeY(code);
          const isPinned = code === "USD" || code === GOLD_CODE;
          const score = scoreByNode[code];
          const isPositive = score >= 0;
          const stroke =
            code === "USD" ? "#38bdf8" : code === GOLD_CODE ? "#fbbf24" : isPositive ? "#10b981" : "#ec4899";
          const textColor =
            code === "USD" ? "#7dd3fc" : code === GOLD_CODE ? "#fde047" : isPositive ? "#6ee7b7" : "#fca5a5";
          return (
            <g key={code}>
              <rect
                x={NODE_X - 34}
                y={y - 14}
                width={68}
                height={28}
                rx={14}
                fill="#0c1416"
                stroke={stroke}
                strokeWidth={isPinned ? 1.8 : 1.2}
                filter={isPinned ? "url(#hub-glow)" : undefined}
              />
              <text x={NODE_X} y={y - 1} textAnchor="middle" fontSize={11} fontWeight={700} fill={textColor}>
                {code}
              </text>
              <text x={NODE_X} y={y + 10} textAnchor="middle" fontSize={8} fill="#8a8a8a">
                {score >= 0 ? "+" : ""}
                {score.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> זורם לכיוון המטבע החזק בזוג
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-pink-500" /> זורם לכיוון המטבע החלש בזוג
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-sky-400" /> USD ו-GOLD קבועים במרכז
        </span>
      </div>
    </div>
  );
}
