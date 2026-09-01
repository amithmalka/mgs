import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomHolding, MonthlyEntry } from '../types';

/**
 * One student's custom portfolio: which stocks they hold, the plan, and the
 * month-by-month log of what actually happened.
 *
 * Kept on the device (like allocations, transactions and goals in store/index)
 * rather than in Supabase — the admin's shared stock list is the only part of
 * this feature that is server-side.
 */
interface CustomState {
  holdings: CustomHolding[];
  /** planned monthly deposit for this portfolio, ILS */
  monthlyDeposit: number;
  /** projection horizon, years */
  horizonYears: number;
  entries: MonthlyEntry[];

  addHolding: (h: Omit<CustomHolding, 'id'>) => void;
  updateHolding: (id: string, patch: Partial<CustomHolding>) => void;
  removeHolding: (id: string) => void;
  moveHolding: (index: number, delta: -1 | 1) => void;
  /** set every target to an equal share of 100% */
  distributeEvenly: () => void;

  setMonthlyDeposit: (amount: number) => void;
  setHorizonYears: (years: number) => void;

  upsertEntry: (e: Omit<MonthlyEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useCustomStore = create<CustomState>()(
  persist(
    (set) => ({
      holdings: [],
      monthlyDeposit: 3000,
      horizonYears: 20,
      entries: [],

      addHolding: (h) => set(s => {
        // Same ticker twice would make the allocation meaningless.
        if (s.holdings.some(x => x.ticker.toUpperCase() === h.ticker.toUpperCase())) return s;
        return { holdings: [...s.holdings, { ...h, id: uid() }] };
      }),

      updateHolding: (id, patch) => set(s => ({
        holdings: s.holdings.map(h => (h.id === id ? { ...h, ...patch } : h)),
      })),

      removeHolding: (id) => set(s => ({ holdings: s.holdings.filter(h => h.id !== id) })),

      moveHolding: (index, delta) => set(s => {
        const target = index + delta;
        if (target < 0 || target >= s.holdings.length) return s;
        const next = s.holdings.slice();
        [next[index], next[target]] = [next[target], next[index]];
        return { holdings: next };
      }),

      distributeEvenly: () => set(s => {
        if (s.holdings.length === 0) return s;
        const share = Math.floor((100 / s.holdings.length) * 10) / 10;
        const next = s.holdings.map(h => ({ ...h, targetPercent: share }));
        // Give the rounding remainder to the first row so the total is exactly 100.
        const drift = Math.round((100 - share * next.length) * 10) / 10;
        if (drift !== 0) next[0] = { ...next[0], targetPercent: Math.round((next[0].targetPercent + drift) * 10) / 10 };
        return { holdings: next };
      }),

      setMonthlyDeposit: (monthlyDeposit) => set({ monthlyDeposit: Math.max(0, monthlyDeposit) }),
      setHorizonYears: (horizonYears) => set({ horizonYears: Math.min(50, Math.max(1, horizonYears)) }),

      // One entry per month — re-reporting a month overwrites it.
      upsertEntry: (e) => set(s => {
        const existing = s.entries.find(x => x.month === e.month);
        if (existing) {
          return { entries: s.entries.map(x => (x.month === e.month ? { ...x, ...e } : x)) };
        }
        return { entries: [...s.entries, { ...e, id: uid() }] };
      }),

      removeEntry: (id) => set(s => ({ entries: s.entries.filter(e => e.id !== id) })),
    }),
    { name: 'mgs-custom-portfolio' }
  )
);
