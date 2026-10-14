import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SleeveId } from '../constants/mgsScenarios';

/**
 * What the plan actually holds, and the memory the rules need.
 *
 * The arithmetic of a month is easy; the state is not. A person doing this
 * alone has to carry each sleeve's all-time high, whether it has fallen far
 * enough since the last harvest to arm the next one, and the cost basis left
 * after every partial sale. That is what lives here.
 */
export interface Lot {
  /** fractional units held */
  units: number;
  /** what they cost, in shekels */
  cost: number;
  /** the highest price ever seen for this sleeve, in its own currency */
  ath: number;
  /** true once it has fallen far enough from that high to arm a harvest */
  armed: boolean;
  /** plan month of the last harvest, 0 if never */
  lastHarvest: number;
}

/** The income sleeve: what the harvests bought, and what it has paid out. */
export interface Jepq {
  units: number;
  cost: number;
  /** every distribution so far, after tax */
  received: number;
}

export interface MonthLog {
  /** 'YYYY-MM' */
  month: string;
  /** what went in, per sleeve, in shekels */
  bought: Partial<Record<SleeveId, number>>;
  /** what was harvested to JEPQ, net of tax */
  harvested: number;
  taxPaid: number;
  deposit: number;
  /** JEPQ's own distribution that month, after tax */
  income: number;
}

const empty = (): Lot => ({ units: 0, cost: 0, ath: 0, armed: false, lastHarvest: 0 });

interface PlanState {
  /** set once the user says the plan is live */
  started: boolean;
  /** 'YYYY-MM' of the first month */
  startMonth: string;
  lots: Record<SleeveId, Lot>;
  jepq: Jepq;
  log: MonthLog[];

  start: (month: string) => void;
  setLot: (sleeve: SleeveId, patch: Partial<Lot>) => void;
  recordMonth: (entry: MonthLog, lots: Record<SleeveId, Lot>, jepq: Jepq) => void;
  undoLast: () => void;
  reset: () => void;
}

const emptyLots = (): Record<SleeveId, Lot> => ({
  BTC: empty(), SMH: empty(), SPMO: empty(), XLK: empty(), WORLD: empty(), SYN: empty(),
});

export const thisMonth = () => new Date().toISOString().slice(0, 7);

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      started: false,
      startMonth: thisMonth(),
      lots: emptyLots(),
      jepq: { units: 0, cost: 0, received: 0 },
      log: [],

      start: (month) => set({ started: true, startMonth: month }),
      setLot: (sleeve, patch) => set(s => ({
        lots: { ...s.lots, [sleeve]: { ...s.lots[sleeve], ...patch } },
      })),
      recordMonth: (entry, lots, jepq) => set(s => ({
        log: [...s.log.filter(l => l.month !== entry.month), entry]
          .sort((a, b) => a.month.localeCompare(b.month)),
        lots, jepq,
      })),
      undoLast: () => set(s => ({ log: s.log.slice(0, -1) })),
      reset: () => set({ started: false, lots: emptyLots(),
        jepq: { units: 0, cost: 0, received: 0 }, log: [] }),
    }),
    { name: 'mgs-plan' },
  ),
);

/** How many months the plan has been running, 1-based. */
export function planMonth(startMonth: string, now = thisMonth()): number {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ny, nm] = now.split('-').map(Number);
  return Math.max(1, (ny - sy) * 12 + (nm - sm) + 1);
}
