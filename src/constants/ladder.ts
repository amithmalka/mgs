/** סולם התשואות — **נגזר מ-`combos.ts`, לא מוחזק בנפרד.**
 *
 *  **תוקן 4.11.2026, ושינוי השיטה הוא העיקר.** עד כאן החזיק הקובץ
 *  הזה **23 תמהילים מקובעים בקוד**, ו-`frontier.ts` החזיק 40 נוספים.
 *  סך הכול **63 תמהילים מול 10 האמיתיים** שב-`combos.ts` — ושלושת
 *  הסטים אמרו דברים שונים. התמהילים הישנים כאן הכילו גם קרנות
 *  שהוצאו מהקטלוג (VUAA, IUIT, XUTC, SEMI) וגם שורת `SMH 100%`
 *  שסותרת את כלל 2–4 הרכיבים.
 *
 *  **מעתה יש מקור אמת אחד.** הסולם הוא בדיוק עשרת התמהילים שעברו
 *  את המסנן, מסודרים לפי תנודתיות. אין כאן נתון שאינו ב-`combos.ts`,
 *  ולכן אי אפשר יותר שיהיה פער ביניהם.
 *
 *  **מה המסנן פוסל:** קרן שההתאוששות הארוכה שלה מעל 28 חודשים.
 *  ההנמקה המלאה, כולל כל מועמד שנבדק ונפל, יושבת ב-`combos.ts`.
 *
 *  **והאזהרה שחייבת להופיע ליד כל מספר כאן.** אף קרן בקטלוג אינה
 *  מכסה את 2008, ובטח לא את 2000–2002; הארוכה שבהן מתחילה ב-2009,
 *  **מיד אחרי המשבר.** לכן ״התאוששות 17–23 חודשים״ היא למעשה
 *  **ההתאוששות מ-2022, וזה כל מה שהיא.** למוליכים למחצה, שהם
 *  הרכיב הכבד בצמיחה, הירידה ב-2000–2002 הייתה 85%–96% לפי חברה,
 *  וההתאוששות ארכה **שנים עד למעלה מעשור.**
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
import { COMBOS, COMBOS_TESTED, COMBOS_FUNDS, type Combo } from './combos';

export interface Rung {
  vol: number; cagr: number; dd: number; track: string;
  /** ההתאוששות הארוכה של הרכיב האיטי בתמהיל, בחודשים */
  recov: number;
  parts: Array<{ k: string; w: number }>;
}

const TRACK_HE: Record<Combo['track'], string> = {
  flow: 'תזרים בלבד', both: 'תזרים וצמיחה', growth: 'צמיחה',
};

export const LADDER: Rung[] = COMBOS.map(c => ({
  vol: c.vol, cagr: c.cagr, dd: c.dd, recov: c.recov,
  track: TRACK_HE[c.track], parts: c.parts,
}));

export const LADDER_COMBOS = COMBOS_TESTED;
export const LADDER_FUNDS = COMBOS_FUNDS;

/** השלב שבו היחס תשואה־תנודתיות הגיע לשיא */
export function ladderPeak(): Rung {
  return LADDER.reduce((a, b) => (b.cagr / b.vol > a.cagr / a.vol ? b : a));
}
