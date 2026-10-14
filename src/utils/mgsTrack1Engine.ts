/**
 * Track 1, run month by month from the day the client joins to the day they draw.
 *
 * The projection grows every asset at its own assumed rate, routes each deposit
 * through the track's rules, and lets the harvest move money from the growth
 * side into JEPQ. JEPQ then compounds on its own and is never sold — by the end
 * it is what pays the monthly income.
 *
 * One thing the spec left open and this resolves: on a smoothly rising path
 * every single month is a new all-time high, so a harvest rule written as "at
 * new highs" would fire every month and trim the portfolio to nothing. It fires
 * here once per measured all-time-high CYCLE — 2.4 years for bitcoin, 6.3 for
 * semiconductors, 8.2 for technology — which is how often those cycles have
 * actually come round.
 */

import {
  horizonFor, targetMix, routeDeposit, harvest, volatileShare,
  ATH_CYCLE_YEARS, OPTION_NET_YIELD, OPTIONABLE, T1_ASSETS, VOLATILE, type T1Asset,
} from '../constants/mgsTrack1';
import { T1_RETURNS, type Scenario } from '../constants/mgsTrack1Returns';

/**
 * JEPQ's own distributions: reinvested, or taken as cash.
 *
 * 'reinvest' buys more JEPQ with every payment, after tax. 'cash' leaves them
 * out of the portfolio entirely, which is what someone already living off the
 * plan would do.
 */
export type IncomeMode = 'reinvest' | 'cash';
export const WITHDRAW_RATE = 0.04;
export const TAX_RATE = 0.25;

interface Position { value: number; cost: number }

export interface T1YearRow {
  year: number;
  age: number;
  deposited: number;
  value: number;
  gain: number;
  byAsset: Record<T1Asset, number>;
  /** share of the portfolio still in BTC + SMH */
  volatile: number;
  /** what JEPQ is worth, and what it pays this year */
  jepq: number;
  jepqIncome: number;
  /** cash JEPQ actually handed over during this year, after tax */
  jepqCash: number;
  /** harvested into JEPQ during this year, after tax */
  harvested: number;
  /** option premium added to JEPQ during this year, after tax */
  premium: number;
  /** tax paid on harvests during this year */
  taxPaid: number;
  shifted: boolean;
}

export interface T1Projection {
  rows: T1YearRow[];
  horizon: ReturnType<typeof horizonFor>;
  withdrawAge: number;
  totalDeposited: number;
  finalValue: number;
  /** everything the harvests sent to JEPQ, after tax, over the whole plan */
  totalHarvested: number;
  totalTax: number;
  finalJepq: number;
  /** 4% of the whole portfolio a year, paid monthly, net of tax on the gain */
  monthlyIncomeNet: number;
  /** what JEPQ alone pays each month at its own distribution rate */
  monthlyFromJepq: number;
  /** every JEPQ distribution over the plan, after tax */
  jepqPaidTotal: number;
  /** every option premium that reached JEPQ, after tax */
  premiumTotal: number;
  /**
   * The 4% rule applies to the growth side only — JEPQ already pays its own
   * cash and drawing 4% of it on top would be spending the same money twice.
   */
  monthlyFromGrowth: number;
  /** what the client actually receives: the growth draw plus JEPQ's own payment */
  monthlyTotal: number;
}

/**
 * JEPQ's cash distribution, as a share of its value per year.
 *
 * It is paid out, not reinvested: this is the money the client lives on from
 * the first month. That is the point of the sleeve, so 'cash' is the default
 * mode and JEPQ's own value stays roughly flat rather than compounding.
 */
export const JEPQ_YIELD = 0.09;

export function projectTrack1(
  startAge: number,
  monthlyDeposit: number,
  scenario: Scenario,
  horizonYears?: number,
  incomeMode: IncomeMode = 'cash',
  harvestOn = true,
  optionsOn = true,
  /** annual %, per asset — overrides the scenario when given */
  rateOverride?: Partial<Record<T1Asset, number>>,
  /**
   * Year the harvest is allowed to start.
   *
   * Every harvest is a tax event, and a shekel given to the tax office in year
   * five does not compound for the twenty years after it. Holding the harvest
   * back until the conversion phase is the single largest improvement measured
   * on this track.
   */
  harvestFromYear = 0,
  /** share of every deposit sent to a broad index, as the fourth leg */
  indexShare = 0,
): T1Projection {
  const h = horizonFor(startAge);
  const total = horizonYears ?? h.totalYears;
  const rate = Object.fromEntries(
    T1_ASSETS.map(a => {
      const annual = rateOverride?.[a] ?? T1_RETURNS[a].pct[scenario];
      return [a, Math.pow(1 + annual / 100, 1 / 12) - 1];
    }),
  ) as Record<T1Asset, number>;

  const book = Object.fromEntries(
    T1_ASSETS.map(a => [a, { value: 0, cost: 0 }]),
  ) as Record<T1Asset, Position>;

  // On a smooth path an asset never falls, so it would never re-arm. The
  // projection therefore fires a harvest at each asset's own measured cycle
  // length — 2.4 years for bitcoin, 6.3 for semiconductors, 8.2 for technology.
  const lastHarvest: Partial<Record<T1Asset, number>> = {};
  let deposited = 0, totalHarvested = 0, totalTax = 0, jepqPaidTotal = 0, premiumTotal = 0;
  let yearJepqCash = 0;
  const rows: T1YearRow[] = [];
  let yearHarvested = 0, yearTax = 0, yearPremium = 0;

  for (let month = 1; month <= total * 12; month++) {
    const age = startAge + Math.floor((month - 1) / 12);

    // ── the deposit, aimed by the track's rules ──────────────────────────────
    const state = Object.fromEntries(
      T1_ASSETS.map(a => [a, { value: book[a].value, drawdown: 0 }]),
    ) as Record<T1Asset, { value: number; drawdown: number }>;
    const r = routeDeposit(monthlyDeposit, age, month, startAge, state, indexShare);
    for (const [a, amt] of Object.entries(r.split) as [T1Asset, number][]) {
      book[a].value += amt;
      book[a].cost += amt;
    }
    deposited += monthlyDeposit;

    // ── growth ──────────────────────────────────────────────────────────────
    for (const a of T1_ASSETS) book[a].value *= 1 + rate[a];

    // ── JEPQ pays out, and the cash leaves the plan ─────────────────────────
    const paid = (book.JEPQ.value * JEPQ_YIELD) / 12;
    const net = paid * (1 - TAX_RATE);
    jepqPaidTotal += net;
    yearJepqCash += net;
    if (incomeMode === 'reinvest') {
      book.JEPQ.cost += net;          // value is unchanged: the payment is already in it
    } else {
      book.JEPQ.value -= paid;        // the client spends it; it never compounds
    }

    // ── option premiums: collected on the growth side, spent on JEPQ ────────
    if (optionsOn && month > harvestFromYear * 12) {
      let prem = 0;
      for (const a of OPTIONABLE) prem += (book[a].value * OPTION_NET_YIELD[a]) / 12;
      const premNet = prem * (1 - TAX_RATE);
      if (premNet > 0) {
        book.JEPQ.value += premNet;
        book.JEPQ.cost += premNet;
        premiumTotal += premNet;
        yearPremium += premNet;
        totalTax += prem - premNet;
        yearTax += prem - premNet;
      }
    }

    // ── the harvest: a quarter of the gain, once per cycle ──────────────────
    const canHarvest = harvestOn && month > harvestFromYear * 12;
    for (const a of (canHarvest ? [...VOLATILE, 'SPMO', 'XLK'] as T1Asset[] : [])) {
      const cycle = ATH_CYCLE_YEARS[a] * 12;
      const since = month - (lastHarvest[a] ?? 0);
      if (since < cycle || book[a].value <= book[a].cost) continue;
      const res = harvest(book[a].value, book[a].cost, TAX_RATE);
      if (res.sell <= 0) continue;
      const frac = res.sell / book[a].value;
      book[a].value -= res.sell;
      book[a].cost -= book[a].cost * frac;
      book.JEPQ.value += res.toJepq;
      book.JEPQ.cost += res.toJepq;
      lastHarvest[a] = month;
      totalHarvested += res.toJepq;
      totalTax += res.tax;
      yearHarvested += res.toJepq;
      yearTax += res.tax;
    }

    if (month % 12 === 0) {
      const value = T1_ASSETS.reduce((s, a) => s + book[a].value, 0);
      rows.push({
        year: month / 12,
        age: startAge + month / 12,
        deposited,
        value,
        gain: value - deposited,
        byAsset: Object.fromEntries(
          T1_ASSETS.map(a => [a, book[a].value]),
        ) as Record<T1Asset, number>,
        volatile: value > 0 ? (book.BTC.value + book.SMH.value) / value : 0,
        jepq: book.JEPQ.value,
        jepqIncome: (book.JEPQ.value * JEPQ_YIELD) / 12,
        jepqCash: yearJepqCash,
        harvested: yearHarvested,
        premium: yearPremium,
        taxPaid: yearTax,
        shifted: r.shifted,
      });
      yearHarvested = 0;
      yearTax = 0;
      yearPremium = 0;
      yearJepqCash = 0;
    }
  }

  const finalValue = rows.length ? rows[rows.length - 1].value : 0;
  const finalJepq = rows.length ? rows[rows.length - 1].jepq : 0;
  const growth = Math.max(0, finalValue - finalJepq);
  const margin = finalValue > 0 ? Math.max(0, finalValue - deposited) / finalValue : 0;
  const fromGrowth = ((growth * WITHDRAW_RATE) / 12) * (1 - margin * TAX_RATE);
  const fromJepq = ((finalJepq * JEPQ_YIELD) / 12) * (1 - TAX_RATE);

  return {
    rows,
    horizon: h,
    withdrawAge: startAge + total,
    totalDeposited: deposited,
    finalValue,
    totalHarvested,
    totalTax,
    finalJepq,
    monthlyIncomeNet: fromGrowth + fromJepq,
    monthlyFromJepq: fromJepq,
    monthlyFromGrowth: fromGrowth,
    monthlyTotal: fromGrowth + fromJepq,
    jepqPaidTotal,
    premiumTotal,
  };
}

export { targetMix, volatileShare, horizonFor };
