import type { SimulationResult, AllocationTarget, AssetClass, AssetSimRow } from '../types';

/**
 * Geometric monthly rate conversion:
 *   r_monthly = (1 + r_annual)^(1/12) - 1
 *
 * This is the mathematically correct formula. The naive r/12 approximation
 * overstates returns, especially at high annual rates.
 */
export function toMonthlyRate(annualPct: number): number {
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

/**
 * Assets the simulation must track, given the phase routing.
 *
 * An asset with a 0% Phase-A target and no holdings is still needed if a later
 * phase routes deposits into it or consolidates into it — MSCI World is exactly
 * that: every track carries it at 0% until the yellow phase. Leaving it out
 * made Phase-B consolidation a no-op and silently discarded every yellow-phase
 * deposit, because the routing weight pointed at an asset the loop never
 * visited.
 */
function activeForPhases(
  allocations: AllocationTarget[],
  routing: Array<Partial<Record<AssetClass, number>> | undefined>,
  consolidateTo?: AssetClass,
): AllocationTarget[] {
  const routed = new Set<AssetClass>();
  for (const map of routing) {
    for (const k of Object.keys(map ?? {})) routed.add(k as AssetClass);
  }
  if (consolidateTo) routed.add(consolidateTo);
  return allocations.filter(
    a => a.targetPercent > 0 || a.currentValue > 0 || routed.has(a.assetClass)
  );
}

/**
 * Phase-aware "traffic light" (רמזור) simulation for an MGS track.
 *
 * Three phases, measured in years from the start of investing:
 *   red       (year ≤ yellowStartYear):  monthly deposit split across the track
 *                                        allocation; every asset grows.
 *   yellow (yellowStartYear < y ≤ greenStartYear): the entire monthly deposit
 *                                        flows into the track's GREEN assets only
 *                                        (de-risk); others keep growing, no new money.
 *   green   (year > greenStartYear):   no new deposits. A 4% withdrawal is
 *                                        taken at the end of each year as income.
 *
 * Withdrawals are removed proportionally from each asset. Growth is reported net
 * of withdrawals, so totalGrowth = totalValue − totalDeposited + cumulativeIncome.
 */
export function simulateTrack(
  initialDeposit: number,
  monthlyDeposit: number,
  years: number,
  allocations: AllocationTarget[],
  assetReturns: Record<AssetClass, number>,
  opts: {
    turboEnd: number; groundingEnd: number; incubationEnd: number;
    grounding: Partial<Record<AssetClass, number>>;
    incubation: Partial<Record<AssetClass, number>>;
    withdrawRate: number;
    /** at Phase-B start, migrate all balances into this asset (MSCI World) */
    consolidateTo?: AssetClass;
  },
): AssetSimRow[] {
  const active = activeForPhases(allocations, [opts.grounding, opts.incubation], opts.consolidateTo);
  const results: AssetSimRow[] = [];

  const totalCurrentValue = allocations.reduce((s, a) => s + a.currentValue, 0);
  const useActualHoldings = totalCurrentValue > 0;

  const rates: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  const balances: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  const deposited: Record<AssetClass, number> = {} as Record<AssetClass, number>;

  for (const a of active) {
    rates[a.assetClass] = toMonthlyRate(assetReturns[a.assetClass]);
    if (useActualHoldings) {
      balances[a.assetClass] = a.currentValue;
      deposited[a.assetClass] = a.currentValue;
    } else {
      const pct = a.targetPercent / 100;
      balances[a.assetClass] = initialDeposit * pct;
      deposited[a.assetClass] = initialDeposit * pct;
    }
  }

  let cumulativeIncome = 0;

  type Phase4 = 'turbo' | 'grounding' | 'incubation' | 'withdraw';
  const phase4 = (year: number): Phase4 => {
    if (year <= opts.turboEnd) return 'turbo';
    if (year <= opts.groundingEnd) return 'grounding';
    if (year <= opts.incubationEnd) return 'incubation';
    return 'withdraw';
  };
  const tl = (p: Phase4): 'red' | 'yellow' | 'green' => p === 'turbo' ? 'red' : p === 'grounding' ? 'yellow' : 'green';

  // Deposit-routing weight map for a given phase (asset → weight).
  const routeFor = (p: Phase4): Partial<Record<AssetClass, number>> => {
    if (p === 'turbo') return Object.fromEntries(active.map(a => [a.assetClass, a.targetPercent]));
    if (p === 'grounding') return opts.grounding;
    if (p === 'incubation') return opts.incubation;
    return {};
  };

  const phaseForYear = (year: number) => tl(phase4(year));

  const makeRow = (year: number, income: number): AssetSimRow => {
    let totalValue = 0;
    let totalDep = 0;
    const assets = {} as AssetSimRow['assets'];
    for (const a of active) {
      const ac = a.assetClass;
      totalValue += balances[ac];
      totalDep += deposited[ac];
      assets[ac] = {
        value: Math.round(balances[ac]),
        deposited: Math.round(deposited[ac]),
        growth: Math.round(balances[ac] - deposited[ac]),
        returnRate: assetReturns[ac],
      };
    }
    return {
      year,
      totalValue: Math.round(totalValue),
      totalDeposited: Math.round(totalDep),
      totalGrowth: Math.round(totalValue - totalDep + cumulativeIncome),
      assets,
      phase: phaseForYear(year),
      income: Math.round(income),
      cumulativeIncome: Math.round(cumulativeIncome),
    };
  };

  results.push(makeRow(0, 0));

  for (let year = 1; year <= years; year++) {
    const p4 = phase4(year);

    // Phase B start: migrate all accumulated balances into the target (MSCI World)
    if (year === opts.turboEnd + 1 && opts.groundingEnd > opts.turboEnd && opts.consolidateTo) {
      const dest = opts.consolidateTo;
      if (balances[dest] !== undefined) {
        for (const a of active) {
          if (a.assetClass === dest) continue;
          balances[dest] += balances[a.assetClass]; balances[a.assetClass] = 0;
          deposited[dest] += deposited[a.assetClass]; deposited[a.assetClass] = 0;
        }
      }
    }

    const route = routeFor(p4);
    const routeSum = (Object.values(route) as number[]).reduce((s, v) => s + v, 0);
    // Growth and withdrawal interleave month by month. The 4% is drawn
    // MONTHLY, not as a single year-end lump — a lump would leave the whole
    // balance compounding all year and overstate it, and it disagreed with
    // simulateTrackMonthly, which always drew monthly. Same question, two
    // different answers.
    const withdrawMonthly = p4 === 'withdraw' ? opts.withdrawRate / 12 : 0;
    let income = 0;

    for (let month = 1; month <= 12; month++) {
      for (const a of active) {
        const ac = a.assetClass;
        const w = route[ac] ?? 0;
        const depositSlice = routeSum > 0 ? monthlyDeposit * (w / routeSum) : 0;
        // Deposit first, then compound (deposit earns interest the same month)
        balances[ac] = (balances[ac] + depositSlice) * (1 + rates[ac]);
        deposited[ac] += depositSlice;
      }

      if (withdrawMonthly > 0) {
        const total = active.reduce((s, a) => s + balances[a.assetClass], 0);
        if (total > 0) {
          const slice = total * withdrawMonthly;
          for (const a of active) {
            const ac = a.assetClass;
            balances[ac] -= slice * (balances[ac] / total); // proportional drawdown
          }
          income += slice;
        }
      }
    }

    cumulativeIncome += income;
    results.push(makeRow(year, income));
  }

  return results;
}

export interface MonthlyRow {
  m: number;            // 1-based month index across the whole horizon
  year: number;
  monthOfYear: number;  // 1..12
  value: number;
  deposited: number;
  growth: number;
  income: number;       // 4%/12 withdrawal that month (Phase C)
  phase: 'red' | 'yellow' | 'green';
}

/**
 * Month-by-month version of simulateTrack — same phase logic (turbo → Phase-B
 * consolidation → withdrawal) but records a snapshot every single month, with
 * withdrawals applied monthly (4% ÷ 12) during the harvest phase.
 */
export function simulateTrackMonthly(
  initialDeposit: number,
  monthlyDeposit: number,
  years: number,
  allocations: AllocationTarget[],
  assetReturns: Record<AssetClass, number>,
  opts: {
    turboEnd: number; groundingEnd: number; incubationEnd: number;
    grounding: Partial<Record<AssetClass, number>>;
    incubation: Partial<Record<AssetClass, number>>;
    withdrawRate: number;
    consolidateTo?: AssetClass;
  },
): MonthlyRow[] {
  const active = activeForPhases(allocations, [opts.grounding, opts.incubation], opts.consolidateTo);
  const totalCurrentValue = allocations.reduce((s, a) => s + a.currentValue, 0);
  const useActualHoldings = totalCurrentValue > 0;

  const rates: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  const balances: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  const deposited: Record<AssetClass, number> = {} as Record<AssetClass, number>;
  for (const a of active) {
    rates[a.assetClass] = toMonthlyRate(assetReturns[a.assetClass]);
    const start = useActualHoldings ? a.currentValue : initialDeposit * (a.targetPercent / 100);
    balances[a.assetClass] = start;
    deposited[a.assetClass] = start;
  }

  type P4 = 'turbo' | 'grounding' | 'incubation' | 'withdraw';
  const phase4 = (y: number): P4 =>
    y <= opts.turboEnd ? 'turbo' : y <= opts.groundingEnd ? 'grounding' : y <= opts.incubationEnd ? 'incubation' : 'withdraw';
  const tl = (p: P4): 'red' | 'yellow' | 'green' => p === 'turbo' ? 'red' : p === 'grounding' ? 'yellow' : 'green';
  const routeFor = (p: P4): Partial<Record<AssetClass, number>> =>
    p === 'turbo' ? Object.fromEntries(active.map(a => [a.assetClass, a.targetPercent]))
      : p === 'grounding' ? opts.grounding : p === 'incubation' ? opts.incubation : {};

  const rows: MonthlyRow[] = [];
  let cumulativeIncome = 0;
  let mIdx = 0;

  for (let year = 1; year <= years; year++) {
    const p4 = phase4(year);
    if (year === opts.turboEnd + 1 && opts.groundingEnd > opts.turboEnd && opts.consolidateTo) {
      const dest = opts.consolidateTo;
      if (balances[dest] !== undefined) {
        for (const a of active) {
          if (a.assetClass === dest) continue;
          balances[dest] += balances[a.assetClass]; balances[a.assetClass] = 0;
          deposited[dest] += deposited[a.assetClass]; deposited[a.assetClass] = 0;
        }
      }
    }
    const route = routeFor(p4);
    const routeSum = (Object.values(route) as number[]).reduce((s, v) => s + v, 0);

    for (let month = 1; month <= 12; month++) {
      mIdx++;
      for (const a of active) {
        const ac = a.assetClass;
        const slice = routeSum > 0 ? monthlyDeposit * ((route[ac] ?? 0) / routeSum) : 0;
        balances[ac] = (balances[ac] + slice) * (1 + rates[ac]);
        deposited[ac] += slice;
      }
      let income = 0;
      if (p4 === 'withdraw') {
        const total = active.reduce((s, a) => s + balances[a.assetClass], 0);
        income = total * opts.withdrawRate / 12;
        if (total > 0) for (const a of active) balances[a.assetClass] -= income * (balances[a.assetClass] / total);
        cumulativeIncome += income;
      }
      const value = active.reduce((s, a) => s + balances[a.assetClass], 0);
      const dep = active.reduce((s, a) => s + deposited[a.assetClass], 0);
      rows.push({
        m: mIdx, year, monthOfYear: month,
        value: Math.round(value), deposited: Math.round(dep),
        growth: Math.round(value - dep + cumulativeIncome),
        income: Math.round(income), phase: tl(p4),
      });
    }
  }
  return rows;
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
