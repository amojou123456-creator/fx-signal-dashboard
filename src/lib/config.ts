// Scope: 8 FX major pairs + Gold. Edit here to change what's tracked — no
// other file needs to change for a simple pair addition/removal.
//
// Pinned at 8 fetched symbols deliberately: Twelve Data's free Basic plan
// allows 8 API credits/minute, and this app runs on that plan by choice (not
// paying for Grow right now). EUR/GBP is derived as EUR/USD ÷ GBP/USD (a
// standard cross-rate identity) instead of being fetched directly, which
// keeps the batched request at exactly 7 fetched pairs + gold = 8 credits.
// A larger 15-pair version of this app exists and works (see git history /
// the version before this file), but needs a paid plan with more than 8
// credits/minute — it's parked until that upgrade happens.

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "NZD";

export interface PairDef {
  symbol: string; // Twelve Data format, e.g. "EUR/USD"
  base: Currency;
  quote: Currency;
}

export const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];

export const FX_PAIRS: PairDef[] = [
  { symbol: "EUR/USD", base: "EUR", quote: "USD" },
  { symbol: "GBP/USD", base: "GBP", quote: "USD" },
  { symbol: "USD/JPY", base: "USD", quote: "JPY" },
  { symbol: "USD/CHF", base: "USD", quote: "CHF" },
  { symbol: "USD/CAD", base: "USD", quote: "CAD" },
  { symbol: "AUD/USD", base: "AUD", quote: "USD" },
  { symbol: "NZD/USD", base: "NZD", quote: "USD" },
  { symbol: "EUR/GBP", base: "EUR", quote: "GBP" },
];

export const GOLD_SYMBOL = "XAU/USD";

export const ALL_SYMBOLS = [...FX_PAIRS.map((p) => p.symbol), GOLD_SYMBOL];

// Known historical relationships used for the correlation-divergence signal.
// `sign` is the expected sign of correlation between the two symbols' returns:
// +1 = normally move together, -1 = normally move opposite.
export interface RelationshipDef {
  a: string;
  b: string;
  sign: 1 | -1;
  label: string;
}

export const RELATIONSHIPS: RelationshipDef[] = [
  { a: "EUR/USD", b: "GBP/USD", sign: 1, label: "EUR/USD vs GBP/USD (both vs USD)" },
  { a: "AUD/USD", b: "NZD/USD", sign: 1, label: "AUD/USD vs NZD/USD (commodity currencies)" },
  { a: "USD/CAD", b: "USD/CHF", sign: 1, label: "USD/CAD vs USD/CHF (both USD-base safe-haven flows)" },
  { a: "GBP/USD", b: "USD/CHF", sign: -1, label: "GBP/USD vs USD/CHF (opposite USD exposure)" },
  { a: "XAU/USD", b: "AUD/USD", sign: 1, label: "Gold vs AUD/USD (commodity-linked)" },
];

export const LOOKBACK_SHORT = 20; // bars, rolling correlation window
export const LOOKBACK_BASELINE = 90; // bars, baseline correlation window
export const DIVERGENCE_THRESHOLD = 0.5; // |rolling - expected| to flag a signal
export const BACKTEST_HORIZON_BARS = 5; // bars ahead to judge whether a past signal "won"
// ~2 years of trading days. Widened from 90 days on the council's recommendation:
// a 90-day window produced too few signal events to tell a real edge from noise.
export const BACKTEST_LOOKBACK_DAYS = 500;
// Below this many fired-signal events, a win rate is statistically meaningless —
// hide/flag it instead of showing a confident-looking percentage from a tiny sample.
export const MIN_SAMPLE_SIZE = 30;
// Below this many other relationships confirming the same direction, a signal
// is held back ("Reject weak signals without sufficient confirmation" — Module 5
// spec). This is a real, computed cross-check against the other monitored
// relationships, not a fabricated "confirmation" count.
export const MIN_CONFIRMATIONS = 2;

// How far back (in daily bars) the "live" Currency Strength / Flow Map /
// Market Overview panels look for their %-change. There's no separate
// intraday feed on the Basic plan — one daily batch serves both the
// long-history backtest above and this short-lookback "live" view.
export const LIVE_LOOKBACK_BARS = 1;
