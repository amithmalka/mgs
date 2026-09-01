// ── MJS asset universe (each bucket = synthetic Primary + physical Fallback) ─
//   dbxb S&P 500 x2 leveraged · eqqs NASDAQ 100      -> red (turbo/leverage)
//   p500 S&P 500 · xmwo MSCI World (Phase-B target)  -> green (vanilla)
import type { DotColor } from '../components/shared/Icon';

export type AssetClass = 'dbxb' | 'eqqs' | 'p500' | 'xmwo';

/** Role: green = vanilla anchor (Phase-B target); red = turbo/leveraged. */
export type ColorRole = 'green' | 'red';

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
  dot: DotColor;
  taglineHe: string;
  taglineEn: string;
  /** Phase A target allocation, must sum to 100 */
  allocations: Partial<Record<AssetClass, number>>;
  /** Phase A (accumulation) length in years */
  phaseADuration: number;
  /** Phase B (consolidation into phaseBTarget) length in years */
  phaseBDuration: number;
  /** the single asset Phase B migrates + routes deposits into (MSCI World) */
  phaseBTarget: AssetClass;
  /** leverage % headline shown on the track card */
  leverage: number;
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

// ── Academy (learning system) ──────────────────────────────────────────────
export interface Module {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  created_at?: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  sort_order: number;
  created_at?: string;
}

// ── Custom portfolio (per-student stock picking) ───────────────────────────
/** A stock on the admin's shared recommended list (Supabase). */
export interface CustomStock {
  id: string;
  ticker: string;
  name: string;
  /** default expected annual return %, editable per student */
  expected_return: number;
  sort_order: number;
  created_at?: string;
}

/** A holding in one student's personal custom portfolio (stored locally). */
export interface CustomHolding {
  id: string;
  ticker: string;
  name: string;
  /** desired share of the portfolio, % */
  targetPercent: number;
  /** expected annual return %, seeded from live data but user-editable */
  expectedReturn: number;
  /** actual amount held today, ILS */
  currentValue: number;
  /** true when the row originated from the admin's shared list */
  fromAdmin?: boolean;
}

/** One month of actual, self-reported progress. */
export interface MonthlyEntry {
  id: string;
  /** 'YYYY-MM' */
  month: string;
  /** amount actually deposited that month, ILS */
  deposit: number;
  /** actual total portfolio value at month end, ILS */
  value: number;
  note?: string;
}

export interface ETFRecommendation {
  ticker: string;
  name: string;
  expenseRatio: number;
  dividendYield?: number;
}

export type ETFMap = Record<AssetClass, ETFRecommendation[]>;
