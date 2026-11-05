import { MGS_ASSETS, allocationFor, milestonesFor } from '../constants/mgsTracks';
import type { MgsAsset } from '../constants/mgsTracks';

/**
 * MGS execution engine.
 *
 *   Allocation   The leveraged target is a function of the investor's current
 *                age: 50% at 20, −1pp a year, 30% from 40 on. The rest splits
 *                evenly between the two unleveraged synthetics.
 *   Rebalancing  Asymmetric, and by deposit only — nothing is ever sold to
 *                rebalance. Below target, the deposit buys the leveraged asset
 *                back toward target; at or above target, not one shekel of it
 *                may go to leverage.
 *   De-risk      At the shift milestone the whole portfolio and every later
 *                deposit move to MWRD.
 *   Withdrawal   4% of the portfolio measured once, at the withdrawal
 *                milestone, paid monthly and held flat from then on. Each
 *                payment is raised from the asset holding the largest absolute
 *                gain at that moment.
 */

const ASSETS = Object.keys(MGS_ASSETS) as MgsAsset[];

export interface Position { value: number; basis: number }
export type Book = Record<MgsAsset, Position>;
export type Phase = 'accumulate' | 'derisk' | 'withdraw';

export const emptyBook = (): Book =>
  Object.fromEntries(ASSETS.map(a => [a, { value: 0, basis: 0 }])) as Book;

const total = (b: Book) => ASSETS.reduce((s, a) => s + b[a].value, 0);
const totalBasis = (b: Book) => ASSETS.reduce((s, a) => s + b[a].basis, 0);

/** **הסטייה הגדולה ביותר ממשקל היעד, בנקודות אחוז.**
 *  החליפה את `leveragedWeight` כשהמינוף הוסר. אפס = התיק על היעד. */
export function driftFromTarget(book: Book, age: number): number {
  const t = total(book);
  if (t <= 0) return 0;
  const tgt = allocationFor(age);
  let worst = 0;
  for (const a of ASSETS) {
    const gap = Math.abs(book[a].value / t - (tgt[a] ?? 0));
    if (gap > worst) worst = gap;
  }
  return worst;
}

/** Age at a given plan month (1-based), given the age at the start. */
export const ageAtMonth = (startAge: number, month: number) =>
  startAge + Math.floor((month - 1) / 12);

/** Which phase a plan month (1-based) falls in, for a plan started at `startAge`. */
export function phaseOf(startAge: number, month: number): Phase {
  const { shiftYears, withdrawYears } = milestonesFor(startAge);
  if (month > withdrawYears * 12) return 'withdraw';
  if (month > shiftYears * 12) return 'derisk';
  return 'accumulate';
}

// ── Deposit routing ──────────────────────────────────────────────────────────

export interface DepositRouting {
  split: Partial<Record<MgsAsset, number>>;
  /** true when every asset was already at or above its target, so the deposit
   *  was split by the target weights themselves */
  onTarget: boolean;
  /** the largest deviation from target measured BEFORE this deposit, 0..1 */
  driftBefore: number;
  /** the target mix it was measured against */
  target: Partial<Record<MgsAsset, number>>;
}

/** **ניתוב ההפקדה החודשית — קנייה לעבר משקל היעד.**
 *
 *  **הוחלף 4.11.2026, עם הסרת המינוף.** המנגנון הקודם היה בינארי:
 *  מעל היעד — כל ההפקדה מתחלקת שווה בשווה בין שני הנכסים הלא
 *  ממונפים; מתחת ליעד — **כל ההפקדה** קונה את המוצר הממונף.
 *  זה היה מנגנון שלישי, שונה גם ממנגנון הקנייה של המסלולים
 *  (`monthPlan.ts`) וגם מזה של התמהיל האישי.
 *
 *  **מעתה: אותו מנגנון שבכל שאר המערכת.** ההפקדה מתחלקת לפי
 *  **הפער בין המשקל הנוכחי למשקל היעד** — מי שנפל מתחת ליעד מקבל
 *  יותר, מי שמעליו לא מקבל כלום, ואף רכיב אינו נדחף מעבר ליעד
 *  שלו על ידי הפקדה בודדת. כשכולם על היעד או מעליו, ההפקדה
 *  מתחלקת לפי משקלי היעד עצמם.
 *
 *  **ולמה זה עדיף על הבינארי.** נפילה *יוצרת* תת־משקל — ולכן
 *  קנייה לעבר היעד קונה יותר ממה שירד, בלי צורך בכלל נפרד.
 *  אבל היא עושה את זה **ברציפות ובחסם**: הגרסה הבינארית הפנתה
 *  100% מההפקדה לרכיב אחד, וזה בדיוק הכשל שתוקן ב-`monthPlan`. */
export function routeDeposit(
  amount: number, book: Book, startAge: number, month: number,
): DepositRouting {
  const age = ageAtMonth(startAge, month);
  const target = allocationFor(age);
  const phase = phaseOf(startAge, month);
  const base = { split: {} as Partial<Record<MgsAsset, number>>,
                 driftBefore: driftFromTarget(book, age), target };

  if (amount <= 0 || phase === 'withdraw') return { ...base, onTarget: false };
  if (phase === 'derisk') return { ...base, split: { MWRD: amount }, onTarget: false };

  // הפער של כל נכס מתחת ליעד, אחרי ההפקדה
  const after = total(book) + amount;
  const gaps = ASSETS.map(a => {
    const cur = after > 0 ? book[a].value / after : 0;
    return Math.max(0, (target[a] ?? 0) - cur);
  });
  const sum = gaps.reduce((x, y) => x + y, 0);

  // כולם על היעד או מעליו — מתחלק לפי משקלי היעד
  if (sum <= 0) {
    const tw = ASSETS.reduce((x, a) => x + (target[a] ?? 0), 0);
    const split: Partial<Record<MgsAsset, number>> = {};
    if (tw > 0) ASSETS.forEach(a => {
      const w = (target[a] ?? 0) / tw;
      if (w > 0) split[a] = amount * w;
    });
    return { ...base, split, onTarget: true };
  }

  const split: Partial<Record<MgsAsset, number>> = {};
  ASSETS.forEach((a, i) => {
    if (gaps[i] > 0) split[a] = amount * gaps[i] / sum;
  });
  return { ...base, split, onTarget: false };
}

// ── Withdrawal ───────────────────────────────────────────────────────────────

export interface WithdrawalPlan {
  sales: Array<{ asset: MgsAsset; amount: number; gain: number }>;
  gross: number;
  gain: number;
  tax: number;
  net: number;
  /** the asset the engine advises drawing from this month */
  from: MgsAsset | null;
}

/**
 * Raise `amount`, taking it from the asset sitting on the largest absolute
 * gain and working down. Selling within an asset is proportional, so each
 * shekel raised carries that asset's own profit margin and only that part is
 * taxed.
 */
export function planWithdrawal(amount: number, book: Book, taxRate: number): WithdrawalPlan {
  const gainOf = (a: MgsAsset) => book[a].value - book[a].basis;
  const margin = (a: MgsAsset) => (book[a].value > 0 ? gainOf(a) / book[a].value : 0);
  const order = ASSETS.filter(a => book[a].value > 0).sort((x, y) => gainOf(y) - gainOf(x));

  const sales: WithdrawalPlan['sales'] = [];
  let remaining = amount;
  for (const a of order) {
    if (remaining <= 0) break;
    const take = Math.min(book[a].value, remaining);
    sales.push({ asset: a, amount: take, gain: take * margin(a) });
    remaining -= take;
  }
  const gross = amount - Math.max(0, remaining);
  const gain = sales.reduce((s, x) => s + x.gain, 0);
  const tax = Math.max(0, gain) * taxRate;
  return { sales, gross, gain, tax, net: gross - tax, from: order[0] ?? null };
}

function applySales(book: Book, plan: WithdrawalPlan): void {
  for (const s of plan.sales) {
    const p = book[s.asset];
    const frac = p.value > 0 ? s.amount / p.value : 0;
    p.value -= s.amount;
    p.basis -= p.basis * frac;
  }
}

// ── Projection ───────────────────────────────────────────────────────────────

export interface ProjectionParams {
  /** age when the plan starts — it sets both the mix and the milestones */
  startAge: number;
  monthlyDeposit: number;
  /** one-off amounts by month (1-based), replacing that month's deposit */
  overrides?: Record<number, number>;
  /** expected annual return per asset, % */
  returns: Record<MgsAsset, number>;
  /** years of withdrawals to project past the withdrawal milestone */
  withdrawYears?: number;
  withdrawRate?: number;
  taxRate?: number;
  /** project from this month of the plan (1-based) instead of the start */
  startMonth?: number;
  /** holdings today, by market value */
  startBook?: Partial<Record<MgsAsset, number>>;
  /**
   * What was originally paid for those holdings. Without it every holding is
   * assumed bought at today's price, i.e. no gain — which zeroes the shift tax
   * and makes the profit ordering meaningless.
   */
  startBasis?: Partial<Record<MgsAsset, number>>;
}

export interface ProjectionRow {
  month: number;
  year: number;
  age: number;
  phase: Phase;
  deposit: number;
  deposited: number;
  value: number;
  basis: number;
  byAsset: Record<MgsAsset, number>;
  /** הסטייה הגדולה ביותר ממשקל היעד באותו חודש, 0..1 */
  drift: number;
  /** האם ההפקדה התחלקה לפי משקלי היעד, כי כולם היו על היעד */
  onTarget: boolean;
  gross: number;
  tax: number;
  net: number;
  /** which asset this month's withdrawal came from */
  drawnFrom: MgsAsset | null;
  /** gain realised by the de-risk shift, in the month it happens */
  shiftGain: number;
  shiftTax: number;
}

export function projectMgs(p: ProjectionParams): ProjectionRow[] {
  const {
    startAge, monthlyDeposit, overrides = {}, returns,
    withdrawYears = 10, withdrawRate = 0.04, taxRate = 0.25,
    startMonth = 1, startBook = {}, startBasis = {},
  } = p;

  const { withdrawYears: wy } = milestonesFor(startAge);
  const rate = Object.fromEntries(
    ASSETS.map(a => [a, Math.pow(1 + returns[a] / 100, 1 / 12) - 1])
  ) as Record<MgsAsset, number>;

  const book = emptyBook();
  for (const [a, v] of Object.entries(startBook) as [MgsAsset, number][]) {
    if (v > 0) book[a] = { value: v, basis: startBasis[a] ?? v };
  }
  let deposited = totalBasis(book);
  let shifted = false;
  /** Fixed once, at the withdrawal milestone, and held flat thereafter. */
  let monthlyDraw = 0;
  const rows: ProjectionRow[] = [];

  for (let m = Math.max(1, startMonth); m <= (wy + withdrawYears) * 12; m++) {
    const phase = phaseOf(startAge, m);
    let shiftGain = 0;
    let shiftTax = 0;

    if (phase !== 'accumulate' && !shifted) {
      // The guillotine: everything is sold into MWRD and the gain is taxed.
      for (const a of ASSETS) {
        if (a === 'MWRD' || book[a].value <= 0) continue;
        shiftGain += book[a].value - book[a].basis;
        book.MWRD.value += book[a].value;
        book.MWRD.basis += book[a].value; // re-bought at market value
        book[a] = { value: 0, basis: 0 };
      }
      shiftTax = Math.max(0, shiftGain) * taxRate;
      book.MWRD.value -= shiftTax;
      book.MWRD.basis -= shiftTax;
      shifted = true;
    }

    let deposit = 0;
    let routing = routeDeposit(0, book, startAge, m);
    if (phase !== 'withdraw') {
      deposit = overrides[m] ?? monthlyDeposit;
      routing = routeDeposit(deposit, book, startAge, m);
      for (const [a, amt] of Object.entries(routing.split) as [MgsAsset, number][]) {
        book[a].value += amt;
        book[a].basis += amt;
      }
      deposited += deposit;
    }

    for (const a of ASSETS) book[a].value *= 1 + rate[a];

    let gross = 0, tax = 0, net = 0, drawnFrom: MgsAsset | null = null;
    if (phase === 'withdraw') {
      // Measured once, on the portfolio as it stood entering the phase.
      if (monthlyDraw === 0) monthlyDraw = total(book) * withdrawRate / 12;
      const plan = planWithdrawal(monthlyDraw, book, taxRate);
      applySales(book, plan);
      ({ gross, tax, net } = plan);
      drawnFrom = plan.from;
    }

    rows.push({
      month: m, year: m / 12, age: ageAtMonth(startAge, m), phase,
      deposit, deposited, value: total(book), basis: totalBasis(book),
      byAsset: Object.fromEntries(ASSETS.map(a => [a, book[a].value])) as Record<MgsAsset, number>,
      drift: driftFromTarget(book, ageAtMonth(startAge, m)),
      onTarget: routing.onTarget,
      gross, tax, net, drawnFrom, shiftGain, shiftTax,
    });
  }
  return rows;
}

// ── Insight footer ───────────────────────────────────────────────────────────

export interface Insight {
  avgMonthlyDeposit: number;
  totalContributions: number;
  terminalValue: number;
  netMonthlyPayout: number;
  shiftAge: number;
  withdrawAge: number;
}

export function insightFrom(rows: ProjectionRow[], startAge: number): Insight | null {
  const { shiftYears, withdrawYears } = milestonesFor(startAge);
  const at = rows.find(r => r.month === withdrawYears * 12);
  if (!at) return null;
  const future = rows.filter(r => r.phase !== 'withdraw' && r.deposit > 0);
  const avg = future.length ? future.reduce((s, r) => s + r.deposit, 0) / future.length : 0;
  const first = rows.find(r => r.phase === 'withdraw');
  return {
    avgMonthlyDeposit: avg,
    totalContributions: at.deposited,
    terminalValue: at.value,
    netMonthlyPayout: first?.net ?? 0,
    shiftAge: startAge + shiftYears,
    withdrawAge: startAge + withdrawYears,
  };
}
