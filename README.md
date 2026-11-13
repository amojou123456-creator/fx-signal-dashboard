# FX & Gold Signal Dashboard

A personal (not for sale) dashboard that tracks the 8 major FX pairs plus Gold
(XAU/USD), shows a currency strength meter, and flags correlation-divergence
signals with a real backtested win rate. Phase 1 — web app, daily bars.

## Disclaimer

This is a personal informational tool. Nothing here is professional financial
or investment advice. All signals are mechanically generated from public
market data and may be wrong, delayed, or incomplete. Win rates come from an
actual backtest over recent history, not a guarantee about the future.
Always verify before acting on real money. There is no automated trade
execution in this version — it only displays signals for you to review.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set TWELVE_DATA_API_KEY=<your key from twelvedata.com>
```

Without an API key, the dashboard runs on deterministic mock data (clearly
labeled in the UI) so you can see everything working before paying for a
subscription.

## Run

```bash
npm run dev
```

Open http://localhost:3000. On your phone, open the same URL on your local
network, or deploy to Vercel to access it from anywhere (add it to your home
screen for an app-like feel).

## Methodology (Phase 1)

**Currency Strength Meter** — for each of the 8 major currencies, average the
%-change contribution across every pair it appears in (positive if it's the
base and the pair rose, negative if it's the quote and the pair rose, and
vice versa).

**Correlation-divergence signals** — a small set of currency-pair
relationships that normally move together (or opposite) are monitored
(`src/lib/config.ts` → `RELATIONSHIPS`). For each one:
- rolling correlation = Pearson correlation of daily returns over the last 20 bars
- baseline correlation = same, over the last 90 bars
- if the gap between them exceeds a threshold, the relationship has "broken
  down" and a signal fires on whichever pair underperformed its usual
  partner, expecting reversion (mean-reversion heuristic — not guaranteed).

**Win rate** — computed by walking back through the last 90 days, replaying
the same divergence rule at every point in history, and checking whether
price moved in the predicted direction within the next 5 bars. This is a real
backtest of this exact rule, not an assumed number.

**Known simplification to revisit later:** bars across symbols are aligned by
array position, not matched by calendar date. Daily FX/gold series are mostly
aligned day-for-day; small mismatches around holidays aren't corrected for
yet.

## Editing what's tracked

Edit `src/lib/config.ts`:
- `FX_PAIRS` — which pairs feed the strength meter
- `RELATIONSHIPS` — which pair-vs-pair relationships generate signals
- `LOOKBACK_SHORT` / `LOOKBACK_BASELINE` / `DIVERGENCE_THRESHOLD` — tune sensitivity

## Possible later phases

- Intraday bars instead of daily (needs a higher Twelve Data tier)
- Calendar-date-aligned series instead of position-aligned
- Push/email alerts when a new signal fires
- Wrap as a native mobile app (Capacitor/React Native) once the strategy proves useful
