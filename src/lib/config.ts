// Module 5 scope: 15 FX pairs + Gold. Edit here to change what's tracked —
// no other file needs to change for a simple pair addition/removal.

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
  { symbol: "EUR/JPY", base: "EUR", quote: "JPY" },
  { symbol: "GBP/JPY", base: "GBP", quote: "JPY" },
  { symbol: "GBP/CAD", base: "GBP", quote: "CAD" },
  { symbol: "AUD/NZD", base: "AUD", quote: "NZD" },
  { symbol: "AUD/CAD", base: "AUD", quote: "CAD" },
  { symbol: "NZD/CHF", base: "NZD", quote: "CHF" },
  { symbol: "CAD/CHF", base: "CAD", quote: "CHF" },
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
  { a: "EUR/JPY", b: "GBP/JPY", sign: 1, label: "EUR/JPY vs GBP/JPY (both JPY crosses)" },
  { a: "NZD/CHF", b: "CAD/CHF", sign: 1, label: "NZD/CHF vs CAD/CHF (commodity currencies vs CHF)" },
  { a: "GBP/CAD", b: "GBP/USD", sign: 1, label: "GBP/CAD vs GBP/USD (both GBP-base)" },
  { a: "AUD/CAD", b: "AUD/USD", sign: 1, label: "AUD/CAD vs AUD/USD (both AUD-base)" },
  { a: "AUD/NZD", b: "AUD/CAD", sign: 1, label: "AUD/NZD vs AUD/CAD (both AUD crosses)" },
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

// Live display only (Currency Flow Map + Strength Ranking + Market Overview)
// — separate from the daily-bar backtest/signal engine above, which stays on
// long daily history for statistical reliability regardless of the timeframe
// picked here. Needs a paid Twelve Data plan with intraday access (Basic is
// daily-only in practice at this app's usage volume).
export interface TimeframeOption {
  label: string; // shown in the UI, e.g. "M15"
  interval: string; // Twelve Data interval string
  bars: number; // how many bars to request
  strengthLookbackBars: number; // how far back the strength %-change looks within those bars
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: "M1", interval: "1min", bars: 120, strengthLookbackBars: 30 },
  { label: "M5", interval: "5min", bars: 96, strengthLookbackBars: 12 },
  { label: "M15", interval: "15min", bars: 48, strengthLookbackBars: 8 },
  { label: "M30", interval: "30min", bars: 48, strengthLookbackBars: 6 },
  { label: "H1", interval: "1h", bars: 48, strengthLookbackBars: 4 },
  { label: "H4", interval: "4h", bars: 60, strengthLookbackBars: 3 },
  { label: "D1", interval: "1day", bars: 60, strengthLookbackBars: 2 },
];
export const DEFAULT_TIMEFRAME = "H1";
