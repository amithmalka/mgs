/**
 * Investing for a child: the growth engine, from the child's age today until
 * they turn twenty.
 *
 * Nothing is ever sold on the way, so there is no tax event until the end. The
 * result is linear in the deposit, which is what lets the page solve in both
 * directions — a monthly amount into a result, or a target into the amount it
 * needs.
 */
import { SCENARIOS, TAX, WITHDRAW, btcRate, type ScenarioId } from '../constants/mgsScenarios';

export const HANDOVER_AGE = 20;

export interface KidYear {
  year: number;
  age: number;
  deposited: number;
  btc: number;
  synthetic: number;
  /** net of the tax owed on the gain so far */
  net: number;
}

export interface KidResult {
  childAge: number;
  years: number;
  rows: KidYear[];
  deposited: number;
  /** what the child receives at twenty, after tax */
  net: number;
  taxOwed: number;
  /** the 4% draw, monthly, net */
  monthly: number;
  multiple: number;
}

export function projectKid(
  scenario: ScenarioId,
  childAge: number,
  monthlyDeposit: number,
): KidResult {
  const years = Math.max(1, HANDOVER_AGE - childAge);
  const syn = SCENARIOS[scenario].rate.SYN;
  let bv = 0, bc = 0, sv = 0, sc = 0;
  const rows: KidYear[] = [];

  for (let m = 1; m <= years * 12; m++) {
    const y = m / 12;
    bv *= Math.pow(1 + btcRate(scenario, y), 1 / 12);
    sv *= Math.pow(1 + syn, 1 / 12);

    // the volatile half fades out at two points a year, by deposit only
    const share = Math.max(0, 0.5 - 0.02 * y);
    bv += monthlyDeposit * share; bc += monthlyDeposit * share;
    sv += monthlyDeposit * (1 - share); sc += monthlyDeposit * (1 - share);

    if (m % 12 === 0) {
      const val = bv + sv, basis = bc + sc;
      const owed = Math.max(0, val - basis) * TAX;
      rows.push({
        year: m / 12, age: childAge + m / 12, deposited: monthlyDeposit * m,
        btc: bv, synthetic: sv, net: val - owed,
      });
    }
  }

  const val = bv + sv, basis = bc + sc;
  const taxOwed = Math.max(0, val - basis) * TAX;
  const gainFrac = val ? Math.max(0, (val - basis) / val) : 0;
  const deposited = monthlyDeposit * years * 12;
  return {
    childAge, years, rows, deposited,
    net: val - taxOwed, taxOwed,
    monthly: ((val * WITHDRAW) / 12) * (1 - gainFrac * TAX),
    multiple: deposited ? (val - taxOwed) / deposited : 0,
  };
}

/** What a target at twenty costs per month, for a child of this age. */
export function depositFor(scenario: ScenarioId, childAge: number, target: number): number {
  const unit = projectKid(scenario, childAge, 1000).net;
  return unit > 0 ? (target / unit) * 1000 : 0;
}
