import type { Track, TrackId, AllocationTarget, AssetClass } from '../types';
import { ASSET_META, WITHDRAW_RATE } from './defaults';

/**
 * MJS — 5 age-based tracks, on the traffic-light model:
 *   red    — years 1..phaseADuration: deposits split across the track mix
 *   yellow — the next phaseBDuration years: everything is consolidated into
 *            phaseBTarget (MSCI World) and every new deposit goes there alone
 *   green  — the year after that on: no new deposits, income is withdrawn
 *
 * The standard MGS timing is 25 years red then 5 years yellow, so green opens
 * in year 31. 'security' is the deliberate exception — it is the 60-65 track,
 * where 25 years of deposits would push income out to age 90.
 *
 * **תוקן 4.11.2026 — המינוף ירד מחמשת המסלולים.**
 *
 * כל מסלול כאן נשא כותרת מינוף — 20%, 15%, 10%, 5% — והמינוף היה אמיתי:
 * המפתח `dbxb` הצביע על קרן S&P 500 **ממונפת פי שתיים**. אין מינוף
 * במערכת, ולכן `dbxb` מצביע עכשיו על שרוול השבבים (SMH) ו-`eqqs` על
 * טכנולוגיה (XLKS) במקום נאסד״ק, שהוצא מכל המסלולים.
 *
 * **השדה `leverage` הוא אפס בכל מסלול,** ובמקומו הכותרת נוקבת במה
 * שהיא באמת: **איזה חלק מהתמהיל הוא שבבים וטכנולוגיה.** זה הגליד
 * שהיה שם מלכתחילה — 50% בבני 20 ויורד ל-10% בבני 60 — רק בלי
 * ההלוואה שהייתה חבויה בו.
 *
 * אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
export const TRACKS: Track[] = [
  {
    id: 'aggressive', nameHe: 'טורבו אלפא', nameEn: 'Turbo Alpha',
    ageMin: 20, ageMax: 30, dot: 'green', leverage: 0,
    taglineHe: 'חשיפה מקסימלית · 50% שבבים וטכנולוגיה',
    taglineEn: 'Max exposure · 50% semis and technology',
    allocations: { p500: 50, eqqs: 30, dbxb: 20 },
    phaseADuration: 25, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'stable', nameHe: 'טורבו מבוקר', nameEn: 'Controlled Turbo',
    ageMin: 30, ageMax: 40, dot: 'yellow', leverage: 0,
    taglineHe: 'צמיחה · 40% שבבים וטכנולוגיה',
    taglineEn: 'Growth · 40% semis and technology',
    allocations: { p500: 60, eqqs: 25, dbxb: 15 },
    phaseADuration: 25, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'mature', nameHe: 'שמרנות אקטיבית', nameEn: 'Active Conservatism',
    ageMin: 40, ageMax: 50, dot: 'orange', leverage: 0,
    taglineHe: 'איזון · 30% שבבים וטכנולוגיה',
    taglineEn: 'Balance · 30% semis and technology',
    allocations: { p500: 70, eqqs: 20, dbxb: 10 },
    phaseADuration: 25, phaseBDuration: 5, phaseBTarget: 'xmwo',
  },
  {
    id: 'defensive', nameHe: 'ביצור דינמי', nameEn: 'Dynamic Fortification',
    ageMin: 50, ageMax: 60, dot: 'red', leverage: 0,
    taglineHe: 'הגנתי · 20% שבבים וטכנולוגיה',
    taglineEn: 'Defensive · 20% semis and technology',
    allocations: { p500: 80, eqqs: 15, dbxb: 5 },
    phaseADuration: 25, phaseBDuration: 5, phaseBTarget: 'xmwo',
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
