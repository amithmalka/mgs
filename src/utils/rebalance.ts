import type { AllocationTarget, AssetClass } from '../types';

export interface RebalanceSuggestion {
  assetClass: AssetClass;
  label: string;
  amount: number;
  currentPercent: number;
  targetPercent: number;
  color: string;
}

export function calcRebalance(
  depositAmount: number,
  allocations: AllocationTarget[],
  totalPortfolioValue: number
): RebalanceSuggestion[] {
  const newTotal = totalPortfolioValue + depositAmount;

  // Only include active allocations (targetPercent > 0)
  const active = allocations.filter(a => a.targetPercent > 0);

  // Calculate how much each asset should have after deposit
  const suggestions: RebalanceSuggestion[] = active.map(a => {
    const targetValue = (a.targetPercent / 100) * newTotal;
    const needed = Math.max(0, targetValue - a.currentValue);
    return {
      assetClass: a.assetClass,
      label: a.label,
      amount: needed,
      currentPercent: totalPortfolioValue > 0 ? (a.currentValue / totalPortfolioValue) * 100 : 0,
      targetPercent: a.targetPercent,
      color: a.color,
    };
  });

  // Normalize amounts to match deposit
  const totalNeeded = suggestions.reduce((sum, s) => sum + s.amount, 0);
  if (totalNeeded > 0) {
    const ratio = depositAmount / totalNeeded;
    suggestions.forEach(s => {
      s.amount = Math.round(s.amount * ratio);
    });
  } else {
    // All balanced — distribute by target
    suggestions.forEach(s => {
      s.amount = Math.round(depositAmount * (s.targetPercent / 100));
    });
  }

  // Fix rounding: adjust the largest item
  const currentSum = suggestions.reduce((sum, s) => sum + s.amount, 0);
  const diff = depositAmount - currentSum;
  if (diff !== 0 && suggestions.length > 0) {
    suggestions.sort((a, b) => b.amount - a.amount);
    suggestions[0].amount += diff;
  }

  return suggestions.sort((a, b) => b.targetPercent - a.targetPercent);
}
