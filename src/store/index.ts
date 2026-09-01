import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  AllocationTarget,
  Transaction,
  InvestmentPhase,
  SimulationParams,
  Goal,
  ActivityEntry,
  Notification,
  AssetClass,
  TrackId,
} from '../types';
import { DEFAULT_SIMULATION, DEFAULT_GOAL, TRANSITION_THRESHOLD } from '../constants/defaults';
import { DEFAULT_TRACK_ID, getTrackById, recommendTrackByAge, trackToAllocations } from '../constants/tracks';
import { DEFAULT_STRATEGY_ID } from '../constants/strategies';
import type { StrategyId } from '../constants/strategies';

const DEFAULT_AGE = 30;
const DEFAULT_TRACK_ALLOCATIONS = trackToAllocations(getTrackById(DEFAULT_TRACK_ID));

export interface StoreState {
  // Portfolio
  allocations: AllocationTarget[];
  currentPortfolioValue: number;
  monthlyDeposit: number;
  phase: InvestmentPhase;
  transitionThreshold: number;

  // Track (מסלול) selection
  userAge: number;
  selectedTrackId: TrackId;
  /** which investing method is active — each has its own tracks */
  selectedStrategyId: StrategyId;

  // Transactions
  transactions: Transaction[];

  // Simulation
  simulationParams: SimulationParams;

  // Goal
  goal: Goal;

  // Activity & Notifications
  activities: ActivityEntry[];
  notifications: Notification[];

  // Auth
  userId: string | null;

  // Actions
  setAllocations: (allocations: AllocationTarget[]) => void;
  updateAllocationValue: (assetClass: AssetClass, value: number) => void;
  setMonthlyDeposit: (amount: number) => void;
  setPhase: (phase: InvestmentPhase) => void;
  setTransitionThreshold: (amount: number) => void;

  setUserAge: (age: number) => void;
  setSelectedTrack: (id: TrackId) => void;
  setSelectedStrategy: (id: StrategyId) => void;

  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;

  setSimulationParams: (params: Partial<SimulationParams>) => void;
  setGoal: (goal: Partial<Goal>) => void;

  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void;
  addNotification: (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  setUserId: (id: string | null) => void;

  // Computed
  getTotalDeposited: () => number;
  getTotalWithdrawn: () => number;
  getProfit: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      allocations: DEFAULT_TRACK_ALLOCATIONS,
      currentPortfolioValue: 0,
      monthlyDeposit: DEFAULT_SIMULATION.monthlyDeposit,
      phase: 'growth',
      transitionThreshold: TRANSITION_THRESHOLD,

      userAge: DEFAULT_AGE,
      selectedTrackId: DEFAULT_TRACK_ID,
      selectedStrategyId: DEFAULT_STRATEGY_ID,

      transactions: [],
      simulationParams: DEFAULT_SIMULATION,
      goal: DEFAULT_GOAL,
      activities: [],
      notifications: [],
      userId: null,

      setAllocations: (allocations) => {
        const total = allocations.reduce((s, a) => s + a.currentValue, 0);
        set({
          allocations,
          currentPortfolioValue: total,
          simulationParams: { ...get().simulationParams, initialDeposit: total || get().simulationParams.initialDeposit },
        });
      },

      updateAllocationValue: (assetClass, value) => {
        const allocations = get().allocations.map(a =>
          a.assetClass === assetClass ? { ...a, currentValue: value } : a
        );
        const total = allocations.reduce((s, a) => s + a.currentValue, 0);
        set({
          allocations,
          currentPortfolioValue: total,
          // Sync simulation initial deposit to actual portfolio value
          simulationParams: { ...get().simulationParams, initialDeposit: total || get().simulationParams.initialDeposit },
        });
      },

      setMonthlyDeposit: (amount) => {
        set({
          monthlyDeposit: amount,
          simulationParams: { ...get().simulationParams, monthlyDeposit: amount },
        });
      },

      setPhase: (phase) => set({ phase }),
      setTransitionThreshold: (amount) => set({ transitionThreshold: amount }),

      // Setting the age auto-selects the recommended track for that age band.
      setUserAge: (age) => {
        const trackId = recommendTrackByAge(age);
        const track = getTrackById(trackId);
        const allocations = trackToAllocations(track, get().allocations);
        set({
          userAge: age,
          selectedTrackId: trackId,
          allocations,
          currentPortfolioValue: allocations.reduce((s, a) => s + a.currentValue, 0),
        });
        get().addActivity({
          action: `Age set to ${age} → track "${track.nameEn}"`,
          type: 'system',
        });
      },

      // Manual track override — keeps the user's age but switches allocations.
      setSelectedStrategy: (id) => set({ selectedStrategyId: id }),

      setSelectedTrack: (id) => {
        const track = getTrackById(id);
        const allocations = trackToAllocations(track, get().allocations);
        set({
          selectedTrackId: id,
          allocations,
          currentPortfolioValue: allocations.reduce((s, a) => s + a.currentValue, 0),
        });
        get().addActivity({
          action: `Track changed to "${track.nameEn}"`,
          type: 'system',
        });
      },

      setSimulationParams: (params) => {
        const current = get();
        const newParams = { ...current.simulationParams, ...params };

        // If initialDeposit changed → sync back to currentPortfolioValue and scale allocations
        if (params.initialDeposit !== undefined) {
          const newTotal = params.initialDeposit;
          const oldTotal = current.currentPortfolioValue;
          let allocations = current.allocations;

          if (oldTotal > 0 && newTotal > 0) {
            // Scale all individual asset values proportionally
            const ratio = newTotal / oldTotal;
            allocations = current.allocations.map(a => ({
              ...a,
              currentValue: Math.round(a.currentValue * ratio),
            }));
          }

          set({ simulationParams: newParams, currentPortfolioValue: newTotal, allocations });
          return;
        }

        // If monthlyDeposit changed → also sync store.monthlyDeposit
        if (params.monthlyDeposit !== undefined) {
          set({ simulationParams: newParams, monthlyDeposit: params.monthlyDeposit });
          return;
        }

        set({ simulationParams: newParams });
      },

      setGoal: (goal) => {
        set({ goal: { ...get().goal, ...goal } });
      },

      addTransaction: (tx) => {
        const newTx: Transaction = { ...tx, id: uuid() };
        const transactions = [newTx, ...get().transactions];
        set({ transactions });

        if (tx.type === 'deposit') {
          const newTotal = get().currentPortfolioValue + tx.amount;
          set({ currentPortfolioValue: newTotal });
          if (tx.allocation) {
            const allocations = get().allocations.map(a => {
              const add = tx.allocation?.[a.assetClass] ?? 0;
              return { ...a, currentValue: a.currentValue + add };
            });
            const total = allocations.reduce((s, a) => s + a.currentValue, 0);
            set({
              allocations,
              currentPortfolioValue: total,
              simulationParams: { ...get().simulationParams, initialDeposit: total },
            });
          } else {
            set({ simulationParams: { ...get().simulationParams, initialDeposit: newTotal } });
          }
        } else if (tx.type === 'withdrawal') {
          const newTotal = Math.max(0, get().currentPortfolioValue - tx.amount);
          set({
            currentPortfolioValue: newTotal,
            simulationParams: { ...get().simulationParams, initialDeposit: newTotal },
          });
        } else if (tx.type === 'update') {
          set({
            currentPortfolioValue: tx.amount,
            simulationParams: { ...get().simulationParams, initialDeposit: tx.amount },
          });
        }

        get().addActivity({
          action: tx.type === 'deposit'
            ? `Deposited ${tx.amount}`
            : tx.type === 'withdrawal'
            ? `Withdrew ${tx.amount}`
            : `Updated portfolio value to ${tx.amount}`,
          type: tx.type === 'update' ? 'update' : tx.type,
          amount: tx.amount,
          notes: tx.notes,
        });
      },

      deleteTransaction: (id) => {
        set({ transactions: get().transactions.filter(t => t.id !== id) });
      },

      addActivity: (entry) => {
        const newEntry: ActivityEntry = {
          ...entry,
          id: uuid(),
          timestamp: new Date().toISOString(),
        };
        set({ activities: [newEntry, ...get().activities].slice(0, 100) });
      },

      addNotification: (notif) => {
        const newNotif: Notification = {
          ...notif,
          id: uuid(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set({ notifications: [newNotif, ...get().notifications].slice(0, 50) });
      },

      markNotificationRead: (id) => {
        set({
          notifications: get().notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        });
      },

      clearNotifications: () => {
        set({ notifications: get().notifications.map(n => ({ ...n, read: true })) });
      },

      setUserId: (id) => set({ userId: id }),

      getTotalDeposited: () =>
        get().transactions
          .filter(t => t.type === 'deposit')
          .reduce((s, t) => s + t.amount, 0),

      getTotalWithdrawn: () =>
        get().transactions
          .filter(t => t.type === 'withdrawal')
          .reduce((s, t) => s + t.amount, 0),

      getProfit: () => {
        const totalDeposited = get().getTotalDeposited();
        const totalWithdrawn = get().getTotalWithdrawn();
        return get().currentPortfolioValue - totalDeposited + totalWithdrawn;
      },
    }),
    {
      name: 'wealth-simulator',
      version: 7,
      migrate: (persistedState: unknown, version: number) => {
        let s = persistedState as Record<string, unknown>;
        if (version < 3) {
          // v3: reset simulation params — zero out yearlyDepositIncrease,
          // preserve portfolio value and monthly deposit the user set intentionally
          const simParams = s.simulationParams as Record<string, unknown> | undefined;
          s = {
            ...s,
            simulationParams: {
              ...DEFAULT_SIMULATION,
              yearlyDepositIncrease: 0,
              initialDeposit: (s.currentPortfolioValue as number) || DEFAULT_SIMULATION.initialDeposit,
              monthlyDeposit: simParams?.monthlyDeposit ?? DEFAULT_SIMULATION.monthlyDeposit,
            },
          };
        }
        if (version < 4) {
          // v4: introduce age-based tracks + traffic-light model.
          // Adopt the default track's allocation (preserving any holdings the
          // user already entered for matching asset classes).
          const prev = (s.allocations as AllocationTarget[]) ?? [];
          s = {
            ...s,
            userAge: DEFAULT_AGE,
            selectedTrackId: DEFAULT_TRACK_ID,
            allocations: trackToAllocations(getTrackById(DEFAULT_TRACK_ID), prev),
          };
        }
        if (version < 5) {
          // v5: asset universe replaced with 7 Irish ETFs. Old asset classes
          // (sp500/nasdaq/bitcoin/dividend/msci/bonds) no longer exist — reset
          // allocations to the selected track's new ETF allocation.
          const tid = (s.selectedTrackId as TrackId) || DEFAULT_TRACK_ID;
          s = {
            ...s,
            selectedTrackId: tid,
            allocations: trackToAllocations(getTrackById(tid)),
            currentPortfolioValue: 0,
          };
        }
        if (version < 7) {
          // v6/v7: MJS asset universe (DBXB/EQQS/P500/XMWO) + per-track phases.
          const tid = (s.selectedTrackId as TrackId) || DEFAULT_TRACK_ID;
          s = {
            ...s,
            selectedTrackId: tid,
            allocations: trackToAllocations(getTrackById(tid)),
            currentPortfolioValue: 0,
          };
        }
        return s;
      },
    }
  )
);
