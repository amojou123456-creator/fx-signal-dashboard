export interface Bar {
  date: string; // ISO date, daily close
  close: number;
}

export type SeriesBySymbol = Record<string, Bar[]>;

export interface CurrencyStrength {
  currency: string;
  score: number; // average %-contribution across all pairs it appears in
}

export type Direction = "BUY" | "SELL";

export interface Signal {
  pair: string; // the pair the signal applies to
  direction: Direction;
  relationshipLabel: string;
  rollingCorrelation: number;
  baselineCorrelation: number;
  divergence: number;
  winRatePct: number | null; // null if not enough backtest history
  sampleSize: number; // number of past occurrences used for the win rate
  historicalPips: number | null; // cumulative backtested pips; null if sample too thin
  confirmationCount: number; // how many other monitored relationships are also diverging right now
  asOf: string;
}

export interface GoldPoint {
  date: string;
  close: number;
}

export interface RelationshipStatus {
  a: string;
  b: string;
  label: string;
  rollingCorrelation: number;
  baselineCorrelation: number;
  triggered: boolean;
}

export interface MarketOverviewRow {
  symbol: string;
  lastPrice: number | null;
  changePct: number | null;
}

export interface DashboardData {
  asOf: string;
  isMockData: boolean;
  timeframe: string; // the timeframe label in effect for the intraday panels, e.g. "H1"
  // Signals/backtest run on long daily history (see marketData.ts getDailySeries).
  dailyDataFetchedAt: string;
  signals: Signal[];
  relationships: RelationshipStatus[];
  // Currency Flow Map + Strength Ranking + Market Overview run on short
  // intraday history at the selected timeframe, for a "live" feel, kept
  // separate from the backtest so it stays reliable regardless of timeframe.
  intradayDataFetchedAt: string;
  strengths: CurrencyStrength[];
  marketOverview: MarketOverviewRow[];
  gold: GoldPoint[];
}
