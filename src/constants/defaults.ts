import type { AllocationTarget, SimulationParams, Goal, AssetClass, ColorRole } from '../types';

/**
 * Asset master table — Irish-domiciled, accumulating ETFs (tax-efficient).
 * `ticker` is the LSE/Euronext-traded symbol used for the live price feed.
 * `role` (green/yellow/red) drives the traffic-light de-risk routing.
 */
export interface AssetMeta {
  /** synthetic Irish ETF (0% withholding) shown while status = Active_Primary */
  primaryTicker: string;
  /** physical Irish ETF (15% withholding) used after a regulatory switch */
  fallbackTicker: string;
  /** free-tier US-listed proxy tracking the same index — used for live prices */
  proxyTicker: string;
  label: string;
  index: string;
  color: string;
  role: ColorRole;
  leveraged: boolean;
}

export const ASSET_META: Record<AssetClass, AssetMeta> = {
  dbxb: { primaryTicker: 'DBXB', fallbackTicker: 'CSPX', proxyTicker: 'SSO',  label: 'S&P 500 ×2 ממונף', index: 'S&P 500 2× Leveraged', color: '#DC2626', role: 'red',   leveraged: true  },
  eqqs: { primaryTicker: 'EQQS', fallbackTicker: 'CNDX', proxyTicker: 'QQQ',  label: 'נאסד״ק 100',       index: 'NASDAQ 100',          color: '#EF4444', role: 'red',   leveraged: false },
  p500: { primaryTicker: 'XSPX', fallbackTicker: 'CSPX', proxyTicker: 'SPY',  label: 'S&P 500',          index: 'S&P 500',             color: '#34D399', role: 'green', leveraged: false },
  xmwo: { primaryTicker: 'XMWO', fallbackTicker: 'IWDA', proxyTicker: 'URTH', label: 'MSCI World',        index: 'MSCI World',          color: '#10B981', role: 'green', leveraged: false },
};

/** Vanilla "green" anchors (S&P 500 + MSCI World — the Phase-B targets). */
export const GREEN_ASSETS: AssetClass[] = (Object.keys(ASSET_META) as AssetClass[]).filter(a => ASSET_META[a].role === 'green');

export const DEFAULT_ALLOCATIONS: AllocationTarget[] = (
  [['p500', 50], ['eqqs', 30], ['dbxb', 20]] as [AssetClass, number][]
).map(([assetClass, targetPercent]) => ({
  assetClass, targetPercent, currentValue: 0,
  label: ASSET_META[assetClass].label, color: ASSET_META[assetClass].color,
}));

/** Default lifecycle boundaries (most tracks). Track 5 overrides via its durations. */
export const TURBO_END = 20;       // Phase A yr 1–20 : smart-DCA accumulation
export const GROUNDING_END = 25;   // Phase B yr 21–25 : consolidate + deposit → MSCI World
export const INCUBATION_END = 25;  // (no separate incubation phase in MJS)
export const WITHDRAW_RATE = 0.04; // Phase C yr 26+   : 4% rule smart harvesting

// kept for back-compat with older references
export const PHASE_RED_END = TURBO_END;
export const PHASE_YELLOW_END = GROUNDING_END;

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
  // dbxb = 2× leveraged S&P (high return, high volatility drag in weak years)
  conservative: { dbxb: 6,  eqqs: 9,  p500: 7,  xmwo: 5  },
  moderate:     { dbxb: 18, eqqs: 14, p500: 10, xmwo: 8  },
  aggressive:   { dbxb: 28, eqqs: 20, p500: 14, xmwo: 11 },
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
