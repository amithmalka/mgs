/**
 * What to do this month: where every shekel of the deposit goes, and whether a
 * harvest has come due.
 *
 * This is the one calculation that cannot be done from a projection, because it
 * depends on what is actually held and on each sleeve's own history.
 */
import { horizonFor, type SleeveId } from '../constants/mgsScenarios';
import type { Lot, Jepq } from '../store/planStore';

export const TAX = 0.25;
/** how far a sleeve must fall from its high before the next harvest arms */
export const RESET: Partial<Record<SleeveId, number>> =
  { BTC: 0.50, SMH: 0.30, SPMO: 0.30, XLK: 0.30 };
/** a new high must clear the old one by this much before it counts */
export const BREAKOUT = 0.10;
/** a sleeve this far below its own high takes most of the month's money */
export const DEEP = 0.50;
export const DEEP_SHARE = 0.70;
/** what JEPQ hands over a year, as a share of its value */
export const JEPQ_YIELD = 0.09;

export type Reason =
  | 'onTarget' | 'over' | 'under' | 'deep' | 'landing';

export interface Line {
  sleeve: SleeveId;
  /** shekels to put in this month */
  amount: number;
  reason: Reason;
  /** current value, in shekels */
  value: number;
  /** share of the portfolio now */
  share: number;
  /** share the age says it should be */
  target: number;
  /** how far below its own high, 0..1 */
  fromHigh: number;
}

export interface HarvestLine {
  sleeve: SleeveId;
  /** shekels of gain being realised */
  gross: number;
  tax: number;
  /** what reaches JEPQ */
  net: number;
  /** the old high it had to clear */
  bar: number;
}

export interface MonthPlan {
  month: number;
  age: number;
  phase: 'accumulate' | 'landing' | 'withdraw';
  lines: Line[];
  harvests: HarvestLine[];
  total: number;
  portfolio: number;
  /** JEPQ's value right now, in shekels */
  jepqValue: number;
  /** what it hands over this month, after tax */
  income: number;
}

/** how much of the volatile half moves to the complements each year of life */
export const GLIDE = 0.02;
/** the age the glide is measured from: a 20-year-old is all volatile */
export const BASE_AGE = 20;

/**
 * The mix an age calls for — and the point is that it depends on the age
 * itself, not on how long this person has been depositing.
 *
 * Someone joining at 60 does not start where a 20-year-old starts. He starts
 * where the 20-year-old arrived after forty years of gliding: the volatile
 * half has already come down to 20%, and bitcoin with it to 10%. Two people of
 * the same age hold the same mix, whichever of them joined first.
 */
export function mixForAge(age: number): Partial<Record<SleeveId, number>> {
  const vol = Math.min(1, Math.max(0, 1 - GLIDE * (age - BASE_AGE)));
  const core = 1 - vol;
  return { BTC: vol / 2, SMH: vol / 2, SPMO: core / 2, XLK: core / 2 };
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
  jepq: Jepq = { units: 0, cost: 0, received: 0 },
  jepqPrice = 0,
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

  // a sleeve far enough below its high takes most of the month off the top
  const deep = keys.filter(k => fromHigh(k) > DEEP);
  let left = deposit;
  const amounts: Partial<Record<SleeveId, number>> = {};
  const reasons: Partial<Record<SleeveId, Reason>> = {};

  if (deep.length) {
    const pot = deposit * DEEP_SHARE;
    const depth = deep.reduce((s, k) => s + fromHigh(k), 0);
    for (const k of deep) { amounts[k] = pot * (fromHigh(k) / depth); reasons[k] = 'deep'; }
    left -= pot;
  }

  for (const k of keys) {
    const share = portfolio > 0 ? value(k) / portfolio : 0;
    const want = mix[k] ?? 0;
    const base = left * want;
    if (reasons[k] === 'deep') continue;
    if (phase !== 'accumulate') { amounts[k] = (amounts[k] ?? 0) + base; reasons[k] = 'landing'; continue; }
    if (portfolio > 0 && share > want * 1.02) {
      // over its target: half the portion, the other half to the core sleeves
      amounts[k] = (amounts[k] ?? 0) + base / 2;
      reasons[k] = 'over';
      const core = (['SPMO', 'XLK'] as SleeveId[]).filter(c => keys.includes(c) && c !== k);
      for (const c of core) amounts[c] = (amounts[c] ?? 0) + base / 2 / core.length;
    } else {
      amounts[k] = (amounts[k] ?? 0) + base;
      reasons[k] = portfolio > 0 && share < want * 0.98 ? 'under' : 'onTarget';
    }
  }

  const lines: Line[] = keys.map(k => ({
    sleeve: k,
    amount: amounts[k] ?? 0,
    reason: reasons[k] ?? 'onTarget',
    value: value(k),
    share: portfolio > 0 ? value(k) / portfolio : 0,
    target: mix[k] ?? 0,
    fromHigh: fromHigh(k),
  }));

  // a harvest fires only on a real high: armed by a fall, then clearing the old
  // high by the breakout margin
  const harvests: HarvestLine[] = [];
  for (const k of keys) {
    const lot = lots[k]; const p = price[k];
    const reset = RESET[k];
    if (!lot || !p || !reset || lot.units <= 0 || !lot.armed) continue;
    const bar = lot.ath * (1 + BREAKOUT);
    if (p < bar) continue;
    const val = lot.units * p;
    const gain = val - lot.cost;
    if (gain <= 0) continue;
    const gross = 0.25 * gain;
    const tax = gross * TAX;
    harvests.push({ sleeve: k, gross, tax, net: gross - tax, bar });
  }

  const jepqValue = jepq.units * jepqPrice;
  return {
    month, age: startAge + Math.floor(years), phase, lines, harvests,
    total: lines.reduce((s, l) => s + l.amount, 0), portfolio,
    jepqValue,
    income: ((jepqValue * JEPQ_YIELD) / 12) * (1 - TAX),
  };
}

/** Roll the held lots forward for a month that was actually executed. */
export function applyMonth(
  lots: Record<SleeveId, Lot>,
  plan: MonthPlan,
  price: Partial<Record<SleeveId, number>>,
  jepq: Jepq = { units: 0, cost: 0, received: 0 },
  jepqPrice = 0,
): { lots: Record<SleeveId, Lot>; jepq: Jepq } {
  const next: Record<SleeveId, Lot> = { ...lots };
  for (const k of Object.keys(lots) as SleeveId[]) next[k] = { ...lots[k] };

  for (const h of plan.harvests) {
    const lot = next[h.sleeve], p = price[h.sleeve]!;
    const frac = h.gross / (lot.units * p);
    lot.units *= 1 - frac;
    lot.cost *= 1 - frac;
    lot.armed = false;
    lot.lastHarvest = plan.month;
  }

  // the harvest buys JEPQ, and JEPQ's own distribution leaves the plan as cash
  const nextJepq: Jepq = { ...jepq };
  const harvested = plan.harvests.reduce((s, h) => s + h.net, 0);
  if (harvested > 0 && jepqPrice > 0) {
    nextJepq.units += harvested / jepqPrice;
    nextJepq.cost += harvested;
  }
  nextJepq.received += plan.income;
  for (const l of plan.lines) {
    if (l.amount <= 0) continue;
    const p = price[l.sleeve];
    if (!p) continue;
    next[l.sleeve].units += l.amount / p;
    next[l.sleeve].cost += l.amount;
  }
  // The bar freezes the moment a sleeve arms. Her rule is that bitcoin, having
  // reached 128k and fallen to 60k, is harvested when it passes 128k by 10% —
  // so the high it must clear is the one that stood *before* the fall, and it
  // must not creep upward with the recovery. Let it creep and the price can
  // never get 10% ahead of it, and the harvest never fires at all.
  for (const k of Object.keys(next) as SleeveId[]) {
    const p = price[k]; if (!p) continue;
    const reset = RESET[k];
    if (!next[k].armed && p > next[k].ath) next[k].ath = p;
    if (reset && next[k].ath > 0 && p < next[k].ath * (1 - reset)) next[k].armed = true;
  }
  return { lots: next, jepq: nextJepq };
}
