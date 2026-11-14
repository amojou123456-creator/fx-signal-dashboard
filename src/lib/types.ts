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
  dataFetchedAt: string; // when the single underlying daily batch was fetched
  signals: Signal[];
  relationships: RelationshipStatus[];
  strengths: CurrencyStrength[];
  marketOverview: MarketOverviewRow[];
  gold: GoldPoint[];
}
