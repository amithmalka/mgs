import type { AssetClass } from '../types';

export interface WithdrawHolding {
  assetClass: AssetClass;
  ticker: string;
  label: string;
  value: number;       // current ILS value of the holding
  perf30: number;      // 30-day performance %
  price: number;       // latest unit price (trading currency)
}

export interface SellInstruction {
  assetClass: AssetClass;
  ticker: string;
  label: string;
  sellValue: number;   // ILS to sell
  units: number | null; // approx units (sellValue / price)
  perf30: number;
}

export interface WithdrawalPlan {
  instructions: SellInstruction[];
  target: number;
  covered: number;
  shortfall: number;
}

/**
 * Year-21 Smart Withdrawal algorithm.
 * Sells ONLY from assets with positive 30-day performance (profit-locking),
 * highest performer first, cascading until the monthly target is met.
 * Assets that are flat/negative over 30 days are never touched (loss protection).
 */
export function planWithdrawal(holdings: WithdrawHolding[], target: number): WithdrawalPlan {
  const eligible = holdings
    .filter(h => h.perf30 > 0 && h.value > 0)
    .sort((a, b) => b.perf30 - a.perf30);

  const instructions: SellInstruction[] = [];
  let remaining = target;
  for (const h of eligible) {
    if (remaining <= 0.5) break;
    const sell = Math.min(h.value, remaining);
    instructions.push({
      assetClass: h.assetClass,
      ticker: h.ticker,
      label: h.label,
      sellValue: Math.round(sell),
      units: h.price > 0 ? Math.round((sell / h.price) * 100) / 100 : null,
      perf30: h.perf30,
    });
    remaining -= sell;
  }

  return {
    instructions,
    target: Math.round(target),
    covered: Math.round(target - Math.max(0, remaining)),
    shortfall: Math.round(Math.max(0, remaining)),
  };
}
