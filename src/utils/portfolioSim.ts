/** MGS · המנוע המוכלל — תיק שהמשתמש מרכיב בעצמו.
 *
 *  זהה למנוע של שלושת הרכיבים בכל כלל: אותה חלוקת הפקדה לפי אחוז הירידה
 *  מהשיא, אותו לוח משיכות לפי מסלול וגיל, אותו מס ריאלי. ההבדל היחיד הוא
 *  שמספר הרכיבים אינו קבוע, ולכן גם המתאם ביניהם נבנה בזמן ריצה מהמטריצה
 *  המדודה ולא מערך קבוע.
 *
 *  **למה אין כאן בסיס של ״היסטוריה מוקרנת קדימה״.** ניסיתי, ונמדד שזה
 *  מייצר שטות: לביטקוין נמדדו 61.8% לשנה, והקרנה של זה ל-30 שנה נותנת
 *  מספרים שגדולים מהתמ״ג העולמי. היסטוריה **מוצגת** בדף, ולעולם לא
 *  מוקרנת. ההקרנה נשענת על הנחה מפורסמת בלבד.
 *
 *  ורכיב שאין לו הנחה מפורסמת — ואין כזו לאף נושא צר כמו קוונטים או
 *  אורניום — מקבל את **הנחת המניות הרחבה**, עם **התנודתיות המדודה שלו**.
 *  כלומר: לא מניחים שהנושא מרוויח יותר מהשוק, אבל כן יודעים שהוא מיטלטל
 *  יותר. זה מראה את **המחיר** של בחירה תנודתית, בלי להמציא לה פרס. */
import { MEASURED, CORR, KEYS, ASSUME, FUND, type SleeveKey } from '../constants/sleeveCatalog';
import { withdrawRate, depositFor, type Track, type Cohort, type Scenario } from './mgsSim';

export const FX_DRAG = 0.004, CPI = 0.02, TAX = 0.25, UP_CAP = 10;
/** דמי ניהול לרכיב שהקרן שלו עוד לא אומתה — שמרני במכוון */
export const TER_UNKNOWN = 0.0045;
export const terOf = (k: SleeveKey) => FUND[k]?.ter ?? TER_UNKNOWN;

/** האם לכל הרכיבים שנבחרו יש הנחה מפורסמת משלהם */
export const hasPublished = (ks: SleeveKey[]) => ks.every(k => ASSUME[k]);

/** הנחת המניות הרחבה, לרכיב שאין לו מקור משלו.
 *  מקור טרם אומת — עד שיאומת, מוצגת כאן הנמוכה משתי ההנחות המפורסמות
 *  שכבר בפרויקט, ולא מספר שהמצאתי. הדף מציין שזו הצבה ולא תחזית לנושא. */
export const EQUITY = { pess: 0.0964 * (2 / 3), real: 0.0964,
  src: 'הצבה: הנמוכה מהנחות דאמודראן שבפרויקט · מקור ייעודי טרם אומת' };

/** תשואה שנתית לרכיב, לפני עלויות */
export function grossFor(k: SleeveKey, _basis: Basis, sc: Scenario): number {
  const a = ASSUME[k];
  if (a) return sc === 'pess' ? a.pess : a.real;
  return sc === 'pess' ? EQUITY.pess : EQUITY.real;
}

/** אילו מהרכיבים שנבחרו רצים על הצבה ולא על מקור משלהם */
export const substituted = (ks: SleeveKey[]) => ks.filter(k => !ASSUME[k]);

export type Basis = 'published' | 'measured';

/** פירוק צ׳ולסקי לתת-מטריצה של הרכיבים שנבחרו */
export function cholOf(ks: SleeveKey[]): number[][] {
  const n = ks.length;
  const idx = ks.map(k => (KEYS as readonly string[]).indexOf(k));
  const M = idx.map(i => idx.map(j => CORR[i][j]));
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = M[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) L[i][i] = Math.sqrt(Math.max(1e-9, s));
      else L[i][j] = s / (L[j][j] || 1);
    }
  }
  return L;
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

export interface PortInput {
  sleeves: SleeveKey[]; basis: Basis; scenario: Scenario;
  track: Track; cohort: Cohort;
  base: number; growth: number; years: number;
  lump?: number; paths?: number; seed?: number; startYear?: number;
  targets?: number[];
}
export interface PortRow {
  deposit: number; value: number; income: number; incomeP10: number;
  cash: number; valueP10: number;
}
export interface PortResult {
  rows: PortRow[]; value: number; cash: number; paid: number;
  skipped: number; weights: Record<string, number>;
  firstWithdrawal: number | null; crossover: number | null;
  goals: Record<number, number | null>;
  irr: number;
}

function onePath(o: PortInput, L: number[][], mu: number[], sd: number[], months: number, r: () => number) {
  const n = o.sleeves.length;
  const px = new Float64Array(n * months);
  const cur = new Array(n).fill(100);
  for (let m = 0; m < months; m++) {
    const z = Array.from({ length: n }, () => gauss(r));
    for (let i = 0; i < n; i++) {
      let cz = 0;
      for (let j = 0; j <= i; j++) cz += L[i][j] * z[j];
      cur[i] *= Math.exp(mu[i] + sd[i] * cz);
      px[i * months + m] = cur[i];
    }
  }
  const sh = new Array(n).fill(0), cost = new Array(n).fill(0);
  const costIdx = new Array(n).fill(0), peak = new Array(n).fill(0);
  const put = new Array(n).fill(0);
  const lump = o.lump ?? 0;
  let cash = 0, paid = 0, yearCash = 0, skipped = 0;
  let first: number | null = null, cross: number | null = null;
  const rows: Array<[number, number, number, number]> = [];
  const hit: Record<number, number | null> = {};
  for (const T of o.targets ?? []) hit[T] = null;
  const cm = Math.pow(1 + CPI, 1 / 12);
  const P = (i: number, m: number) => px[i * months + m];

  for (let m = 0; m < months; m++) {
    const year = Math.floor(m / 12) + 1;
    if (m % 12 === 0) yearCash = 0;
    const idx = Math.pow(cm, m);
    for (let i = 0; i < n; i++) peak[i] = peak[i] > 0 ? Math.max(peak[i], P(i, m)) : P(i, m);

    if (lump > 0 && m === 0) {
      // ביום הראשון אף רכיב אינו מתחת לשיא, ולכן לכלל אין מה לקרוא — חלוקה שווה
      for (let i = 0; i < n; i++) {
        const a = lump / n;
        sh[i] += a / P(i, m); cost[i] += a; costIdx[i] += a / idx; put[i] += a;
      }
      paid += lump;
    }

    const dep = depositFor(o.track, o.cohort, year, o.base, o.growth, o.startYear);
    if (dep > 0) {
      const f = new Array(n).fill(0), drop = new Array(n).fill(0);
      let s = 0, deepest = 0, worst = -1;
      for (let i = 0; i < n; i++) {
        const x = (P(i, m) / peak[i] - 1) * 100;
        f[i] = (x >= 0 ? Math.min(x, UP_CAP) : -x) / 100;
        drop[i] = Math.max(0, -x);
        s += f[i];
        if (drop[i] > worst) { worst = drop[i]; deepest = i; }
      }
      const al = new Array(n).fill(0);
      if (s >= 1 || worst <= 0) for (let i = 0; i < n; i++) al[i] = dep * f[i] / s;
      else {
        for (let i = 0; i < n; i++) al[i] = dep * f[i];
        al[deepest] += dep * (1 - s);
      }
      for (let i = 0; i < n; i++) if (al[i] > 0) {
        sh[i] += al[i] / P(i, m); cost[i] += al[i]; costIdx[i] += al[i] / idx; put[i] += al[i];
      }
      paid += dep;
    }

    let value = 0;
    for (let i = 0; i < n; i++) value += sh[i] * P(i, m);
    let net = 0;
    const rate = withdrawRate(o.track, o.cohort, year, o.startYear);
    if (rate > 0 && value > 0) {
      const gross = value * rate / 12;
      const pool = new Array(n).fill(0);
      let pv = 0;
      for (let i = 0; i < n; i++) if (sh[i] > 0 && P(i, m) > cost[i] / sh[i]) {
        pool[i] = sh[i] * P(i, m); pv += pool[i];
      }
      if (pv <= 0) skipped++;
      else {
        for (let i = 0; i < n; i++) if (pool[i] > 0) {
          const take = gross * pool[i] / pv;
          const fr = Math.min(0.999, take / (sh[i] * P(i, m)));
          const realGain = Math.max(0, take - fr * idx * costIdx[i]);
          sh[i] *= 1 - fr; cost[i] *= 1 - fr; costIdx[i] *= 1 - fr;
          const after = take - realGain * TAX;
          cash += after; net += after; yearCash += after;
        }
        if (first === null) first = m;
      }
    }
    if (cross === null && dep > 0 && net >= dep && net > 0) cross = m;
    for (const T of Object.keys(hit)) if (hit[+T] === null && net >= +T) hit[+T] = m;
    value = 0;
    for (let i = 0; i < n; i++) value += sh[i] * P(i, m);
    if (m % 12 === 11) rows.push([dep, value, yearCash / 12, cash]);
  }
  let end = 0;
  for (let i = 0; i < n; i++) end += sh[i] * P(i, months - 1);
  return { rows, value: end, cash, paid, skipped, first, cross, hit, put };
}

export function simulatePortfolio(o: PortInput): PortResult {
  const months = o.years * 12, paths = o.paths ?? 800;
  const L = cholOf(o.sleeves);
  const mu: number[] = [], sd: number[] = [];
  for (const k of o.sleeves) {
    const g = grossFor(k, o.basis, o.scenario);
    mu.push(Math.log(Math.max(0.0001, 1 + g - FX_DRAG - terOf(k))) / 12);
    sd.push(MEASURED[k].vol / Math.sqrt(12));
  }
  const r = rng(o.seed ?? 20261026);
  const runs = Array.from({ length: paths }, () => onePath(o, L, mu, sd, months, r));

  const rows: PortRow[] = [];
  for (let y = 0; y < o.years; y++) {
    const inc = runs.map(x => x.rows[y][2]), val = runs.map(x => x.rows[y][1]);
    rows.push({
      deposit: runs[0].rows[y][0], value: median(val), income: median(inc),
      incomeP10: pctl(inc, 0.10), cash: median(runs.map(x => x.rows[y][3])),
      valueP10: pctl(val, 0.10),
    });
  }
  const w: Record<string, number> = {};
  const tot = runs.reduce((s, x) => s + x.put.reduce((a: number, b: number) => a + b, 0), 0);
  o.sleeves.forEach((k, i) => { w[k] = runs.reduce((s, x) => s + x.put[i], 0) / tot; });

  const mid = (pick: (x: ReturnType<typeof onePath>) => number | null) => {
    const got = runs.map(pick).filter((v): v is number => v !== null);
    return got.length > runs.length / 2 ? Math.round(median(got)) : null;
  };
  const goals: Record<number, number | null> = {};
  for (const T of o.targets ?? []) goals[T] = mid(x => x.hit[T]);

  // תשואה שנתית פנימית על זרם ההפקדות החציוני
  const value = median(runs.map(x => x.value)), cash = median(runs.map(x => x.cash));
  const paid = runs[0].paid;
  let lo = -0.5, hi = 2;
  for (let it = 0; it < 120; it++) {
    const g = (lo + hi) / 2, mr = Math.pow(1 + g, 1 / 12) - 1;
    let npv = -(o.lump ?? 0);
    for (let m = 0; m < months; m++) {
      const dep = depositFor(o.track, o.cohort, Math.floor(m / 12) + 1, o.base, o.growth, o.startYear);
      npv -= dep / Math.pow(1 + mr, m + 1);
    }
    npv += (value + cash) / Math.pow(1 + mr, months);
    if (npv > 0) lo = g; else hi = g;
  }

  return {
    rows, value, cash, paid, skipped: Math.round(median(runs.map(x => x.skipped))),
    weights: w, firstWithdrawal: mid(x => x.first), crossover: mid(x => x.cross),
    goals, irr: (lo + hi) / 2,
  };
}
