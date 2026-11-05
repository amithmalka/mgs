/** MGS · **הבדיקה שעונה על ״האם תמיד יהיה ממה למשוך״.**
 *
 *  **מה נבדק.** כל קומבינציה הורצה **אחורה על המדדים שמאחוריה**,
 *  מכל נקודת התחלה אפשרית בהיסטוריה — 214 עד 269 נקודות לכל
 *  תמהיל, תלוי בכמה היסטוריה יש למדד הקצר שבו. בכל הרצה: הפקדה
 *  חודשית לאורך 20 שנה, אופק 25 שנה, **ולוח המשיכות המלא.**
 *
 *  **והכלל שיוצר את החסימה.** המערכת **אינה מוכרת מתחת למחיר
 *  העלות הממוצע.** זה מה שמונע ממשיכה לנעול הפסד — אבל זה גם אומר
 *  שבתקופה שבה התיק מתחת לעלות, **אין משיכה כלל.** זו לא תקלה, זו
 *  ההגנה עצמה — והשאלה הנכונה היא כמה זמן היא יכולה להימשך.
 *
 *  **התשובה, ושתי השורות שלה.** במקרה החציוני החסימה ארכה
 *  **13 עד 15 חודשים**. בנקודת ההתחלה הגרועה ביותר שנמדדה היא
 *  ארכה **39 עד 57 חודשים — שלוש עד כמעט חמש שנים.**
 *
 *  **וצמיחה אינה נחסמת אף פעם, כי היא אינה מושכת.** זה לא יתרון
 *  של המסלול — זו ההגדרה שלו.
 *
 *  נמדד ב-3.11.2026 על SOX, XLK, NDX, S&P 500.
 */
export interface WdTest {
  track: 'flow' | 'both' | 'growth';
  lab: string;
  /** נקודות התחלה שנבדקו */
  n: number;
  /** אחוז החודשים שבהם לא הייתה משיכה — חציון כל ההרצות */
  blockedPct: number;
  /** הרצף הארוך ביותר ללא משיכה, בחודשים — חציון */
  worstMed: number;
  /** והרצף הארוך ביותר שנמדד בכלל */
  worstMax: number;
}

export const WD_TEST: WdTest[] = [
  { track: 'flow', lab: 'VWRA50/SPXS40/XLKS10', n: 214, blockedPct: 8.4, worstMed: 14, worstMax: 48 },
  { track: 'flow', lab: 'SPXS60/MXWO30/SMH10', n: 269, blockedPct: 9.7, worstMed: 15, worstMax: 39 },
  { track: 'both', lab: 'SPXS80/SMH10/XLKS10', n: 214, blockedPct: 8.2, worstMed: 14, worstMax: 40 },
  { track: 'both', lab: 'MXWO40/XLKS30/IWDA20/SMH10', n: 214, blockedPct: 6.8, worstMed: 14, worstMax: 50 },
  { track: 'both', lab: 'XLKS40/IWDA20/SMH20/SPXS20', n: 214, blockedPct: 6.8, worstMed: 13, worstMax: 57 },
  { track: 'growth', lab: 'XLKS50/SMH30/IWDA10/SPXS10', n: 214, blockedPct: 0, worstMed: 0, worstMax: 0 },
  { track: 'growth', lab: 'XLKS70/SMH30', n: 215, blockedPct: 0, worstMed: 0, worstMax: 0 },
  { track: 'growth', lab: 'SMH50/XLKS50', n: 215, blockedPct: 0, worstMed: 0, worstMax: 0 },
  { track: 'growth', lab: 'SMH70/XLKS20/SPXS10', n: 214, blockedPct: 0, worstMed: 0, worstMax: 0 },
  { track: 'growth', lab: 'SMH90/XLKS10', n: 215, blockedPct: 0, worstMed: 0, worstMax: 0 },
];

/** **ומה המשיכה עושה לתשואה — אותה הרצה, עם ובלי.**
 *
 *  כל המספרים הם **מכפיל על סך ההפקדות**, חציון כל נקודות ההתחלה,
 *  25 שנים עם הפקדות ל-20 שנה.
 *
 *  **ומה שהטבלה אומרת.** המשיכה ״עולה״ 23% עד 27% מההון הסופי —
 *  **אבל זה לא כסף שאבד, זה כסף שנמשך והוצא.** `taken` הוא מה
 *  שהגיע ליד לאורך הדרך, ו-`total` הוא הסכום של שניהם. מה שכן
 *  אבד הוא **ההרכבה על הכסף שיצא**, וזה ההפרש בין `noWd` ל-`total`.
 *
 *  **וההשוואה שחייבת להיאמר במלואה:** תזרים מסתיים ב-3.64 מכפיל
 *  סך הכל, וצמיחה ב-**15.97 — פי 4.4 ממנו.** זה מה שעולה להיות
 *  נזיל. זו לא טעות בבחירה; **זו המחיר שלה, ואפשר להציג אותו
 *  במספר.**
 */
export interface WdCost {
  track: 'flow' | 'both' | 'growth';
  lab: string;
  /** מכפיל ההפקדות בתום התקופה — **בלי משיכות בכלל** */
  noWd: number;
  /** ומכפיל ההפקדות בתום התקופה **עם לוח המשיכות** */
  wd: number;
  /** מה שנמשך לאורך הדרך, גם כמכפיל ההפקדות */
  taken: number;
  /** הסכום: מה שנשאר ומה שנמשך */
  total: number;
  /** כמה אחוז מההון נגרע מכך שהכסף יצא ולא הרכיב */
  cost: number;
}

export const WD_COST: WdCost[] = [
  { track: 'flow', lab: 'VWRA50/SPXS40/XLKS10', noWd: 4.84, wd: 2.80, taken: 0.85, total: 3.64, cost: 24.7 },
  { track: 'flow', lab: 'SPXS60/MXWO30/SMH10', noWd: 4.57, wd: 2.73, taken: 0.78, total: 3.51, cost: 23.2 },
  { track: 'both', lab: 'SPXS80/SMH10/XLKS10', noWd: 5.60, wd: 3.40, taken: 0.91, total: 4.31, cost: 22.9 },
  { track: 'both', lab: 'XLKS40/IWDA20/SMH20/SPXS20', noWd: 8.88, wd: 5.28, taken: 1.19, total: 6.47, cost: 27.1 },
  { track: 'growth', lab: 'SMH90/XLKS10', noWd: 15.97, wd: 15.97, taken: 0, total: 15.97, cost: 0 },
];

/** לוח המשיכות עצמו, כפי שהוא מוצג על המסך */
export const WD_SCHEDULE: Record<'flow' | 'both' | 'growth', string> = {
  flow: '1% לשנה בשנים 1–5, ומשנה 6 — 4%',
  both: '1% לשנה בשנים 1–9, ומשנה 10 — 4%',
  growth: 'אין משיכה לאורך התקופה כלל',
};

export const wdTestFor = (t: WdTest['track']) => WD_TEST.filter(x => x.track === t);
