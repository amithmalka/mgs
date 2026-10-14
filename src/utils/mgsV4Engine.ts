/**
 * The v4 projection: a client's age and deposit in, a year-by-year table out.
 *
 * It walks month by month because the allocation moves every month — the decay
 * is continuous and the deposit window closes on a specific month — and then
 * reports one row per year, which is what anyone actually reads.
 */

import {
  allocationFor, routeDeposit, milestonesFor, volatileShare,
  type AssetId, type TrackId, type Allocation,
} from '../constants/mgsV4';
import { monthlyReturn, type Scenario } from '../constants/mgsReturns';

const ASSETS: AssetId[] = ['BTC', 'SMH', 'SPMO', 'QQQA', 'I500', 'EQQS', 'JEPQ', 'WORLD'];

export interface YearRow {
  year: number;
  age: number;
  /** paid in over the whole plan so far */
  deposited: number;
  /** portfolio value at the end of this year */
  value: number;
  /** value minus everything paid in */
  gain: number;
  /** what the portfolio holds, by asset */
  byAsset: Record<AssetId, number>;
  /** share of the portfolio in BTC + SMH */
  volatile: number;
  /** true once deposits have moved to the world index */
  shifted: boolean;
}

export interface Projection {
  rows: YearRow[];
  /** the year deposits stop going to the track */
  shiftYear: number;
  /** the year withdrawals begin */
  withdrawYear: number;
  withdrawAge: number;
  totalDeposited: number;
  finalValue: number;
  /** 4% of the final value, paid monthly */
  monthlyIncome: number;
  /** that income after 25% tax on the gain portion */
  monthlyIncomeNet: number;
}

export const WITHDRAW_RATE = 0.04;
export const TAX_RATE = 0.25;

const emptyBook = (): Record<AssetId, number> =>
  Object.fromEntries(ASSETS.map(a => [a, 0])) as Record<AssetId, number>;

/**
 * Run one plan.
 *
 * `horizonYears` lets the client choose when they stop — the age matrix has a
 * default, but someone who wants to run five years longer should see that
 * table rather than be told what their horizon is.
 */
export function project(
  track: TrackId,
  startAge: number,
  monthlyDeposit: number,
  scenario: Scenario,
  horizonYears?: number,
): Projection {
  const m = milestonesFor(startAge);
  const total = horizonYears ?? m.depositYears + m.shiftYears;
  const rate = Object.fromEntries(
    ASSETS.map(a => [a, monthlyReturn(a, scenario)]),
  ) as Record<AssetId, number>;

  const book = emptyBook();
  let deposited = 0;
  const rows: YearRow[] = [];

  for (let month = 1; month <= total * 12; month++) {
    const r = routeDeposit(track, startAge, month);
    for (const [a, share] of Object.entries(r.split) as [AssetId, number][]) {
      book[a] += monthlyDeposit * share;
    }
    deposited += monthlyDeposit;

    for (const a of ASSETS) book[a] *= 1 + rate[a];

    if (month % 12 === 0) {
      const value = ASSETS.reduce((s, a) => s + book[a], 0);
      rows.push({
        year: month / 12,
        age: startAge + month / 12,
        deposited,
        value,
        gain: value - deposited,
        byAsset: { ...book },
        volatile: value > 0 ? (book.BTC + book.SMH) / value : 0,
        shifted: r.shifted,
      });
    }
  }

  const last = rows[rows.length - 1];
  const finalValue = last?.value ?? 0;
  const income = (finalValue * WITHDRAW_RATE) / 12;
  // only the profit portion of each withdrawal is taxed
  const margin = finalValue > 0 ? Math.max(0, finalValue - deposited) / finalValue : 0;

  return {
    rows,
    shiftYear: m.depositYears,
    withdrawYear: total,
    withdrawAge: startAge + total,
    totalDeposited: deposited,
    finalValue,
    monthlyIncome: income,
    monthlyIncomeNet: income * (1 - margin * TAX_RATE),
  };
}

/** The target mix at a point in the plan, as a sorted list for display. */
export function mixAt(track: TrackId, startAge: number, years: number): Array<[AssetId, number]> {
  const a: Allocation = allocationFor(track, startAge, years);
  return (Object.entries(a) as Array<[AssetId, number]>)
    .filter(([, v]) => v > 0.0005)
    .sort((x, y) => y[1] - x[1]);
}

/** Every track, same client, for the side-by-side comparison. */
export function compareTracks(
  startAge: number, monthlyDeposit: number, scenario: Scenario, horizonYears?: number,
): Array<{ track: TrackId; projection: Projection }> {
  return (['alpha', 'shield', 'compound'] as TrackId[])
    .map(track => ({ track, projection: project(track, startAge, monthlyDeposit, scenario, horizonYears) }));
}

export { volatileShare };
