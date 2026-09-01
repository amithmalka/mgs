import type { Track, TrackId, AllocationTarget, AssetClass } from '../types';
import { ASSET_META, WITHDRAW_RATE } from './defaults';

/**
 * MJS — 5 age-based tracks. Phase A (accumulation, smart-DCA) runs for
 * phaseADuration years; Phase B (consolidation) then migrates everything into
 * phaseBTarget (MSCI World) and routes new deposits there for phaseBDuration
 * years; Phase C (year after that) switches to 4% smart harvesting.
 */
export const TRACKS: Track[] = [
  {
    id: 'aggressive', nameHe: 'טורבו אלפא', nameEn: 'Turbo Alpha',
    ageMin: 20, ageMax: 30, dot: 'green', leverage: 20,
    taglineHe: 'חשיפה מקסימלית, מינוף 20%', taglineEn: 'Max exposure, 20% leverage',
    allocations: { p500: 50, eqqs: 30, dbxb: 20 },
    phaseADuration: 20, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'stable', nameHe: 'טורבו מבוקר', nameEn: 'Controlled Turbo',
    ageMin: 30, ageMax: 40, dot: 'yellow', leverage: 15,
    taglineHe: 'צמיחה עם מינוף 15%', taglineEn: 'Growth with 15% leverage',
    allocations: { p500: 60, eqqs: 25, dbxb: 15 },
    phaseADuration: 20, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'mature', nameHe: 'שמרנות אקטיבית', nameEn: 'Active Conservatism',
    ageMin: 40, ageMax: 50, dot: 'orange', leverage: 10,
    taglineHe: 'איזון עם מינוף 10%', taglineEn: 'Balance with 10% leverage',
    allocations: { p500: 70, eqqs: 20, dbxb: 10 },
    phaseADuration: 20, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'defensive', nameHe: 'ביצור דינמי', nameEn: 'Dynamic Fortification',
    ageMin: 50, ageMax: 60, dot: 'red', leverage: 5,
    taglineHe: 'הגנתי עם נגיעת מינוף 5%', taglineEn: 'Defensive, 5% leverage',
    allocations: { p500: 80, eqqs: 15, dbxb: 5 },
    phaseADuration: 20, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'security', nameHe: 'מגן פלדה', nameEn: 'Steel Shield',
    ageMin: 60, ageMax: 65, dot: 'brown', leverage: 0,
    taglineHe: 'אופק קצר — צבירה 10 שנים', taglineEn: 'Short horizon — 10yr accumulation',
    allocations: { p500: 90, eqqs: 10 },
    phaseADuration: 10, phaseBDuration: 0, phaseBTarget: 'xmwo',
  },
];

export const DEFAULT_TRACK_ID: TrackId = 'stable';

export function getTrackById(id: TrackId): Track {
  return TRACKS.find(t => t.id === id) ?? TRACKS[1];
}

export function recommendTrackByAge(age: number): TrackId {
  if (age < TRACKS[0].ageMin) return TRACKS[0].id;
  const match = TRACKS.find(t => age >= t.ageMin && age <= t.ageMax);
  return (match ?? TRACKS[TRACKS.length - 1]).id;
}

/** Phase-boundary + routing options for simulateTrack(), derived from a track. */
export function trackPhaseOpts(track: Track) {
  const turboEnd = track.phaseADuration;
  const groundingEnd = track.phaseADuration + track.phaseBDuration;
  return {
    turboEnd,
    groundingEnd,
    incubationEnd: groundingEnd, // MJS has no separate incubation phase
    grounding: { [track.phaseBTarget]: 100 } as Partial<Record<AssetClass, number>>,
    incubation: {} as Partial<Record<AssetClass, number>>,
    consolidateTo: track.phaseBTarget,
    withdrawRate: WITHDRAW_RATE,
  };
}

/** Union of Phase-A assets + the Phase-B target, as full AllocationTargets. */
export function trackToAllocations(
  track: Track,
  previous: AllocationTarget[] = [],
): AllocationTarget[] {
  const prevByClass = new Map(previous.map(a => [a.assetClass, a]));
  const classes = new Set<AssetClass>([
    ...(Object.keys(track.allocations) as AssetClass[]),
    track.phaseBTarget,
  ]);
  return [...classes].map(ac => {
    const meta = ASSET_META[ac];
    return {
      assetClass: ac,
      label: meta.label,
      targetPercent: track.allocations[ac] ?? 0,
      currentValue: prevByClass.get(ac)?.currentValue ?? 0,
      color: meta.color,
    };
  });
}
