/** MGS · הרצת תמהיל נבחר דרך שלושת המסלולים.
 *
 *  **מה זה עושה.** לוקח תמהיל מהקטלוג האירי — עם התשואה והתנודתיות
 *  **שנמדדו לו**, לא עם הנחה — ומריץ עליו את ההפקדות והמשיכות של כל
 *  אחד משלושת המסלולים, כדי שאפשר יהיה לראות את אותו תיק בשלושה
 *  תפקידים שונים.
 *
 *  **למה מונטה־קרלו ולא נוסחה.** תשואה ממוצעת של 19% אינה אומרת
 *  שהתיק יעלה 19% בכל שנה. עם משיכות, **הסדר של השנים הטובות
 *  והרעות משנה את התוצאה** — מי שסופג נפילה בשנים הראשונות של
 *  המשיכה מושך מתוך קרן קטנה יותר, והיא לא מתאוששת. לכן מוצג
 *  **החציון ואחוזון 10**, ולא מספר אחד.
 *
 *  **מה אינו כלול כאן:** מנגנון הקנייה שמנתב לנופל העמוק ביותר.
 *  הוא דורש מחירי שיא של כל רכיב בנפרד; כאן מוצג התיק כיחידה אחת
 *  עם התשואה והתנודתיות המשוקללות שלו.
 */
import { withdrawRate, WITHDRAW_MAX, type Track, type Cohort } from './mgsSim';

/** **אופק ההפקדות לכל קבוצת גיל.**
 *
 *  ההפקדות רצות עד השנה הזאת **ונעצרות לגמרי** — אין דעיכה הדרגתית.
 *  מאותה נקודה ואילך יש **משיכות בלבד**, והתיק חי ממה שנצבר.
 *
 *  **הערה שצריכה הכרעה:** לפי ההגדרה שנמסרה, 60-70 מפקידים 10 שנים —
 *  וזה **זהה ל-50-60**. ייתכן שהכוונה הייתה 50-60 ושהמספר של 60-70
 *  נשאר 5 כפי שהיה. הערך כאן הוא כפי שנמסר, ואפשר לשנות אותו בשורה
 *  אחת.
 */
export const DEPOSIT_YEARS: Record<Cohort, number> = {
  '20-30': 25,
  '30-40': 20,
  '40-50': 15,
  '50-60': 10,
  '60-70': 10,
};

/** **עקומת ההפקדה — מקור אחד לכל המערכת.**
 *
 *  שני שלבים, ואז אפס:
 *
 *  · **שנים 1–5 — עולה.** ההפקדה גדלה באחוז שנבחר בכל שנה.
 *    `base * (1+g)^(y-1)`, כך ששנה 5 היא השיא.
 *  · **משנה 6 ועד סוף תקופת ההפקדות — יורדת.** ירידה לינארית
 *    מהשיא, שמגיעה לאפס בדיוק בשנה שאחרי העצירה.
 *  · **אחרי העצירה — אפס מוחלט.**
 *
 *  **למה דווקא ככה.** שקל שנכנס מוקדם עובד את כל התקופה ושקל
 *  שנכנס בסוף כמעט לא, ולכן ההפקדה מרוכזת בשנים הראשונות — שם
 *  היא שווה הכי הרבה. הירידה שאחריה מורידה את הנטל בדיוק
 *  כשהתיק כבר גדול מספיק לשאת את עצמו.
 *
 *  **ובדיקת הגבול:** בשנה 5 שני הענפים נותנים את אותו מספר, ולכן
 *  אין קפיצה בעקומה.
 */
export function depositAt(
  year: number, base: number, growth: number, depYears: number,
): number {
  if (year > depYears || base <= 0) return 0;
  const RISE = 5;
  const peak = base * Math.pow(1 + growth, Math.min(RISE, depYears) - 1);
  if (year <= RISE) return base * Math.pow(1 + growth, year - 1);
  // יורדת מהשיא לאפס בשנה depYears+1
  const span = depYears + 1 - RISE;
  return span > 0 ? peak * (depYears + 1 - year) / span : 0;
}

/** ההפקדה בשנה נתונה לפי קבוצת גיל. */
export function depositUntilStop(
  cohort: Cohort, year: number, base: number, growth: number,
): number {
  return depositAt(year, base, growth, DEPOSIT_YEARS[cohort]);
}

export interface ComboProjection {
  track: Track;
  /** שווי התיק בתום התקופה — חציון */
  value: number;
  /** אחוזון 10 — אחד מעשרה מסלולים הסתיים כאן או נמוך מזה */
  valueP10: number;
  /** סך המשיכות לאורך התקופה, חציון */
  taken: number;
  /** ההכנסה החודשית בשנה האחרונה שבה נמשך כסף */
  income: number;
  /** סך ההפקדות */
  paid: number;
  /** השנה שבה מתחילה המשיכה, או null אם אין */
  firstWithdrawYear: number | null;
  /** הנפילה העמוקה ביותר שנצפתה בחציון המסלולים */
  worstDrop: number;
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

/** שיעור המשיכה השנתי אחרי שההפקדות נעצרו, לפי מסלול.
 *  תזרים מושך הכי הרבה כי זה תפקידו; צמיחה מושך 4% — כלל האצבע
 *  הנפוץ — רק מהרגע שההפקדות נגמרו. */
/** **גיל העצירה המוחלט של ההפקדות.**
 *
 *  המודל קובע שנות הפקדה לפי קבוצת גיל: 60-70 מפקידים עשר שנים,
 *  כלומר בן 70 עוצר ב-80. **הגבול המשתמע הוא 80** — ובלעדיו המערכת
 *  אמרה לבן 75 להפקיד עשר שנים ולעצור ב-85, ולבן 99 לעצור ב-109.
 */
export const STOP_AGE = 80;

/** **שנות ההפקדה בפועל, לפי הגיל ולא רק לפי הקבוצה.**
 *
 *  הקבוצה נותנת את האופק הרצוי; גיל העצירה חותך אותו. בן 75 מפקיד
 *  חמש שנים ולא עשר, ומי שעבר את 80 **אינו בצבירה כלל** — הוא
 *  במשיכות, וזה מה שהמסך צריך לומר.
 */
export function depositYearsFor(
  age: number, cohort: Cohort,
): { years: number; stopAge: number; capped: boolean } {
  const want = DEPOSIT_YEARS[cohort];
  const years = Math.max(0, Math.min(want, STOP_AGE - age));
  return { years, stopAge: age + years, capped: years < want };
}

/** תווית הקבוצה כפי שמציגים אותה. מעל 70 הקבוצה ״60-70״ היא תווית
 *  שקרית, ולכן מוצג הטווח האמיתי. */
export function cohortLabel(age: number, cohort: Cohort): string {
  return age >= 70 ? '70+' : cohort;
}

/** **שיעור המשיכה השנתי אחרי שההפקדות נעצרות — 4% בשלושת המסלולים.**
 *
 *  **תוקן 4.11.2026, והתיקון הוא תיקון של פגם ולא כיול.** עד כאן
 *  עמד כאן `flow: 0.05, both: 0.045` — כלומר **תזרים משך 5% ותזרים־
 *  וצמיחה 4.5%, שניהם מעל התקרה של 4%** שלוח המשיכות ב-`mgsSim`
 *  מגדיר. אותה אפליקציה הציגה למשתמש 4% בשלב הצבירה ואז משכה
 *  5% בשלב החיים מהכסף, ושני המספרים נראו לו כמו אותו מסלול.
 *
 *  **למה 4% ולא יותר, גם כשהתיק עלה.** שיעור המשיכה הוא מה שקובע
 *  אם נפילה רגילה היא נפילה שממנה חוזרים. מי שמושך 5% מתיק שירד
 *  30% מושך בפועל 7.1% מהקרן שנשארה, והוא מוציא מניות בדיוק בשלב
 *  שבו הן אמורות להתאושש. ההפרש בין 4% ל-5% אינו 1% — הוא ההבדל
 *  בין קרן שמחזיקה שלושים שנה לקרן שנגמרת.
 *
 *  · **תזרים** — 4%.
 *  · **תזרים וצמיחה** — 4%.
 *  · **צמיחה** — 4%, ורק אחרי שההפקדות נעצרו. בדרך הוא לא מושך. */
export const WITHDRAW_AFTER_STOP: Record<Track, number> = {
  flow: WITHDRAW_MAX, both: WITHDRAW_MAX, growth: WITHDRAW_MAX,
};

export interface ComboInput {
  /** התשואה השנתית שנמדדה לתמהיל */
  cagr: number;
  /** התנודתיות השנתית שנמדדה לו */
  vol: number;
  track: Track;
  cohort: Cohort;
  /** ההפקדה החודשית — **החלק שמגיע לברוקר בלבד** */
  base: number;
  /** כמה שנים **אחרי** שההפקדות נעצרו ממשיכים למשוך. ברירת מחדל 20. */
  drawYears?: number;
  /** עליה שנתית בהפקדה, עד שנה 5 */
  growth: number;
  years: number;
  paths?: number;
  seed?: number;
}

export function projectCombo(o: ComboInput): ComboProjection {
  // האופק הכולל: שנות ההפקדה של הקבוצה, ועוד שנות המשיכה
  const totalYears = DEPOSIT_YEARS[o.cohort] + (o.drawYears ?? 20);
  const months = totalYears * 12;
  const paths = o.paths ?? 400;
  const r = rng(o.seed ?? 20261102);

  // תשואה גיאומטרית חודשית מהתשואה השנתית שנמדדה
  const mu = Math.log(1 + o.cagr) / 12;
  const sd = o.vol / Math.sqrt(12);

  const ends: number[] = [], takens: number[] = [], incomes: number[] = [];
  const drops: number[] = [];
  let firstW: number | null = null;
  let paid = 0;

  for (let p = 0; p < paths; p++) {
    let v = 0, taken = 0, lastIncome = 0, pathPaid = 0;
    let peak = 0, worst = 0;

    for (let m = 0; m < months; m++) {
      const year = Math.floor(m / 12) + 1;

      const dep = depositUntilStop(o.cohort, year, o.base, o.growth) / 12;
      if (dep > 0) { v += dep; pathPaid += dep; }

      v *= Math.exp(mu + sd * gauss(r));

      // מאופק ההפקדות ואילך — משיכות בלבד, בכל המסלולים
      const stopped = year > DEPOSIT_YEARS[o.cohort];
      const rate = stopped
        ? WITHDRAW_AFTER_STOP[o.track]
        : withdrawRate(o.track, o.cohort, year);
      if (rate > 0 && v > 0) {
        const want = v * rate / 12;
        const got = Math.min(want, v);
        v -= got; taken += got; lastIncome = got;
        if (p === 0 && firstW === null) firstW = year;
      }

      peak = Math.max(peak, v);
      if (peak > 0) worst = Math.min(worst, v / peak - 1);
    }
    ends.push(v); takens.push(taken); incomes.push(lastIncome); drops.push(worst);
    if (p === 0) paid = pathPaid;
  }

  return {
    track: o.track,
    value: pctl(ends, 0.5),
    valueP10: pctl(ends, 0.10),
    taken: pctl(takens, 0.5),
    income: pctl(incomes, 0.5),
    paid,
    firstWithdrawYear: firstW,
    worstDrop: pctl(drops, 0.5),
  };
}

/** אותו תמהיל, בשלושת המסלולים — זו ההשוואה שמעניינת */
export function projectAllTracks(
  o: Omit<ComboInput, 'track'>,
): Record<Track, ComboProjection> {
  const tracks: Track[] = ['flow', 'both', 'growth'];
  const out = {} as Record<Track, ComboProjection>;
  for (const t of tracks) out[t] = projectCombo({ ...o, track: t });
  return out;
}
