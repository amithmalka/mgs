/** **חלוקת ההפקדה — כלל אחד, במקום אחד.**
 *
 *  עד כאן הכלל היה כתוב בתוך `MonthBuy`, והוא היה היחיד שהריץ אותו.
 *  ברגע שמסך האישור צריך **בדיוק את אותה חלוקה** — אחרת המשתמש
 *  מאשר סכומים שאינם מה שהמסך הציג לו — אין דרך לשמור על זה מלבד
 *  פונקציה אחת ששניהם קוראים לה. לכן הכלל כאן, ושני המסכים דקים.
 *
 *  **הכלל עצמו.** קונים לכיוון משקל היעד שנבחר, ומטים לנופלים
 *  **בתוך הגבול הזה**: הפער בין משקל היעד למשקל בפועל כפול
 *  `(1 + נפילה × הטיה)`. רכיב שנפל הוא תת-משקל ולכן מקבל יותר,
 *  **וברגע שהוא חוזר למשקל שנבחר הוא נעצר.** אף רכיב לא מעל פי
 *  `DIP_CAP` ממשקל היעד שלו בהפקדה אחת, והעודף עובר למי שיש לו מקום.
 *
 *  **ובלי מחירים אין כלל.** אם אין ציטוט לכל הרכיבים אי אפשר לדעת
 *  מה ירד, ולכן החלוקה חוזרת למשקלות שנבחרו — ומסומנת ככזאת
 *  (`priced: false`), כדי ששום מסך לא יציג אותה כאילו נמדדה.
 */
import { BUY } from '../constants/irish';
import { DIP_TILT, DIP_CAP } from './monthPlan';

export type TrackKey = 'flow' | 'both' | 'growth';

export interface Quote { price: number | null; currency: string | null; change: number | null }

export interface SplitInput {
  /** התיק שנבחר — מפתח הרכיב והמשקל באחוזים */
  holdings: Array<{ k: string; w: number }>;
  /** הציטוטים כפי שחזרו מ-`/api/lse`, לפי **סימול** ולא לפי מפתח */
  quotes: Record<string, Quote>;
  /** השיא הידוע לכל רכיב, לפי מפתח */
  peaks: Record<string, number>;
  /** היחידות שמוחזקות בפועל, לפי מפתח — מתוך יומן ההפקדות */
  held: Record<string, number>;
  /** הסכום שמגיע לברוקר החודש, בשקלים */
  amount: number;
  track: TrackKey;
}

export interface SplitLine {
  k: string;
  /** המשקל שנבחר, באחוזים מתוך סך המשקלות */
  w: number;
  /** חלק ההפקדה שהרכיב מקבל, באחוזים */
  ask: number;
  /** והסכום בשקלים */
  ils: number;
  /** המחיר החי, במטבע הנייר */
  px: number | null;
  /** השיא שממנו נמדדת הנפילה */
  peak: number | null;
  /** הנפילה מהשיא, 0–1 */
  drop: number | null;
  /** הנופל העמוק ביותר החודש */
  deepest: boolean;
  /** המשפט שמסביר את השורה */
  why: string;
}

export interface SplitResult {
  lines: SplitLine[];
  /** האם החלוקה נמדדה על מחירים, או נפלה חזרה למשקלות */
  priced: boolean;
  /** האם יש בכלל רכיב מתחת לשיא שלו */
  anyDown: boolean;
}

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export function buySplit(o: SplitInput): SplitResult {
  const tot = o.holdings.reduce((t, h) => t + h.w, 0) || 1;
  const live = o.holdings.map(h => {
    const sym = BUY[h.k]?.sym;
    const px = sym ? o.quotes[sym]?.price ?? null : null;
    const peak = o.peaks[h.k] ?? px ?? null;
    const drop = px && peak && peak > 0 ? Math.max(0, 1 - px / peak) : null;
    return { k: h.k, w: h.w, px, peak, drop };
  });

  // בלי מחיר לכל רכיב אין מה למדוד — חוזרים למשקלות, ואומרים את זה
  if (!live.every(x => x.drop !== null)) {
    return {
      priced: false, anyDown: false,
      lines: live.map(x => {
        const ask = (x.w / tot) * 100;
        return {
          ...x, ask, ils: o.amount * ask / 100, deepest: false,
          // **הסבר ולא קוד שגיאה.** ״לפי המשקלות שבחרתם · אין
          // מחירים״ היה שני שברי משפט מחוברים בנקודה — קורא
          // שלא בנה את המסך לא יכול לדעת מה הוא אמור לעשות עם זה.
          why: 'כדי לדעת מי ירד צריך מחיר, וכרגע אין — '
             + 'ולכן ההפקדה מתחלקת לפי המשקלות שבחרתם.',
        };
      }),
    };
  }

  const pfNow = live.reduce((t, x) => t + (x.px ?? 0) * (o.held[x.k] ?? 0), 0);
  const pf = pfNow + o.amount;
  const tilt = DIP_TILT[o.track];

  let gaps = live.map(x => {
    const target = x.w / tot;
    const cur = pf > 0 ? (x.px ?? 0) * (o.held[x.k] ?? 0) / pf : 0;
    return Math.max(0, target - cur) * (1 + (x.drop ?? 0) * tilt);
  });
  // כולם כבר במשקל או מעליו — אין פער לקנות לכיוונו, ולכן לפי המשקלות
  if (gaps.reduce((a, b) => a + b, 0) <= 0) gaps = live.map(x => x.w / tot);
  const gsum = gaps.reduce((a, b) => a + b, 0);
  let share = gaps.map(g => (gsum > 0 ? g / gsum : 1 / live.length) * 100);

  // התקרה, והעודף למי שיש לו מקום תחתיה
  let over = 0;
  share = share.map((v, i) => {
    const max = (live[i].w / tot) * 100 * DIP_CAP;
    if (v > max) { over += v - max; return max; }
    return v;
  });
  if (over > 0.01) {
    const room = share.map((v, i) => Math.max(0, (live[i].w / tot) * 100 * DIP_CAP - v));
    const rs = room.reduce((a, b) => a + b, 0);
    if (rs > 0) share = share.map((v, i) => v + over * room[i] / rs);
  }

  let deepest = 0;
  for (let i = 1; i < live.length; i++) if (live[i].drop! > live[deepest].drop!) deepest = i;
  const anyDown = live.some(x => x.drop! > 0);

  return {
    priced: true, anyDown,
    lines: live.map((x, i) => ({
      ...x,
      ask: share[i],
      ils: o.amount * share[i] / 100,
      deepest: anyDown && i === deepest,
      why: !anyDown
        ? 'כל הרכיבים על השיא — ההפקדה מתחלקת לפי המשקלות שבחרתם'
        : x.drop! > 0
          ? (i === deepest
            ? `ירד ${pc(x.drop!)} — הנפילה העמוקה החודש, ולכן מקבל הכי הרבה · עד ${pc(x.w / tot)} בתיק ולא מעל`
            : `ירד ${pc(x.drop!)} — מקבל יותר, עד שיחזור ל-${pc(x.w / tot)} שבחרתם`)
          : `על השיא שלו — מקבל רק מה שצריך כדי להישאר על ${pc(x.w / tot)}`,
    })),
  };
}

/** **כמה יחידות הסכום קונה.** המחיר נקוב במטבע הנייר והסכום בשקלים,
 *  ולכן בלי שער אין יחידות. `GBp` הוא פני ולא לירה — פי מאה. */
export function unitsFor(ils: number, px: number | null, currency: string | null,
  rates: Record<string, number>): number | null {
  if (!px || px <= 0) return null;
  const cur = currency ?? 'USD';
  const fx = cur === 'GBp' ? (rates.GBP ?? 0) / 100 : rates[cur] ?? 0;
  if (!fx) return null;
  return ils / (px * fx);
}
