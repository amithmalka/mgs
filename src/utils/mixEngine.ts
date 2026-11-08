/** MGS · המנוע האמיתי — כל רכיב בנפרד, עם המתאמים, ועם מנגנון הקנייה.
 *
 *  **למה זה שונה מהרצת התיק כיחידה אחת, ולמה זה משנה הרבה.**
 *
 *  כשמריצים את התיק כנכס אחד עם התשואה המשוקללת שלו, מפספסים שני
 *  דברים שנמדדו ושניהם לטובת המשקיע:
 *
 *  **אחד — הפקדה חודשית לנכס תנודתי מרוויחה יותר מהתשואה שלו.**
 *  קונים יותר יחידות כשהוא זול ופחות כשהוא יקר, ולכן ה-IRR גבוה
 *  מה-CAGR. בתמהיל של טכנולוגיה ושבבים ההנחה המשוקללת היא 9.57%,
 *  **וה-IRR שנמדד בהרצה הוא 12.04%**. הפער הזה אמיתי ואינו בונוס.
 *
 *  **שתיים — מנגנון הקנייה מוסיף מעל זה.** הוא מנתב את השארית לרכיב
 *  שנפל הכי עמוק, ולכן קונה הכי הרבה בדיוק כשהוא הכי זול. היתרון
 *  שנמדד: **0.31 עד 1.52 נקודות אחוז בשנה**, תלוי בתמהיל.
 *
 *  **התשואה קדימה היא הנחה; התנודתיות והמתאמים הם מדידה.** כל רכיב
 *  מקבל את ההנחה שלו מ-`forward.ts` עם מקור מפורסם, ואת התנודתיות
 *  והמתאם שלו מ-60 החודשים שנמדדו.
 */
import { IRISH, corr } from '../constants/irish';
import { FORWARD, CONT_YEARS, type Outlook } from '../constants/forward';
import { DEPOSIT_YEARS, WITHDRAW_AFTER_STOP, depositAt } from './comboProject';
import { withdrawRate, type Track, type Cohort } from './mgsSim';

const SHIFT: Record<Outlook, number> = { real: 0, opt: 0.02, cont: 0 };
/** רכיב בשיא מבקש 10% מההפקדה */
const UP_CAP = 10;

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

/** פירוק צ׳ולסקי של מטריצת המתאמים המדודה בין הרכיבים שנבחרו.
 *  זה מה שגורם לרכיבים ליפול יחד כשהם מתואמים — ולא יחד כשלא. */
function cholesky(keys: string[]): number[][] {
  const n = keys.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(1e-12, 1 - s));
      else L[i][j] = (corr(keys[i], keys[j]) - s) / L[j][j];
    }
  }
  return L;
}

/** שורה בתחזית — ערכים בסוף כל שנה, על פני כל המסלולים שנדגמו. */
export interface MixRow {
  year: number;
  /** ההפקדה החודשית באותה שנה — 0 אחרי העצירה */
  deposit: number;
  /** שווי התיק בסוף השנה: חציון ואחוזון 10 */
  value: number; valueP10: number;
  /** המשיכה החודשית באותה שנה, 0 אם אין */
  income: number;
  /** סך מה שנמשך עד סוף אותה שנה */
  takenSoFar: number;
  /** סך מה שהופקד עד סוף אותה שנה */
  paidSoFar: number;
  phase: 'עולה' | 'יורדת' | 'משיכה' | 'צמיחה';
}

export interface MixResult {
  track: Track;
  /** **הצבירה ברגע שההפקדות נעצרות** — זה המספר המרכזי.
   *  בגיל 30-40 זו הצבירה בתום 20 שנה, לא בתום 40. */
  atStop: number; atStopP10: number;
  /** והצבירה שנשארה בתום תקופת המשיכות */
  value: number; valueP10: number;
  taken: number; income: number; paid: number;
  worstDrop: number;
  /** **סך מה שהתיק ייצר** — מה שנשאר ועוד מה שנמשך.
   *  זו ההשוואה ההוגנת בין המסלולים: מסלול שמושך הרבה משאיר פחות,
   *  ולהסתכל רק על היתרה מציג אותו כגרוע בטעות. */
  delivered: number;
  /** התשואה השנתית האפקטיבית על ההפקדות — IRR */
  irr: number;
  firstWithdrawYear: number | null;
  /** התחזית שנה-אחר-שנה */
  rows: MixRow[];
}

export interface MixInput {
  parts: Array<{ k: string; w: number }>;
  track: Track; cohort: Cohort;
  /** עוקף את שנות ההפקדה של הקוהורט. נדרש ל-MGS קידס, שבו אופק
   *  ההפקדה הוא גיל המסירה פחות גיל הילד ואין לו קוהורט. */
  depYears?: number;
  /** ההפקדה החודשית — החלק שמגיע לברוקר */
  base: number;
  /** **העליה השנתית באחוזים — חלה על חמש השנים הראשונות בלבד.**
   *
   *  מהשנה השישית ההפקדה **יורדת** לינארית עד אפס בסוף תקופת
   *  ההפקדות. העקומה כולה ב-`depositAt`.
   *
   *  **זה מה שמונע אובדן תשואה:** שקל שנכנס בשנה 2 עובד את כל
   *  התקופה; שקל שנכנס בשנה 23 כמעט לא — ולכן הכסף מרוכז מוקדם. */
  growth: number;
  drawYears: number;
  outlook: Outlook;
  /** האם להפעיל את מנגנון הקנייה. כבוי = משקלות קבועים. */
  useRule: boolean;
  paths?: number; seed?: number;
}

export function runMix(o: MixInput): MixResult {
  const keys = o.parts.filter(p => p.w > 0).map(p => p.k);
  const n = keys.length;
  const depYears = o.depYears ?? DEPOSIT_YEARS[o.cohort];
  const months = (depYears + o.drawYears) * 12;
  const paths = o.paths ?? 400;   // כמו שאר הקוראים, כדי שמספר המסלולים יהיה אחיד
  const r = rng(o.seed ?? 20261102);
  const L = cholesky(keys);
  const totW = o.parts.reduce((s, p) => s + p.w, 0) || 1;

  /** **ההנחה קדימה לכל רכיב — וב״המשכיות״ היא משתנה עם הזמן.**
   *
   *  בריאלי ובאופטימי התשואה קבועה. ב״המשכיות״ היא מתחילה **במה
   *  שנמדד בפועל** ודועכת לינארית אל ההנחה המפורסמת לאורך
   *  CONT_YEARS שנים — ומשם ההנחה בלבד.
   *
   *  **זה לא תרחיש אופטימי, זו הנחה אחרת:** שמגמה שנמדדה דועכת
   *  ולא נעצרת ביום שבו פתחת את התיק. */
  const muStart = keys.map(k => {
    const f = IRISH.find(x => x.k === k);
    const base = o.outlook === 'cont'
      ? Math.max(0, f?.cagr ?? FORWARD[k]?.real ?? 0.075)
      : (FORWARD[k]?.real ?? 0.075) + SHIFT[o.outlook];
    return Math.max(0, base - (f?.ter ?? 0.002));
  });
  const muEnd = keys.map(k => {
    const f = IRISH.find(x => x.k === k);
    return Math.max(0, (FORWARD[k]?.real ?? 0.075) - (f?.ter ?? 0.002));
  });
  /** התשואה החודשית הלוגריתמית של רכיב i בשנה y */
  const muAt = (i: number, y: number) => {
    if (o.outlook !== 'cont') return Math.log(1 + muStart[i]) / 12;
    const t = Math.min(1, Math.max(0, (y - 1) / CONT_YEARS));
    return Math.log(1 + muStart[i] + (muEnd[i] - muStart[i]) * t) / 12;
  };
  const sd = keys.map(k => (IRISH.find(x => x.k === k)?.vol ?? 0.16) / Math.sqrt(12));

  const ends: number[] = [], takens: number[] = [], incomes: number[] = [], drops: number[] = [];
  const stops: number[] = [];
  const totYears = depYears + o.drawYears;
  // שווי בסוף כל שנה, לכל מסלול — לחישוב החציון והאחוזון התחתון
  const byYear: number[][] = Array.from({ length: totYears }, () => []);
  const incByYear: number[][] = Array.from({ length: totYears }, () => []);
  const takenByYear: number[][] = Array.from({ length: totYears }, () => []);
  let paid = 0, firstW: number | null = null;

  for (let p = 0; p < paths; p++) {
    const px = new Array(n).fill(100);
    const peak = new Array(n).fill(100);
    const sh = new Array(n).fill(0);
    let taken = 0, lastInc = 0, pathPaid = 0, vPeak = 0, worst = 0, atStop = 0;

    for (let m = 0; m < months; m++) {
      const year = Math.floor(m / 12) + 1;

      const z = Array.from({ length: n }, () => gauss(r));
      for (let i = 0; i < n; i++) {
        let cz = 0;
        for (let j = 0; j <= i; j++) cz += L[i][j] * z[j];
        px[i] *= Math.exp(muAt(i, year) + sd[i] * cz);
        peak[i] = Math.max(peak[i], px[i]);
      }

      if (year <= depYears && o.base > 0) {
        // עולה עד שנה 5, ומשם יורדת עד סוף תקופת ההפקדות
        const dep = depositAt(year, o.base, o.growth, depYears);
        let al: number[];
        if (o.useRule) {
          // **הכלל כפי שנאמר, ולא כפי שהיה כאן.** רכיב בשיא מבקש
          // UP_CAP מההפקדה **בלי קשר לגודל העלייה**; רכיב מתחת לשיא
          // מבקש את עומק הנפילה שלו; והיתרה הולכת למי שהעלייה שלו
          // הנמוכה ביותר — שהוא הנופל העמוק ביותר אם מישהו נפל, ומי
          // שעלה הכי פחות אם כולם בשיא. שתי השורות בכלל אחד.
          //
          // מה שהיה כאן: הבקשה של רכיב בשיא הייתה min(עלייה, 10), ולכן
          // **כשכולם בשיא הכסף הלך בעיקר למי שעלה הכי הרבה** — ההיפך
          // מהכלל. ובמקרה הזה השארית לא חולקה בכלל.
          const ask = new Array(n).fill(0), rise = new Array(n).fill(0);
          let s = 0, target = 0;
          for (let i = 0; i < n; i++) {
            const x = (px[i] / peak[i] - 1) * 100;
            rise[i] = x;
            ask[i] = x >= 0 ? UP_CAP : -x;
            s += ask[i];
          }
          for (let i = 1; i < n; i++) if (rise[i] < rise[target]) target = i;
          if (s >= 100) {
            al = ask.map(a => dep * a / s);
          } else {
            al = ask.map(a => dep * a / 100);
            al[target] += dep * (100 - s) / 100;
          }
        } else {
          al = keys.map(k => dep * (o.parts.find(x => x.k === k)!.w / totW));
        }
        for (let i = 0; i < n; i++) sh[i] += al[i] / px[i];
        pathPaid += dep;
      }

      let v = 0;
      for (let i = 0; i < n; i++) v += sh[i] * px[i];

      // הצבירה ברגע שההפקדות נעצרות — החודש האחרון של שנת ההפקדה האחרונה
      if (m === depYears * 12 - 1) atStop = v;

      /** **המשיכה אינה מתחילה רק בעצירה — והלוח הוא זה שב-`mgsSim`.**
       *
       *  **תוקנה 4.11.2026.** ההערה שעמדה כאן תיארה לוח שלא קיים
       *  בקוד — ״2% בשנה 6, 3% בשנה 7, 4% משנה 8״ בתזרים, ו״שנה 5
       *  עד 4% בשנה 11״ במשולב. `RAMP` לא אומר את זה ומעולם לא אמר.
       *
       *  **הלוח האמיתי, מ-`RAMP`:**
       *  · **תזרים** — 1% בשנים 1–5, **ו-4% משנה 6.**
       *  · **תזרים וצמיחה** — 1% בשנים 1–9, **ו-4% משנה 10.**
       *  · **צמיחה** — אפס בזמן הצבירה, **ו-4% משנת המעבר של
       *    הקבוצה** (גיל 50 / 55 / 60 / 65 / 70).
       *
       *  אחרי שההפקדות נעצרות מושכים 4% בשלושת המסלולים.
       *  **4% הם תקרה מוחלטת** — `WITHDRAW_MAX` אוכף אותה.
       *
       *  **והמשיכה היא יחסית מכל רכיב, לא מהרכיב שברווח.** השורה
       *  שמתחת מקטינה את כל ההחזקות באותו שיעור בדיוק. אין כאן
       *  בדיקה של מחיר הקנייה הממוצע ואין העדפה למכור את המנצח. */
      const wRate = year <= depYears
        ? withdrawRate(o.track, o.cohort, year)
        : WITHDRAW_AFTER_STOP[o.track];
      if (v > 0 && wRate > 0) {
        const want = v * wRate / 12;
        const got = Math.min(want, v);
        const fr = v > 0 ? got / v : 0;
        for (let i = 0; i < n; i++) sh[i] *= 1 - fr;
        taken += got; lastInc = got; v -= got;
        if (p === 0 && firstW === null) firstW = year;
      }

      // **הנפילה נמדדת רק בשלב הצבירה.** אחרי שההפקדות נעצרות התיק
      // יורד כי מושכים ממנו, וזו ירידה מתוכננת ולא נפילת שוק —
      // לספור אותה כ״נפילה״ מציג 66% במקום הנפילה האמיתית.
      if (year <= depYears) {
        vPeak = Math.max(vPeak, v);
        if (vPeak > 0) worst = Math.min(worst, v / vPeak - 1);
      }

      // סוף שנה — רושמים את המצב
      if ((m + 1) % 12 === 0) {
        const yi = year - 1;
        if (yi < totYears) {
          byYear[yi].push(v);
          incByYear[yi].push(lastInc);
          takenByYear[yi].push(taken);
        }
      }
    }

    let end = 0;
    for (let i = 0; i < n; i++) end += sh[i] * px[i];
    ends.push(end); takens.push(taken); incomes.push(lastInc); drops.push(worst);
    stops.push(atStop);
    if (p === 0) paid = pathPaid;
  }

  // התחזית שנה-אחר-שנה
  let paidRun = 0;
  const rows: MixRow[] = [];
  for (let y = 1; y <= totYears; y++) {
    const dep = depositAt(y, o.base, o.growth, depYears);
    paidRun += dep * 12;
    const vals = byYear[y - 1];
    rows.push({
      year: y,
      deposit: Math.round(dep),
      value: vals.length ? pctl(vals, 0.5) : 0,
      valueP10: vals.length ? pctl(vals, 0.1) : 0,
      income: incByYear[y - 1].length ? pctl(incByYear[y - 1], 0.5) : 0,
      takenSoFar: takenByYear[y - 1].length ? pctl(takenByYear[y - 1], 0.5) : 0,
      paidSoFar: paidRun,
      phase: y > depYears
        ? (WITHDRAW_AFTER_STOP[o.track] > 0 ? 'משיכה' : 'צמיחה')
        : (y <= 5 ? 'עולה' : 'יורדת'),
    });
  }

  // IRR על ההפקדות בפועל מול הצבירה והמשיכות
  const medEnd = pctl(ends, 0.5), medTaken = pctl(takens, 0.5);
  // ה-IRR נמדד **עד עצירת ההפקדות** — זו התשואה על הכסף שהפקדת,
  // בלי שתקופת המשיכות תדלל אותה.
  const medStop = pctl(stops, 0.5);
  let lo = -0.9, hi = 2;
  for (let it = 0; it < 160; it++) {
    const g = (lo + hi) / 2, mr = Math.pow(1 + g, 1 / 12) - 1;
    let npv = 0;
    for (let m = 0; m < depYears * 12; m++) {
      const y = Math.floor(m / 12) + 1;
      const d = depositAt(y, o.base, o.growth, depYears);
      npv -= d / Math.pow(1 + mr, m + 1);
    }
    npv += medStop / Math.pow(1 + mr, depYears * 12);
    if (npv > 0) lo = g; else hi = g;
  }

  return {
    track: o.track,
    atStop: pctl(stops, 0.5), atStopP10: pctl(stops, 0.10),
    value: medEnd, valueP10: pctl(ends, 0.10),
    taken: medTaken, delivered: medEnd + medTaken,
    income: pctl(incomes, 0.5), paid,
    worstDrop: pctl(drops, 0.5),
    irr: (lo + hi) / 2,
    firstWithdrawYear: firstW,
    rows,
  };
}

/** אותו תמהיל בשלושת המסלולים */
export function runAllTracks(o: Omit<MixInput, 'track'>): Record<Track, MixResult> {
  const out = {} as Record<Track, MixResult>;
  for (const t of ['flow', 'both', 'growth'] as Track[]) out[t] = runMix({ ...o, track: t });
  return out;
}
