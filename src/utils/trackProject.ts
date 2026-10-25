/**
 * The two cash-flow tracks, projected month by month.
 *
 * A faithful port of the model behind the published pages, so the app and the
 * pages can never disagree. Every figure that leaves this file is NET: the tax
 * paid along the way on harvests and distributions, plus the tax still owed on
 * the gain sitting unrealised in the portfolio.
 */
import {
  SCENARIOS, CYCLE_YEARS, TAX, WITHDRAW, horizonFor, btcRate,
  type ScenarioId, type SleeveId,
} from '../constants/mgsScenarios';

/* This projection still routes a share of every deposit into JEPQ. The fund was
 * measured and rejected for the system itself — its audited 2025 report shows
 * 96.6% of the distribution came from capital — and the MGS and month pages no
 * longer use it. The home page and the onboarding still read this engine, so
 * the two figures it needs live here rather than in the shared constants, which
 * now describe only the sleeves the system actually buys. */
const JEPQ_YIELD = 0.09;
const JEPQ_TOTAL: Record<ScenarioId, number> = { pess: 0.075, real: 0.080 };
import { glideFor, glideHeld, glideInvert, mixForAgeIn, type GlideMode } from './monthPlan';

/** the most of a single deposit model 1 will route to JEPQ, reached at age 45 */
export const JEPQ_CAP = 0.50;

export type TrackModel = 1 | 2;

/** the age from which the growing side no longer has time to build an engine */
export const INCOME_AGE = 55;

/**
 * Which track an age should be on.
 *
 * Measured: at 60, model 2's JEPQ reaches only 22,577 and pays 140 a month —
 * ten years and two harvest cycles do not build an income engine. Model 1 pays
 * 1,051 at the same age, because it routes deposits there instead of waiting
 * for harvests. So from 55 the cash-flow track is the honest answer.
 */
export function recommendModel(age: number): TrackModel {
  return age >= INCOME_AGE ? 1 : 2;
}

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
  /** what each sleeve is worth at the end, gross — for composition and stress */
  final: Record<SleeveId, number>;
  finalJepq: number;
}

const SLEEVES: SleeveId[] = ['BTC', 'SMH', 'XLK', 'WORLD', 'SYN'];

interface Sleeve { v: number; c: number }

export function projectTrack(
  scenario: ScenarioId,
  model: TrackModel,
  startAge: number,
  monthlyDeposit = 4000,
  /** false keeps depositing by the age mix instead of landing in the world index */
  land = true,
  /** which glide the deposit mix follows */
  glide: GlideMode = 'continuous',
  /** for the 'held' glide: how many years stay at full weight */
  holdYears?: number,
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
    jepq.v *= Math.pow(1 + JEPQ_TOTAL[scenario], 1 / 12);

    // JEPQ pays out and the cash leaves the plan — it is never reinvested
    const pay = (jepq.v * JEPQ_YIELD) / 12;
    jepq.v -= pay;
    received += pay * (1 - TAX); yearReceived += pay * (1 - TAX);
    tax += pay * TAX; yearTax += pay * TAX;

    deposited += monthlyDeposit;
    const age = startAge + yrs;
    if (land && m > depositYears * 12) {
      g.WORLD.v += monthlyDeposit; g.WORLD.c += monthlyDeposit;
    } else {
      // Model 1 sends a growing share of every deposit straight to JEPQ — a
      // change of address for new money, never a sale, so it costs no tax. What
      // stays on the growing side follows the same age mix as model 2, with
      // technology as the complement in both tracks.
      // the held glide is measured from the plan's own start, the others from age
      const g0 = glide === 'held' ? glideHeld(yrs, holdYears)
        : glide === 'invert' ? glideInvert(yrs, startAge)
        : glideFor(glide)(age);
      const toJepq = model === 1 ? Math.min(JEPQ_CAP, g0) : 0;
      if (toJepq > 0) {
        jepq.v += monthlyDeposit * toJepq; jepq.c += monthlyDeposit * toJepq;
      }
      const left = monthlyDeposit * (1 - toJepq);
      const vol = 1 - g0, core = 1 - vol;
      const mix: Array<[SleeveId, number]> = glide === 'held' || glide === 'invert'
        ? [['BTC', vol / 2], ['SMH', vol / 2], ['XLK', core]]
        : Object.entries(mixForAgeIn(age, glide)) as Array<[SleeveId, number]>;
      for (const [k, w] of mix) { g[k].v += left * w; g[k].c += left * w; }
    }

    // the harvest fires once a cycle, not on every new high
    const keys: SleeveId[] = ['BTC', 'SMH', 'XLK'];
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
    final: Object.fromEntries(SLEEVES.map(k => [k, g[k].v])) as Record<SleeveId, number>,
    finalJepq: jepq.v,
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
