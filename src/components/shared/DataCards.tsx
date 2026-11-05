/** **כרטיסי נתונים — מה שמחליף טבלה צרה.**
 *
 *  **למה.** טבלה בת 2–4 עמודות היא התצוגה הגרועה ביותר לאותו מידע.
 *  על מסך רחב היא שתי מילים ושלושה מטרים של ריק; על מסך צר היא
 *  גלילה לצדדים כדי לקרוא שדה בודד. בשני המצבים כרטיס קריא ממנה.
 *
 *  **ומה כן נשאר טבלה.** מעל ארבע עמודות, ההשוואה **בין** השורות
 *  היא העיקר — העין רצה למטה בעמודה אחת ומחפשת את הגבוה — וכרטיסים
 *  שוברים בדיוק את זה. לכן הגבול הוא ארבע, והטבלאות הרחבות נשארו
 *  טבלאות בכוונה.
 *
 *  **המבנה.** העמודה הראשונה היא כותרת הכרטיס, והשאר זוגות
 *  תווית/ערך בתוך `<dl>`. זה לא קוסמטי: `<dl>` נותן לקורא מסך את
 *  הקישור בין התווית לערך בלי ARIA ידני, מה שטבלה נותנת דרך
 *  ה-`<th>` שלה — ואילו רשת של `<div>`-ים לא נותנת בכלל.
 */
import type { ReactNode } from 'react';

export type Tone = 'up' | 'dn' | 'gold' | 'dim';

export interface DCol<T> {
  /** התווית שמעל הערך. בעמודה הראשונה היא אינה מוצגת — שם הערך הוא הכותרת. */
  h: string;
  /** הערך עצמו */
  v: (row: T) => ReactNode;
  /** צבע סמנטי — רק כשהוא אומר משהו, לא לקישוט */
  tone?: (row: T) => Tone | undefined;
  /** משפט ולא ערך — קטן יותר וקל יותר, כדי שלא יתחרה במספרים */
  he?: boolean;
  /** סימול, ISIN או מחרוזת אנגלית — גופן מונו. **לא לטקסט עברי:**
   *  ל-IBM Plex Mono אין אותיות עבריות, והערך ייפול לגיבוי אות־אות. */
  mono?: boolean;
}

export function DataCards<T>({
  items, cols, keyOf, mark, titleSym, titleSub, note, wide, className = '',
}: {
  items: readonly T[];
  /** 2–4 עמודות. הראשונה היא הכותרת. */
  cols: Array<DCol<T>>;
  keyOf: (row: T, i: number) => string;
  /** כרטיס מודגש — אותו תפקיד של `tr.mark` */
  mark?: (row: T) => boolean;
  /** סימול שמופיע ליד הכותרת, באנגלית */
  titleSym?: (row: T) => ReactNode;
  /** שורת משנה מתחת לכותרת */
  titleSub?: (row: T) => ReactNode;
  /** הערה בתחתית הכרטיס */
  note?: (row: T) => ReactNode;
  /** שלוש בשורה במקום שתיים — למי שיש לו מעט שדות */
  wide?: boolean;
  className?: string;
}) {
  const [head, ...rest] = cols;
  return (
    <div className={`dcards${wide ? ' wide' : ''}${className ? ' ' + className : ''}`}>
      {items.map((row, i) => {
        const sym = titleSym?.(row);
        const sub = titleSub?.(row);
        const n = note?.(row);
        return (
          <div key={keyOf(row, i)} className={`dcard${mark?.(row) ? ' mark' : ''}`}>
            <div className="t">
              <span>{head.v(row)}</span>
              {sym != null && sym !== '' && <span className="sym" dir="ltr">{sym}</span>}
              {sub != null && sub !== '' && <span className="sub">{sub}</span>}
            </div>
            {rest.length > 0 && (
              <dl>
                {rest.map((c, j) => {
                  const t = c.tone?.(row);
                  return (
                    <div key={j}>
                      <dt>{c.h}</dt>
                      <dd
                        dir={c.mono ? 'ltr' : undefined}
                        className={[c.he ? 'he' : '', c.mono ? 'mono' : '', t ?? '']
                          .filter(Boolean).join(' ')}
                      >
                        {c.v(row)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
            {n != null && n !== '' && <div className="n">{n}</div>}
          </div>
        );
      })}
    </div>
  );
}
