import { toMonthlyRate } from './math';
import type { CustomHolding, MonthlyEntry } from '../types';

/**
 * Simulation + rebalancing for a custom, user-picked stock portfolio.
 *
 * The existing engine in utils/math.ts and utils/rebalance.ts is keyed on the
 * fixed `AssetClass` union, so it cannot hold arbitrary tickers. This module
 * reuses the same two formulas — geometric monthly compounding and
 * deviation-routed DCA — over a free-form list of holdings.
 */

// ── Simulation ───────────────────────────────────────────────────────────────
export interface CustomSimRow {
  year: number;
  totalValue: number;
  totalDeposited: number;
  totalGrowth: number;
  /** value per ticker at the end of this year */
  byTicker: Record<string, number>;
}

/**
 * Project the portfolio forward. Each holding compounds at its own expected
 * return; the monthly deposit is split by target weight. Deposit lands first
 * and earns interest the same month — matching futureValue() in math.ts.
 *
 * Holdings that already have a currentValue start from it; otherwise every
 * holding starts at zero and grows purely from deposits.
 */
export function simulateCustom(
  holdings: CustomHolding[],
  monthlyDeposit: number,
  years: number,
): CustomSimRow[] {
  const active = holdings.filter(h => h.targetPercent > 0 || h.currentValue > 0);
  if (active.length === 0) return [];

  const rate = new Map(active.map(h => [h.id, toMonthlyRate(h.expectedReturn)]));
  const balance = new Map(active.map(h => [h.id, h.currentValue]));
  let deposited = active.reduce((s, h) => s + h.currentValue, 0);

  const totalTarget = active.reduce((s, h) => s + h.targetPercent, 0);

  const row = (year: number): CustomSimRow => {
    const byTicker: Record<string, number> = {};
    let totalValue = 0;
    for (const h of active) {
      const v = balance.get(h.id)!;
      byTicker[h.ticker] = Math.round(v);
      totalValue += v;
    }
    return {
      year,
      totalValue: Math.round(totalValue),
      totalDeposited: Math.round(deposited),
      totalGrowth: Math.round(totalValue - deposited),
      byTicker,
    };
  };

  const rows: CustomSimRow[] = [row(0)];

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      for (const h of active) {
        // With no targets set at all, spread the deposit evenly rather than
        // dropping it — otherwise the projection silently flatlines.
        const share = totalTarget > 0 ? h.targetPercent / totalTarget : 1 / active.length;
        const slice = monthlyDeposit * share;
        balance.set(h.id, (balance.get(h.id)! + slice) * (1 + rate.get(h.id)!));
      }
      deposited += monthlyDeposit;
    }
    rows.push(row(year));
  }

  return rows;
}

/** Blended expected return of the portfolio, weighted by target allocation. */
export function blendedReturn(holdings: CustomHolding[]): number {
  const active = holdings.filter(h => h.targetPercent > 0);
  const total = active.reduce((s, h) => s + h.targetPercent, 0);
  if (total === 0) return 0;
  return active.reduce((s, h) => s + h.expectedReturn * (h.targetPercent / total), 0);
}

// ── Rebalancing ──────────────────────────────────────────────────────────────
export interface CustomRebalanceRow {
  id: string;
  ticker: string;
  name: string;
  /** ILS of this deposit to route into this holding */
  amount: number;
  /** actual current weight, % */
  currentPercent: number;
  targetPercent: number;
  /** target − current; positive means under-weighted */
  deviation: number;
  underweight: boolean;
}

/**
 * Route a deposit into the under-weighted holdings, never selling and never
 * buying a holding past its target. Same algorithm as calcRebalance() in
 * utils/rebalance.ts, over tickers instead of asset classes.
 */
export function calcCustomRebalance(
  depositAmount: number,
  holdings: CustomHolding[],
): CustomRebalanceRow[] {
  const active = holdings.filter(h => h.targetPercent > 0);
  if (active.length === 0) return [];

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const newTotal = totalValue + depositAmount;
  const sumTarget = active.reduce((s, h) => s + h.targetPercent, 0) || 1;

  const deficit = new Map(
    active.map(h => [h.id, Math.max(0, (h.targetPercent / 100) * newTotal - h.currentValue)])
  );
  const sumDeficit = [...deficit.values()].reduce((s, v) => s + v, 0);

  const amount = new Map<string, number>();
  if (sumDeficit <= 0) {
    // Everything at or above target — spread by target weight.
    active.forEach(h => amount.set(h.id, depositAmount * (h.targetPercent / sumTarget)));
  } else if (sumDeficit >= depositAmount) {
    // Not enough to fill every gap — split proportionally to the gaps.
    active.forEach(h => amount.set(h.id, depositAmount * (deficit.get(h.id)! / sumDeficit)));
  } else {
    // Fill every gap, then spread what is left by target weight.
    const residual = depositAmount - sumDeficit;
    active.forEach(h => amount.set(h.id, deficit.get(h.id)! + residual * (h.targetPercent / sumTarget)));
  }

  const rows: CustomRebalanceRow[] = active.map(h => {
    const current = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
    return {
      id: h.id, ticker: h.ticker, name: h.name,
      amount: Math.round(amount.get(h.id) ?? 0),
      currentPercent: current,
      targetPercent: h.targetPercent,
      deviation: Math.round((h.targetPercent - current) * 10) / 10,
      underweight: h.targetPercent - current > 0,
    };
  });

  // Absorb rounding drift into the largest allocation so the split sums exactly.
  const drift = depositAmount - rows.reduce((s, r) => s + r.amount, 0);
  if (drift !== 0 && rows.length) {
    const target = [...rows].sort((a, b) => b.amount - a.amount)[0];
    target.amount += drift;
  }

  return rows.sort((a, b) => Number(b.underweight) - Number(a.underweight) || b.amount - a.amount);
}

// ── Monthly progress ─────────────────────────────────────────────────────────
export interface ProgressRow {
  month: string;          // 'YYYY-MM'
  index: number;          // 1-based month number since the first entry
  actualDeposit: number;
  actualValue: number;
  /** where the plan says the portfolio should be by this month */
  planValue: number;
  /** actual − plan, ILS */
  gap: number;
  cumulativeDeposit: number;
}

/** Sort key for 'YYYY-MM' strings — plain lexical order is already correct. */
const byMonth = (a: MonthlyEntry, b: MonthlyEntry) => a.month.localeCompare(b.month);

/**
 * Join the self-reported monthly entries against the plan.
 *
 * The plan compounds the *starting* value at the blended expected return and
 * adds the planned monthly deposit — so the comparison answers "am I ahead of
 * or behind the plan I set", not "was my return correct".
 */
export function buildProgress(
  entries: MonthlyEntry[],
  plannedMonthlyDeposit: number,
  annualReturn: number,
  startingValue: number,
): ProgressRow[] {
  const sorted = [...entries].sort(byMonth);
  const r = toMonthlyRate(annualReturn);

  let plan = startingValue;
  let cumulativeDeposit = 0;

  return sorted.map((e, i) => {
    plan = (plan + plannedMonthlyDeposit) * (1 + r);
    cumulativeDeposit += e.deposit;
    return {
      month: e.month,
      index: i + 1,
      actualDeposit: e.deposit,
      actualValue: e.value,
      planValue: Math.round(plan),
      gap: Math.round(e.value - plan),
      cumulativeDeposit: Math.round(cumulativeDeposit),
    };
  });
}

/** 'YYYY-MM' for the current month, in local time. */
export function currentMonthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
