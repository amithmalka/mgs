/** הגבול היעיל — **נגזר מ-`combos.ts`, לא מוחזק בנפרד.**
 *
 *  **תוקן 4.11.2026, ושני דברים תוקנו כאן.**
 *
 *  **האחד: הקובץ החזיק 40 תמהילים מקובעים שסתרו את `combos.ts`**,
 *  והם כללו קרנות שהוצאו מהקטלוג וגם שורת `SMH 100%` — רכיב אחד
 *  ב-100%, שסותרת את כלל 2–4 הרכיבים. מעתה הגבול הוא בדיוק עשרת
 *  התמהילים שעברו את המסנן.
 *
 *  **השני: ההפרדה בין ״בריכת תל אביב״ ל״הכל״ לא הייתה אמיתית.**
 *  שתי הרשימות היו **זהות בית־בבית**, כלומר הצגנו למשתמש בחירה בין
 *  שתי אפשרויות שהן אותו דבר. ההפרדה ירדה.
 *
 *  **ותל אביב ירדה כמסלול קנייה בכלל.** הקנייה נעשית דרך אינטראקטיב
 *  ישראל בבורסות לונדון ואירופה, ולכן השאלה אם קרן רשומה בת״א אינה
 *  רלוונטית לבחירה. היא גם לא הייתה מעשית: התמורה היומית של תעודת
 *  הטכנולוגיה בת״א (1159193) הייתה **46,144₪** — מתחת לרף הנזילות
 *  של 100,000₪ שאנחנו עצמנו קבענו, וסכום הפקדה בודד גדול ממנה.
 *
 *  `FRONTIER` נשמר עם שני המפתחות כדי לא לשבור קוראים קיימים, ושני
 *  המפתחות מחזירים את אותה רשימה — כי זו האמת.
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
import { COMBOS, COMBOS_TESTED } from './combos';

export interface FrontierPoint {
  vol: number; cagr: number; dd: number;
  /** ההתאוששות הארוכה של הרכיב האיטי, בחודשים */
  recov: number;
  parts: Array<{ k: string; w: number }>;
}

const POINTS: FrontierPoint[] = COMBOS.map(c => ({
  vol: c.vol, cagr: c.cagr, dd: c.dd, recov: c.recov, parts: c.parts,
}));

export const FRONTIER: Record<'tase' | 'all', FrontierPoint[]> = {
  tase: POINTS, all: POINTS,
};
export const COMBOS_COUNT = { tase: COMBOS_TESTED, all: COMBOS_TESTED } as const;

/** **הקרנות שהוצאו מבריכת תל אביב — נשמר כתיעוד בלבד.**
 *  תל אביב אינה מסלול קנייה, ולכן זו אינה עוד סיבת פסילה אלא
 *  ההסבר למה אין טעם לנסות לקנות דרכה. התמורה אומתה ב-30.10.2026. */
export const ILLIQUID: Array<{ tase: string; he: string; turn: number }> = [
  { tase: '1186055', he: 'בלוקצ׳יין · Invesco', turn: 0 },
  { tase: '1159144', he: 'רובוטיקה ואוטומציה · iShares', turn: 32259 },
  { tase: '1159193', he: 'טכנולוגיה S&P 500 · iShares', turn: 46144 },
];
/** מתחת לזה קרן נחשבת דלילה מכדי להיות ניתנת לקנייה במחיר סביר. */
export const MIN_TURN = 100000;

export function peakOf(_pool: 'tase' | 'all'): FrontierPoint {
  return POINTS.reduce((a, b) => (b.cagr / b.vol > a.cagr / a.vol ? b : a));
}
export function topOf(_pool: 'tase' | 'all'): FrontierPoint {
  return POINTS.reduce((a, b) => (b.cagr > a.cagr ? b : a));
}
