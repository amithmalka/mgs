import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MgsAsset } from '../constants/mgsTracks';

export type Scenario = 'conservative' | 'moderate' | 'aggressive';

/** One holding: what it is worth today and what was paid for it. */
export interface Holding { value: number; cost: number }

/**
 * The student's MGS settings.
 *
 * Age is the only lever: it sets the leveraged target, the shift date and the
 * withdrawal date, so there is no track or horizon to store alongside it.
 * The monthly deposit lives in the main store (simulationParams), which
 * tracking already reads.
 */
interface MgsState {
  age: number;
  /** first month of the plan, 'YYYY-MM' */
  startMonth: string;
  holdings: Record<MgsAsset, Holding>;
  /** one-off deposits by plan month (1-based), replacing that month's amount */
  overrides: Record<number, number>;
  scenario: Scenario;

  setAge: (age: number) => void;
  setStartMonth: (ym: string) => void;
  setHolding: (asset: MgsAsset, patch: Partial<Holding>) => void;
  setOverride: (month: number, amount: number) => void;
  removeOverride: (month: number) => void;
  setScenario: (s: Scenario) => void;
}

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const emptyHoldings = (): Record<MgsAsset, Holding> => ({
  I500: { value: 0, cost: 0 }, EQQS: { value: 0, cost: 0 },
  QQQ3: { value: 0, cost: 0 }, MWRD: { value: 0, cost: 0 },
});

const DEFAULT_AGE = 30;

export const useMgsStore = create<MgsState>()(
  persist(
    (set) => ({
      age: DEFAULT_AGE,
      startMonth: thisMonth(),
      holdings: emptyHoldings(),
      overrides: {},
      scenario: 'moderate',

      setAge: (age) => set({ age: Math.min(75, Math.max(18, Math.round(age) || 0)) }),
      setStartMonth: (startMonth) => set({ startMonth }),

      setHolding: (asset, patch) => set(s => ({
        holdings: { ...s.holdings, [asset]: { ...s.holdings[asset], ...patch } },
      })),

      setOverride: (month, amount) => set(s => ({
        overrides: { ...s.overrides, [month]: Math.max(0, amount) },
      })),

      removeOverride: (month) => set(s => {
        const next = { ...s.overrides };
        delete next[month];
        return { overrides: next };
      }),

      setScenario: (scenario) => set({ scenario }),
    }),
    {
      name: 'mgs-engine',
      version: 3,
      /**
       * v1 and v2 stored a chosen track and horizon. Both are now derived from
       * age alone, so they are simply dropped; anything else the user set —
       * age, holdings, one-off deposits — carries over untouched.
       */
      migrate: (persisted) => {
        const s = persisted as Partial<MgsState> & { trackId?: string; horizonYears?: number };
        if (!s) return s as MgsState;
        const { trackId: _t, horizonYears: _h, ...rest } = s;
        void _t; void _h;
        return rest as MgsState;
      },
    }
  )
);

/** Plan month (1-based) that `today` falls in, given the plan's start. */
export function currentPlanMonth(startMonth: string, today = new Date()): number {
  const [y, m] = startMonth.split('-').map(Number);
  if (!y || !m) return 1;
  return Math.max(1, (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m) + 1);
}
