import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MgsAsset, MgsTrackId } from '../constants/mgsTracks';
import { getMgsTrack, recommendMgsTrack, defaultHorizon } from '../constants/mgsTracks';

export type Scenario = 'conservative' | 'moderate' | 'aggressive';

/** One holding: what it is worth today and what was paid for it. */
export interface Holding { value: number; cost: number }

/**
 * The student's MGS settings.
 *
 * The monthly deposit itself lives in the main store (simulationParams), which
 * tracking already reads; this holds everything specific to the method.
 * Stored on the device, like the rest of the portfolio data.
 */
interface MgsState {
  age: number;
  trackId: MgsTrackId;
  horizonYears: number;
  /** first month of the plan, 'YYYY-MM' */
  startMonth: string;
  holdings: Record<MgsAsset, Holding>;
  /** one-off deposits by plan month (1-based), replacing that month's amount */
  overrides: Record<number, number>;
  scenario: Scenario;

  setAge: (age: number) => void;
  setTrack: (id: MgsTrackId) => void;
  setHorizon: (years: number) => void;
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
    (set, get) => ({
      age: DEFAULT_AGE,
      trackId: recommendMgsTrack(DEFAULT_AGE),
      horizonYears: defaultHorizon(getMgsTrack(recommendMgsTrack(DEFAULT_AGE)), DEFAULT_AGE),
      startMonth: thisMonth(),
      holdings: emptyHoldings(),
      overrides: {},
      scenario: 'moderate',

      // Changing age re-routes to the matching track, as onboarding requires.
      setAge: (age) => {
        const trackId = recommendMgsTrack(age);
        set({ age, trackId, horizonYears: defaultHorizon(getMgsTrack(trackId), age) });
      },

      // Fixed-horizon tracks carry their own horizon; Track A keeps the user's.
      setTrack: (trackId) => {
        const t = getMgsTrack(trackId);
        set({ trackId, horizonYears: t.horizonYears ?? defaultHorizon(t, get().age) });
      },

      setHorizon: (years) => {
        const t = getMgsTrack(get().trackId);
        if (t.horizonYears !== null) return; // fixed by the track
        const [lo, hi] = t.horizonRange ?? [15, 35];
        set({ horizonYears: Math.min(hi, Math.max(lo, Math.round(years))) });
      },

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
    { name: 'mgs-engine' }
  )
);

/** Plan month (1-based) that `today` falls in, given the plan's start. */
export function currentPlanMonth(startMonth: string, today = new Date()): number {
  const [y, m] = startMonth.split('-').map(Number);
  if (!y || !m) return 1;
  return Math.max(1, (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m) + 1);
}
