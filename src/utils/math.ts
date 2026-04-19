import type { SimulationResult, AllocationTarget, AssetClass, AssetSimRow } from '../types';

/**
 * Geometric monthly rate conversion:
 *   r_monthly = (1 + r_annual)^(1/12) - 1
 *
 * This is the mathematically correct formula. The naive r/12 approximation
 * overstates returns, especially at high annual rates.
 */
function toMonthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/**
 * Compound interest formula (per month):
 *   1. Add the deposit to the current balance first
 *   2. Then apply monthly interest to the full amount
 *
 *   balance = (balance + monthlyDeposit) * (1 + monthlyRate)
 *
 * This ensures the deposit earns interest in the same month it is made
 * and produces mathematically accurate results.
 *
 * Verification: 10% annual · ₪3,000/month · 30 years ≈ ₪6.4M (no initial deposit)
 */

export function futureValue(
  principal: number,
  monthlyDeposit: number,
  annualReturn: number,
  years: number,
): SimulationResult[] {
  const results: SimulationResult[] = [];
  let balance = principal;
  let totalDeposited = principal;
  const r = toMonthlyRate(annualReturn);

  results.push({
    year: 0,
    value: Math.round(balance),
    totalDeposited: Math.round(totalDeposited),
    growth: 0,
  });

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      // Deposit first, then compound
      balance = (balance + monthlyDeposit) * (1 + r);
      totalDeposited += monthlyDeposit;
    }
    results.push({
      year,
      value: Math.round(balance),
      totalDeposited: Math.round(totalDeposited),
      growth: Math.round(balance - totalDeposited),
    });
  }

  return results;
}

/**
 * Per-asset simulation.
 *
 * Each asset grows at its own annual return rate (geometric monthly conversion).
 * Monthly deposits are split by targetPercent allocation.
 *
 * Formula per asset per month:
 *   balance = (balance + depositSlice) * (1 + monthlyRate)
 *
 * Starting capital:
 *   - If the user has entered actual holdings (currentValue > 0), each asset
 *     starts from its real currentValue.
 *   - Otherwise, initialDeposit is distributed by targetPercent.
 *
 * Monthly deposit is FIXED — no yearly increase applied.
 * Total deposited after N years = initialDeposit + monthlyDeposit × 12 × N
 */
export function simulateByAsset(
  initialDeposit: number,
  monthlyDeposit: number,
  years: number,
  _yearlyDepositIncrease: number,   // kept for API compatibility — always treated as 0
  allocations: AllocationTarget[],
  assetReturns: Record<AssetClass, number>
): AssetSimRow[] {
  const active = allocations.filter(a => a.targetPercent > 0 || a.currentValue > 0);
  const results: AssetSimRow[] = [];

  const totalCurrentValue = allocations.reduce((s, a) => s + a.currentValue, 0);
  const useActualHoldings = totalCurrentValue > 0;

  // Pre-compute geometric monthly rates (once, outside the loop)
  const rates: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  for (const a of active) {
    rates[a.assetClass] = toMonthlyRate(assetReturns[a.assetClass]);
  }

  const balances: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  const deposited: Record<AssetClass, number> = {} as Record<AssetClass, number>;

  for (const a of active) {
    if (useActualHoldings) {
      balances[a.assetClass] = a.currentValue;
      deposited[a.assetClass] = a.currentValue;
    } else {
      const pct = a.targetPercent / 100;
      balances[a.assetClass] = initialDeposit * pct;
      deposited[a.assetClass] = initialDeposit * pct;
    }
  }

  const totalTargetPct = active.reduce((s, a) => s + a.targetPercent, 0) || 100;

  const makeRow = (year: number): AssetSimRow => {
    let totalValue = 0;
    let totalDep = 0;
    const assets = {} as AssetSimRow['assets'];
    for (const a of active) {
      const ac = a.assetClass;
      const val = balances[ac];
      const dep = deposited[ac];
      totalValue += val;
      totalDep += dep;
      assets[ac] = {
        value: Math.round(val),
        deposited: Math.round(dep),
        growth: Math.round(val - dep),
        returnRate: assetReturns[ac],
      };
    }
    return {
      year,
      totalValue: Math.round(totalValue),
      totalDeposited: Math.round(totalDep),
      totalGrowth: Math.round(totalValue - totalDep),
      assets,
    };
  };

  results.push(makeRow(0));

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      for (const a of active) {
        const ac = a.assetClass;
        const depositSlice = monthlyDeposit * (a.targetPercent / totalTargetPct);
        // Deposit first, then compound (deposit earns interest in the same month)
        balances[ac] = (balances[ac] + depositSlice) * (1 + rates[ac]);
        deposited[ac] += depositSlice;
      }
    }
    results.push(makeRow(year));
  }

  return results;
}

export function calcRequiredMonthly(
  targetAmount: number,
  currentValue: number,
  annualReturn: number,
  years: number
): number {
  const r = toMonthlyRate(annualReturn);
  const months = years * 12;
  const futureOfPrincipal = currentValue * Math.pow(1 + r, months);
  const remaining = targetAmount - futureOfPrincipal;
  if (remaining <= 0) return 0;
  const factor = (Math.pow(1 + r, months) - 1) / r;
  return Math.round(remaining / factor);
}

export function calcYearsNeeded(
  targetAmount: number,
  currentValue: number,
  monthlyDeposit: number,
  annualReturn: number
): number {
  const r = toMonthlyRate(annualReturn);
  let balance = currentValue;
  let months = 0;
  while (balance < targetAmount && months < 600) {
    balance = (balance + monthlyDeposit) * (1 + r);
    months++;
  }
  return Math.round((months / 12) * 10) / 10;
}

export function fourPercentRule(portfolioValue: number): {
  safe: number;
  normal: number;
  aggressive: number;
} {
  return {
    safe: Math.round(portfolioValue * 0.03),
    normal: Math.round(portfolioValue * 0.04),
    aggressive: Math.round(portfolioValue * 0.05),
  };
}
