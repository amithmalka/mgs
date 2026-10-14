/**
 * The two cash-flow tracks, projected month by month.
 *
 * A faithful port of the model behind the published pages, so the app and the
 * pages can never disagree. Every figure that leaves this file is NET: the tax
 * paid along the way on harvests and distributions, plus the tax still owed on
 * the gain sitting unrealised in the portfolio.
 */
import {
  SCENARIOS, CYCLE_YEARS, TAX, WITHDRAW, JEPQ_YIELD, horizonFor, btcRate,
  type ScenarioId, type SleeveId,
} from '../constants/mgsScenarios';

export type TrackModel = 1 | 2;

export interface TrackYear {
  year: number;
  age: number;
  deposited: number;
  /** the growing side, net of the tax owed on it */
  grow: number;
  /** JEPQ, net of the same */
  jepq: number;
  /** what JEPQ hands over this month, after tax */
  monthlyJepq: number;
  /** every distribution received so far, after tax */
  received: number;
  harvested: number;
  taxThisYear: number;
  /** portfolio net + everything already received */
  total: number;
}

export interface TrackResult {
  age: number;
  model: TrackModel;
  years: number;
  depositYears: number;
  rows: TrackYear[];
  deposited: number;
  /** the growing side at the end, net */
  equity: number;
  jepq: number;
  received: number;
  total: number;
  /** everything paid plus everything still owed */
  tax: number;
  monthlyFromGrowth: number;
  monthlyFromJepq: number;
  monthly: number;
  multiple: number;
}

const SLEEVES: SleeveId[] = ['BTC', 'SMH', 'SPMO', 'XLK', 'WORLD', 'SYN'];

interface Sleeve { v: number; c: number }

export function projectTrack(
  scenario: ScenarioId,
  model: TrackModel,
  startAge: number,
  monthlyDeposit = 4000,
): TrackResult {
  const S = SCENARIOS[scenario];
  const [depositYears, shiftYears] = horizonFor(startAge);
  const years = depositYears + shiftYears;

  const g: Record<SleeveId, Sleeve> =
    Object.fromEntries(SLEEVES.map(k => [k, { v: 0, c: 0 }])) as Record<SleeveId, Sleeve>;
  const jepq: Sleeve = { v: 0, c: 0 };
  const lastHarvest: Record<string, number> = {};

  let tax = 0, deposited = 0, received = 0;
  let yearReceived = 0, yearTax = 0, yearHarvested = 0;
  const rows: TrackYear[] = [];

  for (let m = 1; m <= years * 12; m++) {
    const yrs = m / 12;

    for (const k of SLEEVES) {
      const r = k === 'BTC' ? btcRate(scenario, yrs) : S.rate[k];
      g[k].v *= Math.pow(1 + r, 1 / 12);
    }
    jepq.v *= Math.pow(1 + S.jepqTotal, 1 / 12);

    // JEPQ pays out and the cash leaves the plan — it is never reinvested
    const pay = (jepq.v * JEPQ_YIELD) / 12;
    jepq.v -= pay;
    received += pay * (1 - TAX); yearReceived += pay * (1 - TAX);
    tax += pay * TAX; yearTax += pay * TAX;

    deposited += monthlyDeposit;
    if (model === 1) {
      // one point of each volatile sleeve a year is redirected to JEPQ; this is
      // a change of address for new money, never a sale, so it costs no tax
      const sh = Math.min(1, 0.02 * Math.floor(yrs));
      for (const k of ['BTC', 'SMH'] as SleeveId[]) {
        const amt = (monthlyDeposit * (1 - sh)) / 2;
        g[k].v += amt; g[k].c += amt;
      }
      jepq.v += monthlyDeposit * sh; jepq.c += monthlyDeposit * sh;
    } else if (m > depositYears * 12) {
      g.WORLD.v += monthlyDeposit; g.WORLD.c += monthlyDeposit;
    } else {
      const vol = Math.max(0, 1 - 0.02 * yrs), core = 1 - vol;
      const mix: Array<[SleeveId, number]> =
        [['BTC', vol / 2], ['SMH', vol / 2], ['SPMO', core / 2], ['XLK', core / 2]];
      for (const [k, w] of mix) { g[k].v += monthlyDeposit * w; g[k].c += monthlyDeposit * w; }
    }

    // the harvest fires once a cycle, not on every new high
    const keys: SleeveId[] = model === 1 ? ['BTC', 'SMH'] : ['BTC', 'SMH', 'SPMO', 'XLK'];
    for (const k of keys) {
      const since = m - (lastHarvest[k] ?? 0);
      if (since < CYCLE_YEARS[k] * 12 || g[k].v <= g[k].c) continue;
      const cut = model === 1 ? 0.25 * g[k].v : 0.25 * (g[k].v - g[k].c);
      const frac = cut / g[k].v;
      const t = Math.max(0, cut - g[k].c * frac) * TAX;
      tax += t; yearTax += t;
      g[k].v -= cut; g[k].c *= 1 - frac;
      jepq.v += cut - t; jepq.c += cut - t;
      yearHarvested += cut - t;
      lastHarvest[k] = m;
    }

    if (m % 12 === 0) {
      const eq = SLEEVES.reduce((s, k) => s + g[k].v, 0);
      const basis = SLEEVES.reduce((s, k) => s + g[k].c, 0) + jepq.c;
      const gross = eq + jepq.v;
      const owed = Math.max(0, gross - basis) * TAX;
      const share = gross ? owed / gross : 0;
      rows.push({
        year: m / 12, age: startAge + m / 12, deposited,
        grow: eq * (1 - share), jepq: jepq.v * (1 - share),
        monthlyJepq: ((jepq.v * JEPQ_YIELD) / 12) * (1 - TAX),
        received, harvested: yearHarvested, taxThisYear: yearTax,
        total: gross * (1 - share) + received,
      });
      yearReceived = 0; yearTax = 0; yearHarvested = 0;
    }
  }

  const eq = SLEEVES.reduce((s, k) => s + g[k].v, 0);
  // two bases: the 4% draw is taxed on the growing side's own gain, while net
  // worth is taxed on everything still unrealised
  const growthBasis = SLEEVES.reduce((s, k) => s + g[k].c, 0);
  const basis = growthBasis + jepq.c;
  const gainFrac = eq ? Math.max(0, (eq - growthBasis) / eq) : 0;
  const monthlyFromGrowth = ((eq * WITHDRAW) / 12) * (1 - gainFrac * TAX);
  const monthlyFromJepq = ((jepq.v * JEPQ_YIELD) / 12) * (1 - TAX);
  const gross = eq + jepq.v;
  const taxIfSold = Math.max(0, gross - basis) * TAX;
  const share = gross ? taxIfSold / gross : 0;
  const total = gross * (1 - share) + received;

  return {
    age: startAge, model, years, depositYears, rows, deposited,
    equity: eq * (1 - share), jepq: jepq.v * (1 - share), received, total,
    tax: tax + taxIfSold,
    monthlyFromGrowth, monthlyFromJepq, monthly: monthlyFromGrowth + monthlyFromJepq,
    multiple: deposited ? total / deposited : 0,
  };
}

/** A plain allocation with the same deposits, taxed once at the end. */
export function projectPlain(annual: number, years: number, monthlyDeposit: number) {
  const r = Math.pow(1 + annual, 1 / 12) - 1;
  let v = 0;
  for (let m = 0; m < years * 12; m++) v = (v + monthlyDeposit) * (1 + r);
  const paid = monthlyDeposit * years * 12;
  const net = v - Math.max(0, v - paid) * TAX;
  return { total: net, monthly: (net * WITHDRAW) / 12 };
}
