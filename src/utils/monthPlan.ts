/**
 * What to do this month: where every shekel of the deposit goes, and whether a
 * harvest has come due.
 *
 * This is the one calculation that cannot be done from a projection, because it
 * depends on what is actually held and on each sleeve's own history.
 */
import { horizonFor, type SleeveId } from '../constants/mgsScenarios';
import type { Lot } from '../store/planStore';

export const TAX = 0.25;
/** a sleeve this far below its own high is in the deepest buying tier */
export const DEEP = 0.50;
/** and this close to its high counts as being at it */
export const NEAR_HIGH = 0.02;

/**
 * The three buying tiers, applied to each sleeve's own portion of the month.
 *
 * A sleeve at its high is bought at a quarter weight, one that has fallen at a
 * half, and one more than 50% down at seven tenths — so a faller gets twice
 * what a riser gets and a crash gets 2.8 times.
 *
 * The multiplier scales the share the AGE asks for and the result is
 * renormalised, which is the whole point: taking 25/50/70 percent of the whole
 * deposit instead would hand the two volatile sleeves the entire month between
 * them, leave the core nothing, and erase the glide — measured, a 65-year-old
 * then ends up holding exactly the portfolio of a 20-year-old.
 */
/** above its own previous high a holding takes this share of the deposit,
 *  however far above it has gone */
export const UP_CAP = 0.10;
/** the withdrawal: 4% a year, taken a twelfth at a time */
export const WITHDRAW_RATE = 0.04;

export type Reason =
  /** at or above its own previous high — capped at UP_CAP of the deposit */
  | 'high'
  /** below its high — takes that fall, as a share of the deposit */
  | 'fallen'
  /** the deepest faller, which also takes everything left over */
  | 'deepest'
  /** past the deposit years, everything goes to the landing sleeve */
  | 'landing';

export interface Line {
  sleeve: SleeveId;
  /** shekels to put in this month */
  amount: number;
  reason: Reason;
  /** current value, in shekels */
  value: number;
  /** share of the portfolio now */
  share: number;
  /** share the age says it should be, before the tier multiplier */
  target: number;
  /** the share of the deposit the fall asked for, before the overflow */
  tier: number;
  /** how far below its own high, 0..1 */
  fromHigh: number;
}

export interface WithdrawLine {
  sleeve: SleeveId;
  /** shekels taken out of this sleeve */
  gross: number;
  tax: number;
  /** what reaches the account */
  net: number;
  /** its own average purchase price, which the price had to clear */
  avg: number;
}

export interface MonthPlan {
  month: number;
  age: number;
  phase: 'accumulate' | 'landing' | 'withdraw';
  lines: Line[];
  /** which sleeves this month's withdrawal came out of, and what tax that was */
  withdrawals: WithdrawLine[];
  total: number;
  portfolio: number;
  /** what reaches the account this month, after tax */
  income: number;
  /** set when the rule found nothing priced above its own average cost */
  allBelowAverage: boolean;
}

/** the age the glide is measured from: a 20-year-old is all volatile */
export const BASE_AGE = 20;
/** the glide runs at one point a year up to this age, two points after it */
export const GLIDE_BREAK = 35;
export const GLIDE_EARLY = 0.01;
export const GLIDE_LATE = 0.02;

/**
 * How much of the volatile half has moved to the complements by this age.
 *
 * One point a year while the horizon is long, two points a year once it is
 * not: the slow half is where the extra return sits, and the fast half is
 * where the risk has to come down.
 */
export function glideAt(age: number): number {
  const a = Math.max(BASE_AGE, age);
  const early = Math.min(a, GLIDE_BREAK) - BASE_AGE;
  const late = Math.max(0, a - GLIDE_BREAK);
  return Math.min(1, early * GLIDE_EARLY + late * GLIDE_LATE);
}

/** the stepped alternative: the volatile share loses this much at each step */
export const STEP_CUT = 0.05;
export const STEP_EVERY = 5;

/**
 * The same glide taken in steps instead of continuously: every five years of
 * life the volatile share loses five per cent of itself, which is a cut that
 * never reaches zero — bitcoin stays in the portfolio for good.
 */
export function glideStepped(age: number): number {
  const steps = Math.floor(Math.max(0, age - BASE_AGE) / STEP_EVERY);
  return Math.min(1, 1 - Math.pow(1 - STEP_CUT, steps));
}

/**
 * the 'hold' glide: nothing moves for ten years, and then each of the two
 * volatile sleeves loses three points a year — six points of the volatile half
 * together — all of it by redirecting new deposits, never by selling
 */
export const HOLD_YEARS = 10;
export const HOLD_RATE = 0.03;

/**
 * Ten years at full weight, and only then the glide — five points of the
 * volatile half a year, measured from the day the plan opened rather than from
 * the age. Bitcoin and semiconductors keep their whole share through the first
 * decade, which is where the compounding they are there for actually happens.
 */
export function glideHeld(yearsIn: number, hold = HOLD_YEARS, rate = HOLD_RATE): number {
  // each sleeve starts at half the portfolio and loses `rate` a year, so the
  // volatile half loses twice that
  const each = Math.max(0, 0.5 - Math.max(0, yearsIn - hold) * rate);
  return 1 - 2 * each;
}

/**
 * The inversion: every age opens at the full volatile weight and the mix turns
 * over during the plan, at a rate the entry cohort sets. The older the entrant,
 * the faster the turn — a sixty-year-old inverts inside three and a half years,
 * a twenty-year-old takes the whole twenty-five.
 */
export const INVERT_RATE: Array<[number, number]> = [
  [30, 0.02], [40, 0.04], [50, 0.08], [60, 0.16], [200, 0.30],
];
export function invertRate(startAge: number): number {
  for (const [to, r] of INVERT_RATE) if (startAge < to) return r;
  return 0.30;
}
/** how much of the volatile half has turned over by this year of the plan */
export function glideInvert(yearsIn: number, startAge: number): number {
  return Math.min(1, Math.max(0, yearsIn * invertRate(startAge)));
}

/**
 * The steep glide, stated per component: each of bitcoin and semiconductors
 * loses one point a year up to 35 and three points a year after it. Each sleeve
 * is half the volatile part, so the volatile part itself loses twice that.
 */
export const STEEP_EARLY = 0.02;
export const STEEP_LATE = 0.06;
export function glideSteep(age: number): number {
  const a = Math.max(BASE_AGE, age);
  const early = Math.min(a, GLIDE_BREAK) - BASE_AGE;
  const late = Math.max(0, a - GLIDE_BREAK);
  return Math.min(1, early * STEEP_EARLY + late * STEEP_LATE);
}

export type GlideMode = 'continuous' | 'stepped' | 'held' | 'invert' | 'steep';
export const glideFor = (mode: GlideMode) =>
  mode === 'stepped' ? glideStepped : mode === 'steep' ? glideSteep : glideAt;

/** The mix an age calls for under either glide. */
export function mixForAgeIn(age: number, mode: GlideMode): Partial<Record<SleeveId, number>> {
  const vol = 1 - glideFor(mode)(age);
  const core = 1 - vol;
  return { BTC: vol / 2, SMH: vol / 2, XLK: core };
}

/**
 * The mix an age calls for — and the point is that it depends on the age
 * itself, not on how long this person has been depositing.
 *
 * Someone joining at 60 does not start where a 20-year-old starts. He starts
 * where the 20-year-old arrived after forty years of gliding: the volatile
 * half has already come down to 20%, and bitcoin with it to 10%. Two people of
 * the same age hold the same mix, whichever of them joined first.
 */
/**
 * The world index is not part of the accumulating mix at any age.
 *
 * It is the asset the plan lands in: for the final years before the first
 * withdrawal every deposit goes to it and nothing else, which is a change of
 * address for new money and never a sale. Until that point the mix is the four
 * sleeves alone.
 */
export function mixForAge(age: number): Partial<Record<SleeveId, number>> {
  const vol = 1 - glideAt(age);
  const core = 1 - vol;
  return { BTC: vol / 2, SMH: vol / 2, XLK: core };
}

/** The mix the age calls for, in this plan month. */
export function targetMix(startAge: number, month: number): Partial<Record<SleeveId, number>> {
  const years = (month - 1) / 12;
  const [depositYears] = horizonFor(startAge);
  if (years >= depositYears) return { WORLD: 1 };
  return mixForAge(startAge + years);
}

export function buildMonth(
  startAge: number,
  month: number,
  deposit: number,
  lots: Record<SleeveId, Lot>,
  /** value of one unit, in shekels */
  price: Partial<Record<SleeveId, number>>,
): MonthPlan {
  const years = (month - 1) / 12;
  const [depositYears, shiftYears] = horizonFor(startAge);
  const phase = years >= depositYears + shiftYears ? 'withdraw'
    : years >= depositYears ? 'landing' : 'accumulate';

  const mix = targetMix(startAge, month);
  const keys = Object.keys(mix) as SleeveId[];
  const value = (k: SleeveId) => (lots[k]?.units ?? 0) * (price[k] ?? 0);
  const portfolio = (Object.keys(lots) as SleeveId[]).reduce((s, k) => s + value(k), 0);

  // how far each sleeve has fallen from its own high
  const fromHigh = (k: SleeveId) => {
    const p = price[k], ath = lots[k]?.ath ?? 0;
    return p && ath > 0 ? Math.max(0, 1 - p / ath) : 0;
  };

  // The rule, as it runs on the day the deposit lands.
  //
  // A holding at or above its own previous high takes 10% of the deposit,
  // however far above it has gone. A holding below its high takes the fall
  // itself: down 30% takes 30% of the deposit. If those shares come to less
  // than the whole deposit, every shekel left over goes to whichever holding
  // fell the furthest — and that one line is the strongest parameter in the
  // system: sending the remainder to the deepest faller rather than splitting
  // it evenly measured 5.7 million apart over the tested history. If the
  // shares come to more than the deposit, they are scaled back in proportion
  // and there is nothing left over.
  //
  // Nothing here reads a target weight or a share of the portfolio. The mix is
  // an outcome of where the falls were, not an allocation anyone chose.
  const amounts: Partial<Record<SleeveId, number>> = {};
  const reasons: Partial<Record<SleeveId, Reason>> = {};
  const share: Partial<Record<SleeveId, number>> = {};

  if (phase !== 'accumulate') {
    // past the deposit years the age mix lands it, and the rule steps aside
    for (const k of keys) {
      reasons[k] = 'landing';
      amounts[k] = deposit * (mix[k] ?? 0);
    }
  } else {
    let asked = 0, deepest: SleeveId = keys[0], worst = -1;
    for (const k of keys) {
      const d = fromHigh(k);
      share[k] = d > 0 ? d : UP_CAP;
      reasons[k] = d > 0 ? 'fallen' : 'high';
      asked += share[k] ?? 0;
      if (d > worst) { worst = d; deepest = k; }
    }
    if (asked >= 1 || worst <= 0) {
      // Two cases scale back in proportion instead of leaving a remainder.
      // More was asked for than there is — or nothing is below its peak at
      // all, and then there is no deepest faller to hand the rest to. Sending
      // it to whichever holding happens to be first in the list would put most
      // of the deposit somewhere nobody chose, so when every holding is at its
      // high the deposit splits evenly between them.
      for (const k of keys) amounts[k] = deposit * ((share[k] ?? 0) / asked);
    } else {
      for (const k of keys) amounts[k] = deposit * (share[k] ?? 0);
      amounts[deepest] = (amounts[deepest] ?? 0) + deposit * (1 - asked);
      reasons[deepest] = 'deepest';
    }
  }

  const lines: Line[] = keys.map(k => {
    const r = reasons[k] ?? 'high';
    return {
      sleeve: k,
      amount: amounts[k] ?? 0,
      reason: r,
      value: value(k),
      share: portfolio > 0 ? value(k) / portfolio : 0,
      target: mix[k] ?? 0,
      /** the share of the deposit the rule asked for, before any overflow */
      tier: share[k] ?? 0,
      fromHigh: fromHigh(k),
    };
  });

  // The withdrawal, once the plan is in its withdrawal phase: 4% a year taken
  // a twelfth at a time, and only out of a sleeve priced above its own average
  // purchase price. When all of them sit below it, nothing is sold — that is
  // what keeps the plan from realising a loss to pay an income.
  const withdrawals: WithdrawLine[] = [];
  let income = 0, allBelowAverage = false;
  if (phase === 'withdraw' && portfolio > 0) {
    const gross = (portfolio * WITHDRAW_RATE) / 12;
    const eligible = (Object.keys(lots) as SleeveId[]).filter(k => {
      const lot = lots[k], p = price[k];
      if (!lot || !p || lot.units <= 0) return false;
      return p > lot.cost / lot.units;
    });
    if (!eligible.length) allBelowAverage = true;
    else {
      const pool = eligible.reduce((sum, k) => sum + value(k), 0);
      for (const k of eligible) {
        const lot = lots[k]!;
        const take = gross * (value(k) / pool);
        const share = Math.min(1, take / value(k));
        // tax on the gain inside the slice being sold, not on the whole slice
        const gain = Math.max(0, take - lot.cost * share);
        const tax = gain * TAX;
        withdrawals.push({ sleeve: k, gross: take, tax, net: take - tax, avg: lot.cost / lot.units });
        income += take - tax;
      }
    }
  }

  return {
    month, age: startAge + Math.floor(years), phase, lines, withdrawals,
    total: lines.reduce((s, l) => s + l.amount, 0), portfolio,
    income, allBelowAverage,
  };
}

export function applyMonth(
  lots: Record<SleeveId, Lot>,
  plan: MonthPlan,
  price: Partial<Record<SleeveId, number>>,
): Record<SleeveId, Lot> {
  const next: Record<SleeveId, Lot> = { ...lots };
  for (const k of Object.keys(lots) as SleeveId[]) next[k] = { ...lots[k] };

  // the withdrawal takes units out of the sleeves it came from
  for (const w of plan.withdrawals) {
    const lot = next[w.sleeve], p = price[w.sleeve];
    if (!lot || !p || lot.units <= 0) continue;
    const frac = Math.min(1, w.gross / (lot.units * p));
    lot.units *= 1 - frac;
    lot.cost *= 1 - frac;
  }
  for (const l of plan.lines) {
    if (l.amount <= 0) continue;
    const p = price[l.sleeve];
    if (!p) continue;
    next[l.sleeve].units += l.amount / p;
    next[l.sleeve].cost += l.amount;
  }
  // The high only ever rises. It is what the deposit is routed from — a sleeve
  // is measured by how far it sits below the best price it ever reached — so
  // letting it drift down with the price would erase the fall the rule reads.
  for (const k of Object.keys(next) as SleeveId[]) {
    const p = price[k];
    if (p && p > (next[k].ath ?? 0)) next[k].ath = p;
  }
  return next;
}
