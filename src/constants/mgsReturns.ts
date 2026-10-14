/**
 * Expected annual returns for the v4 assets, and where each figure came from.
 *
 * Every asset carries three numbers: what it actually did over the last ten
 * years, what it did over the longest history it has, and what the projection
 * uses. They are deliberately far apart. The last decade was one of the
 * strongest in market history — semiconductors did 34.3% a year in it and
 * 10.7% a year since 2000 — so projecting the decade forward would promise
 * something no long period has ever delivered. The projection runs on the long
 * history, trimmed down further, and the client sees all three side by side.
 */

import type { AssetId } from './mgsV4';

export type Scenario = 'conservative' | 'moderate' | 'optimistic';

export interface ReturnSpec {
  /** annual %, by scenario — what the projection actually uses */
  pct: Record<Scenario, number>;
  /** annual % over the last ten years, for context only */
  last10: number;
  /** annual % over the longest history available */
  longRun: number;
  /** how long that history is */
  longRunYears: number;
  /** what the long-run figure was measured on */
  source: string;
  /** true when no long history exists and the number is a judgement call */
  assumed?: boolean;
}

export const RETURNS: Record<AssetId, ReturnSpec> = {
  I500: {
    pct: { conservative: 6, moderate: 8, optimistic: 10 },
    last10: 15.8, longRun: 9.8, longRunYears: 57,
    source: 'S&P 500 מאז 1970',
  },
  EQQS: {
    pct: { conservative: 6, moderate: 9, optimistic: 12 },
    last10: 21.4, longRun: 12.98, longRunYears: 56,
    source: 'נאסד״ק 100 מאז 1971',
  },
  SMH: {
    pct: { conservative: 6, moderate: 9, optimistic: 13 },
    last10: 34.3, longRun: 10.7, longRunYears: 26,
    source: 'מוליכים למחצה מאז 2000, כולל התרסקות הדוט-קום',
  },
  SPMO: {
    pct: { conservative: 6, moderate: 8.5, optimistic: 11 },
    last10: 20.3, longRun: 19.1, longRunYears: 11,
    source: 'הקרן קיימת 11 שנה בלבד — כולן בשוק עולה',
    assumed: true,
  },
  QQQA: {
    pct: { conservative: 6, moderate: 9, optimistic: 12 },
    last10: 11.3, longRun: 11.3, longRunYears: 5,
    source: 'הקרן קיימת 5 שנים בלבד; העוגן הוא הנאסד״ק בניכוי עלויות',
    assumed: true,
  },
  JEPQ: {
    pct: { conservative: 5.5, moderate: 7.5, optimistic: 9 },
    last10: 18.6, longRun: 9.05, longRunYears: 56,
    source: 'שחזור על 56 שנה. הקרן עצמה קיימת 4.4 שנים בלבד',
  },
  BTC: {
    pct: { conservative: 5, moderate: 10, optimistic: 18 },
    last10: 62.9, longRun: 54.1, longRunYears: 12,
    source: 'קיים 12 שנה בלבד, ואין לכך תקדים. ההנחה שמרנית בכוונה',
    assumed: true,
  },
  WORLD: {
    pct: { conservative: 5, moderate: 7, optimistic: 9 },
    last10: 11.5, longRun: 10.0, longRunYears: 39,
    source: 'מדד עולמי ב-39 השנים האחרונות',
  },
};

export const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: 'שמרני',
  moderate: 'מתון',
  optimistic: 'אופטימי',
};

/** Annual return for one asset under one scenario, as a fraction. */
export const annualReturn = (asset: AssetId, s: Scenario): number =>
  RETURNS[asset].pct[s] / 100;

/** The same, compounded down to one month. */
export const monthlyReturn = (asset: AssetId, s: Scenario): number =>
  Math.pow(1 + annualReturn(asset, s), 1 / 12) - 1;
