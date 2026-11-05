/** MGS · מדידה ישירה של הקרנות האיריות עצמן.
 *
 *  עד כאן התנודתיות והתשואה נגזרו מהנייר **האמריקאי** המקביל. כאן הן נמדדו
 *  על הקרן האירית עצמה, בבורסה שבה היא באמת נסחרת (לונדון / פרנקפורט /
 *  אמסטרדם), דרך Yahoo Finance, בסדרה חודשית מתואמת־דיבידנד.
 *
 *  **כל המספרים הומרו לדולר** לפי EURUSD / GBPUSD חודשיים — אחרת קרן
 *  ביורו וקרן בדולר אינן בנות־השוואה.
 *
 *  **החלון אחיד: 60 החודשים האחרונים** (2021-11 → 2026-11). זו הבחירה היחידה
 *  שמאפשרת לדרג את כולן זה מול זה, וגם היחידה שבה לכל קרן יש נתונים.
 *  `months` אומר כמה חודשים באמת נמדדו — קרן שהושקה לאחרונה
 *  (`short: true`) נמדדה על חלון קצר יותר שכולו שוק עולה, ולכן המספר
 *  שלה מוטה כלפי מעלה ואינו בר־השוואה לקרן עם 60 חודשים מלאים.
 *
 *  `fullCagr` / `fullVol` הם על כל ההיסטוריה הזמינה, להשוואה.
 *  **אזהרה אחת בנתון:** ל-SPXS סדרת ההיסטוריה המלאה פגומה (פיצול מנייה
 *  שלא תואם), ולכן על החלון המלא היא מראה מינוס 99% — רק חלון 60
 *  החודשים תקף עבורה.
 *
 *  **שתי אזהרות על רשומות ספציפיות, שאומתו מול המנפיק:**
 *
 *  1. **XUTC ל-IE0000K7HU41 היה שגוי אצלי.** הטיקר XUTC שייך למחלקה
 *     **המחלקת** IE00BGQYRS42. ה-ISIN כאן הוא מחלקת 1C הצוברת, שנסחרת
 *     **רק ב-Cboe Europe תחת XUIT**, ובה כ-225,000$ בלבד — מחלקת זרע
 *     ולא נייר סחיר. המדידה בוצעה על הקו הגרמני של הקרן, כלומר על
 *     **מחלקה אחרת** של אותה קרן. הרשומה נשארת לעיון ואינה בת־קנייה.
 *
 *  2. **קיימת קרן נפרדת Xtrackers NASDAQ 100 Swap (IE000472H9T4)**,
 *     סינתטית מול Goldman Sachs Bank Europe. XNAS שכאן היא **פיזית
 *     מלאה**, 102 מניות. אין לבלבל ביניהן.
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי. תשואת עבר אינה מנבאת את העתיד.
 */

export type Tier = 'calm' | 'mid' | 'hot';

export const TIER_HE: Record<Tier, string> = {
  calm: 'רגוע', mid: 'בינוני', hot: 'תוספת תנודתיות',
};
export const TIER_BAND: Record<Tier, string> = {
  calm: 'עד 15% תנודתיות',
  mid: '15%-30% תנודתיות',
  hot: '30% תנודתיות ומעלה',
};

export interface IrishFund {
  k: string; tick: string; he: string; isin: string;
  /** מספר נייר בבורסה בתל אביב — null = נדרש ברוקר אירופי */
  tase: string | null;
  ter: number;
  /** תמורה יומית בת״א בשקלים, 30.10.2026 — אומת בדף המסחר של הבורסה.
   *  0 = רשומה אך **לא נסחרה כלל** באותו יום · ‎-1 = טרם החלה להיסחר ·
   *  null = אינה רשומה בת״א. מתחת ל-100,000₪ נחשבת **דלילה**. */
  turn: number | null;
  /** הנייר האמריקאי שהקרן באה להחליף */
  us: string;
  desc: string;
  tier: Tier;
  /** על חלון 60 החודשים, בדולר */
  cagr: number; vol: number; dd: number; months: number; short: boolean;
  /** על כל ההיסטוריה הזמינה */
  fullCagr: number; fullVol: number; fullMonths: number;
}

/** מבנה משפטי של המטרייה, אומת מול התשקיפים — plc או ICAV.
 *  זה רלוונטי למס עיזבון: אימתתי את הניתוח על **plc**. */
export const UMBRELLA: Record<string, 'plc' | 'ICAV'> = {
  CSPX: 'plc',                                          // iShares VII plc
  IWDA: 'plc',                                          // iShares III plc
  SPXS: 'plc', MXWO: 'plc', XLKS: 'plc',                // Invesco Markets plc
  VWRA: 'plc',                                          // Vanguard Funds plc
  SMH:  'plc',                                          // VanEck UCITS ETFs plc
  WTEC: 'plc',                                          // SSGA SPDR ETFs Europe II plc
};

/** השאלת ניירות — מה שבפועל, לא מה שמותר. אומת מול הדוחות. */
export const LENDING: Record<string, { actual: number | null; max: number | null }> = {   // השיא בקטלוג
  IWDA: { actual: 0.1116, max: 0.22 },
  
  
  
  CSPX: { actual: 0.0426, max: 0.17 },
     // 36.88% מה-NAV — חריג
  
  VWRA: { actual: 0.0145, max: 0.50 },
  
  
  SPXS: { actual: 0, max: 0 }, 
  MXWO: { actual: 0, max: 0 }, XLKS: { actual: 0, max: 0 },
  SMH: { actual: 0, max: null },
  
  WTEC: { actual: null, max: 0.40 },
};

/** כמה ניירות הקרן באמת מחזיקה, וכמה מרוכזות שלוש הגדולות.
 *  אומת מול קובץ ההחזקות של המנפיק, אוקטובר 2026. */
export const HOLDINGS: Record<string, { n: number; top3: number }> = {
  
  VWRA: { n: 3821, top3: 0.131 }, 
  IWDA: { n: 1250, top3: 0.149 },
  
  
  CSPX: { n: 504, top3: 0.212 }, 
  SMH: { n: 25, top3: 0.309 },
  WTEC: { n: 132, top3: 0.479 }, 
  
};

/** הקו הדולרי לקנייה — אומת מול נתוני ה-LSE וטבלאות הליסטינג של
 *  המנפיקים, 2.11.2026. לכל קו יש תאום ב-GBP/GBX עם **אותו ISIN**;
 *  מבחינת מס עיזבון אין שום הבדל, רק מטבע סליקה.
 *
 *  **להזמין לפי ISIN ולא לפי טיקר.** שלוש התנגשויות מסוכנות:
 *  · **SPXS** בארה״ב = Direxion Daily S&P 500 **Bear 3X** (US25460E1901) —
 *    אמריקאית, ממונפת פי 3, בכיוון **הפוך**.
 *  · **NDIA** בארה״ב = Global X India Active ETF, אמריקאית.
 *  · **RBOT** בארה״ב = Vicarious Surgical — מניה בודדת, לא קרן.
 *  הגרסאות האמריקאיות של GDX/SMH/SPY כן נסחרות בלונדון, אבל תחת
 *  קודים אחרים לגמרי (0LKC, 0LLB, 0KZC).
 */
export interface Line { sym: string; ex: string; cur: 'USD' | 'EUR' | 'GBP' }
export const BUY: Record<string, Line> = {
  // **הקו הדולרי בלונדון, אומת 2.11.2026.** לכל קרן בקטלוג יש
  // שורה כאן — זה התנאי להיכנס לקומבינציות. הקנייה נעשית דרך
  // אינטראקטיב ישראל ב-LSE; תל אביב אינה מסלול קנייה.
  SPXS: { sym: 'SPXS', ex: 'LSE', cur: 'USD' },   // S&P 500 · סינתטית
  CSPX: { sym: 'CSPX', ex: 'LSE', cur: 'USD' },   // S&P 500 · פיזית
  MXWO: { sym: 'MXWO', ex: 'LSE', cur: 'USD' },   // MSCI World · סינתטית (התאום MXWS בפני)
  IWDA: { sym: 'IWDA', ex: 'LSE', cur: 'USD' },   // MSCI World · פיזית בדגימה
  VWRA: { sym: 'VWRA', ex: 'LSE', cur: 'USD' },   // כל העולם · פיזית בדגימה
  XLKS: { sym: 'XLKS', ex: 'LSE', cur: 'USD' },   // טכנולוגיה · סינתטית
  WTEC: { sym: 'WTEC', ex: 'LSE', cur: 'USD' },   // טכנולוגיה · פיזית
  SMH:  { sym: 'SMH',  ex: 'LSE', cur: 'USD' },   // מוליכים למחצה · פיזית (SMGB הוא קו ה-GBP)
};
/** קווים שבהם נשאר פער אימות */
export const BUY_UNVERIFIED: string[] = [];

/** שיטת השחזור, ומה היא עושה לניכוי המס על הדיבידנד.
 *
 *  **קרן פיזית אירית שמחזיקה מניות אמריקאיות משלמת 15% ניכוי במקור**
 *  על הדיבידנד — זה השיעור המופחת לפי אמנת אירלנד–ארה״ב, במקום 30%,
 *  והוא **אינו ניתן להשבה**. הוא פשוט נגרע מהתשואה בתוך הקרן.
 *
 *  **קרן בחוזה חילופין מקבלת את תשואת המדד ברוטו** מהבנק שמנגד, ולכן
 *  הניכוי הזה אינו חל עליה. זה היתרון המובנה שלה.
 *
 *  **וזה נמדד כאן, לא הונח:** על אותם 60 חודשים בדיוק,
 *  SPXS (חילופין) הניבה **0.20 נקודות** יותר מ-CSPX ומ-VUAA הפיזיות
 *  אחרי נטרול הפרש דמי הניהול — והחיסכון התיאורטי בניכוי על S&P 500
 *  הוא **0.18 נקודות**. התאמה כמעט מדויקת, ועל שתי קרנות פיזיות
 *  בלתי תלויות.
 *
 *  **אבל זה לא אוניברסלי:** MXWO מול IWDA נתנה פער של 0.06 נקודות
 *  בלבד, ואחרי נטרול דמי ניהול היא דווקא פיגרה. אל תניחו את היתרון —
 *  הוא תלוי בקרן ובמדד.
 *
 *  **ועל מס עיזבון אין לזה שום השפעה.** מי שמחזיק קרן חילופין אירית
 *  מחזיק מניה של חברה אירית, בדיוק כמו בפיזית. ההבדל הוא **סיכון
 *  צד נגדי**, שאלה אחרת לגמרי.
 */
export type Repl = 'physical' | 'sampled' | 'swap';
export const REPL: Record<string, Repl> = {
  SPXS: 'swap', MXWO: 'swap', XLKS: 'swap',
  CSPX: 'physical', SMH: 'physical',
  WTEC: 'physical', 
  IWDA: 'sampled',
  VWRA: 'sampled', 
};
export const REPL_HE: Record<Repl, string> = {
  physical: 'פיזית מלאה', sampled: 'פיזית בדגימה', swap: 'חוזה חילופין',
};
/** האם הקרן סופגת את ניכוי ה-15% על דיבידנד אמריקאי */
export function withholds(k: string): boolean { return REPL[k] !== 'swap'; }

/** הפער שנמדד בין קרן חילופין לקרן פיזית על אותו מדד, בנקודות אחוז
 *  לשנה, אחרי נטרול הפרש דמי הניהול. 60 חודשים. */
export const SWAP_EDGE: Array<{ he: string; swap: string; phys: string; edge: number; theory: number }> = [
  { he: 'S&P 500', swap: 'SPXS', phys: 'CSPX', edge: 0.20, theory: 0.18 },
  { he: 'S&P 500', swap: 'SPXS', phys: 'VUAA', edge: 0.19, theory: 0.18 },
  { he: 'נאסד״ק 100', swap: 'EQQS', phys: 'CNDX', edge: 0.15, theory: 0.08 },
  { he: 'MSCI World', swap: 'MXWO', phys: 'IWDA', edge: -0.09, theory: 0.26 },
];

export const WINDOW = { from: '2021-11', to: '2026-11', months: 60 } as const;

export const IRISH: IrishFund[] = [
  { k: 'SPXS', tick: 'SPXS', he: 'S&P 500 · Invesco swap', isin: 'IE00B3YCGJ38', tase: '1183441', ter: 0.0005, turn: 5355148,
    us: 'SPY', desc: '500 החברות הגדולות בארה״ב', tier: 'calm',
    cagr: 0.1369, vol: 0.1375, dd: -0.2234, months: 60, short: false,
    fullCagr: -0.1454, fullVol: 0.2906, fullMonths: 181 },
  { k: 'CSPX', tick: 'CSPX', he: 'S&P 500 · iShares', isin: 'IE00B5BMR087', tase: '1159250', ter: 0.0007, turn: 5344727,
    us: 'SPY', desc: '500 החברות הגדולות בארה״ב', tier: 'calm',
    cagr: 0.1347, vol: 0.1373, dd: -0.2248, months: 60, short: false,
    fullCagr: 0.1524, fullVol: 0.1339, fullMonths: 177 },
  { k: 'MXWO', tick: 'MXWO', he: 'MSCI World · Invesco swap', isin: 'IE00B60SX394', tase: '1185164', ter: 0.0005, turn: 2848487,
    us: 'URTH', desc: '23 שווקים מפותחים בלבד', tier: 'calm',
    cagr: 0.1186, vol: 0.1303, dd: -0.2408, months: 60, short: false,
    fullCagr: 0.1263, fullVol: 0.1379, fullMonths: 193 },
  { k: 'IWDA', tick: 'IWDA', he: 'MSCI World · iShares', isin: 'IE00B4L5Y983', tase: null, ter: 0.002, turn: null,
    us: 'URTH', desc: '23 שווקים מפותחים בלבד', tier: 'calm',
    cagr: 0.118, vol: 0.1309, dd: -0.2405, months: 60, short: false,
    fullCagr: 0.1167, fullVol: 0.1328, fullMonths: 188 },
  { k: 'VWRA', tick: 'VWRA', he: 'All-World · Vanguard', isin: 'IE00BK5BQT80', tase: null, ter: 0.0014, turn: null,
    us: 'VT', desc: 'כל העולם, פיזור מקסימלי', tier: 'calm',
    cagr: 0.1094, vol: 0.1285, dd: -0.2429, months: 60, short: false,
    fullCagr: 0.1435, fullVol: 0.1359, fullMonths: 80 },
  { k: 'XLKS', tick: 'XLKS', he: 'טכנולוגיה S&P · Invesco swap', isin: 'IE00B3VSSL01', tase: null, ter: 0.0014, turn: null,
    us: 'XLK', desc: 'סקטור הטכנולוגיה ב-S&P 500', tier: 'mid',
    cagr: 0.2309, vol: 0.2232, dd: -0.3081, months: 60, short: false,
    fullCagr: 0.2226, fullVol: 0.1806, fullMonths: 185 },
  { k: 'WTEC', tick: 'WTEC', he: 'טכנולוגיה עולמית · SPDR', isin: 'IE00BYTRRD19', tase: null, ter: 0.003, turn: null,
    us: 'IXN', desc: 'טכנולוגיה עולמית', tier: 'mid',
    cagr: 0.1895, vol: 0.219, dd: -0.3268, months: 60, short: false,
    fullCagr: 0.2084, fullVol: 0.1808, fullMonths: 194 },
  // **תוקן 4.11.2026:** השדה הזה אמר `SMGB` — הקו בליש״ט בלונדון —
  // בזמן ששורת הקנייה אומרת `SMH`, הקו הדולרי. הטיקר הזה **מוצג
  // למשתמש** ב״ללמוד״ ובדף הבנייה, כך שהמערכת הציגה נייר אחד
  // והורתה לקנות אחר, בשני מטבעות שונים.
  { k: 'SMH', tick: 'SMH', he: 'שבבים · VanEck', isin: 'IE00BMC38736', tase: null, ter: 0.0035, turn: null,
    us: 'SMH', desc: '25 יצרניות השבבים הגדולות', tier: 'hot',
    cagr: 0.3234, vol: 0.3396, dd: -0.4047, months: 60, short: false,
    fullCagr: 0.3265, fullVol: 0.3314, fullMonths: 63 },
];

/** מטריצת המתאמים המדודה, 60 חודשים, בדולר. המפתח הוא '<a>|<b>' לפי
 *  סדר לקסיקוגרפי. השתמשו ב-corr(a, b) ולא בגישה ישירה. */

/** **זמן ההתאוששות שנמדד לכל קרן — הקריטריון שהקטלוג נבנה עליו.**
 *
 *  `m` — ההתאוששות **הארוכה ביותר** בכל ההיסטוריה של הקרן, בחודשים:
 *  נמדדה כל נפילה של 15% ומעלה, וכמה זמן לקח לחזור לשיא שלפניה.
 *  `dd` — הנפילה העמוקה ביותר. `open` — כמה חודשים הקרן מתחת לשיא
 *  **כרגע**, ו-0 פירושו שהיא עליו או קרוב אליו.
 *
 *  **למה זה כאן ולא רק בקטלוג.** מנגנון הקנייה מפנה כסף לרכיב
 *  שנפל, וזה עובד רק אם הרכיב חוזר ומהר. מי שמרכיב תמהיל בעצמו
 *  חייב לראות את אותו מספר שסינן את הקטלוג — אחרת הוא יכול לבנות
 *  בדיוק את מה שהמערכת פסלה.
 *
 *  **הקצוות:** XNAS חוזרת ב-15 חודשים; **SPGP ב-163 — 13.6 שנים**;
 *  **KWEB 68 חודשים מתחת לשיא ולא חזרה.**
 *
 *  נמדד ב-3.11.2026 מסדרות המחיר, בדולר, אחרי תיקון פיצולי מניות
 *  לא מתוקנים (ל-SPXS היה פיצול 1:103 בינואר 2014).
 */
export const RECOVERY: Record<string, { m: number; dd: number; open: number }> = {
  CSPX: { m: 23, dd: -0.225, open: 0 }, IWDA: { m: 23, dd: -0.241, open: 0 }, MXWO: { m: 23, dd: -0.241, open: 0 }, SMH: { m: 17, dd: -0.405, open: 4 }, SPXS: { m: 23, dd: -0.223, open: 0 }, VWRA: { m: 23, dd: -0.243, open: 0 }, WTEC: { m: 21, dd: -0.327, open: 0 }, XLKS: { m: 16, dd: -0.308, open: 0 }, 
};

/** ההתאוששות של תמהיל היא זו של הרכיב האיטי שבו. */
export function recoveryOf(parts: Array<{ k: string }>): number {
  return parts.reduce((w, p) => Math.max(w, RECOVERY[p.k]?.m ?? 0), 0);
}


/** **התאוששות לפי המדד, לא לפי הקרן — וזו המדידה שקובעת.**
 *
 *  **למה.** אף קרן בקטלוג אינה מכסה את 2008, ובטח לא את 2000–2002;
 *  הארוכה שבהן מתחילה ב-2009, מיד אחרי המשבר. לכן מדידה על הקרן
 *  **מקטינה את ההתאוששות פי 3 עד פי 13.** נמדד:
 *
 *  · SMH מול SOX: **17 חודשים מול 210 — פי 12.4**
 *  · XLKS מול XLK: **16 מול 210 — פי 13.1**
 *  · CNDX מול NDX: 23 מול 178 — פי 7.7
 *  · CSPX מול S&P 500: 23 מול 80 — פי 3.5
 *
 *  **`med`** — חציון ההתאוששות מכל נפילה של 15%+ בכל ההיסטוריה.
 *  **`max`** — הארוכה ביותר. **`tailYears`** — פעם בכמה שנים
 *  מתרחשת נפילה שההתאוששות ממנה ארכה מעל חמש שנים. **`deep70`** —
 *  כמה פעמים המדד ירד 70% ומעלה.
 *
 *  **ומה ההתפלגות אומרת, וזה העיקר.** המקסימום אינו הסיפור —
 *  **התדירות היא.** למוליכים למחצה ולטכנולוגיה יש **החציון המהיר
 *  ביותר שנמדד, 11 ו-12 חודשים**, וזנב אחד קטסטרופלי לדור. למכרות
 *  זהב יש **החציון האיטי ביותר, 29 חודשים, וזנב פעם ב-15 שנים
 *  ושתי נפילות של 79% ו-82%.** כלומר הם גרועים יותר **בשני קצות
 *  ההתפלגות** — ולכן הם יצאו מהקטלוג, ולא רק בגלל המקסימום.
 *
 *  **והמדד הרחב אינו המהיר.** ל-S&P 500 יש החציון האיטי מבין
 *  המדדים הצומחים — **22 חודשים** — ושני מקרים של מעל חמש שנים
 *  ב-42 שנה. הוא הרדוד ביותר בעומק, לא המהיר ביותר בזמן.
 *
 *  נמדד ב-3.11.2026 מסדרות המדדים: SOX מ-1994, NDX ו-S&P מ-1985,
 *  XLK מ-1999.
 */
export const INDEX_RECOVERY: Record<string, {
  he: string; med: number; max: number; tailYears: number; deep70: number;
  /** מצבו של המדד ב-3.11.2026: כמה אחוז מתחת לשיא, וכמה חודשים */
  now: [number, number];
}> = {
  SOX:  { he: 'מוליכים למחצה', med: 11, max: 210, tailYears: 32, deep70: 1, now: [-0.275, 5] },
  XLK:  { he: 'טכנולוגיה אמריקאית', med: 12, max: 210, tailYears: 28, deep70: 1, now: [-0.110, 2] },
  NDX:  { he: 'נאסד״ק 100', med: 7, max: 178, tailYears: 41, deep70: 1, now: [-0.067, 1] },
  SPX:  { he: 'S&P 500', med: 22, max: 80, tailYears: 21, deep70: 0, now: [-0.014, 2] },
};

/** איזה מדד כל קרן עוקבת — כדי שההתאוששות תימדד על ההיסטוריה
 *  הארוכה ולא על חיי הקרן. */
export const FUND_INDEX: Record<string, keyof typeof INDEX_RECOVERY> = {
  SMH: 'SOX', 
  XLKS: 'XLK', WTEC: 'XLK',
  
  CSPX: 'SPX', SPXS: 'SPX', 
  MXWO: 'SPX', IWDA: 'SPX', 
  VWRA: 'SPX', 
};

/** ההתאוששות שצריך להציג לתמהיל: החציון של הרכיב האיטי, והזנב שלו. */
export function indexRecoveryOf(parts: Array<{ k: string }>): {
  med: number; max: number; tailYears: number;
} {
  let med = 0, mx = 0, tail = 99;
  for (const p of parts) {
    const i = FUND_INDEX[p.k];
    const r = i ? INDEX_RECOVERY[i] : null;
    if (!r) continue;
    med = Math.max(med, r.med); mx = Math.max(mx, r.max);
    tail = Math.min(tail, r.tailYears);
  }
  return { med, max: mx, tailYears: tail === 99 ? 0 : tail };
}


/** **הטווח הארוך — מה אותו מדד נתן על כל ההיסטוריה שלו.**
 *
 *  **למה זה כאן.** הקטלוג נמדד על 60 חודשים, ורובם שוק עולה.
 *  כשמודדים את אותם מדדים **על כל ההיסטוריה**, התשואה נמוכה
 *  בהרבה והסיכון גדול בהרבה:
 *
 *  | המדד | 60 חודשים | כל ההיסטוריה | ההפרש |
 *  |---|---|---|---|
 *  | SOX · מוליכים למחצה | 23.19% | **14.75%** | **−8.44** |
 *  | XLK · טכנולוגיה | 17.48% | **9.47%** | **−8.01** |
 *  | NDX · נאסד״ק 100 | 12.17% | 14.37% | +2.20 |
 *  | S&P 500 | 10.85% | 9.38% | −1.48 | 
 *
 *  **ומכרות הזהב הן ההוכחה החזקה ביותר שההוצאה שלהן נכונה:**
 *  4.40% לשנה על שלושים שנה, עם **47% מהשנים שליליות** — הטלת
 *  מטבע — ונפילה של 81.9%.
 *
 *  **ומה שחייב להיאמר על מסלול הצמיחה.** תמהיל של 90% מוליכים
 *  למחצה ו-10% טכנולוגיה מוצג בקטלוג כ-26.9% לשנה עם נפילה של
 *  39.5%. **על הטווח הארוך אותם מדדים נתנו כ-14%, עם נפילה של
 *  83% ושנה גרועה של מינוס 56%.** זה לא אומר שהמסלול שגוי — זה
 *  אומר **שהמספר שבקטלוג הוא של חלון, והמספר כאן הוא של מחזור.**
 *
 *  `neg` — אחוז השנים המתגלגלות שהסתיימו בהפסד. נמדד ב-3.11.2026.
 */
export const INDEX_LONG: Record<string, {
  he: string; years: number; cagr: number; vol: number;
  dd: number; worstYear: number; neg: number;
}> = {
  SOX: { he: 'מוליכים למחצה', years: 32.4, cagr: 0.1475, vol: 0.349, dd: -0.832, worstYear: -0.561, neg: 0.33 },
  XLK: { he: 'טכנולוגיה אמריקאית', years: 27.8, cagr: 0.0947, vol: 0.230, dd: -0.805, worstYear: -0.593, neg: 0.22 },
  NDX: { he: 'נאסד״ק 100', years: 41.0, cagr: 0.1437, vol: 0.234, dd: -0.811, worstYear: -0.673, neg: 0.17 },
  SPX: { he: 'S&P 500', years: 41.8, cagr: 0.0938, vol: 0.151, dd: -0.526, worstYear: -0.448, neg: 0.20 },
};

/** **אומדן הטווח הארוך לתמהיל: המדדים שמאחוריו, לפי משקל.**
 *
 *  **זה אינו תחזית.** זו השאלה ״מה אותם מדדים נתנו על פני מחזור
 *  שוק מלא״, לעומת ״מה הם נתנו בחמש השנים האחרונות״.
 *
 *  **והתנודתיות והנפילה כאן הן ממוצע משוקלל, כלומר תקרה.** הן
 *  מתעלמות מהפיזור, שמרדד את שתיהן בפועל — התנודתיות המדודה
 *  לתמהיל נמוכה ב-3 עד 6 נקודות מהמשוקלל. **התשואה, לעומת זאת,
 *  כן מתחברת משוקלל** ולכן היא האומדן הישיר. */
export function longRunOf(parts: Array<{ k: string; w: number }>): {
  cagr: number; volNaive: number; dd: number; worstYear: number; cover: number;
} {
  const tot = parts.reduce((t, p) => t + p.w, 0) || 1;
  let c = 0, v = 0, dd = 0, wy = 0, cov = 0;
  for (const p of parts) {
    const i = FUND_INDEX[p.k];
    const r = i ? INDEX_LONG[i] : null;
    if (!r) continue;
    const w = p.w / tot;
    c += w * r.cagr; v += w * r.vol; cov += w;
    // **הנפילה משוקללת ולא מינימלית.** עשרה אחוזי מוליכים למחצה
    // אינם מפילים תיק ב-83%; לקחת את הרכיב הגרוע היה מספר מפחיד
    // ולא נכון. המשוקלל הוא אומדן — נפילות אינן מתחברות לינארית,
    // והפיזור מרדד אותן עוד — **ולכן זו תקרה, לא תחזית.**
    dd += w * r.dd; wy += w * r.worstYear;
  }
  // `cover` אומר איזה חלק מהתמהיל מכוסה במדד ארוך; פחות מ-1 פירושו
  // שחלק מהרכיבים אינם ממופים, והאומדן חלקי.
  return { cagr: cov > 0 ? c / cov : 0, volNaive: cov > 0 ? v / cov : 0,
    dd: cov > 0 ? dd / cov : 0, worstYear: cov > 0 ? wy / cov : 0, cover: cov };
}

const CORR: Record<string, number> = {"CSPX|SPXS":1,"CSPX|XLKS":0.872,"CSPX|WTEC":0.891,"CSPX|VWRA":0.952,"CSPX|MXWO":0.973,"CSPX|IWDA":0.973,"CSPX|SMH":0.7,"SPXS|XLKS":0.871,"SPXS|WTEC":0.89,"SPXS|VWRA":0.952,"WTEC|XLKS":0.994,"VWRA|XLKS":0.782,"VWRA|WTEC":0.812,"MXWO|SPXS":0.972,"MXWO|XLKS":0.793,"MXWO|WTEC":0.822,"MXWO|VWRA":0.992,"MXWO|SMH":0.666,"IWDA|SPXS":0.973,"IWDA|XLKS":0.791,"IWDA|WTEC":0.82,"IWDA|VWRA":0.992,"IWDA|MXWO":0.999,"IWDA|SMH":0.662,"SMH|SPXS":0.697,"SMH|XLKS":0.829,"SMH|WTEC":0.835,"SMH|VWRA":0.687};

export function corr(a: string, b: string): number {
  if (a === b) return 1;
  const v = CORR[a + '|' + b] ?? CORR[b + '|' + a];
  return v ?? 0.6;   // ברירת מחדל שמרנית לזוג שלא נמדד
}

/** תנודתיות, תשואה ונפילה של תמהיל — מהמתאמים המדודים, לא מהערכה.
 *  התשואה היא ממוצע משוקלל; התנודתיות היא השורש של wᵀΣw, ולכן היא
 *  **נמוכה** מהממוצע המשוקלל של התנודתיויות בכל מתאם קטן מ-1. */
export function mix(parts: Array<{ k: string; w: number }>): {
  cagr: number; vol: number; ddEst: number; avgCorr: number; naive: number;
  /** ההתאוששות הארוכה של הרכיב האיטי בתמהיל, בחודשים */
  recov: number;
} {
  const by = new Map(IRISH.map(f => [f.k, f]));
  const ps = parts.filter(p => p.w > 0 && by.has(p.k));
  const tot = ps.reduce((s, p) => s + p.w, 0);
  if (!ps.length || tot <= 0) return { cagr: 0, vol: 0, ddEst: 0, avgCorr: 0, naive: 0, recov: 0 };
  let cagr = 0, v = 0, cs = 0, cn = 0;
  for (const p of ps) {
    const a = by.get(p.k)!, wa = p.w / tot;
    cagr += wa * a.cagr;
    for (const q of ps) {
      const b = by.get(q.k)!, wb = q.w / tot;
      const c = corr(p.k, q.k);
      v += wa * wb * a.vol * b.vol * c;
      if (p.k !== q.k) { cs += c; cn++; }
    }
  }
  const vol = Math.sqrt(Math.max(0, v));
  const naive = ps.reduce((s, p) => s + (p.w / tot) * by.get(p.k)!.vol, 0);
  const wDd = ps.reduce((s, p) => s + (p.w / tot) * by.get(p.k)!.dd, 0);
  return { cagr, vol, recov: recoveryOf(ps), ddEst: wDd * (naive > 0 ? vol / naive : 1),
           avgCorr: cn ? cs / cn : 1, naive };
}

/** **ירדו מכאן ב-4.11.2026 שלושה ייצואים שלא היה להם אף צרכן:**
 *  `BTC_REF`, `BTC_WINDOWS` ו-`SPREAD`. השניים הראשונים החזיקו את
 *  מדידות הביטקוין, והשלישי את הטבלה ״האם שרוול ביטקוין מוסיף״ —
 *  שגם פוצלה לפי ת״א, שאינה מסלול קנייה. ביטקוין אינו בקטלוג:
 *  UCITS אוסרת קריפטו בקרן אירית, ולכן אין לו גרסה שאפשר לקנות
 *  דרך אינטראקטיב ישראל בלונדון. */

/** מנגנון הקנייה מול חלוקה שווה — הרצה על ההפקדות החודשיות עצמן.
 *
 *  **הממצא:** המנגנון אינו תלוי בגודל היוניברס אלא ב**איכותו**. הוא
 *  מנתב את הכסף לנופל העמוק ביותר, ו**אינו יודע להבחין בין ירידה
 *  זמנית לבין קריסה מתמשכת**. קרן שיורדת שנה אחרי שנה היא לנצח
 *  ״הנופלת העמוקה ביותר״, והמנגנון ימשיך להזרים אליה.
 *
 *  ביוניברס של 24 הקרנות, **אינטרנט סיני בלעה 37.2% מכל הכסף** —
 *  קרן שהניבה 17%− לשנה. התשואה המשוקללת של מה שהמנגנון קנה היתה
 *  **2.4%+**, מול **13.4%+** בחלוקה שווה.
 */
export interface RuleRow { n: number; rule: number; equal: number }
export const RULE_BY_SIZE: RuleRow[] = [
  { n: 3, rule: 0.390, equal: 0.344 },
  { n: 5, rule: 0.354, equal: 0.321 },
  { n: 8, rule: 0.347, equal: 0.313 },
  { n: 12, rule: 0.325, equal: 0.278 },
  { n: 16, rule: 0.308, equal: 0.254 },
  { n: 20, rule: 0.288, equal: 0.239 },
  { n: 24, rule: 0.164, equal: 0.216 },
];
/** אותו מנגנון, יוניברסים שנבחרו בדרכים שונות. */
export const RULE_BY_PICK: Array<{ he: string; n: number; rule: number; equal: number }> = [
  { he: 'לפי היחס תשואה־תנודתיות', n: 6, rule: 0.245, equal: 0.234 },
  { he: 'רק מה שנסחר בשקלים', n: 8, rule: 0.209, equal: 0.202 },
  { he: 'הרגועות ביותר', n: 6, rule: 0.171, equal: 0.170 },
  { he: 'התנודתיות ביותר', n: 6, rule: 0.165, equal: 0.274 },
  { he: 'כל מה שיש', n: 24, rule: 0.164, equal: 0.216 },
];
/** מתחת לזה, רכיב מסוכן למנגנון: הוא ייבלע את השארית חודש אחר חודש. */
export const RULE_FLOOR = 0.08;


/** **בדיקת ספרת ביקורת ל-ISIN, לפי ISO 6166.**
 *
 *  **למה זה יושב בקוד ולא רק בראש.** ISIN שגוי נראה בדיוק כמו ISIN
 *  נכון — שתי אותיות, תשעה תווים וספרה. בבדיקה אחת התברר שאחד
 *  המספרים שזכרתי בעל פה הצביע על **קרן בריאות** במקום על קרן
 *  טכנולוגיה, ואחר לא היה נייר ערך קיים בכלל. הקטלוג עצמו היה
 *  תקין — אבל הבדיקה הזאת היא מה שמוודא שהוא יישאר כזה.
 */
export function validIsin(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;
  const digits = isin.slice(0, 11).split('')
    .map(c => (/[0-9]/.test(c) ? c : String(c.charCodeAt(0) - 55))).join('');
  let sum = 0, dbl = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10 === Number(isin[11]);
}

/** כל הקרנות שה-ISIN שלהן אינו תקין, או שאינו אירי. ריק = הכל תקין. */
export const ISIN_PROBLEMS = IRISH.filter(
  f => !validIsin(f.isin) || !f.isin.startsWith('IE'),
).map(f => f.k);
