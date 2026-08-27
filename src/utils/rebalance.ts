import type { AllocationTarget, AssetClass } from '../types';

export interface RebalanceSuggestion {
  assetClass: AssetClass;
  label: string;
  amount: number;        // ILS to route into this asset from the deposit
  currentPercent: number; // Aᵢ — actual current allocation %
  targetPercent: number;  // Tᵢ — target (hard cap) %
  deviation: number;      // Δᵢ = Tᵢ − Aᵢ  (positive = under-weighted = buy priority)
  underweight: boolean;
  color: string;
}

/**
 * Dynamic DCA Rebalancing Engine (SRS).
 *
 * Routes the monthly deposit D into UNDER-weighted assets (Δᵢ = Tᵢ − Aᵢ > 0)
 * to converge toward the target allocation — without ever selling (no tax
 * events). Hard cap: never buy an asset past its target Tᵢ.
 *
 * Routing:
 *   Deposit_Amountᵢ = Target_Valueᵢ − Vᵢ ,  Target_Valueᵢ = (V_total + D)·Tᵢ
 *   • ΣDeficit ≥ D  → split D across deficits proportionally (a single deeply
 *                     under-weighted asset can receive up to 100% of D).
 *   • ΣDeficit < D  → fill every deficit to target, then spread the residual
 *                     by target weight (keeps everyone at target, no over-buy).
 *
 * `restrictTo` activates the Phase-2 de-leverage rule: 100% of D is routed only
 * into the given (green / vanilla) assets; the rest are frozen (amount 0).
 */
export function calcRebalance(
  depositAmount: number,
  allocations: AllocationTarget[],
  totalPortfolioValue: number,
  opts?: { restrictTo?: AssetClass[] },
): RebalanceSuggestion[] {
  const Vtotal = totalPortfolioValue;
  const newTotal = Vtotal + depositAmount;
  const active = allocations.filter(a => a.targetPercent > 0);

  const base = (a: AllocationTarget) => {
    const Ai = Vtotal > 0 ? (a.currentValue / Vtotal) * 100 : 0;
    return {
      assetClass: a.assetClass, label: a.label, color: a.color,
      currentPercent: Ai, targetPercent: a.targetPercent,
      deviation: Math.round((a.targetPercent - Ai) * 10) / 10,
      underweight: a.targetPercent - Ai > 0,
      amount: 0,
    };
  };

  const out: RebalanceSuggestion[] = active.map(base);
  const amt = new Map<AssetClass, number>();

  if (opts?.restrictTo && opts.restrictTo.length) {
    // ── Phase-2 de-leverage: all D → the restricted (green) assets by weight ──
    const set = new Set(opts.restrictTo);
    const elig = active.filter(a => set.has(a.assetClass));
    const sumT = elig.reduce((s, a) => s + a.targetPercent, 0) || 1;
    elig.forEach(a => amt.set(a.assetClass, depositAmount * (a.targetPercent / sumT)));
  } else {
    // ── Accumulation: deviation routing with hard caps ──
    const deficit = new Map<AssetClass, number>();
    active.forEach(a => {
      const targetValue = (a.targetPercent / 100) * newTotal;
      deficit.set(a.assetClass, Math.max(0, targetValue - a.currentValue));
    });
    const sumDeficit = [...deficit.values()].reduce((s, v) => s + v, 0);
    const sumT = active.reduce((s, a) => s + a.targetPercent, 0) || 1;

    if (sumDeficit <= 0) {
      active.forEach(a => amt.set(a.assetClass, depositAmount * (a.targetPercent / sumT)));
    } else if (sumDeficit >= depositAmount) {
      active.forEach(a => amt.set(a.assetClass, depositAmount * (deficit.get(a.assetClass)! / sumDeficit)));
    } else {
      const residual = depositAmount - sumDeficit;
      active.forEach(a => amt.set(a.assetClass, deficit.get(a.assetClass)! + residual * (a.targetPercent / sumT)));
    }
  }

  out.forEach(s => { s.amount = Math.round(amt.get(s.assetClass) ?? 0); });

  // Fix rounding drift on the largest allocation
  const diff = depositAmount - out.reduce((sum, s) => sum + s.amount, 0);
  if (diff !== 0) {
    const target = [...out].filter(s => s.amount > 0).sort((a, b) => b.amount - a.amount)[0] ?? out[0];
    if (target) target.amount += diff;
  }

  // Under-weighted first (buy priority), then by target
  return out.sort((a, b) => (b.underweight ? 1 : 0) - (a.underweight ? 1 : 0) || b.amount - a.amount);
}
