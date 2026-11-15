"use client";

import { useEffect, useRef } from "react";
import { CURRENCIES, FX_PAIRS, GOLD_SYMBOL } from "@/lib/config";
import type { CurrencyStrength } from "@/lib/types";

const GOLD_CODE = "GOLD";

const PAIR_ROWS = [...FX_PAIRS, { symbol: GOLD_SYMBOL, base: GOLD_CODE, quote: "USD" }];

export function FlowDiagram({
  strengths,
  goldChangePct,
}: {
  strengths: CurrencyStrength[];
  goldChangePct: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const rowsWithGap = PAIR_ROWS.map((p) => {
    const baseScore = scoreByNode[p.base] ?? 0;
    const quoteScore = scoreByNode[p.quote] ?? 0;
    const strong = baseScore >= quoteScore ? p.base : p.quote;
    const weak = strong === p.base ? p.quote : p.base;
    return { ...p, strong, weak, gap: Math.abs(baseScore - quoteScore) };
  }).sort((a, b) => b.gap - a.gap);

  const maxGap = Math.max(0.0001, ...rowsWithGap.map((r) => r.gap));

  // Direct USD-vs-GOLD verdict: the single highest-level answer to "where is
  // the money going right now" that the detailed ranking above doesn't spell
  // out on its own (you'd have to notice which of the two pinned chips sits
  // on top). This turns that into one explicit headline + gauge.
  const vsDiff = goldScore - usdScore;
  const vsMax = Math.max(Math.abs(usdScore), Math.abs(goldScore), 0.01);
  const vsPct = Math.min(95, Math.max(5, 50 + (vsDiff / (2 * vsMax)) * 50));
  const vsFlat = Math.abs(vsDiff) < vsMax * 0.08;
  const vsWinner: "usd" | "gold" | "flat" = vsFlat ? "flat" : vsDiff > 0 ? "gold" : "usd";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const nodeStep = H / (order.length + 1);
    const nodeY: Record<string, number> = {};
    order.forEach((code, i) => (nodeY[code] = nodeStep * (i + 1)));

    const rowStep = H / (rowsWithGap.length + 1);
    const xm = W * 0.5;
    const x0 = 2;
    const x1 = W - 2;

    // Same two-segment bezier shape as the reference design: every curve bends
    // through the canvas's vertical center (not through its own target's y),
    // which is what produces the fanned "flow" look instead of straight lines.
    function curve(y0: number, y1: number, rgb: string, a: number) {
      ctx!.strokeStyle = `rgba(${rgb},${0.08 + a * 0.5})`;
      ctx!.lineWidth = 0.6 + a * 1.4;
      ctx!.beginPath();
      ctx!.moveTo(x0, y0);
      ctx!.bezierCurveTo(xm * 0.7, y0, xm * 0.9, H / 2, xm, H / 2 * 0.5 + y0 * 0.1 + y1 * 0.4);
      ctx!.bezierCurveTo(xm * 1.2, y1, x1 - 40, y1, x1, y1);
      ctx!.stroke();
    }

    rowsWithGap.forEach((row, i) => {
      const y0 = rowStep * (i + 1);
      const strength = Math.min(1, row.gap / maxGap);
      curve(y0, nodeY[row.strong], "74,222,128", strength);
      curve(y0, nodeY[row.weak], "248,113,113", strength * 0.8);
    });

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xm, 0);
    ctx.lineTo(xm, H);
    ctx.stroke();
  }, [order, rowsWithGap, maxGap]);

  return (
    <div className="fd">
      <h1>
        <span className="dot" />
        מפת זרימת כסף — מטבעות וזהב
      </h1>
      <div className="sub">
        חוזק יחסי של 8 מטבעות וזהב — USD ו-GOLD קבועים במרכז כך שקל לראות מה חזק מהם (למעלה) ומה חלש מהם (למטה)
      </div>

      <div className="vs">
        <div className="vsHead">
          <span className={`vsWinner ${vsWinner}`}>
            {vsWinner === "flat"
              ? "⚖ הדולר והזהב מאוזנים כרגע"
              : vsWinner === "gold"
                ? "🥇 הכסף נוטה כרגע לכיוון הזהב"
                : "💵 הכסף נוטה כרגע לכיוון הדולר"}
          </span>
        </div>
        <div className="vsBar">
          <span className="vsLabel usd">USD</span>
          <div className="vsTrack">
            <i className="vsFill" style={{ width: `${vsPct}%` }} />
            <b className="vsPointer" style={{ left: `${vsPct}%` }} />
          </div>
          <span className="vsLabel gold">GOLD</span>
        </div>
      </div>

      <div className="stage">
        <canvas ref={canvasRef} />
        <div className="cur">
          {order.map((code) => {
            const score = scoreByNode[code];
            const pinned = code === "USD" || code === GOLD_CODE;
            const kind = pinned ? (code === "USD" ? "usd" : "gold") : score >= 0 ? "pos" : "neg";
            return (
              <div key={code} className={`chip ${kind}`}>
                <span>{code}</span>
                <small>
                  {score >= 0 ? "+" : ""}
                  {score.toFixed(2)}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      <h2>
        זוגות עם הפער הגדול ביותר <span>{rowsWithGap.length} מתוך {rowsWithGap.length}</span>
      </h2>
      <div id="pairs">
        {rowsWithGap.map((row) => {
          const buy = row.strong === row.base;
          const pct = Math.min(99, Math.round(50 + (row.gap / maxGap) * 50));
          return (
            <div className="row" key={row.symbol}>
              <div className={`sig ${buy ? "buy" : "sell"}`}>{buy ? "קנייה" : "מכירה"}</div>
              <div>
                <div className="track">
                  <i style={{ width: `${buy ? pct : 100 - pct}%` }} />
                </div>
                <div className="meta">
                  פער חוזק {row.gap.toFixed(2)} · עוצמה {pct}%
                </div>
              </div>
              <div className="pair">{row.symbol.replace("/", "")}</div>
            </div>
          );
        })}
      </div>

      <div className="foot">
        שיטת החישוב: לכל מטבע מחושב חוזק יחסי מתוך השינוי היומי שלו מול שאר המטבעות הנמדדים (ולזהב — מהשינוי היומי
        שלו מול הדולר). &quot;קנייה&quot; = מטבע הבסיס בזוג חזק מהמטבע המצוטט כרגע, &quot;מכירה&quot; = ההפך — זהו
        שיקוף של החוזק היחסי הרגעי, לא סיגנל מסחר. לסיגנלים מבוססי Backtest אמיתי ראו את הטבלה &quot;נגד הרוב&quot;
        למטה.
      </div>

      <style jsx>{`
        .fd {
          --bg: #07100f;
          --panel: #0d1917;
          --line: #1e3330;
          --g: #4ade80;
          --r: #f87171;
          --t: #e6f2ef;
          --m: #7f9a95;
          background: radial-gradient(900px 500px at 50% -10%, #0f2a27, var(--bg));
          color: var(--t);
          border-radius: 16px;
          padding: 16px;
        }
        h1 {
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: var(--t);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--g);
          box-shadow: 0 0 10px var(--g);
          animation: fd-pulse 1.4s infinite;
        }
        @keyframes fd-pulse {
          50% {
            opacity: 0.25;
          }
        }
        .sub {
          color: var(--m);
          font-size: 12px;
          margin: 4px 0 12px;
        }
        .vs {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 10px;
        }
        .vsHead {
          text-align: center;
          margin-bottom: 8px;
        }
        .vsWinner {
          font-size: 13px;
          font-weight: 700;
        }
        .vsWinner.usd {
          color: #7dd3fc;
        }
        .vsWinner.gold {
          color: #fde047;
        }
        .vsWinner.flat {
          color: var(--m);
        }
        .vsBar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vsLabel {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .vsLabel.usd {
          color: #7dd3fc;
        }
        .vsLabel.gold {
          color: #fde047;
        }
        .vsTrack {
          position: relative;
          flex: 1;
          height: 10px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.18), rgba(30, 41, 59, 0.5) 50%, rgba(251, 191, 36, 0.18));
          overflow: visible;
        }
        .vsFill {
          position: absolute;
          inset: 0;
          width: 50%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.55), rgba(251, 191, 36, 0.55));
          transition: width 0.6s;
        }
        .vsPointer {
          position: absolute;
          top: -3px;
          width: 3px;
          height: 16px;
          border-radius: 2px;
          background: #fff;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.7);
          transform: translateX(-50%);
          transition: left 0.6s;
        }
        .stage {
          display: grid;
          grid-template-columns: 1fr 92px;
          gap: 8px;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 10px;
        }
        canvas {
          width: 100%;
          height: 340px;
          display: block;
        }
        .cur {
          display: flex;
          flex-direction: column;
          gap: 5px;
          justify-content: space-between;
        }
        .chip {
          border-radius: 9px;
          padding: 5px 8px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          border: 1px solid;
          transition: all 0.6s;
        }
        .chip small {
          font-weight: 600;
          opacity: 0.9;
        }
        .pos {
          background: rgba(74, 222, 128, 0.12);
          border-color: rgba(74, 222, 128, 0.45);
          color: var(--g);
        }
        .neg {
          background: rgba(248, 113, 113, 0.12);
          border-color: rgba(248, 113, 113, 0.45);
          color: var(--r);
        }
        .usd {
          background: rgba(56, 189, 248, 0.14);
          border-color: rgba(56, 189, 248, 0.6);
          color: #7dd3fc;
        }
        .gold {
          background: rgba(251, 191, 36, 0.14);
          border-color: rgba(251, 191, 36, 0.6);
          color: #fde047;
        }
        h2 {
          font-size: 13px;
          margin: 14px 0 8px;
          display: flex;
          justify-content: space-between;
          color: var(--t);
        }
        h2 span {
          color: var(--m);
          font-weight: 400;
          font-size: 11px;
        }
        .row {
          display: grid;
          grid-template-columns: 64px 1fr 74px;
          gap: 10px;
          align-items: center;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 9px 12px;
          margin-bottom: 6px;
        }
        .sig {
          border-radius: 8px;
          text-align: center;
          padding: 5px 0;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid;
        }
        .sig.buy {
          color: var(--g);
          border-color: var(--g);
          background: rgba(74, 222, 128, 0.1);
        }
        .sig.sell {
          color: var(--r);
          border-color: var(--r);
          background: rgba(248, 113, 113, 0.1);
        }
        .track {
          height: 7px;
          border-radius: 5px;
          background: var(--r);
          overflow: hidden;
          direction: ltr;
        }
        .track i {
          display: block;
          height: 100%;
          background: var(--g);
          transition: width 0.6s;
        }
        .meta {
          font-size: 11px;
          color: var(--m);
          margin-top: 5px;
        }
        .pair {
          font-weight: 800;
          direction: ltr;
          text-align: left;
          letter-spacing: 0.3px;
        }
        .foot {
          color: var(--m);
          font-size: 11px;
          margin-top: 14px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
