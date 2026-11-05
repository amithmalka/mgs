/**
 * What to do this month: where every shekel of the deposit goes, and whether a
 * harvest has come due.
 *
 * This is the one calculation that cannot be done from a projection, because it
 * depends on what is actually held and on each sleeve's own history.
 */
import { horizonFor, type SleeveId } from '../constants/mgsScenarios';
import type { Lot } from '../store/planStore';
import { COMBOS, type TrackKey } from '../constants/combos';

export const TAX = 0.25;
/** a sleeve this far below its own high is in the deepest buying tier */
export const DEEP = 0.50;
/** and this close to its high counts as being at it */
export const NEAR_HIGH = 0.02;

/**
 * The three buying tiers, applied to each sleeve's own portion of the month.
 *
 * A sleeve at its high is bought at a quarter weight, one that has fallen at a
 * half, and one more than 50% down at seven tenths — so a faller gets twice
 * what a riser gets and a crash gets 2.8 times.
 *
 * The multiplier scales the share the AGE asks for and the result is
 * renormalised, which is the whole point: taking 25/50/70 percent of the whole
 * deposit instead would hand the two volatile sleeves the entire month between
 * them, leave the core nothing, and erase the glide — measured, a 65-year-old
 * then ends up holding exactly the portfolio of a 20-year-old.
 */
/** above its own previous high a holding takes this share of the deposit,
 *  however far above it has gone */
export const UP_CAP = 0.10;
/** the withdrawal: 4% a year, taken a twelfth at a time */
export const WITHDRAW_RATE = 0.04;

/** **כמה המנגנון מטה לנופלים, לפי מסלול.**
 *
 *  ההטיה נדיבה יותר כשהאופק ארוך יותר, כי קנייה בירידה משתלמת רק
 *  אם יש זמן להתאוששות. **תזרים מושך כסף בדרך ולכן הוא מטה הכי
 *  מעט;** צמיחה אינו מושך כלל ולכן הוא יכול להרשות לעצמו להמתין. */
export const DIP_TILT: Record<TrackKey, number> = {
  flow: 0.5, both: 1.0, growth: 1.5,
};

/** **התקרה — וזה התיקון שחסר.**
 *
 *  אף רכיב לא יקבל יותר מפי 3 ממשקל היעד שלו בהפקדה אחת.
 *  **בלי התקרה הזאת המנגנון היה שבור:** נמדד שרכיב שירד 10% בלבד
 *  קיבל **80% מכל הפקדה**, ונשאר שם ככל שירד יותר — כי הכלל
 *  ״העודף הולך לנופל העמוק ביותר״ הפעיל את עצמו מיד, והאחרים היו
 *  חסומים ב-10% כל אחד. בתרחיש של ירידה 80% לאורך שנתיים זה שלח
 *  **80% מכל הכסף** לרכיב הנופל והפך אותו ל-61% מהתיק.
 *
 *  עם התקרה, אותו תרחיש שולח אליו 35.5% — **עדיין הטיה אמיתית** —
 *  והוא נוחת בדיוק על משקל היעד. ההפרש נמדד ב-77,388₪ על 240,000₪
 *  שהופקדו. */
export const DIP_CAP = 3;

export type Reason =
  /** at or above its own previous high — capped at UP_CAP of the deposit */
  | 'high'
  /** below its high — takes that fall, as a share of the deposit */
  | 'fallen'
  /** the deepest faller, which also takes everything left over */
  | 'deepest'
  /** past the deposit years, everything goes to the landing sleeve */
  | 'landing';

export interface Line {
  sleeve: SleeveId;
  /** shekels to put in this month */
  amount: number;
  reason: Reason;
  /** current value, in shekels */
  value: number;
  /** share of the portfolio now */
  share: number;
  /** share the age says it should be, before the tier multiplier */
  target: number;
  /** the share of the deposit the fall asked for, before the overflow */
  tier: number;
  /** how far below its own high, 0..1 */
  fromHigh: number;
}

export interface WithdrawLine {
  sleeve: SleeveId;
  /** shekels taken out of this sleeve */
  gross: number;
  tax: number;
  /** what reaches the account */
  net: number;
  /** its own average purchase price, which the price had to clear */
  avg: number;
}

export interface MonthPlan {
  month: number;
  age: number;
  phase: 'accumulate' | 'landing' | 'withdraw';
  lines: Line[];
  /** which sleeves this month's withdrawal came out of, and what tax that was */
  withdrawals: WithdrawLine[];
  total: number;
  portfolio: number;
  /** what reaches the account this month, after tax */
  income: number;
  /** set when the rule found nothing priced above its own average cost */
  allBelowAverage: boolean;
}

/** the age the glide is measured from: a 20-year-old is all volatile */
export const BASE_AGE = 20;
/** the glide runs at one point a year up to this age, two points after it */
export const GLIDE_BREAK = 35;
export const GLIDE_EARLY = 0.01;
export const GLIDE_LATE = 0.02;

/**
 * How much of the volatile half has moved to the complements by this age.
 *
 * One point a year while the horizon is long, two points a year once it is
 * not: the slow half is where the extra return sits, and the fast half is
 * where the risk has to come down.
 */
export function glideAt(age: number): number {
  const a = Math.max(BASE_AGE, age);
  const early = Math.min(a, GLIDE_BREAK) - BASE_AGE;
  const late = Math.max(0, a - GLIDE_BREAK);
  return Math.min(1, early * GLIDE_EARLY + late * GLIDE_LATE);
}

/** the stepped alternative: the volatile share loses this much at each step */
export const STEP_CUT = 0.05;
export const STEP_EVERY = 5;

/**
 * The same glide taken in steps instead of continuously: every five years of
 * life the volatile share loses five per cent of itself, which is a cut that
 * never reaches zero — bitcoin stays in the portfolio for good.
 */
export function glideStepped(age: number): number {
  const steps = Math.floor(Math.max(0, age - BASE_AGE) / STEP_EVERY);
  return Math.min(1, 1 - Math.pow(1 - STEP_CUT, steps));
}

/**
 * the 'hold' glide: nothing moves for ten years, and then each of the two
 * volatile sleeves loses three points a year — six points of the volatile half
 * together — all of it by redirecting new deposits, never by selling
 */
export const HOLD_YEARS = 10;
export const HOLD_RATE = 0.03;

/**
 * Ten years at full weight, and only then the glide — five points of the
 * volatile half a year, measured from the day the plan opened rather than from
 * the age. Bitcoin and semiconductors keep their whole share through the first
 * decade, which is where the compounding they are there for actually happens.
 */
export function glideHeld(yearsIn: number, hold = HOLD_YEARS, rate = HOLD_RATE): number {
  // each sleeve starts at half the portfolio and loses `rate` a year, so the
  // volatile half loses twice that
  const each = Math.max(0, 0.5 - Math.max(0, yearsIn - hold) * rate);
  return 1 - 2 * each;
}

/**
 * The inversion: every age opens at the full volatile weight and the mix turns
 * over during the plan, at a rate the entry cohort sets. The older the entrant,
 * the faster the turn — a sixty-year-old inverts inside three and a half years,
 * a twenty-year-old takes the whole twenty-five.
 */
export const INVERT_RATE: Array<[number, number]> = [
  [30, 0.02], [40, 0.04], [50, 0.08], [60, 0.16], [200, 0.30],
];
export function invertRate(startAge: number): number {
  for (const [to, r] of INVERT_RATE) if (startAge < to) return r;
  return 0.30;
}
/** how much of the volatile half has turned over by this year of the plan */
export function glideInvert(yearsIn: number, startAge: number): number {
  return Math.min(1, Math.max(0, yearsIn * invertRate(startAge)));
}

/**
 * The steep glide, stated per component: each of bitcoin and semiconductors
 * loses one point a year up to 35 and three points a year after it. Each sleeve
 * is half the volatile part, so the volatile part itself loses twice that.
 */
export const STEEP_EARLY = 0.02;
export const STEEP_LATE = 0.06;
export function glideSteep(age: number): number {
  const a = Math.max(BASE_AGE, age);
  const early = Math.min(a, GLIDE_BREAK) - BASE_AGE;
  const late = Math.max(0, a - GLIDE_BREAK);
  return Math.min(1, early * STEEP_EARLY + late * STEEP_LATE);
}

export type GlideMode = 'continuous' | 'stepped' | 'held' | 'invert' | 'steep';
export const glideFor = (mode: GlideMode) =>
  mode === 'stepped' ? glideStepped : mode === 'steep' ? glideSteep : glideAt;

/** **התמהיל שגיל קורא לו — נבחר מתוך `COMBOS`, לא מורכב כאן.**
 *
 *  **שוּנה מהיסוד ב-4.11.2026.** עד כאן החזירה הפונקציה הזאת
 *  `{ BTC: vol/2, SMH: vol/2, XLK: core }` — כלומר **מחצית
 *  הרכיב התנודתי הייתה ביטקוין בכל גיל**, 48% לבן 25. ביטקוין
 *  אינו זמין בעטיפה אירית, הוא מחזיר את המשקיע לחשיפת מס עיזבון,
 *  והוא לא נבדק באף קומבינציה.
 *
 *  **מעתה מנגנון הקנייה קונה את התמהיל שנמדד, ולא תמהיל משלו.**
 *  הגיל קובע מסלול, והמסלול מביא את הקומבינציה — כך שאין שום
 *  דרך שמנגנון הקנייה והמסלולים יאמרו דברים שונים.
 *
 *  **ולמה קומבינציה אחת ולא אינטרפולציה בין שתיים.** אינטרפולציה
 *  הייתה מייצרת משקלים שלא נמדדו מעולם. הגלישה קורית דרך **מעבר
 *  מסלול עם הגיל**, וזה בדיוק מה ששלושת המסלולים נועדו לעשות. */
export function mixForAgeIn(age: number, _mode: GlideMode): Partial<Record<SleeveId, number>> {
  return mixForAge(age);
}

/** **הגיל קובע מסלול.** זה הסולם, והוא זהה לזה של `comboProject`
 *  כדי שהגיל לא יאמר דבר אחד במקום אחד ודבר אחר במקום אחר. */
export function trackForAge(age: number): TrackKey {
  if (age <= 42) return 'growth';
  if (age <= 55) return 'both';
  return 'flow';
}

/** **התמהיל שגיל קורא לו — הקומבינציה הרגועה ביותר במסלול שלו.**
 *
 *  שני אנשים באותו גיל מחזיקים את אותו תמהיל, בלי קשר מי מהם
 *  התחיל קודם. ומי שמצטרף ב-60 אינו מתחיל במקום שבו בן 20 מתחיל —
 *  הוא מתחיל במסלול התזרים, שם בן ה-20 היה מגיע אחרי ארבעים שנה. */
export function mixForAge(age: number): Partial<Record<SleeveId, number>> {
  const t = trackForAge(age);
  const c = COMBOS.filter(x => x.track === t).sort((a, b) => a.vol - b.vol)[0]
         ?? COMBOS[0];
  const out: Partial<Record<SleeveId, number>> = {};
  for (const p of c.parts) out[p.k as SleeveId] = p.w / 100;
  return out;
}

/** **התמהיל שהחודש הזה קורא לו.**
 *
 *  **ובשנים שלפני המשיכה הראשונה הנחיתה היא ל-IWDA**, הקרן
 *  הפיזית על MSCI World. עד כאן היה כאן `{ WORLD: 1 }` — רכיב
 *  שאינו קרן בקטלוג. הנחיתה היא **כתובת חדשה לכסף חדש ולא מכירה**:
 *  מה שכבר נקנה נשאר במקומו. */
export function targetMix(startAge: number, month: number): Partial<Record<SleeveId, number>> {
  const years = (month - 1) / 12;
  const [depositYears] = horizonFor(startAge);
  if (years >= depositYears) return { IWDA: 1 };
  return mixForAge(startAge + years);
}

export function buildMonth(
  startAge: number,
  month: number,
  deposit: number,
  lots: Record<SleeveId, Lot>,
  /** value of one unit, in shekels */
  price: Partial<Record<SleeveId, number>>,
  /** **המסלול קובע כמה להטות לנופלים.** ברירת המחדל היא האמצעית. */
  track: TrackKey = 'both',
): MonthPlan {
  const years = (month - 1) / 12;
  const [depositYears, shiftYears] = horizonFor(startAge);
  const phase = years >= depositYears + shiftYears ? 'withdraw'
    : years >= depositYears ? 'landing' : 'accumulate';

  const mix = targetMix(startAge, month);
  const keys = Object.keys(mix) as SleeveId[];
  const value = (k: SleeveId) => (lots[k]?.units ?? 0) * (price[k] ?? 0);
  const portfolio = (Object.keys(lots) as SleeveId[]).reduce((s, k) => s + value(k), 0);

  // how far each sleeve has fallen from its own high
  const fromHigh = (k: SleeveId) => {
    const p = price[k], ath = lots[k]?.ath ?? 0;
    return p && ath > 0 ? Math.max(0, 1 - p / ath) : 0;
  };

  // **הכלל, כפי שהוא רץ ביום שההפקדה נכנסת.**
  //
  // כל רכיב מקבל לפי **הפער בין משקלו בתיק לבין משקל היעד שלו**,
  // והפער מוכפל בהטיה לפי כמה הוא נפל מהשיא שלו ולפי המסלול.
  // רכיב שנפל הוא תת-משקל ולכן מקבל יותר; **רכיב שחזר ליעד נעצר.**
  // אף אחד לא מקבל יותר מפי DIP_CAP ממשקל היעד שלו.
  //
  // **מה היה כאן קודם, ולמה זה תוקן ב-3.11.2026.** הגרסה הקודמת
  // הקצתה לפי גודל הנפילה בלבד והתעלמה ממשקל היעד, והעודף הלך
  // כולו לנופל העמוק ביותר. בהרצה נמדד ש**רכיב שירד 10% בלבד קיבל
  // 80% מכל הפקדה** — ושהוא נשאר על 80% ככל שירד יותר, כי האחרים
  // היו חסומים ב-UP_CAP. בתרחיש של ירידה 80% לאורך שנתיים זה שלח
  // אליו 80% מכל הכסף והפך אותו ל**61% מהתיק**. זהו בדיוק מצב
  // המשקיעים ב-KWEB: לא הקנייה בירידה הזיקה, אלא **שלא היה לה
  // גבול.**
  const amounts: Partial<Record<SleeveId, number>> = {};
  const reasons: Partial<Record<SleeveId, Reason>> = {};
  const share: Partial<Record<SleeveId, number>> = {};

  if (phase !== 'accumulate') {
    // past the deposit years the age mix lands it, and the rule steps aside
    for (const k of keys) {
      reasons[k] = 'landing';
      amounts[k] = deposit * (mix[k] ?? 0);
    }
  } else {
    // **קונים לכיוון משקל היעד, ומטים לנופלים בתוך הגבול הזה.**
    //
    // רכיב שנפל הופך לתת-משקל, ולכן הפער שלו גדול והוא מקבל יותר.
    // **אבל ברגע שהוא חוזר ליעד הפער נסגר והוא נעצר** — ולכן הוא
    // אינו יכול להשתלט על התיק, גם אם הוא ממשיך ליפול לנצח.
    //
    // זה ההבדל בין איזון מחדש לבין מיצוע כלפי מטה בלי גבול: הראשון
    // מוגדר על ידי היעד, השני על ידי הנפילה. **הגרסה הקודמת עשתה
    // את השני**, ורכיב שירד 10% קיבל 80% מההפקדה.
    const pf = portfolio + deposit;
    const tilt = DIP_TILT[track];
    let gaps = keys.map(k => {
      const cur = pf > 0 ? value(k) / pf : 0;
      const gap = Math.max(0, (mix[k] ?? 0) - cur);
      return gap * (1 + fromHigh(k) * tilt);
    });
    // אם הכל על היעד או מעליו — ההפקדה מתחלקת לפי היעד עצמו
    if (gaps.reduce((a, b) => a + b, 0) <= 0) gaps = keys.map(k => mix[k] ?? 0);
    const gsum = gaps.reduce((a, b) => a + b, 0);

    keys.forEach((k, i) => {
      share[k] = gsum > 0 ? gaps[i] / gsum : 1 / keys.length;
      amounts[k] = deposit * (share[k] ?? 0);
    });

    // **התקרה.** מה שנחתך מתחלק מחדש למי שיש לו מקום, לפי היעד.
    let over = 0;
    for (const k of keys) {
      const max = deposit * (mix[k] ?? 0) * DIP_CAP;
      if ((amounts[k] ?? 0) > max) { over += (amounts[k] ?? 0) - max; amounts[k] = max; }
    }
    if (over > 0.01) {
      const room = keys.map(k => Math.max(0, deposit * (mix[k] ?? 0) * DIP_CAP - (amounts[k] ?? 0)));
      const rsum = room.reduce((a, b) => a + b, 0);
      if (rsum > 0) keys.forEach((k, i) => { amounts[k] = (amounts[k] ?? 0) + over * room[i] / rsum; });
    }

    // התיוג: מה שקיבל מעל היעד שלו נקנה בירידה; העמוק מכולם מסומן
    let deepest: SleeveId = keys[0], worst = -1;
    for (const k of keys) { const d = fromHigh(k); if (d > worst) { worst = d; deepest = k; } }
    for (const k of keys) {
      reasons[k] = fromHigh(k) > 0 ? 'fallen' : 'high';
    }
    if (worst > 0) reasons[deepest] = 'deepest';
  }
  const lines: Line[] = keys.map(k => {
    const r = reasons[k] ?? 'high';
    return {
      sleeve: k,
      amount: amounts[k] ?? 0,
      reason: r,
      value: value(k),
      share: portfolio > 0 ? value(k) / portfolio : 0,
      target: mix[k] ?? 0,
      /** the share of the deposit the rule asked for, before any overflow */
      tier: share[k] ?? 0,
      fromHigh: fromHigh(k),
    };
  });

  // The withdrawal, once the plan is in its withdrawal phase: 4% a year taken
  // a twelfth at a time, and only out of a sleeve priced above its own average
  // purchase price. When all of them sit below it, nothing is sold — that is
  // what keeps the plan from realising a loss to pay an income.
  const withdrawals: WithdrawLine[] = [];
  let income = 0, allBelowAverage = false;
  if (phase === 'withdraw' && portfolio > 0) {
    const gross = (portfolio * WITHDRAW_RATE) / 12;
    const eligible = (Object.keys(lots) as SleeveId[]).filter(k => {
      const lot = lots[k], p = price[k];
      if (!lot || !p || lot.units <= 0) return false;
      return p > lot.cost / lot.units;
    });
    if (!eligible.length) allBelowAverage = true;
    else {
      const pool = eligible.reduce((sum, k) => sum + value(k), 0);
      for (const k of eligible) {
        const lot = lots[k]!;
        const take = gross * (value(k) / pool);
        const share = Math.min(1, take / value(k));
        // tax on the gain inside the slice being sold, not on the whole slice
        const gain = Math.max(0, take - lot.cost * share);
        const tax = gain * TAX;
        withdrawals.push({ sleeve: k, gross: take, tax, net: take - tax, avg: lot.cost / lot.units });
        income += take - tax;
      }
    }
  }

  return {
    month, age: startAge + Math.floor(years), phase, lines, withdrawals,
    total: lines.reduce((s, l) => s + l.amount, 0), portfolio,
    income, allBelowAverage,
  };
}

export function applyMonth(
  lots: Record<SleeveId, Lot>,
  plan: MonthPlan,
  price: Partial<Record<SleeveId, number>>,
): Record<SleeveId, Lot> {
  const next: Record<SleeveId, Lot> = { ...lots };
  for (const k of Object.keys(lots) as SleeveId[]) next[k] = { ...lots[k] };

  // the withdrawal takes units out of the sleeves it came from
  for (const w of plan.withdrawals) {
    const lot = next[w.sleeve], p = price[w.sleeve];
    if (!lot || !p || lot.units <= 0) continue;
    const frac = Math.min(1, w.gross / (lot.units * p));
    lot.units *= 1 - frac;
    lot.cost *= 1 - frac;
  }
  for (const l of plan.lines) {
    if (l.amount <= 0) continue;
    const p = price[l.sleeve];
    if (!p) continue;
    next[l.sleeve].units += l.amount / p;
    next[l.sleeve].cost += l.amount;
  }
  // The high only ever rises. It is what the deposit is routed from — a sleeve
  // is measured by how far it sits below the best price it ever reached — so
  // letting it drift down with the price would erase the fall the rule reads.
  for (const k of Object.keys(next) as SleeveId[]) {
    const p = price[k];
    if (p && p > (next[k].ath ?? 0)) next[k].ath = p;
  }
  return next;
}
