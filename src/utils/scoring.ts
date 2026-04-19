import type { Transaction, AllocationTarget } from '../types';

export function calcDisciplineScore(
  transactions: Transaction[],
  allocations: AllocationTarget[],
  _monthlyTarget: number
): { score: number; breakdown: { label: string; score: number; max: number }[] } {
  // 1. Deposit consistency (40 pts)
  const deposits = transactions.filter(t => t.type === 'deposit');
  const months = new Set(deposits.map(d => d.date.slice(0, 7)));
  const totalMonths = Math.max(1, getMonthsSinceFirst(transactions));
  const depositScore = Math.min(40, Math.round((months.size / totalMonths) * 40));

  // 2. No early withdrawals (30 pts)
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');
  const withdrawalPenalty = Math.min(30, withdrawals.length * 10);
  const withdrawalScore = 30 - withdrawalPenalty;

  // 3. Allocation adherence (30 pts)
  const totalValue = allocations.reduce((s, a) => s + a.currentValue, 0);
  if (totalValue === 0) {
    return {
      score: 0,
      breakdown: [
        { label: 'Deposit Consistency', score: 0, max: 40 },
        { label: 'No Early Withdrawals', score: 30, max: 30 },
        { label: 'Allocation Adherence', score: 0, max: 30 },
      ],
    };
  }
  const drifts = allocations
    .filter(a => a.targetPercent > 0)
    .map(a => Math.abs((a.currentValue / totalValue) * 100 - a.targetPercent));
  const avgDrift = drifts.reduce((s, d) => s + d, 0) / Math.max(1, drifts.length);
  const allocationScore = Math.max(0, Math.round(30 - avgDrift * 2));

  const score = depositScore + withdrawalScore + allocationScore;

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: [
      { label: 'Deposit Consistency', score: depositScore, max: 40 },
      { label: 'No Early Withdrawals', score: withdrawalScore, max: 30 },
      { label: 'Allocation Adherence', score: allocationScore, max: 30 },
    ],
  };
}

function getMonthsSinceFirst(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  const dates = transactions.map(t => new Date(t.date).getTime());
  const first = new Date(Math.min(...dates));
  const now = new Date();
  return (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1;
}
