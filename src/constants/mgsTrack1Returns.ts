/**
 * What track 1's six assets are assumed to return, and what they actually did.
 *
 * Each carries the last ten years, the longest history it has, and the figure
 * the projection uses — in that order, because the gap between the first two is
 * the whole point. The last decade was exceptional: technology did 24.8% a year
 * in it and 10.7% a year since 1998, and only the second number has lived
 * through a dot-com. The projection runs below even the long figure.
 */

import type { T1Asset } from './mgsTrack1';

export type Scenario = 'conservative' | 'moderate' | 'optimistic';

export interface T1Return {
  pct: Record<Scenario, number>;
  /** annual %, trailing ten years */
  last10: number;
  /** annual % over the longest history available */
  longRun: number;
  longRunYears: number;
  source: string;
  /** true when the history is too short to lean on */
  assumed?: boolean;
}

export const T1_RETURNS: Record<T1Asset, T1Return> = {
  BTC: {
    pct: { conservative: 5, moderate: 15, optimistic: 22 },
    last10: 63.4, longRun: 54.1, longRunYears: 12,
    source: 'קיים 12 שנה בלבד ואין לכך תקדים — ההנחה שמרנית בכוונה',
    assumed: true,
  },
  SMH: {
    pct: { conservative: 6, moderate: 9, optimistic: 13 },
    last10: 34.3, longRun: 10.7, longRunYears: 26,
    source: 'מוליכים למחצה מאז 2000, כולל התרסקות הדוט-קום',
  },
  SPMO: {
    pct: { conservative: 6, moderate: 8.5, optimistic: 11 },
    last10: 20.3, longRun: 19.1, longRunYears: 11,
    source: 'הקרן קיימת 11 שנה בלבד, כולן בשוק עולה',
    assumed: true,
  },
  XLK: {
    pct: { conservative: 6, moderate: 9, optimistic: 12 },
    last10: 24.8, longRun: 10.7, longRunYears: 28,
    source: 'טכנולוגיה מאז דצמבר 1998 — כולל הדוט-קום',
  },
  JEPQ: {
    pct: { conservative: 5.5, moderate: 7.5, optimistic: 9 },
    last10: 16.4, longRun: 9.05, longRunYears: 56,
    source: 'השחזור על 56 שנה נותן 9.05%. הקרן עצמה בת 4.4 שנים ועשתה 16.4%',
  },
  WORLD: {
    pct: { conservative: 5, moderate: 7, optimistic: 9 },
    last10: 13.2, longRun: 10.0, longRunYears: 39,
    source: 'מדד עולמי ב-39 השנים האחרונות',
  },
};

export const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: 'שמרני',
  moderate: 'מתון',
  optimistic: 'אופטימי',
};
