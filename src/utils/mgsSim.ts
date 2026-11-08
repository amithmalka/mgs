/** MGS · the forward engine.
 *  Ported from the implementation that was checked against an independent
 *  Python run on identical price paths and returned the same figures to the
 *  agora; the two converge on the same median inside sampling noise.
 *  Every market parameter was measured on 146 monthly returns, 9.2014–10.2026.
 *  Nothing here is a published forecast: the per-sleeve assumptions are, the
 *  portfolio result is what the mechanism produces from them. */

/** **הרכיבים — שבבים וטכנולוגיה. ביטקוין הוסר ב-4.11.2026.**
 *
 *  עד כאן היה כאן `'BTC' | 'SEM' | 'TEC'`, והמנוע הזה מזין את דפי
 *  המסלולים, הילדים, קרן ההשתלמות והבנייה. כלומר **ביטקוין נכנס
 *  לשליש מכל הפקדה בכל אחד מהם**, בהנחה של 16.6% לשנה ובתנודתיות
 *  של 66.3%.
 *
 *  **שלוש סיבות להסרה, וכל אחת מספיקה:** אין קרן UCITS אירית על
 *  קריפטו, ולכן כל דרך להחזיק אותו מחזירה חשיפה למס העיזבון
 *  האמריקאי — הדבר היחיד שכל המבנה בא למנוע; הוא לא נבדק באף
 *  קומבינציה; והבורסה הישראלית, שדרכה הוא נקנה, ירדה כמסלול.
 *
 *  **ומה שנשאר הוא בדיוק שני מנועי הצמיחה שבקומבינציות** — SMH
 *  ו-XLKS — כך שהמנוע הזה והמסלולים מחזיקים את אותה חשיפה. */
export type Sleeve = 'SEM' | 'TEC';
export type Scenario = 'real';
/** **מסלול הקנייה — חו״ל בלבד, מאז 4.11.2026.**
 *
 *  עד כאן היה גם מסלול `'il'` — קנייה בשקלים בתל אביב. הוא הוסר,
 *  ומשתי סיבות שכל אחת מהן מספיקה:
 *
 *  **האחת, הוא לא היה מעשי.** התמורה היומית של תעודת הטכנולוגיה
 *  בת״א (IUIT, 1159193) הייתה **46,144₪** — פחות מהפקדה חודשית
 *  אחת של כמה לקוחות, ומתחת לרף הנזילות של 100,000₪ שאנחנו עצמנו
 *  קבענו. המחיר שמקבלים בפועל אינו המחיר שרואים.
 *
 *  **והשנייה, על שני רכיבים לא הייתה שם קרן אירית בכלל.** ביטקוין
 *  ושבבים נקנו דרך **קרנות סל ישראליות** — ואלה אינן UCITS, הן
 *  סינתטיות, והן אינן מחזיקות את הנכס עצמו. אימות של חמש תעודות
 *  הסייבר הישראליות בת״א הראה את אותו מבנה בדיוק: חוזה חילופין
 *  ב-88%–99.9% מהקרן, פורוורדים ומק״מ כבטוחה, **ואפס מניות**.
 *
 *  הקנייה נעשית דרך אינטראקטיב ישראל בבורסות לונדון ואירופה. */
export type Market = 'fx';
export type Track = 'flow' | 'both' | 'growth';
export type Cohort = '20-30' | '30-40' | '40-50' | '50-60' | '60-70';

export const SLEEVES: Sleeve[] = ['SEM', 'TEC'];
export const SLEEVE_HE: Record<Sleeve, string> = {
  SEM: 'שבבים', TEC: 'טכנולוגיה',
};
/** measured annual volatility, 146 months */
export const VOL: Record<Sleeve, number> = { SEM: 0.272745, TEC: 0.198347 };
/** גורם צ׳ולסקי של מטריצת המתאמים הנמדדת.
 *  **חושב מחדש ב-4.11.2026 אחרי הסרת הביטקוין** — נשאר צמד אחד,
 *  SEM·TEC במתאם 0.88, ולכן המטריצה היא 2×2 ולא 3×3. */
const CHOL = [[1, 0], [0.88, 0.474974]];
/** the two scenarios differ in bitcoin alone — there is no published source
 *  above Damodaran for the two sectors, so the realistic case repeats them */
export const ASSUMPTION: Record<Scenario, Record<Sleeve, number>> = {
  real: { SEM: 0.1072, TEC: 0.0964 },
};
/** Management fees of the instruments actually bought on each route.
 *  The Tel Aviv route was removed on 4.11.2026 — see the Market type. */
export const TER: Record<Market, Record<Sleeve, number>> = {
  fx: { SEM: 0.0035, TEC: 0.0014 },
};
export const FX_DRAG = 0.004, CPI = 0.02, TAX = 0.25, UP_CAP = 10;

/** **משקל היעד של כל שרוול, לפי מסלול — נגזר מהקומבינציות עצמן.**
 *
 *  לא מספר שנבחר: זה **ממוצע משקל השבבים בתמהילים של אותו מסלול**
 *  ב-`combos.ts`. תזרים 0% ו-10% ⇒ 5%; משולב 10/10/20 ⇒ 13%;
 *  צמיחה 30/30/50/70/90 ⇒ 54%. היתרה היא שרוול הטכנולוגיה. */
export const SLEEVE_TARGET: Record<Track, Record<Sleeve, number>> = {
  flow:   { SEM: 0.05, TEC: 0.95 },
  both:   { SEM: 0.13, TEC: 0.87 },
  growth: { SEM: 0.54, TEC: 0.46 },
};

/** כמה מטים לנופל, לפי מסלול — אותם ערכים שב-`monthPlan`. */
export const DIP_TILT: Record<Track, number> = { flow: 0.5, both: 1.0, growth: 1.5 };
/** ואף רכיב לא מעל פי זה ממשקל היעד בהפקדה אחת. */
export const DIP_CAP = 3;
/** the year the plan would have moved to a global track — and does not */
/** שנת המעבר במסלול הצמיחה — מתי ההפקדה מתחילה לדעוך ומתי המשיכות
 *  נפתחות. הסולם יורד בחמש לכל קבוצה, כך שהמשיכות מתחילות בגיל
 *  50 / 55 / 60 / 65 / 70.
 *
 *  עד 1.11.2026 שתי הקבוצות הצעירות קיבלו שתיהן 20, ולכן **גילאי 20-30
 *  ו-30-40 הניבו תוצאה זהה לחלוטין** — הגיל נכנס לסימולציה רק דרך
 *  הערך הזה, ולכן אין שום משתנה אחר שהבדיל ביניהן. */
export const COHORT_YEAR: Record<Cohort, number> = {
  '20-30': 25, '30-40': 20, '40-50': 15, '50-60': 10, '60-70': 5,
};
/** **לוח המשיכות — ותקרה אחת שחלה על שלושת המסלולים.**
 *
 *  **ארבעה אחוזים בשנה הם התקרה, ואין מסלול ואין שלב שעובר אותה.**
 *  זו החלטת מוצר ולא פרמטר: המשיכה נעצרת ב-4% גם כשהתיק עלה, כי
 *  שיעור משיכה גבוה יותר הוא מה שהופך נפילה רגילה לנפילה שממנה
 *  הקרן לא חוזרת. `WITHDRAW_MAX` אוכף את זה בקוד, לא בהערה.
 *
 *  ההיגיון של המדרגה שלפניה: **אחוז אחד בשנה הוא תזרים שהתיק כמעט
 *  לא מרגיש**, ולכן הוא יכול לרוץ מהשנה הראשונה בלי לפגוע בצבירה.
 *  **ארבעה אחוזים הם התזרים האמיתי**, והוא נדחה עד שהקרן גדולה
 *  מספיק לשאת אותו.
 *
 *  · **תזרים** — 1% משנה 1 עד 5, **ומשנה 6 ארבעה אחוזים.**
 *  · **תזרים וצמיחה** — 1% עד שנה 9, **ומשנה 10 ארבעה אחוזים.**
 *  · **צמיחה** — אפס בזמן הצבירה, **ו-4% משנת המעבר של הקבוצה**
 *    (גיל 50 / 55 / 60 / 65 / 70). המסלול אינו מושך בדרך, אבל
 *    כשהוא מתחיל למשוך הוא מושך באותה תקרה כמו השניים האחרים.
 *
 *  **ולמה תזרים מקדים את תזרים־וצמיחה בארבע שנים.** זה תפקידו: מי
 *  שבחר אותו צריך את הכסף, ולכן הוא עובר ל-4% ברגע שהתיק יכול —
 *  ואחרי שש שנות הפקדה הוא יכול. מי שבחר תזרים־וצמיחה מוכן להמתין
 *  עוד ארבע שנים בשביל שהקרן תהיה גדולה יותר כשהמשיכה מתחילה.
 *
 *  **המדרגה היא שנתית ומחולקת ל-12.** 4% בשנה פירושו 0.333% בחודש
 *  מהשווי העדכני, לא סכום קבוע. */
/** **התקרה המוחלטת של המשיכה השנתית.** כל שיעור משיכה בכל מסלול
 *  ובכל שלב עובר דרך `Math.min` מולה. */
export const WITHDRAW_MAX = 0.04;

/** **שנתיים ראשונות — בלי משיכה בכלל. וזה נמדד, לא הונח.**
 *
 *  כלל המשיכה מוכר **רק רכיב שמעל מחיר הקנייה הממוצע שלו**, כדי
 *  שמשיכה לא תנעל הפסד. התוצאה היא שבשוק יורד **אין מה למשוך** —
 *  וזו תכונה, לא תקלה.
 *
 *  **אבל המחיר שלה תלוי לגמרי בכמה זמן נצבר לפני המשיכה הראשונה.**
 *  מבחן מתגלגל על כל נקודת התחלה בנתונים (12.2006–11.2026, 168–192
 *  התחלות לכל אורך צבירה):
 *
 *      צבירה 12 חודשים → **28% מההתחלות נחסמו**, הגרוע 28 חודשים ברצף
 *      צבירה 24 חודשים → 9% נחסמו, הגרוע 11 חודשים
 *      צבירה 36 חודשים → **0 מתוך 168. אפס.**
 *
 *  ולכן המשיכות נפתחות **משנה 3**. ‏`0` בשנתיים הראשונות אינו
 *  מגבלה שרירותית — הוא ההפרש בין ״רבע מהמתחילים נתקע בלי הכנסה
 *  לשנתיים״ לבין ״אף אחד״.
 *
 *  ⚠️ **ומה שהמבחן הזה לא כולל: 2000–2002.** שני ספקי הנתונים
 *  חסומים ב-240 נקודות חודשיות, ולכן החלון מתחיל ב-12.2006.
 *  ומהמדידות ששמורות בפרויקט: **נאסד״ק 100 ירד 83% ולקח לו 15.6
 *  שנים לחזור; מדד השבבים ירד 87% ולקח לו 17.7 שנים.** בתיק עם
 *  משקל כבד לשניהם, הכלל היה חוסם משיכות **שנים ולא חודשים** —
 *  ושלוש שנות צבירה לא היו מצילות אותו. */
const RAMP: Record<'flow' | 'both', number[]> = {
  // שנים 1-2 אין משיכה · 3-5 אחוז אחד · משנה 6 ארבעה
  flow: [0, 0, .01, .01, .01, WITHDRAW_MAX],
  // שנים 1-2 אין משיכה · 3-9 אחוז אחד · משנה 10 ארבעה
  both: [0, 0, .01, .01, .01, .01, .01, .01, .01, WITHDRAW_MAX],
};
/** the growth track's transition year — the cohort's, unless one is given.
 *  A child's plan sets it directly: deposits until the salary starts. */
export const transitionYear = (cohort: Cohort, override?: number) =>
  override ?? COHORT_YEAR[cohort];
export function withdrawRate(track: Track, cohort: Cohort, year: number, _startYear?: number): number {
  // **צמיחה אינה מושכת בזמן הצבירה** — זה מה שמבדיל אותה מהשניים
  // האחרים. משנת המעבר של הקבוצה היא מושכת באותה תקרה, 4%.
  const raw = track === 'growth'
    ? (year > COHORT_YEAR[cohort] ? WITHDRAW_MAX : 0)
    : RAMP[track][Math.min(year - 1, RAMP[track].length - 1)];
  // התקרה נאכפת כאן, כדי שאף קורא לא יוכל לעבור אותה.
  return Math.min(raw, WITHDRAW_MAX);
}
/** the deposit climbs for five years, then falls by a share of the base */
/** ההפקדה בשנה נתונה.
 *
 *  ההפקדה עולה ב-growth עד שנה 5, מחזיקה עד שנת המעבר, ואז **דועכת
 *  לינארית עד אפס בשנה האחרונה של האופק**.
 *
 *  עד 1.11.2026 הדעיכה הייתה אחוז קבוע מהבסיס — 5% בתזרים-וצמיחה
 *  ו-10% בשאר — וזה יצר חוסר עקביות: בצמיחה בלבד לגילאי 20-40 שנת
 *  המעבר היא 20, הדעיכה דרשה 12 שנים, **וההפקדות נגמרו בשנה 32,
 *  כלומר אחרי אופק של 30 שנה**. התיק עוד הפקיד בשנה 30 בזמן שהוא
 *  כבר מושך. בתזרים-וצמיחה הן נגמרו ב-28 ובתזרים ב-17.
 *  עכשיו קצב הדעיכה נגזר מהשנים שנשארו, ולכן **ההפקדות מתאפסות
 *  בדיוק בשנה האחרונה בכל מסלול ובכל גיל.** */
export function depositFor(
  track: Track, cohort: Cohort, year: number, base: number, growth: number,
  years: number, startYear?: number,
): number {
  const start = track === 'growth' ? transitionYear(cohort, startYear) : 5;
  if (year <= Math.min(5, start)) return base * Math.pow(1 + growth, Math.min(year, 5) - 1);
  if (year <= start) return base * Math.pow(1 + growth, 4);
  const peak = base * Math.pow(1 + growth, Math.min(start, 5) - 1);
  // הדעיכה פרושה על כל השנים שנשארו, כך שהיא מגיעה לאפס בשנה האחרונה.
  // אם האופק קצר משנת המעבר, אין שלב דעיכה בכלל ולכן אין על מה לחלק.
  const span = years - start;
  if (span <= 0) return peak;
  return Math.max(0, peak * (1 - (year - start) / span));
}
export function depositsEndYear(
  track: Track, cohort: Cohort, base: number, growth: number,
  years: number, startYear?: number,
) {
  for (let y = 2; y <= 200; y++)
    if (depositFor(track, cohort, y, base, growth, years, startYear) <= 0) return y;
  return null;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pctl(a: number[], q: number) {
  const s = a.slice().sort((x, y) => x - y);
  const i = q * (s.length - 1), lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}
const median = (a: number[]) => pctl(a, 0.5);

/** one price path · the assumptions are geometric, so no further σ²/2 drag */
function path(sc: Scenario, mkt: Market, months: number, r: () => number) {
  const mu = {} as Record<Sleeve, number>, sd = {} as Record<Sleeve, number>;
  for (const t of SLEEVES) {
    mu[t] = Math.log(1 + ASSUMPTION[sc][t] - FX_DRAG - TER[mkt][t]) / 12;
    sd[t] = VOL[t] / Math.sqrt(12);
  }
  const px = {} as Record<Sleeve, Float64Array>;
  for (const t of SLEEVES) px[t] = new Float64Array(months);
  const cur = { SEM: 100, TEC: 100 } as Record<Sleeve, number>;
  // **נגזר מ-`SLEEVES.length`, ולא מקובע ב-3.** כאן ישב `i < 3` ושלוש
  // דגימות `gauss` מהימים שבהם היו שלושה רכיבים. אחרי שהביטקוין ירד
  // נשארו שניים ו-`CHOL` כווץ ל-2×2, אבל הלולאה המשיכה לרוץ עד 3 —
  // `CHOL[2]` הוא `undefined`, ו**כל קריאה ל-`simulate` קרסה**. טיפוסים
  // לא תופסים את זה: גישה מחוץ לתחום של מערך היא שגיאת ריצה בלבד.
  for (let m = 0; m < months; m++) {
    const z = SLEEVES.map(() => gauss(r));
    for (let i = 0; i < SLEEVES.length; i++) {
      let cz = 0;
      for (let j = 0; j <= i; j++) cz += CHOL[i][j] * z[j];
      const t = SLEEVES[i];
      cur[t] *= Math.exp(mu[t] + sd[t] * cz);
      px[t][m] = cur[t];
    }
  }
  return px;
}

export interface SimInput {
  scenario: Scenario; market: Market; track: Track; cohort: Cohort;
  base: number; growth: number; years: number;
  lump?: number; floor?: number; paths?: number; seed?: number;
  targets?: number[];
  /** growth track only: the year withdrawals open, instead of the cohort's */
  startYear?: number;
}
export interface YearRow {
  deposit: number; value: number; income: number; incomeP10: number;
  cash: number; valueP10: number;
}
export interface SimResult {
  rows: YearRow[]; value: number; cash: number; paid: number;
  skipped: number; belowFloor: number;
  firstWithdrawal: [number, number] | null;
  crossover: [number, number, number, number] | null;
  goals: Record<number, number | null>;
  depositsEnd: number | null;
}

function runPath(px: Record<Sleeve, Float64Array>, months: number, o: SimInput) {
  const sh = { SEM: 0, TEC: 0 } as Record<Sleeve, number>;
  const cost = { ...sh }, costIdx = { ...sh }, peak = { ...sh };
  const floor = o.floor ?? 0, lump = o.lump ?? 0;
  let cash = 0, paid = 0, yearCash = 0, skipped = 0, belowFloor = 0;
  let first: number | null = null, cross: [number, number, number] | null = null;
  const rows: Array<[number, number, number, number]> = [];
  const hit: Record<number, number | null> = {};
  for (const T of o.targets ?? []) hit[T] = null;
  const cm = Math.pow(1 + CPI, 1 / 12);
  for (let m = 0; m < months; m++) {
    const year = Math.floor(m / 12) + 1;
    if (m % 12 === 0) yearCash = 0;
    const idx = Math.pow(cm, m);
    let dep = depositFor(o.track, o.cohort, year, o.base, o.growth, o.years, o.startYear);
    for (const t of SLEEVES) peak[t] = peak[t] > 0 ? Math.max(peak[t], px[t][m]) : px[t][m];
    if (lump > 0 && m === 0) {
      // nothing is below its peak on day one, so the rule has nothing to read:
      // the opening sum splits evenly, which also measured a better 10th percentile
      for (const t of SLEEVES) {
        const a = lump / SLEEVES.length;
        sh[t] += a / px[t][m]; cost[t] += a; costIdx[t] += a / idx;
      }
      paid += lump;
    }
    if (dep > 0) {
      // **אותו כלל שרשימת הקנייה מריצה — משקל יעד, הטיה, ותקרה.**
      // הכלל שהיה כאן חילק לפי עומק הנפילה בלבד, **והעודף כולו הלך
      // לנופל העמוק ביותר בלי תקרה**. נמדד: בתמהיל שבו השבבים הם
      // 10%, הם קיבלו בפועל **65% מההפקדות** — כלומר ההקרנה תיארה
      // תיק שאיש לא בחר, עם התשואה הגבוהה והסיכון של רכיב אחד.
      const w = SLEEVE_TARGET[o.track];
      const raw = {} as Record<Sleeve, number>;
      let s = 0;
      for (const t of SLEEVES) {
        const fall = Math.max(0, 1 - px[t][m] / peak[t]);
        raw[t] = w[t] * (1 + DIP_TILT[o.track] * fall * 3);
        s += raw[t];
      }
      const al = {} as Record<Sleeve, number>;
      for (const t of SLEEVES) al[t] = dep * raw[t] / s;
      // התקרה: אף רכיב מעל פי DIP_CAP ממשקל היעד, והעודף למי שיש לו מקום
      let over = 0;
      for (const t of SLEEVES) {
        const cap = dep * w[t] * DIP_CAP;
        if (al[t] > cap) { over += al[t] - cap; al[t] = cap; }
      }
      if (over > 0) {
        const room = SLEEVES.map(t => Math.max(0, dep * w[t] * DIP_CAP - al[t]));
        const rs = room.reduce((a, b) => a + b, 0);
        if (rs > 0) SLEEVES.forEach((t, i) => { al[t] += over * room[i] / rs; });
      }
      for (const t of SLEEVES) if (al[t] > 0) {
        sh[t] += al[t] / px[t][m]; cost[t] += al[t]; costIdx[t] += al[t] / idx;
      }
      paid += dep;
    }
    let value = 0;
    for (const t of SLEEVES) value += sh[t] * px[t][m];
    let net = 0;
    const rate = withdrawRate(o.track, o.cohort, year, o.startYear);
    if (rate > 0 && value > 0) {
      const gross = value * rate / 12;
      if (gross < floor) belowFloor++;
      else {
        // only a sleeve priced above its own average cost is sold
        const pool = {} as Record<Sleeve, number>;
        let pv = 0;
        for (const t of SLEEVES) if (sh[t] > 0 && px[t][m] > cost[t] / sh[t]) {
          pool[t] = sh[t] * px[t][m]; pv += pool[t];
        }
        if (pv <= 0) skipped++;
        else {
          for (const t of Object.keys(pool) as Sleeve[]) {
            const take = gross * pool[t] / pv;
            const fr = Math.min(0.999, take / (sh[t] * px[t][m]));
            const realGain = Math.max(0, take - fr * idx * costIdx[t]);
            sh[t] *= 1 - fr; cost[t] *= 1 - fr; costIdx[t] *= 1 - fr;
            const after = take - realGain * TAX;
            cash += after; net += after; yearCash += after;
          }
          if (first === null) first = m;
        }
      }
    }
    if (cross === null && dep > 0 && net >= dep && net > 0) cross = [m, net, dep];
    for (const T of Object.keys(hit)) if (hit[+T] === null && net >= +T) hit[+T] = m;
    value = 0;
    for (const t of SLEEVES) value += sh[t] * px[t][m];
    if (m % 12 === 11) rows.push([dep, value, yearCash / 12, cash]);
  }
  let end = 0;
  for (const t of SLEEVES) end += sh[t] * px[t][months - 1];
  return { rows, value: end, cash, paid, skipped, belowFloor, first, cross, hit };
}

export function simulate(o: SimInput): SimResult {
  const months = o.years * 12, n = o.paths ?? 1200;
  const r = rng(o.seed ?? 20261025);
  const runs = Array.from({ length: n }, () => runPath(path(o.scenario, o.market, months, r), months, o));
  const rows: YearRow[] = [];
  for (let i = 0; i < o.years; i++) {
    const inc = runs.map(x => x.rows[i][2]), val = runs.map(x => x.rows[i][1]);
    rows.push({
      deposit: runs[0].rows[i][0], value: median(val), income: median(inc),
      incomeP10: pctl(inc, 0.10), cash: median(runs.map(x => x.rows[i][3])),
      valueP10: pctl(val, 0.10),
    });
  }
  const mid = (pick: (x: ReturnType<typeof runPath>) => number | null) => {
    const v = runs.map(pick).filter((x): x is number => x !== null);
    if (v.length < n * 0.5) return null;
    const m = Math.round(median(v));
    return [Math.floor(m / 12) + 1, m % 12 + 1] as [number, number];
  };
  const crossRuns = runs.map(x => x.cross).filter((x): x is [number, number, number] => x !== null);
  let crossover: SimResult['crossover'] = null;
  if (crossRuns.length >= n * 0.5) {
    const m = Math.round(median(crossRuns.map(c => c[0])));
    const one = crossRuns.find(c => c[0] === m) ?? crossRuns[0];
    crossover = [Math.floor(m / 12) + 1, m % 12 + 1, Math.round(one[1]), Math.round(one[2])];
  }
  const goals: Record<number, number | null> = {};
  for (const T of o.targets ?? []) {
    const v = runs.map(x => x.hit[T]).filter((x): x is number => x !== null);
    goals[T] = v.length >= n * 0.5 ? Math.round(median(v)) : null;
  }
  return {
    rows, value: median(runs.map(x => x.value)), cash: median(runs.map(x => x.cash)),
    paid: runs[0].paid, skipped: Math.round(median(runs.map(x => x.skipped))),
    belowFloor: Math.round(median(runs.map(x => x.belowFloor))),
    firstWithdrawal: mid(x => x.first), crossover, goals,
    depositsEnd: depositsEndYear(o.track, o.cohort, o.base, o.growth, o.years, o.startYear),
  };
}
/** the median of a skewed distribution moves between runs; this is how much */
export const medianNoise = (paths: number) => 13.2 * Math.sqrt(400 / paths);
