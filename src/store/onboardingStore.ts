import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * What the opening questionnaire learned, kept so it is asked once.
 *
 * Age and the monthly deposit are not here: they belong to the stores the rest
 * of the app already reads, and the questionnaire writes straight into those.
 */
interface OnboardingState {
  done: boolean;
  /** 1 = cash flow only, 2 = growth and cash flow */
  track: 1 | 2;

  kidsDone: boolean;
  childAge: number;
  childDeposit: number;

  finish: (track: 1 | 2) => void;
  finishKids: (childAge: number, childDeposit: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      track: 2,
      kidsDone: false,
      childAge: 0,
      childDeposit: 500,

      finish: (track) => set({ done: true, track }),
      finishKids: (childAge, childDeposit) => set({
        kidsDone: true,
        childAge: Math.min(20, Math.max(0, Math.round(childAge) || 0)),
        childDeposit: Math.max(1, Math.round(childDeposit) || 1),
      }),
      reset: () => set({ done: false, kidsDone: false }),
    }),
    { name: 'mgs-onboarding' },
  ),
);
