import type { AllocationTarget, SimulationParams, Goal, AssetClass } from '../types';

export const DEFAULT_ALLOCATIONS: AllocationTarget[] = [
  { assetClass: 'sp500', label: 'S&P 500', targetPercent: 30, currentValue: 0, color: '#3b82f6' },
  { assetClass: 'nasdaq', label: 'Nasdaq', targetPercent: 30, currentValue: 0, color: '#8b5cf6' },
  { assetClass: 'bitcoin', label: 'Bitcoin', targetPercent: 15, currentValue: 0, color: '#f59e0b' },
  { assetClass: 'dividend', label: 'SCHD', targetPercent: 25, currentValue: 0, color: '#ec4899' },
];

export const DEFAULT_SIMULATION: SimulationParams = {
  initialDeposit: 10000,
  monthlyDeposit: 3000,
  years: 10,
  expectedReturn: 8,
  yearlyDepositIncrease: 0,
  inflationRate: 2.5,
  targetAmount: 1500000,
};

export const DEFAULT_GOAL: Goal = {
  id: 'main',
  name: 'Financial Freedom',
  targetAmount: 1500000,
  targetMonthlyIncome: 5000,
  yearsToInvest: 10,
};

/**
 * Per-asset expected annual returns (%) — based on real historical data:
 *
 * S&P 500 (SPY/VOO):     ~10.5%/yr since 1957 | conservative: weak decade (2000-2009), aggressive: bull run
 * Nasdaq 100 (QQQ):      ~16%/yr since 1985   | one of the best-performing indices long-term
 * Bitcoin (IBIT/FBTC):   CAGR 2015-2024 ~70%+ | conservative = adoption plateau, moderate = sustained growth
 * International (VXUS):  ~6-7%/yr             | typically lags US markets
 * Gold (GLD/IAU):        ~7-8%/yr 20yr avg    | inflation hedge, slow but steady
 * Dividend ETF (SCHD):   ~10-12%/yr total ret | ~4% yield + ~7% price appreciation
 */
/**
 * IMPORTANT — Why Bitcoin rates are lower than its historical CAGR:
 *
 * Bitcoin's 10-year historical CAGR (2015-2024) was ~70%+, but this was during
 * the early adoption phase. As any asset matures, returns normalise downward.
 * For a 20-30 year projection, using 70% would produce mathematically absurd
 * results (e.g. ₪1,000/month → hundreds of millions). Instead, we model Bitcoin
 * as it transitions from a speculative asset toward a digital store of value:
 *   Conservative  = crypto winter / regulatory headwinds
 *   Moderate      = gradual institutionalisation, ~Gold-like growth + premium
 *   Aggressive    = continued adoption cycle, volatile but high compounding
 */
/**
 * Weighted returns with default 30/30/15/25 allocation (S&P/Nasdaq/BTC/SCHD):
 *   Conservative ≈  7.2%   Moderate ≈ 13.5%   Aggressive ≈ 18.9%
 *
 * Bitcoin note: rates are below its historical CAGR (~70%+) intentionally.
 * Using historical BTC rates over 30yr produces mathematically absurd totals.
 * We model BTC as a maturing institutional asset, not the early-adoption phase.
 */
export const ASSET_RETURNS: Record<string, Record<AssetClass, number>> = {
  // ── Conservative: weak decade, crypto winter ─────────────────────────────
  conservative: {
    sp500: 7,          // Lost-decade scenario (2000–2009)
    nasdaq: 9,         // Tech correction years
    bitcoin: 8,        // Sideways / crypto winter, some adoption residual
    dividend: 7,       // Dividend income + modest appreciation
  },
  // ── Moderate: realistic long-term historical averages ────────────────────
  moderate: {
    sp500: 11,         // S&P 500 historical avg 1957–2024 ≈ 10.5%
    nasdaq: 17,        // QQQ 20-year CAGR ≈ 17%
    bitcoin: 22,       // BTC as a maturing growth asset — well below historical CAGR
    dividend: 10,      // SCHD total return (~4% yield + ~6% appreciation)
  },
  // ── Aggressive: bull cycle, above-average growth ──────────────────────────
  aggressive: {
    sp500: 15,         // Bull run (2010–2020 avg ≈ 13.6%)
    nasdaq: 22,        // High-growth tech cycle
    bitcoin: 35,       // Continued adoption with institutional inflows
    dividend: 13,      // High-yield + strong price appreciation
  },
};

export const SCENARIOS = {
  conservative: { label: 'Conservative', color: '#888' },
  moderate: { label: 'Moderate', color: '#D4AF37' },
  aggressive: { label: 'Aggressive', color: '#34D399' },
};

export const TRANSITION_THRESHOLD = 1500000;

// Helper: calculate the weighted return for a given allocation + scenario
export function calcWeightedReturn(
  allocations: AllocationTarget[],
  scenario: 'conservative' | 'moderate' | 'aggressive'
): number {
  const returns = ASSET_RETURNS[scenario];
  let weightedReturn = 0;
  let totalPct = 0;
  for (const a of allocations) {
    if (a.targetPercent > 0) {
      weightedReturn += (a.targetPercent / 100) * returns[a.assetClass];
      totalPct += a.targetPercent;
    }
  }
  // Normalize if allocations don't sum to 100
  if (totalPct > 0 && totalPct !== 100) {
    weightedReturn = weightedReturn * (100 / totalPct);
  }
  return Math.round(weightedReturn * 100) / 100;
}
