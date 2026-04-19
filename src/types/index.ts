export type AssetClass = 'sp500' | 'nasdaq' | 'bitcoin' | 'dividend';

export type InvestmentPhase = 'growth' | 'transition' | 'income';

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
