export type AssetClass = 'sp500' | 'nasdaq' | 'bitcoin' | 'dividend' | 'msci' | 'bonds';

export type InvestmentPhase = 'growth' | 'transition' | 'income';

/**
 * The "traffic light" (רמזור) phase model — time-based, measured in years
 * from the start of investing:
 *   red    (0–15yr): monthly deposits split across the track allocation
 *   yellow (15–20yr): monthly deposits go entirely into SCHD; dividends reinvested
 *   green  (20yr+):   no new deposits; only SCHD dividends reinvested; 4% withdrawals
 */
export type TrafficLight = 'red' | 'yellow' | 'green';

export type TrackId = 'aggressive' | 'stable' | 'mature' | 'defensive' | 'security';

export interface Track {
  id: TrackId;
  nameHe: string;
  nameEn: string;
  ageMin: number;
  ageMax: number;
  icon: string;
  taglineHe: string;
  taglineEn: string;
  /** target allocation per asset class, must sum to 100 */
  allocations: Partial<Record<AssetClass, number>>;
  /** year at which the yellow phase begins (deposits → SCHD only) */
  yellowStartYear: number;
  /** year at which the green phase begins (stop deposits, start 4% withdrawals) */
  greenStartYear: number;
}

export interface AllocationTarget {
  assetClass: AssetClass;
  label: string;
  targetPercent: number;
  currentValue: number;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'update';
  amount: number;
  date: string;
  notes: string;
  allocation?: Partial<Record<AssetClass, number>>;
}

export interface SimulationParams {
  initialDeposit: number;
  monthlyDeposit: number;
  years: number;
  expectedReturn: number;
  yearlyDepositIncrease: number;
  inflationRate: number;
  targetAmount: number;
}

export interface SimulationResult {
  year: number;
  value: number;
  totalDeposited: number;
  growth: number;
}

export interface AssetSimRow {
  year: number;
  totalValue: number;
  totalDeposited: number;
  totalGrowth: number;
  assets: Record<AssetClass, { value: number; deposited: number; growth: number; returnRate: number }>;
  /** traffic-light phase this year belongs to (only set by simulateTrack) */
  phase?: TrafficLight;
  /** income withdrawn this year via the 4% rule (green phase only) */
  income?: number;
  /** cumulative income withdrawn up to and including this year */
  cumulativeIncome?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetMonthlyIncome: number;
  yearsToInvest: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  type: 'deposit' | 'withdrawal' | 'rebalance' | 'update' | 'system';
  amount?: number;
  notes?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface PortfolioState {
  allocations: AllocationTarget[];
  transactions: Transaction[];
  currentPortfolioValue: number;
  monthlyDeposit: number;
  phase: InvestmentPhase;
  simulationParams: SimulationParams;
  goal: Goal;
  activities: ActivityEntry[];
  notifications: Notification[];
  transitionThreshold: number;
}

export interface ETFRecommendation {
  ticker: string;
  name: string;
  expenseRatio: number;
  dividendYield?: number;
}

export type ETFMap = Record<AssetClass, ETFRecommendation[]>;
