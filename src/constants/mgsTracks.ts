/**
 * MGS Multi-Asset Portfolio — assets and age-based tracks.
 *
 * Every asset carries the UCITS instrument the method names and a separate US
 * `proxy` for price/history. None of the four UCITS tickers is served on our
 * data plan, and a raw ticker is not safe to trust anyway: SPXS, used by the
 * other method, resolves to a 3x BEAR fund at our provider.
 */

/** **נאסד״ק הוסר מ-MGS ב-4.11.2026, ובמקומו טכנולוגיה ושבבים.**
 *
 *  עד כאן היו כאן `EQQS` (נאסד״ק 100) ו-`QQQ3` (נאסד״ק 100 ממונף
 *  פי 3), והם היו **62.5% משני המסלולים הצעירים**.
 *
 *  **הנימוק הראשון: נאסד״ק הוא אותו דבר, לא דבר נוסף.** המתאם
 *  החודשי בין נאסד״ק-100 לתמהיל טכנולוגיה־ושבבים הוא **0.958 עד
 *  0.965**, ועקבי בשני חלונות נפרדים — חמש שנים ו-25 שנה. להחזיק
 *  את שניהם זה להחזיק את אותה חשיפה פעמיים תחת שני שמות.
 *
 *  **הנימוק השני, והוא הכבד: המדידה על חלון זהה.** I500/נאסד״ק/
 *  ממונף מול I500/טכנולוגיה/שבבים, אותם 14.8 חודשים בדיוק
 *  (ינואר 2012 – אוקטובר 2026, החלון שהמוצר הממונף מאפשר):
 *
 *  | | תשואה | תנודתיות | יחס | נפילה | התאוששות |
 *  |---|---|---|---|---|---|
 *  | נאסד״ק + ממונף | 24.07% | 25.02% | 0.96 | −44.0% | 25 ח׳ |
 *  | טכנולוגיה + שבבים | 20.02% | **18.07%** | **1.11** | **−31.0%** | **18 ח׳** |
 *
 *  ההחלפה מנצחת בכל מדד סיכון. 4 נקודות התשואה שהיא מוותרת עליהן
 *  נמדדו **בחלון שמחמיא למינוף**: TQQQ נולד בפברואר 2010, אחרי
 *  המשבר, ולא ראה אף דוב אמיתי.
 *
 *  **והנימוק השלישי, על המינוף בפרט.** נאסד״ק-100 ירד **81.1%**
 *  בהתפוצצות הדוט-קום, ולקח לו **174 חודשים — ארבע־עשרה שנים
 *  וחצי** לחזור לשיא. מוצר ממונף פי 3 על מדד שעשה את זה פעם אחת
 *  אינו ירידה עמוקה, הוא מחיקה. טכנולוגיה ושבבים ירדו באותו משבר
 *  56.6% וחזרו ב-72 חודשים — גם זה רע, וגם זה חצי.
 *
 *  **מה שנשאר: שני נכסים רחבים ושני מנועי צמיחה, בלי מינוף ובלי
 *  כפילות.** אלה גם בדיוק הרכיבים שבקומבינציות — XLKS ו-SMH — כך
 *  ש-MGS והמסלולים מחזיקים את אותה חשיפה. */
export type MgsAsset = 'I500' | 'TECH' | 'SEMI' | 'MWRD';

export interface MgsAssetMeta {
  key: MgsAsset;
  labelHe: string;
  labelEn: string;
  isin?: string;
  proxy: string;
  color: string;
  leveraged: boolean;
}

export const MGS_ASSETS: Record<MgsAsset, MgsAssetMeta> = {
  I500: { key: 'I500', labelHe: 'S&P 500 סינתטי', labelEn: 'S&P 500 Synthetic', isin: 'IE00B3YCGJ38', proxy: 'SPY',  color: '#4ADE80', leveraged: false },
  TECH: { key: 'TECH', labelHe: 'טכנולוגיה',      labelEn: 'Technology',        isin: 'IE00B3VSSL01', proxy: 'XLK',  color: '#5EE6D0', leveraged: false },
  SEMI: { key: 'SEMI', labelHe: 'מוליכים למחצה',  labelEn: 'Semiconductors',    isin: 'IE00BMC38736', proxy: 'SOXX', color: '#8193FA', leveraged: false },
  MWRD: { key: 'MWRD', labelHe: 'MSCI World סינתטי', labelEn: 'MSCI World Synthetic', isin: 'IE00B60SX394', proxy: 'URTH', color: '#4ADE80', leveraged: false },
};

/** **ההנחה השנתית לכל נכס, לפי תרחיש (%).**
 *
 *  **עודכנה 4.11.2026 עם הסרת נאסד״ק, והיא נמוכה מקודמתה בכוונה.**
 *  המספרים הקודמים ל-EQQS היו 9 / 14 / 20 ול-QQQ3 5 / 22 / 30 —
 *  והם היו **הקרנה של מה שנמדד**, לא הנחה קדימה. 30% לשנה אינה
 *  הנחה, היא התשואה של עשור ממונף אחרי משבר.
 *
 *  **כאן טכנולוגיה ושבבים מעוגנים באותו מקור שכל האפליקציה
 *  משתמשת בו** — `forward.ts`, שבונה מלמטה למעלה לפי דאמודראן
 *  NYU (ינואר 2026) ו-LTCMA של ג׳יי־פי מורגן: טכנולוגיה 9.64%
 *  (תוכנה, 309 פירמות) ושבבים 10.72% (66 פירמות, בטא 1.52).
 *  התרחיש ה״מתון״ יושב עליהם, והשמרני והאגרסיבי סביבם.
 *
 *  **זה מוריד את התחזית של MGS, וזה תיקון ולא נזק.** */
export const MGS_RETURNS: Record<'conservative' | 'moderate' | 'aggressive', Record<MgsAsset, number>> = {
  conservative: { I500: 7,  TECH: 7,  SEMI: 7,  MWRD: 5  },
  moderate:     { I500: 10, TECH: 10, SEMI: 11, MWRD: 8  },
  aggressive:   { I500: 14, TECH: 13, SEMI: 15, MWRD: 11 },
};

export type MgsTrackId = 'A_YOUTH' | 'B_MID' | 'C50_15' | 'C50_20' | 'C60_10' | 'C60_15';

export interface MgsTrack {
  id: MgsTrackId;
  nameHe: string;
  nameEn: string;
  ageLabel: string;
  /** fixed horizon in years, or null when the user chooses it (Track A) */
  horizonYears: number | null;
  /** allowed range when the horizon is user-chosen */
  horizonRange?: [number, number];
  /** accumulation weights, 0..1 */
  weights: Partial<Record<MgsAsset, number>>;
  /** final years routed 100% to MWRD; 0 = no de-risking phase */
  deRiskYears: number;
  leveraged: boolean;
}

/** **תמהיל הצמיחה — אותם משקלים שנמדדו, בלי מינוף.**
 *  37.5 / 37.5 / 25 הם בדיוק המשקלים שבהם נמדד היחס 1.11 מול
 *  0.96 של הגרסה עם נאסד״ק הממונף. */
const GROWTH_MIX = { I500: 0.375, TECH: 0.375, SEMI: 0.25 };

export const MGS_TRACKS: MgsTrack[] = [
  {
    id: 'A_YOUTH', nameHe: 'צמיחה', nameEn: 'Growth', ageLabel: '20–40',
    horizonYears: null, horizonRange: [15, 35],
    weights: GROWTH_MIX, deRiskYears: 5, leveraged: false,
  },
  {
    // Section 3 of the spec says years 1–6 leveraged, 7–10 MWRD: 4 years of
    // de-risking. Its QA checklist says 5. Kept as written in Section 3.
    id: 'B_MID', nameHe: 'מסלול ביניים', nameEn: 'Mid-Path', ageLabel: '45',
    horizonYears: 10, weights: GROWTH_MIX, deRiskYears: 4, leveraged: false,
  },
  { id: 'C50_15', nameHe: 'גיל 50 · פרישה ב-65', nameEn: 'Age 50 · retire at 65', ageLabel: '50',
    horizonYears: 15, weights: { I500: 0.60, MWRD: 0.40 }, deRiskYears: 0, leveraged: false },
  { id: 'C50_20', nameHe: 'גיל 50 · פרישה ב-70', nameEn: 'Age 50 · retire at 70', ageLabel: '50',
    horizonYears: 20, weights: { I500: 0.50, MWRD: 0.50 }, deRiskYears: 0, leveraged: false },
  { id: 'C60_10', nameHe: 'גיל 60 · פרישה ב-70', nameEn: 'Age 60 · retire at 70', ageLabel: '60',
    horizonYears: 10, weights: { I500: 0.40, MWRD: 0.60 }, deRiskYears: 0, leveraged: false },
  { id: 'C60_15', nameHe: 'גיל 60 · פרישה ב-75', nameEn: 'Age 60 · retire at 75', ageLabel: '60',
    horizonYears: 15, weights: { I500: 0.30, MWRD: 0.70 }, deRiskYears: 0, leveraged: false },
];

export function getMgsTrack(id: MgsTrackId): MgsTrack {
  return MGS_TRACKS.find(t => t.id === id) ?? MGS_TRACKS[0];
}

/**
 * Recommend a track from age. The spec defines 20–40, 45, 50 and 60 only, so
 * the gaps between them go to the nearest defined band.
 */
export function recommendMgsTrack(age: number): MgsTrackId {
  if (age <= 42) return 'A_YOUTH';
  if (age <= 47) return 'B_MID';
  if (age <= 55) return 'C50_15';
  return 'C60_10';
}

/** Default horizon for Track A: retire around 65, within the 15–35 range. */
export function defaultHorizon(track: MgsTrack, age: number): number {
  if (track.horizonYears !== null) return track.horizonYears;
  const [lo, hi] = track.horizonRange ?? [15, 35];
  return Math.min(hi, Math.max(lo, 65 - age));
}

// ── Age bands ────────────────────────────────────────────────────────────────

export interface Cohort {
  label: string;
  from: number;
  to: number;
  /** final years routed entirely to the world index */
  shiftYears: number;
  /** the whole horizon, after which withdrawals begin */
  withdrawYears: number;
}

/**
 * The bands the tracks already define, named for the context bar.
 *
 * Each one mirrors the track `recommendMgsTrack` picks for that age, so the
 * strip and the track page can never disagree about a cohort's horizon.
 */
export const COHORTS: Cohort[] = [
  { label: '20–42', from: 20, to: 42, shiftYears: 5, withdrawYears: 30 },
  { label: '43–47', from: 43, to: 47, shiftYears: 4, withdrawYears: 10 },
  { label: '48–55', from: 48, to: 55, shiftYears: 0, withdrawYears: 15 },
  { label: '56+',   from: 56, to: 99, shiftYears: 0, withdrawYears: 10 },
];

export function cohortLabel(age: number): string {
  return (COHORTS.find(c => age >= c.from && age <= c.to) ?? COHORTS[0]).label;
}

export interface MgsMilestones {
  /** final years routed entirely to MWRD */
  shiftYears: number;
  /** the whole horizon, after which withdrawals begin */
  withdrawYears: number;
}

/** How long this age invests, and how much of that is the glide into MWRD. */
export function milestonesFor(startAge: number): MgsMilestones {
  const track = getMgsTrack(recommendMgsTrack(startAge));
  return { shiftYears: track.deRiskYears, withdrawYears: defaultHorizon(track, startAge) };
}

/** The target mix for an age — the weights of the track that age falls into. */
export function allocationFor(age: number): Partial<Record<MgsAsset, number>> {
  return getMgsTrack(recommendMgsTrack(age)).weights;
}

