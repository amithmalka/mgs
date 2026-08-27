import type { AllocationTarget, AssetClass } from '../types';
import { ASSET_META } from '../constants/defaults';

export interface SmartBuy {
  assetClass: AssetClass;
  label: string;
  ticker: string;
  amount: number;
  perf30: number | null;   // recent price change %
  price: number | null;    // current price (trading currency)
  currency: string | null;
  dipBoosted: boolean;     // received extra weight because it dropped
}

export interface PricePoint { price?: number; perf30?: number; currency?: string | null; }

/**
 * Dip-aware monthly deposit routing. Starts from the track's target weights,
 * then TILTS the split toward assets whose price has recently dropped — the
 * bigger the drop, the more of this month's deposit goes there (buy the dip,
 * maximise the discount). Leveraged assets get amplified during drawdowns.
 *
 *   weightᵢ = Targetᵢ × (1 + dipBoost × max(0, −perf30ᵢ/100))
 *
 * With no live prices, it falls back to a straight target-weight split.
 */
export function smartDeposit(
  deposit: number,
  allocations: AllocationTarget[],
  prices: Record<string, PricePoint>,
  dipBoost = 3,
): SmartBuy[] {
  const active = allocations.filter(a => a.targetPercent > 0);
  const vTotal = allocations.reduce((s, a) => s + a.currentValue, 0);
  const newTotal = vTotal + deposit;

  // Base = how far each asset is under its target (deviation deficit). When the
  // portfolio is already balanced (or empty), fall back to plain target weights.
  const deficits = active.map(a => Math.max(0, (a.targetPercent / 100) * newTotal - a.currentValue));
  const sumDeficit = deficits.reduce((s, v) => s + v, 0);

  const rows = active.map((a, i) => {
    const p = prices[a.assetClass];
    const perf30 = typeof p?.perf30 === 'number' ? p.perf30 : null;
    const drop = perf30 != null ? Math.max(0, -perf30 / 100) : 0;
    const lev = ASSET_META[a.assetClass].leveraged ? 1.5 : 1; // amplify dip on leverage
    const base = sumDeficit > 0 ? deficits[i] : a.targetPercent;
    const weight = base * (1 + dipBoost * lev * drop);
    return {
      a, weight, perf30,
      price: typeof p?.price === 'number' ? p.price : null,
      currency: p?.currency ?? null,
      boosted: drop > 0,
    };
  });

  const sumW = rows.reduce((s, r) => s + r.weight, 0) || 1;
  const out: SmartBuy[] = rows.map(r => ({
    assetClass: r.a.assetClass,
    label: r.a.label,
    ticker: ASSET_META[r.a.assetClass].primaryTicker,
    amount: Math.round(deposit * (r.weight / sumW)),
    perf30: r.perf30,
    price: r.price,
    currency: r.currency,
    dipBoosted: r.boosted,
  }));

  // rounding fix on the largest buy
  const diff = deposit - out.reduce((s, o) => s + o.amount, 0);
  if (diff !== 0 && out.length) {
    const top = [...out].sort((a, b) => b.amount - a.amount)[0];
    top.amount += diff;
  }
  // biggest buys first
  return out.sort((a, b) => b.amount - a.amount);
}
