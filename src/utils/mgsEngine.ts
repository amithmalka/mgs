import { MGS_ASSETS, QQQ3_CAP } from '../constants/mgsTracks';
import type { MgsAsset, MgsTrack } from '../constants/mgsTracks';

/**
 * MGS execution engine.
 *
 *   Rule 1  QQQ3 may never be bought while it is at or above 25% of the
 *           portfolio. The whole deposit then goes to I500 and EQQS by their
 *           baseline ratio, and QQQ3 buying resumes once a dip takes it back
 *           under the cap.
 *   De-risk In a leveraged track's final years every holding and every new
 *           deposit goes to MWRD.
 *   Rule 2  From retirement, 4% a year is drawn monthly, sold from a chosen
 *           order of assets rather than pro rata.
 *
 * Two spec points contradict each other, so they are options rather than
 * baked in — see `withdrawOrder` and `deRiskMode`.
 */

const ASSETS = Object.keys(MGS_ASSETS) as MgsAsset[];

export interface Position { value: number; basis: number }
export type Book = Record<MgsAsset, Position>;
export type Phase = 'accumulate' | 'derisk' | 'withdraw';

export const emptyBook = (): Book =>
  Object.fromEntries(ASSETS.map(a => [a, { value: 0, basis: 0 }])) as Book;

const total = (b: Book) => ASSETS.reduce((s, a) => s + b[a].value, 0);
const totalBasis = (b: Book) => ASSETS.reduce((s, a) => s + b[a].basis, 0);

/** QQQ3's share of the portfolio right now, 0..1. */
export function qqq3Weight(book: Book): number {
  const t = total(book);
  return t > 0 ? book.QQQ3.value / t : 0;
}

/** Which phase a given month (1-based) falls in. */
export function phaseOf(track: MgsTrack, horizonYears: number, month: number): Phase {
  if (month > horizonYears * 12) return 'withdraw';
  const year = Math.ceil(month / 12);
  if (track.deRiskYears > 0 && year > horizonYears - track.deRiskYears) return 'derisk';
  return 'accumulate';
}

// ── Rule 1 ───────────────────────────────────────────────────────────────────
export interface DepositRouting {
  split: Partial<Record<MgsAsset, number>>;
  /** true when QQQ3 buying was halted by the cap */
  qqq3Capped: boolean;
  /** QQQ3 weight measured before the deposit */
  qqq3Weight: number;
}

/**
 * Route one deposit.
 *
 * The cap is tested against the weight BEFORE the deposit, with a plain `>=`
 * and no rounding, so 25.0% halts and 24.9999…% does not. Buying at the
 * baseline 25% share can never lift QQQ3 over the cap from below — a mix of a
 * weight under 25% and new money at exactly 25% stays under 25% — so only
 * price appreciation can trigger a halt, which is what the rule intends.
 */
export function routeDeposit(amount: number, book: Book, track: MgsTrack, phase: Phase): DepositRouting {
  const w = qqq3Weight(book);
  if (amount <= 0 || phase === 'withdraw') return { split: {}, qqq3Capped: false, qqq3Weight: w };
  if (phase === 'derisk') return { split: { MWRD: amount }, qqq3Capped: false, qqq3Weight: w };

  let weights = { ...track.weights };
  const capped = track.leveraged && w >= QQQ3_CAP;
  if (capped) delete weights.QQQ3; // I500:EQQS keep their 37.5:37.5 ratio → 50/50

  const sum = Object.values(weights).reduce((s, v) => s + (v ?? 0), 0);
  if (sum <= 0) weights = { MWRD: 1 };

  const split: Partial<Record<MgsAsset, number>> = {};
  for (const [a, wt] of Object.entries(weights) as [MgsAsset, number][]) {
    split[a] = amount * (wt / (sum || 1));
  }
  return { split, qqq3Capped: capped, qqq3Weight: w };
}

// ── Rule 2 ───────────────────────────────────────────────────────────────────
export type WithdrawOrder = 'highestGain' | 'lowestGain';

export interface WithdrawalPlan {
  sales: Array<{ asset: MgsAsset; amount: number; gain: number }>;
  gross: number;
  gain: number;
  tax: number;
  net: number;
}

/**
 * Raise `amount` by selling assets in order of profit margin.
 *
 * 'highestGain' is the spec as written: sell the asset with the highest profit
 * margin first. That realises the MOST gain per shekel and therefore the most
 * tax, which works against the spec's stated aim of tax efficiency.
 * 'lowestGain' does the opposite and minimises tax now. Selling within an
 * asset is proportional, so its margin is unchanged by the sale.
 */
export function planWithdrawal(amount: number, book: Book, order: WithdrawOrder, taxRate: number): WithdrawalPlan {
  const margin = (a: MgsAsset) => (book[a].value > 0 ? (book[a].value - book[a].basis) / book[a].value : 0);
  const candidates = ASSETS.filter(a => book[a].value > 0)
    .sort((x, y) => order === 'highestGain' ? margin(y) - margin(x) : margin(x) - margin(y));

  const sales: WithdrawalPlan['sales'] = [];
  let remaining = amount;
  for (const a of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(book[a].value, remaining);
    sales.push({ asset: a, amount: take, gain: take * margin(a) });
    remaining -= take;
  }
  const gross = amount - Math.max(0, remaining);
  const gain = sales.reduce((s, x) => s + x.gain, 0);
  const tax = Math.max(0, gain) * taxRate;
  return { sales, gross, gain, tax, net: gross - tax };
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
export type DeRiskMode = 'shiftHoldings' | 'depositsOnly';

export interface ProjectionParams {
  track: MgsTrack;
  horizonYears: number;
  monthlyDeposit: number;
  /** one-off amounts by month (1-based), replacing that month's deposit */
  overrides?: Record<number, number>;
  /** expected annual return per asset, % */
  returns: Record<MgsAsset, number>;
  /** years of withdrawals to project after the horizon */
  withdrawYears?: number;
  withdrawRate?: number;
  taxRate?: number;
  withdrawOrder?: WithdrawOrder;
  /**
   * 'shiftHoldings' is the spec as written: at de-risk start every holding is
   * sold into MWRD. That is a sale, and a taxable one, which contradicts the
   * rule that nothing is sold during accumulation. 'depositsOnly' keeps the
   * holdings and routes only new money to MWRD.
   */
  deRiskMode?: DeRiskMode;
  /** project from this month of the plan (1-based) instead of the start */
  startMonth?: number;
  /** holdings today, by market value */
  startBook?: Partial<Record<MgsAsset, number>>;
  /**
   * What was originally paid for those holdings. Without it every holding is
   * assumed bought at today's price, i.e. no gain — which zeroes the de-risk
   * tax and makes Rule 2's profit-margin ordering meaningless.
   */
  startBasis?: Partial<Record<MgsAsset, number>>;
}

export interface ProjectionRow {
  month: number;
  year: number;
  phase: Phase;
  deposit: number;
  deposited: number;
  value: number;
  basis: number;
  byAsset: Record<MgsAsset, number>;
  qqq3Weight: number;
  qqq3Capped: boolean;
  gross: number;
  tax: number;
  net: number;
  /** gain realised by the de-risk shift, in the month it happens */
  shiftGain: number;
  /** tax paid on that gain, taken out of the portfolio */
  shiftTax: number;
}

export function projectMgs(p: ProjectionParams): ProjectionRow[] {
  const {
    track, horizonYears, monthlyDeposit, overrides = {}, returns,
    withdrawYears = 10, withdrawRate = 0.04, taxRate = 0.25,
    withdrawOrder = 'highestGain', deRiskMode = 'shiftHoldings',
    startMonth = 1, startBook = {}, startBasis = {},
  } = p;

  const rate = Object.fromEntries(
    ASSETS.map(a => [a, Math.pow(1 + returns[a] / 100, 1 / 12) - 1])
  ) as Record<MgsAsset, number>;

  const book = emptyBook();
  for (const [a, v] of Object.entries(startBook) as [MgsAsset, number][]) {
    if (v > 0) book[a] = { value: v, basis: startBasis[a] ?? v };
  }
  let deposited = totalBasis(book);
  let shifted = false;
  const rows: ProjectionRow[] = [];

  for (let m = Math.max(1, startMonth); m <= (horizonYears + withdrawYears) * 12; m++) {
    const phase = phaseOf(track, horizonYears, m);
    let shiftGain = 0;
    let shiftTax = 0;

    if (phase === 'derisk' && deRiskMode === 'shiftHoldings' && !shifted) {
      for (const a of ASSETS) {
        if (a === 'MWRD' || book[a].value <= 0) continue;
        shiftGain += book[a].value - book[a].basis;
        book.MWRD.value += book[a].value;
        book.MWRD.basis += book[a].value; // re-bought at market value
        book[a] = { value: 0, basis: 0 };
      }
      // The shift is a real sale, so its gain is taxed now. Resetting basis
      // without charging this would count the tax as never paid.
      shiftTax = Math.max(0, shiftGain) * taxRate;
      book.MWRD.value -= shiftTax;
      book.MWRD.basis -= shiftTax;
      shifted = true;
    }

    let deposit = 0;
    let routing: DepositRouting = { split: {}, qqq3Capped: false, qqq3Weight: qqq3Weight(book) };
    if (phase !== 'withdraw') {
      deposit = overrides[m] ?? monthlyDeposit;
      routing = routeDeposit(deposit, book, track, phase);
      for (const [a, amt] of Object.entries(routing.split) as [MgsAsset, number][]) {
        book[a].value += amt;
        book[a].basis += amt;
      }
      deposited += deposit;
    }

    for (const a of ASSETS) book[a].value *= 1 + rate[a];

    let gross = 0, tax = 0, net = 0;
    if (phase === 'withdraw') {
      const plan = planWithdrawal(total(book) * withdrawRate / 12, book, withdrawOrder, taxRate);
      applySales(book, plan);
      ({ gross, tax, net } = plan);
    }

    rows.push({
      month: m, year: m / 12, phase, deposit, deposited,
      value: total(book), basis: totalBasis(book),
      byAsset: Object.fromEntries(ASSETS.map(a => [a, book[a].value])) as Record<MgsAsset, number>,
      qqq3Weight: qqq3Weight(book), qqq3Capped: routing.qqq3Capped,
      gross, tax, net, shiftGain, shiftTax,
    });
  }
  return rows;
}

// ── Insight footer ───────────────────────────────────────────────────────────
export interface Insight {
  avgMonthlyDeposit: number;
  totalContributions: number;
  valueAtRetirement: number;
  grossMonthlyWithdrawal: number;
  netMonthlyWithdrawal: number;
}

/**
 * "If you continue with your current average deposit…" — contributions over
 * the horizon and the net 4% payout at retirement, taxed on the profit
 * portion only.
 */
export function insightFrom(
  rows: ProjectionRow[], horizonYears: number,
  opts: { withdrawRate?: number; taxRate?: number } = {},
): Insight | null {
  const { withdrawRate = 0.04, taxRate = 0.25 } = opts;
  const atRetirement = rows.find(r => r.month === horizonYears * 12);
  if (!atRetirement || rows.length === 0) return null;

  // Rows may start mid-plan from real holdings, so average only the deposits
  // that are still to come.
  const startingContributions = rows[0].deposited - rows[0].deposit;
  const months = rows.filter(r => r.phase !== 'withdraw').length;
  const v = atRetirement.value;
  const gross = v * withdrawRate / 12;
  const profitRatio = v > 0 ? Math.max(0, Math.min(1, (v - atRetirement.basis) / v)) : 0;

  return {
    avgMonthlyDeposit: months > 0 ? (atRetirement.deposited - startingContributions) / months : 0,
    totalContributions: atRetirement.deposited,
    valueAtRetirement: v,
    grossMonthlyWithdrawal: gross,
    netMonthlyWithdrawal: gross * (1 - taxRate * profitRatio),
  };
}
