
export enum ReplicationMethod {
  PHYSICAL = 'Physical',
  SYNTHETIC = 'Synthetic',
}

export enum DistributionPolicy {
  ACCUMULATING = 'Accumulating',
  DISTRIBUTING = 'Distributing',
}

export type EtfCategory = 'Global' | 'USA S&P500' | 'Tech/Nasdaq' | 'Europe' | 'Emerging' | 'High Dividend' | 'Bonds/Special' | 'LifeStrategy/Multi';

export type TimeRange = '1M' | '3M' | '1Y' | '3Y' | '5Y';
export type InvestmentHorizon = '5 Years' | '10 Years' | '20 Years' | '30+ Years';

export interface ChartPoint {
  date: string;
  etf1Value: number;
  etf2Value?: number;
}

export interface EtfPerformance {
  "1M": number;
  "3M": number;
  "1Y": number;
  "3Y": number;
  "5Y": number;
  source?: string;
  isEstimated: boolean; // True if API failed and we used category average
}

export interface DividendPayout {
    year: number;
    amount: number; // Cash amount per share
    yield: number;  // Yield percentage at that time
}

export interface ETF {
  isin: string;
  ticker: string;
  category: EtfCategory;
  name: string;
  issuer: string;
  ter: number; // Total Expense Ratio as percentage
  aum: number; // Assets Under Management in Millions EUR
  currency: string;
  domicile: string;
  replication: ReplicationMethod;
  distribution: DistributionPolicy;
  holdingsCount: number;
  topHoldings: string[];
  geoAllocation: Record<string, number>; // New: Geography %
  sectorAllocation: Record<string, number>; // New: Sector %
  description: string;
  dividendYield: number; // Current Yield
  dividendHistory?: DividendPayout[]; // Historical Data
}

export interface Broker {
  id: string;
  name: string;
  country: string;
  commissionType: 'Fixed' | 'Variable' | 'Zero';
  commissionRate: number; // percentage
  minCommission: number; // in EUR
  currencyConversionFee: number; // percentage
  isAvailable: boolean;
  notes?: string;
}

// --- NEW AI TYPES ---

export interface Source {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  sources?: Source[];
}

export interface ComparisonFactor {
    category: 'Cost' | 'Tax Efficiency' | 'Diversification' | 'Safety';
    winnerTicker: string | 'Tie';
    summary: string;
}

export interface CompositionAnalysis {
    topRegions: string[]; // e.g. ["USA 60%", "Europe 15%"]
    topSectors: string[]; // e.g. ["Tech 25%", "Finance 15%"]
    riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
    diversificationScore: number; // 1-10
}

export interface AIAnalysisResult {
    winnerTicker: string;
    confidenceScore: number; // 0-100
    headline: string;
    factors: ComparisonFactor[];
    // New fields for extended dashboard
    etf1Advantages: string[]; // List of specific reasons to buy ETF 1
    etf2Advantages: string[]; // List of specific reasons to buy ETF 2
    investmentHorizon: string;
    finalVerdict: string;
    composition: CompositionAnalysis; // New deep dive data
}

export interface PlaceResult {
  name: string;
  uri: string;
}
