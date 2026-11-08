/** MGS · **מחשבון מס משיכה — כמה מס באמת משלמים על משיכה חודשית.**
 *
 *  **הכלל שעושה את כל ההבדל: סעיף 88 לפקודת מס הכנסה.**
 *
 *  מס רווחי הון בישראל הוא **25% על הרווח הריאלי**, לא על הנומינלי.
 *  והרווח הריאלי נמדד על ידי הפחתת ״סכום אינפלציוני״ מהרווח. אבל
 *  **בנייר ערך הנקוב במטבע חוץ, סעיף 88 מגדיר את ה״מדד״ כשער
 *  החליפין** של אותו מטבע — ולא כמדד המחירים לצרכן.
 *
 *  **ומה זה אומר מעשית, וזו הנקודה כולה:** הרווח מחושב **במטבע
 *  שבו הנייר נקוב**, ורק אחר כך מומר לשקל. **עליית הדולר מול השקל
 *  אינה רווח לצורכי מס.** וגם ההפך — ירידת הדולר אינה הפסד.
 *
 *      רווח ריאלי בשקלים = שער_היום × (שווי_במטבע − עלות_במטבע)
 *
 *  **דוגמה למה זה לא זניח.** קנית ב-100,000₪ כשהדולר היה 3.50
 *  (28,571$). היום הנייר שווה 35,000$ והדולר 3.70 — כלומר
 *  129,500₪. **הרווח הנומינלי בשקלים הוא 29,500₪**, אבל הרווח
 *  הריאלי הוא רק 3.70 × (35,000 − 28,571) = **23,787₪.** המס הוא
 *  5,947₪ ולא 7,375₪ — **הפרש של 1,428₪, שהם 19% מהמס.**
 *
 *  **ומה שלא נכלל כאן, במכוון:**
 *  · **קיזוז הפסדים** — סעיף 92 מתיר לקזז הפסדי הון מרווחי הון.
 *    המחשבון מציג את החבות לפני קיזוז, כי הוא אינו יודע על
 *    הפסדים מניירות אחרים.
 *  · **ניכוי במקור על דיבידנדים** — הקרנות בקטלוג צוברות, ולכן
 *    אין חלוקה ואין ניכוי שוטף.
 *  · **מס יסף** — 3% נוספים על הכנסה גבוהה במיוחד (סעיף 121ב),
 *    שתלוי בכלל ההכנסות ולא בתיק הזה בלבד.
 *
 *  **אין בזה ייעוץ מס.** החישוב עוקב אחרי הכללים כפי שהם מנוסחים
 *  בפקודה, אבל כל מקרה פרטי דורש בדיקה.
 */
import type { Position } from './deposits';

/** שיעור מס רווחי הון על נייר ערך סחיר — סעיף 91(ב)(1) */
export const CGT = 0.25;

/** **השנה הראשונה שבה משיכה נפתחת בכלל.** ראו הנימוק המדוד
 *  ב-`mgsSim.RAMP` — שלוש שנות צבירה הן ההפרש בין 28% מהמתחילים
 *  שנחסמים לבין אפס. */
export const WITHDRAW_FROM_YEAR = 3;

export interface TaxLine {
  /** מפתח הרכיב בקטלוג */
  k: string;
  /** המטבע שבו הנייר נקוב — זה מה שקובע את ה״מדד״ לפי סעיף 88 */
  ccy: string;
  units: number;
  /** השווי בשקלים כיום */
  valueIls: number;
  /** מה שהוכנס בשקלים, בפועל */
  investedIls: number;
  /** ומה שהוכנס במטבע הנייר */
  investedCcy: number;
  /** השווי במטבע הנייר כיום */
  valueCcy: number;
  /** הרווח כפי שהוא נראה בשקלים — **וזה לא בסיס המס** */
  gainNominal: number;
  /** הסכום האינפלציוני: חלק הרווח שנובע משער החליפין בלבד */
  inflation: number;
  /** והרווח הריאלי — **זה בסיס המס** */
  gainReal: number;
  /** **כמה שקלים נלקחים מהרכיב הזה במשיכה הזאת** — פרו־רטה לפי
   *  השווי, ואפס לרכיב שמתחת לעלות ולכן אינו נמכר. נחשב בסבב שני,
   *  אחרי שידוע מי זכאי בכלל; מסך האישור צריך אותו כדי לומר **מה
   *  למכור**, ולא רק כמה מס יצא. */
  sold: number;
}

export interface WithdrawTax {
  lines: TaxLine[];
  /** השווי הכולל בשקלים */
  value: number;
  /** סך ההפקדות בשקלים */
  invested: number;
  /** הרווח הנומינלי בשקלים */
  gainNominal: number;
  /** הסכום האינפלציוני — מה ששער החליפין תרם ואינו ממוסה */
  inflation: number;
  /** הרווח הריאלי — בסיס המס */
  gainReal: number;
  /** **המשיכה המבוקשת החודש, בשקלים** */
  gross: number;
  /** החלק מהמשיכה שהוא רווח ריאלי — ולכן ממוסה */
  taxableShare: number;
  /** המס בפועל */
  tax: number;
  /** ומה מגיע לחשבון */
  net: number;
  /** שיעור המס מהמשיכה — **זה המספר שמעניין את המשקיע** */
  effectiveRate: number;
  /** מה היה המס לולא סעיף 88, כלומר על הרווח הנומינלי */
  taxIfNominal: number;
  /** וכמה סעיף 88 חוסך */
  saved: number;
  /** רכיבים שאסור למכור כי הם מתחת לעלות */
  belowCost: string[];
}

/** **מה אפשר למשוך, וכמה מס יש על זה.**
 *
 *  `rates` הם שערי החליפין **כיום** לכל מטבע מול השקל.
 *  `prices` הם מחירי היחידה **במטבע הנייר**.
 *
 *  **המשיכה נלקחת פרו־רטה מהרכיבים שמעל העלות שלהם.** רכיב מתחת
 *  לעלות אינו נמכר — זה הכלל שמונע ממשיכה לנעול הפסד — והוא מוחזר
 *  ב-`belowCost` כדי שהמסך יאמר למה.
 */
export function withdrawTax(
  positions: Position[],
  prices: Record<string, number>,
  rates: Record<string, number>,
  gross: number,
): WithdrawTax {
  const lines: TaxLine[] = [];
  const below: string[] = [];

  for (const p of positions) {
    if (p.units <= 0) continue;
    const px = prices[p.k];
    const ccy = p.currency || 'USD';
    const fx = rates[ccy];
    if (!px || !fx) continue;

    const valueCcy = p.units * px;
    const valueIls = valueCcy * fx;
    // **הסכום האינפלציוני לפי סעיף 88:** מה שהעלות הייתה שווה
    // היום לפי שער החליפין, פחות מה ששולם בפועל בשקלים.
    const costAdj = p.investedCcy * fx;
    const inflation = costAdj - p.investedIls;
    const gainNominal = valueIls - p.investedIls;
    const gainReal = valueIls - costAdj;

    if (valueIls <= p.investedIls) below.push(p.k);

    lines.push({
      k: p.k, ccy, units: p.units, valueIls,
      investedIls: p.investedIls, investedCcy: p.investedCcy, valueCcy,
      gainNominal, inflation, gainReal, sold: 0,
    });
  }

  // **הזכאים למכירה: מעל העלות הנומינלית בשקלים.** זה הכלל שהמערכת
  // משתמשת בו בכל מקום אחר, ולכן הוא זהה גם כאן.
  const sellable = lines.filter(l => l.valueIls > l.investedIls);
  const pool = sellable.reduce((t, l) => t + l.valueIls, 0);
  const take = Math.min(gross, pool);

  // חלק הרווח הריאלי מתוך מה שנמכר, משוקלל לפי מה שנלקח מכל רכיב
  let taxable = 0, nominalTaxable = 0;
  for (const l of sellable) {
    const part = pool > 0 ? (l.valueIls / pool) * take : 0;
    l.sold = part;
    const realFrac = l.valueIls > 0 ? Math.max(0, l.gainReal) / l.valueIls : 0;
    const nomFrac = l.valueIls > 0 ? Math.max(0, l.gainNominal) / l.valueIls : 0;
    taxable += part * realFrac;
    nominalTaxable += part * nomFrac;
  }

  const value = lines.reduce((t, l) => t + l.valueIls, 0);
  const invested = lines.reduce((t, l) => t + l.investedIls, 0);
  const tax = taxable * CGT;
  const taxIfNominal = nominalTaxable * CGT;

  return {
    lines, value, invested,
    gainNominal: lines.reduce((t, l) => t + l.gainNominal, 0),
    inflation: lines.reduce((t, l) => t + l.inflation, 0),
    gainReal: lines.reduce((t, l) => t + l.gainReal, 0),
    gross: take,
    taxableShare: taxable,
    tax, net: take - tax,
    effectiveRate: take > 0 ? tax / take : 0,
    taxIfNominal, saved: taxIfNominal - tax,
    belowCost: below,
  };
}

/** **המשיכה החודשית לפי המסלול ולפי השנה בתוכנית.**
 *
 *  אותו לוח בדיוק שמוגדר ב-`mgsSim.ts`: תזרים 1% עד שנה 5 ומשנה 6
 *  ארבעה אחוזים; תזרים־וצמיחה 1% עד שנה 9 ומשנה 10 ארבעה; צמיחה
 *  אינו מושך. **האחוז הוא שנתי ומחולק ל-12.**
 */
export function monthlyDraw(
  track: 'flow' | 'both' | 'growth', planYear: number, value: number,
): { rate: number; amount: number; nextStep: number | null } {
  if (track === 'growth') return { rate: 0, amount: 0, nextStep: null };
  // **שנתיים ראשונות סגורות — אותו כלל שב-`mgsSim.RAMP`.**
  // בלי זה אפשר היה למשוך מהחודש הראשון, ונמדד שמי שמתחיל למשוך
  // אחרי 12 חודשי צבירה נחסם ב-28% מנקודות ההתחלה, עד 28 חודשים
  // ברצף. משנה 3 — אפס חסימות ב-168 נקודות התחלה.
  if (planYear < WITHDRAW_FROM_YEAR) {
    return { rate: 0, amount: 0, nextStep: WITHDRAW_FROM_YEAR - planYear };
  }
  const step = track === 'flow' ? 6 : 10;
  const rate = planYear >= step ? 0.04 : 0.01;
  return {
    rate,
    amount: value * rate / 12,
    nextStep: planYear < step ? step - planYear : null,
  };
}
