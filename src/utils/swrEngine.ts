import { SWR_ANNUAL, SWR_START_MONTH, CAPITAL_GAINS_TAX } from '../constants/investmentTracks';

/**
 * Dynamic Allocation & SWR Engine.
 *
 * Implements the method's rules:
 *   · deposits are never used to trigger a sale — new cash goes 100% into the
 *     asset furthest BELOW its target weight
 *   · Bitcoin above its take-profit threshold is trimmed back to target and
 *     rotated into the core, the only deliberate sale during accumulation
 *   · nothing is withdrawn before month 36; from then on 4%/yr is drawn
 *     monthly, taxed at 25% on the profit portion only
 *   · withdrawals sell highest-cost lots first (HIFO), which realises the
 *     smallest gain and therefore the smallest tax
 */

// ── Rolling metrics ──────────────────────────────────────────────────────────
export interface DepositRecord { date: string; amount: number }

/** Mean of every deposit made so far. */
export function avgMonthlyDeposit(deposits: DepositRecord[]): number {
  if (deposits.length === 0) return 0;
  const total = deposits.reduce((s, d) => s + d.amount, 0);
  return total / deposits.length;
}

/**
 * Money-weighted annual return (XIRR) from dated cash flows.
 *
 * Deposits are negative flows, the current value a positive one. Solved by
 * bisection rather than Newton: Newton diverges on the irregular, sign-heavy
 * flows a deposit schedule produces, while bisection on a bracketed range
 * always converges.
 */
export function xirr(flows: Array<{ date: Date; amount: number }>, guessRange = [-0.95, 5]): number | null {
  if (flows.length < 2) return null;
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const YEAR = 365 * 24 * 3600 * 1000;

  const npv = (rate: number) => sorted.reduce((s, f) => {
    const years = (f.date.getTime() - t0) / YEAR;
    return s + f.amount / Math.pow(1 + rate, years);
  }, 0);

  let [lo, hi] = guessRange;
  let flo = npv(lo), fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f = npv(mid);
    if (Math.abs(f) < 1e-7) return mid;
    if (flo * f < 0) { hi = mid; fhi = f; } else { lo = mid; flo = f; }
  }
  return (lo + hi) / 2;
}

/** Realised annual return from a deposit history and the value today. */
export function realizedCagr(deposits: DepositRecord[], currentValue: number, asOf: Date): number | null {
  if (deposits.length === 0 || currentValue <= 0) return null;
  const flows = deposits.map(d => ({ date: new Date(d.date), amount: -d.amount }));
  flows.push({ date: asOf, amount: currentValue });
  return xirr(flows);
}

// ── Withdrawal ───────────────────────────────────────────────────────────────
export interface SwrResult {
  /** true once the accumulation threshold has passed */
  eligible: boolean;
  monthsUntilEligible: number;
  /** 4%/yr split monthly, before tax */
  gross: number;
  /** share of the portfolio that is profit, 0..1 */
  profitRatio: number;
  tax: number;
  /** what actually reaches the pocket */
  net: number;
}

/**
 * Monthly withdrawal, net of tax.
 *
 * Tax applies to the profit portion of what is sold, not the whole amount: a
 * proportional redemption realises gain in the same ratio the portfolio holds
 * it. Taxing the gross would overstate tax roughly fourfold on a young
 * portfolio.
 */
export function monthlySwr(
  portfolioValue: number,
  costBasis: number,
  monthsInvested: number,
  opts?: { annualRate?: number; taxRate?: number; startMonth?: number },
): SwrResult {
  const annualRate = opts?.annualRate ?? SWR_ANNUAL;
  const taxRate = opts?.taxRate ?? CAPITAL_GAINS_TAX;
  const startMonth = opts?.startMonth ?? SWR_START_MONTH;

  const eligible = monthsInvested >= startMonth;
  const monthsUntilEligible = Math.max(0, startMonth - monthsInvested);

  if (!eligible || portfolioValue <= 0) {
    return { eligible, monthsUntilEligible, gross: 0, profitRatio: 0, tax: 0, net: 0 };
  }

  const gross = portfolioValue * annualRate / 12;
  const profitRatio = Math.max(0, Math.min(1, (portfolioValue - costBasis) / portfolioValue));
  const tax = gross * profitRatio * taxRate;

  return { eligible, monthsUntilEligible, gross, profitRatio, tax, net: gross - tax };
}

// ── Deposit routing ──────────────────────────────────────────────────────────
export interface AssetPosition { key: string; value: number; targetWeight: number }

export interface DepositRouting {
  key: string;
  amount: number;
  currentWeight: number;
  targetWeight: number;
  /** target − current; the asset with the largest positive gap receives the cash */
  delta: number;
}

/**
 * Route the whole deposit into the single asset furthest below target.
 *
 * The method is explicit that 100% goes to one asset rather than being spread
 * across every underweight holding — it closes the widest gap fastest and
 * never sells, so no tax event is created.
 */
export function routeDeposit(amount: number, positions: AssetPosition[]): DepositRouting[] {
  if (positions.length === 0 || amount <= 0) return [];
  const total = positions.reduce((s, p) => s + p.value, 0);

  const rows: DepositRouting[] = positions.map(p => {
    const currentWeight = total > 0 ? p.value / total : 0;
    return {
      key: p.key, amount: 0,
      currentWeight,
      targetWeight: p.targetWeight,
      // With an empty portfolio every asset is equally "below target", so fall
      // back to target weight to break the tie sensibly.
      delta: total > 0 ? p.targetWeight - currentWeight : p.targetWeight,
    };
  });

  const winner = rows.reduce((best, r) => (r.delta > best.delta ? r : best), rows[0]);
  winner.amount = amount;
  return rows.sort((a, b) => b.delta - a.delta);
}

// ── Bitcoin profit harvesting ────────────────────────────────────────────────
export interface HarvestPlan {
  triggered: boolean;
  btcWeight: number;
  threshold: number;
  /** amount of BTC to sell, bringing it back to its target weight */
  sellAmount: number;
  intoKey: string;
}

/**
 * Trim Bitcoin back to target once it runs past the threshold.
 *
 * The trigger and the destination are different numbers: it fires above the
 * threshold (28%) but sells down to the TARGET (20%), not to the threshold —
 * otherwise it would re-trigger on the next tick.
 */
export function planBtcHarvest(
  positions: AssetPosition[],
  opts: { btcKey?: string; threshold: number; intoKey: string },
): HarvestPlan {
  const btcKey = opts.btcKey ?? 'BTC';
  const total = positions.reduce((s, p) => s + p.value, 0);
  const btc = positions.find(p => p.key === btcKey);

  const empty: HarvestPlan = {
    triggered: false, btcWeight: 0, threshold: opts.threshold,
    sellAmount: 0, intoKey: opts.intoKey,
  };
  if (!btc || total <= 0) return empty;

  const btcWeight = btc.value / total;
  if (btcWeight <= opts.threshold) return { ...empty, btcWeight };

  // Sell the slice above target. Total is unchanged by the rotation, so the
  // target value can be computed against the current total.
  const sellAmount = btc.value - btc.targetWeight * total;
  return {
    triggered: sellAmount > 0,
    btcWeight,
    threshold: opts.threshold,
    sellAmount: Math.max(0, sellAmount),
    intoKey: opts.intoKey,
  };
}

// ── HIFO lot selection ───────────────────────────────────────────────────────
export interface Lot { id: string; assetKey: string; units: number; costPerUnit: number; pricePerUnit: number }

export interface LotSale { lotId: string; assetKey: string; units: number; proceeds: number; gain: number }

export interface HifoPlan {
  sales: LotSale[];
  proceeds: number;
  realizedGain: number;
  tax: number;
  net: number;
  /** true when the lots could not cover the requested amount */
  shortfall: boolean;
}

/**
 * Raise `amount` by selling highest-cost lots first.
 *
 * HIFO realises the smallest gain per shekel raised, so it minimises tax.
 * Lots in assets that are currently over their target weight are preferred
 * first, so raising cash also nudges the portfolio back toward its targets.
 */
export function planHifoSale(
  amount: number,
  lots: Lot[],
  overweightKeys: string[] = [],
  taxRate = CAPITAL_GAINS_TAX,
): HifoPlan {
  const empty: HifoPlan = { sales: [], proceeds: 0, realizedGain: 0, tax: 0, net: 0, shortfall: amount > 0 };
  if (amount <= 0 || lots.length === 0) return { ...empty, shortfall: false };

  const over = new Set(overweightKeys);
  const ordered = [...lots].sort((a, b) => {
    const ao = over.has(a.assetKey) ? 0 : 1;
    const bo = over.has(b.assetKey) ? 0 : 1;
    if (ao !== bo) return ao - bo;          // over-weighted assets first
    return b.costPerUnit - a.costPerUnit;   // then highest cost basis (HIFO)
  });

  const sales: LotSale[] = [];
  let remaining = amount;
  let proceeds = 0;
  let realizedGain = 0;

  for (const lot of ordered) {
    if (remaining <= 1e-9) break;
    const lotValue = lot.units * lot.pricePerUnit;
    if (lotValue <= 0) continue;

    const take = Math.min(lotValue, remaining);
    const units = take / lot.pricePerUnit;
    const gain = units * (lot.pricePerUnit - lot.costPerUnit);

    sales.push({ lotId: lot.id, assetKey: lot.assetKey, units, proceeds: take, gain });
    proceeds += take;
    realizedGain += gain;
    remaining -= take;
  }

  // A loss-making lot cannot produce negative tax here; losses simply offset.
  const tax = Math.max(0, realizedGain) * taxRate;
  return {
    sales, proceeds, realizedGain, tax, net: proceeds - tax,
    shortfall: remaining > 1e-6,
  };
}

// ── Projection ───────────────────────────────────────────────────────────────
export interface ProjectionRow {
  month: number;
  year: number;
  totalDeposited: number;
  value: number;
  /** gross 4%/12 taken this month */
  grossWithdrawal: number;
  netWithdrawal: number;
  cumulativeNetWithdrawn: number;
}

export interface ProjectionParams {
  monthlyDeposit: number;
  annualReturn: number;
  months: number;
  startingValue?: number;
  startingBasis?: number;
  /** when false, model pure accumulation with no withdrawals at all */
  withdraw?: boolean;
  annualRate?: number;
  taxRate?: number;
  startMonth?: number;
}

/**
 * Month-by-month projection with withdrawals actually removed from the balance.
 *
 * Drawing 4%/yr from month 36 and still compounding the full balance would
 * overstate the portfolio badly over decades — by year 30 it is the difference
 * between roughly 7.7M and 18.7M on the same assumptions.
 */
export function projectEngine(p: ProjectionParams): ProjectionRow[] {
  const {
    monthlyDeposit, annualReturn, months,
    startingValue = 0, startingBasis = 0, withdraw = true,
    annualRate = SWR_ANNUAL, taxRate = CAPITAL_GAINS_TAX, startMonth = SWR_START_MONTH,
  } = p;

  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  let value = startingValue;
  let basis = startingBasis;
  let deposited = startingValue;
  let cumulativeNet = 0;

  const rows: ProjectionRow[] = [];

  for (let m = 1; m <= months; m++) {
    value += monthlyDeposit;
    basis += monthlyDeposit;
    deposited += monthlyDeposit;
    value *= 1 + r;

    let gross = 0, net = 0;
    if (withdraw && m >= startMonth && value > 0) {
      gross = value * annualRate / 12;
      const profitRatio = Math.max(0, Math.min(1, (value - basis) / value));
      net = gross - gross * profitRatio * taxRate;
      value -= gross;
      // A proportional redemption consumes basis in the same proportion.
      basis -= gross * (1 - profitRatio);
      cumulativeNet += net;
    }

    rows.push({
      month: m,
      year: m / 12,
      totalDeposited: Math.round(deposited),
      value: Math.round(value),
      grossWithdrawal: Math.round(gross),
      netWithdrawal: Math.round(net),
      cumulativeNetWithdrawn: Math.round(cumulativeNet),
    });
  }

  return rows;
}
