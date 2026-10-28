/** MGS · קרן השתלמות בניהול אישי (IRA) — המנוע.
 *
 *  אותו מנגנון קנייה ואותו לוח משיכות כמו בשאר המערכת. מה ששונה הוא
 *  **עטיפת המס**, ושלושה כללים שאומתו מלשון החוק ומטפסי הספקים:
 *
 *  1. **תקרה מוטבת שנתית.** 20,566₪ לעצמאי · 18,854₪ לשכיר (2026, מוקפאות
 *     עד 2027). מעל התקרה **מותר להפקיד** — אין חוק שאוסר — אבל אין הטבת
 *     הפקדה, והרווח על החלק הזה חייב 25% על הרווח הריאלי. הדף מפצל.
 *
 *  2. **נזילות אחרי 6 שנים.** לפני כן אין משיכה בכלל (סעיף 9(16א)(א)).
 *     ולכן לוח משיכות שמתחיל בשנה 2 או 5 נדחה בפועל.
 *
 *  3. **משיכה סוגרת את החשבון להפקדות** — תקנה 37(א) לתקנות מס הכנסה,
 *     *״לא יהיה רשאי להפקיד כספים נוספים **באותו חשבון**״*. ולכן נבנה
 *     סולם: ההפקדה עוברת לחשבון חדש, שנזיל רק 6 שנים אחריו. נמדד
 *     ששתי מדיניות המשיכה נותנות אותה תשואה, אבל ״הוותיק עד שיתרוקן״
 *     משאיר פחות חשבונות — ולכן זו המדיניות כאן.
 */
import {
  SLEEVES, VOL, ASSUMPTION, TER, FX_DRAG, CPI, TAX, UP_CAP,
  withdrawRate, depositFor,
  type Sleeve, type Scenario, type Track, type Cohort,
} from './mgsSim';

/** התקרה המוטבת, 2026 */
export const CEILING = { self: 20566, employee: 18854 } as const;
export type Status = keyof typeof CEILING;
/** חודשי אכשרה עד נזילות */
export const LIQUID_MONTHS = 72;

/** פירוק צ׳ולסקי של מטריצת המתאמים המדודה — זהה למנוע הראשי */
const CHOL = [[1, 0, 0], [0.212201, 0.977226, 0], [0.327987, 0.827266, 0.456132]];

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

export interface StudyInput {
  scenario: Scenario; track: Track; cohort: Cohort; status: Status;
  base: number; growth: number; years: number;
  paths?: number; seed?: number;
  /** השוואה: אותו מסלול בחשבון ממוסה */
  taxable?: boolean;
}
export interface StudyRow {
  year: number; deposit: number; value: number; valueP10: number;
  income: number; incomeP10: number; taken: number;
  accounts: number; blocked: boolean;
}
export interface StudyResult {
  rows: StudyRow[]; value: number; paid: number; taken: number;
  taxPaid: number; exemptShare: number; irr: number;
  firstIncome: number | null; accounts: number;
}

interface Acct {
  sh: Record<Sleeve, number>;
  /** עלות, מפוצלת לפי מוטב/לא מוטב, וכן מוצמדת למדד לחישוב הרווח הריאלי */
  cE: number; cT: number; iE: number; iT: number;
  born: number; open: boolean;
}
const empty = (born: number): Acct => ({
  sh: { BTC: 0, SEM: 0, TEC: 0 }, cE: 0, cT: 0, iE: 0, iT: 0, born, open: true,
});

function onePath(o: StudyInput, months: number, r: () => number) {
  // מסלול מחירים — זהה למנוע הראשי, הנחות גיאומטריות בלי σ²/2 נוסף
  const mu = {} as Record<Sleeve, number>, sd = {} as Record<Sleeve, number>;
  for (const t of SLEEVES) {
    mu[t] = Math.log(1 + ASSUMPTION[o.scenario][t] - FX_DRAG - TER.il[t]) / 12;
    sd[t] = VOL[t] / Math.sqrt(12);
  }
  const px = {} as Record<Sleeve, Float64Array>;
  for (const t of SLEEVES) px[t] = new Float64Array(months);
  const cur = { BTC: 100, SEM: 100, TEC: 100 } as Record<Sleeve, number>;
  for (let m = 0; m < months; m++) {
    const z = [gauss(r), gauss(r), gauss(r)];
    for (let i = 0; i < 3; i++) {
      let cz = 0;
      for (let j = 0; j <= i; j++) cz += CHOL[i][j] * z[j];
      cur[SLEEVES[i]] *= Math.exp(mu[SLEEVES[i]] + sd[SLEEVES[i]] * cz);
      px[SLEEVES[i]][m] = cur[SLEEVES[i]];
    }
  }

  const accs: Acct[] = [empty(0)];
  const peak = { BTC: 0, SEM: 0, TEC: 0 } as Record<Sleeve, number>;
  const cap = CEILING[o.status];
  const cm = Math.pow(1 + CPI, 1 / 12);
  let paid = 0, taken = 0, taxPaid = 0, yearTaken = 0, exemptIn = 0;
  let first: number | null = null;
  const rows: Array<[number, number, number, number, number]> = [];

  const valueOf = (m: number) => {
    let v = 0;
    for (const a of accs) for (const t of SLEEVES) v += a.sh[t] * px[t][m];
    return v;
  };

  for (let m = 0; m < months; m++) {
    const year = Math.floor(m / 12) + 1;
    if (m % 12 === 0) yearTaken = 0;
    const idx = Math.pow(cm, m);
    for (const t of SLEEVES) peak[t] = peak[t] > 0 ? Math.max(peak[t], px[t][m]) : px[t][m];

    const dep = depositFor(o.track, o.cohort, year, o.base, o.growth);
    if (dep > 0) {
      // פיצול התקרה: החלק המוטב מתוך ההפקדה השנתית
      const yearly = dep * 12;
      const eShare = o.taxable ? 0 : Math.min(1, cap / Math.max(1, yearly));
      // ההפקדה הולכת לחשבון הפתוח — ואם אין, נפתח חדש
      let open = accs.find(a => a.open);
      if (!open) { open = empty(m); accs.push(open); }

      const f = {} as Record<Sleeve, number>, drop = {} as Record<Sleeve, number>;
      let s = 0, deepest: Sleeve = SLEEVES[0], worst = -1;
      for (const t of SLEEVES) {
        const x = (px[t][m] / peak[t] - 1) * 100;
        f[t] = (x >= 0 ? Math.min(x, UP_CAP) : -x) / 100;
        drop[t] = Math.max(0, -x);
        s += f[t];
        if (drop[t] > worst) { worst = drop[t]; deepest = t; }
      }
      const al = {} as Record<Sleeve, number>;
      if (s >= 1 || worst <= 0) for (const t of SLEEVES) al[t] = dep * f[t] / s;
      else {
        for (const t of SLEEVES) al[t] = dep * f[t];
        al[deepest] += dep * (1 - s);
      }
      for (const t of SLEEVES) if (al[t] > 0) {
        open.sh[t] += al[t] / px[t][m];
        open.cE += al[t] * eShare; open.cT += al[t] * (1 - eShare);
        open.iE += al[t] * eShare / idx; open.iT += al[t] * (1 - eShare) / idx;
      }
      paid += dep; exemptIn += dep * eShare;
    }

    // ── המשיכה ──
    let net = 0;
    const rate = withdrawRate(o.track, o.cohort, year);
    const value = valueOf(m);
    if (rate > 0 && value > 0) {
      const want = value * rate / 12;
      // רק חשבון שעברו עליו 6 שנים — ובממוסה אין חסם בכלל
      const mature = accs
        .filter(a => (o.taxable || m - a.born >= LIQUID_MONTHS))
        .filter(a => SLEEVES.some(t => a.sh[t] > 0))
        .sort((x, y) => x.born - y.born);
      if (mature.length) {
        const a = mature[0];                       // הוותיק קודם, עד שיתרוקן
        let av = 0;
        for (const t of SLEEVES) av += a.sh[t] * px[t][m];
        const gross = Math.min(want, av);
        const fr = av > 0 ? gross / av : 0;
        // הרווח הריאלי, בנפרד למוטב ולחייב
        const realT = Math.max(0, gross * (a.cT / Math.max(1e-9, a.cE + a.cT))
                                  - fr * idx * a.iT);
        const tax = o.taxable
          ? Math.max(0, gross - fr * idx * (a.iE + a.iT)) * TAX   // ממוסה: הכל חייב
          : realT * TAX;                                          // השתלמות: רק מעל התקרה
        for (const t of SLEEVES) a.sh[t] *= 1 - fr;
        a.cE *= 1 - fr; a.cT *= 1 - fr; a.iE *= 1 - fr; a.iT *= 1 - fr;
        if (a.open && !o.taxable) a.open = false;   // נסגר להפקדות
        net = gross - tax; taken += net; taxPaid += tax; yearTaken += net;
        if (first === null) first = m;
      }
    }

    if (m % 12 === 11) {
      rows.push([dep, valueOf(m), yearTaken / 12, taken, accs.filter(a =>
        SLEEVES.some(t => a.sh[t] > 0)).length]);
    }
  }
  return { rows, value: valueOf(months - 1), paid, taken, taxPaid, first,
           exemptIn, accounts: accs.length };
}

export function simulateStudy(o: StudyInput): StudyResult {
  const months = o.years * 12, paths = o.paths ?? 600;
  const r = rng(o.seed ?? 20261028);
  const runs = Array.from({ length: paths }, () => onePath(o, months, r));

  const rows: StudyRow[] = [];
  for (let y = 0; y < o.years; y++) {
    const val = runs.map(x => x.rows[y][1]), inc = runs.map(x => x.rows[y][2]);
    rows.push({
      year: y + 1, deposit: runs[0].rows[y][0],
      value: median(val), valueP10: pctl(val, 0.10),
      income: median(inc), incomeP10: pctl(inc, 0.10),
      taken: median(runs.map(x => x.rows[y][3])),
      accounts: Math.round(median(runs.map(x => x.rows[y][4]))),
      blocked: !o.taxable && (y + 1) * 12 < LIQUID_MONTHS
        && withdrawRate(o.track, o.cohort, y + 1) > 0,
    });
  }
  const value = median(runs.map(x => x.value));
  const taken = median(runs.map(x => x.taken));
  const paid = runs[0].paid;

  let lo = -0.5, hi = 2;
  for (let it = 0; it < 120; it++) {
    const g = (lo + hi) / 2, mr = Math.pow(1 + g, 1 / 12) - 1;
    let npv = 0;
    for (let m = 0; m < months; m++) {
      npv -= depositFor(o.track, o.cohort, Math.floor(m / 12) + 1, o.base, o.growth)
             / Math.pow(1 + mr, m + 1);
    }
    npv += (value + taken) / Math.pow(1 + mr, months);
    if (npv > 0) lo = g; else hi = g;
  }

  const firsts = runs.map(x => x.first).filter((v): v is number => v !== null);
  return {
    rows, value, paid, taken,
    taxPaid: median(runs.map(x => x.taxPaid)),
    exemptShare: runs[0].exemptIn / Math.max(1, runs[0].paid),
    irr: (lo + hi) / 2,
    firstIncome: firsts.length > paths / 2 ? Math.round(median(firsts)) : null,
    accounts: Math.round(median(runs.map(x => x.accounts))),
  };
}
