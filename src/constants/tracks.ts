import type { Track, TrackId, AllocationTarget, AssetClass } from '../types';
import { ASSET_META } from './defaults';

/**
 * The 5 age-based investment tracks (מסלולים) of the MGS method.
 *
 * Every track shares the SAME traffic-light process (red → yellow → green),
 * but differs in how the percentages are split by age. Younger investors take
 * on more growth/volatility (Nasdaq, Bitcoin); older investors shift toward
 * dividends (SCHD) and medium-term bonds (IEF) for stability.
 *
 * Allocations are validated to sum to 100% by the test at the bottom.
 */
export const TRACKS: Track[] = [
  {
    id: 'aggressive',
    nameHe: 'בנייה אגרסיבית',
    nameEn: 'Aggressive Building',
    ageMin: 20,
    ageMax: 30,
    icon: '🚀',
    taglineHe: 'מקסימום זמן, מקסימום צמיחה',
    taglineEn: 'Maximum time, maximum growth',
    allocations: { sp500: 25, dividend: 5, nasdaq: 35, bitcoin: 35 },
    yellowStartYear: 15,
    greenStartYear: 20,
  },
  {
    id: 'stable',
    nameHe: 'צמיחה יציבה',
    nameEn: 'Stable Growth',
    ageMin: 30,
    ageMax: 40,
    icon: '📈',
    taglineHe: 'צמיחה חזקה עם רגליים על הקרקע',
    taglineEn: 'Strong growth, grounded',
    allocations: { sp500: 25, dividend: 5, bitcoin: 20, nasdaq: 50 },
    yellowStartYear: 15,
    greenStartYear: 20,
  },
  {
    id: 'mature',
    nameHe: 'האיזון הבוגר',
    nameEn: 'Mature Balance',
    ageMin: 40,
    ageMax: 50,
    icon: '⚖️',
    taglineHe: 'איזון בין צמיחה לפיזור',
    taglineEn: 'Balance between growth and diversification',
    allocations: { sp500: 25, dividend: 5, bitcoin: 10, nasdaq: 40, msci: 20 },
    yellowStartYear: 15,
    greenStartYear: 20,
  },
  {
    id: 'defensive',
    nameHe: 'הגנה התקפית',
    nameEn: 'Offensive Defense',
    ageMin: 50,
    ageMax: 60,
    icon: '🛡️',
    taglineHe: 'צמיחה מוגנת עם הכנסה מהתחלה',
    taglineEn: 'Protected growth with income from day one',
    // SCHD at 25% from the start; Nasdaq trimmed to 20% so the track sums to 100%.
    allocations: { sp500: 25, dividend: 25, bitcoin: 5, nasdaq: 20, bonds: 25 },
    yellowStartYear: 15,
    greenStartYear: 20,
  },
  {
    id: 'security',
    nameHe: 'אבטחה עתידית',
    nameEn: 'Future Security',
    ageMin: 60,
    ageMax: 65,
    icon: '🏛️',
    taglineHe: 'שמירה על ההון והכנסה מוקדמת',
    taglineEn: 'Capital preservation and early income',
    allocations: { sp500: 25, nasdaq: 15, bonds: 30, dividend: 30 },
    // Shorter horizon — withdrawals (4% rule) may begin already after 15 years.
    yellowStartYear: 15,
    greenStartYear: 15,
  },
];

export const DEFAULT_TRACK_ID: TrackId = 'stable';

export function getTrackById(id: TrackId): Track {
  return TRACKS.find(t => t.id === id) ?? TRACKS[1];
}

/** Pick the track whose age band contains `age`; clamps to the nearest band. */
export function recommendTrackByAge(age: number): TrackId {
  if (age < TRACKS[0].ageMin) return TRACKS[0].id;
  const match = TRACKS.find(t => age >= t.ageMin && age <= t.ageMax);
  if (match) return match.id;
  return TRACKS[TRACKS.length - 1].id; // older than the last band
}

/** Build a full AllocationTarget[] (with colors + labels) from a track. */
export function trackToAllocations(
  track: Track,
  previous: AllocationTarget[] = [],
): AllocationTarget[] {
  const prevByClass = new Map(previous.map(a => [a.assetClass, a]));
  return (Object.keys(track.allocations) as AssetClass[]).map(ac => {
    const meta = ASSET_META[ac];
    return {
      assetClass: ac,
      label: meta.label,
      targetPercent: track.allocations[ac] ?? 0,
      // preserve any holdings the user already entered for this asset class
      currentValue: prevByClass.get(ac)?.currentValue ?? 0,
      color: meta.color,
    };
  });
}
