import type { TrackId } from '../types';

/**
 * The investing methods MGS teaches. Each one is a different answer to "what
 * am I investing FOR", and therefore has its own phase timing and its own set
 * of age tracks.
 */
export type StrategyId = 'apartment' | 'wealth';

export interface Strategy {
  id: StrategyId;
  nameHe: string;
  nameEn: string;
  taglineHe: string;
  taglineEn: string;
  /** who this method is for — shown so a student can tell if it applies */
  forWhoHe: string;
  forWhoEn: string;
  /** short phase summary, or null while the method is still being defined */
  phasesHe: string | null;
  phasesEn: string | null;
  /** age tracks this method offers; null means its rules are not defined yet */
  tracks: TrackId[] | null;
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'apartment',
    nameHe: 'משקיעה להשקעה (במקום דירה)',
    nameEn: 'Into Investing (Instead of an Apartment)',
    taglineHe: 'להחליף את קניית הדירה בהשקעה מתוכננת.',
    taglineEn: 'Replace buying a property with a planned investment.',
    forWhoHe: 'למי ששוקל לקנות דירה — ובוחר להשקיע את אותו כסף במקום.',
    forWhoEn: 'For anyone weighing up buying a property, and choosing to invest that money instead.',
    phasesHe: '25 שנות הפקדה · 5 שנות ייצוב במדד העולמי · הכנסה משנה 31',
    phasesEn: '25 years of deposits · 5 years consolidating · income from year 31',
    tracks: ['aggressive', 'stable', 'mature', 'defensive', 'security'],
  },
  {
    id: 'wealth',
    nameHe: 'מהשקעה לעושר',
    nameEn: 'From Investing to Wealth',
    taglineHe: 'שיטת השקעה כללית — לא קשורה לרכישת דירה.',
    taglineEn: 'A general investing method, not tied to buying property.',
    forWhoHe: 'למי שרוצה לבנות הון לאורך זמן בלי שהיעד יהיה דירה.',
    forWhoEn: 'For building wealth over time, with no property purchase as the goal.',
    phasesHe: null,
    phasesEn: null,
    tracks: null,
  },
];

export const DEFAULT_STRATEGY_ID: StrategyId = 'apartment';

export function getStrategy(id: StrategyId): Strategy {
  return STRATEGIES.find(s => s.id === id) ?? STRATEGIES[0];
}
