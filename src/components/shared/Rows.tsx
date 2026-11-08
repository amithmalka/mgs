/** **טבלה שהופכת לכרטיסים כשיש בה מעט שורות — ומחליטה בעצמה.**
 *
 *  **הכלל:** עד **שלוש שורות** — כרטיסים. ארבע ומעלה — טבלה.
 *
 *  **ולמה ההחלטה כאן ולא בכל מסך בנפרד.** מספר השורות הוא נתון
 *  ריצה: תיק יכול להחזיק שני רכיבים או חמישה, ואותו מסך עצמו יראה
 *  אחרת בשני המקרים. אם כל מסך מכריע לבדו, חצי מהם יישארו טבלאות
 *  כשהתיק קטן — וזה בדיוק מה שנשבר.
 *
 *  **מה היה שבור, קונקרטית.** טבלת רכיבי התיק היא **תשע עמודות**
 *  ובה היו **שני** רכיבים. בעברית מימין לשמאל זה יצא כך:
 *
 *      טכנולוגיה S&P · Invesco swap  בינוני  60%  2,400₪XLKS  LSEETF
 *
 *  הסכום והטיקר נדבקו (``2,400₪XLKS``), הכותרות לא התיישרו עם
 *  התאים, והעין איבדה איזה ערך שייך לאיזה רכיב. **טבלה עובדת כשיש
 *  מה להשוות לאורך**; בשתי שורות אין השוואה, יש רק רשת שבורה.
 *
 *  **הכרטיס, לעומת זאת, נקרא מלמעלה למטה:** שם הרכיב, אחריו המספר
 *  שבגללו פתחו את המסך, ואחריו שאר השדות כזוגות תווית־ערך שלא
 *  יכולים להידבק זה לזה.
 */
import type { ReactNode } from 'react';

export interface Col {
  /** המפתח בתוך `cells` */
  k: string;
  /** **הכותרת — בטבלה זו שורת הכותרות, בכרטיס זו התווית ליד הערך.**
   *
   *  ‏`ReactNode` ולא `string`, כי כותרת יכולה לשאת צבע: בטבלת
   *  התרחישים ב-`SimulationPage` לכל עמודה יש את הצבע של התרחיש
   *  שלה, והטיפוס הצר מחק אותם בהמרה. */
  label: ReactNode;
  /** מספרים וסימולים — מיושרים משמאל לימין */
  ltr?: boolean;
  /** **העמודה שהשורה מזוהה בה.** בכרטיס היא הכותרת, ולכן אין לה
   *  תווית: ״הרכיב: טכנולוגיה״ הוא רעש. */
  lead?: boolean;
  /** **המספר שבגללו המסך נפתח.** בכרטיס הוא גדול ומודגש, ומעל
   *  שאר השדות. לכל היותר אחד. */
  big?: boolean;
  /** טקסט מסביר — בכרטיס הוא יורד לשורה משלו ברוחב מלא */
  wide?: boolean;
  /** מוצג שקט יותר */
  dim?: boolean;
}

export interface Row {
  /** מזהה ייחודי לשורה */
  id: string;
  cells: Record<string, ReactNode>;
  /** מדגיש את השורה — בטבלה `cross`, בכרטיס פס בצד */
  mark?: boolean;
  /** תג קצר שמוצג ליד הכותרת בכרטיס */
  tag?: string;
}

export interface RowsProps {
  cols: Col[];
  rows: Row[];
  /** שורת סיכום, אם יש — בכרטיסים היא גוש נפרד בתחתית */
  total?: { label: string; value: ReactNode };
  /** מכריח צורה אחת, לשימושים שבהם ההשוואה לאורך היא כל העניין */
  as?: 'auto' | 'table' | 'cards';
  /** מה להציג כשאין שורות בכלל */
  empty?: ReactNode;
}

/** מעל זה טבלה, עד זה כרטיסים */
export const CARD_MAX = 3;

export function Rows({ cols, rows, total, as = 'auto', empty }: RowsProps) {
  if (!rows.length) {
    return empty ? <p className="note">{empty}</p> : null;
  }

  const cards = as === 'cards' || (as === 'auto' && rows.length <= CARD_MAX);
  if (!cards) {
    return (
      <div className="ptable bleed">
        <table>
          <thead>
            <tr>{cols.map(c => <th key={c.k} className={c.lead ? 'lead' : undefined}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.mark ? 'cross' : undefined}>
                {cols.map(c => (
                  <td key={c.k}
                    dir={c.ltr ? 'ltr' : undefined}
                    className={[c.lead ? 'lead' : '', c.dim ? 'dim' : ''].filter(Boolean).join(' ') || undefined}>
                    {r.cells[c.k] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
            {total && (
              <tr>
                <td><b>{total.label}</b></td>
                <td dir="ltr"><b>{total.value}</b></td>
                {cols.length > 2 && <td colSpan={cols.length - 2} />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const lead = cols.find(c => c.lead) ?? cols[0];
  const big = cols.find(c => c.big);
  const wide = cols.filter(c => c.wide && c !== lead && c !== big);
  const rest = cols.filter(c => c !== lead && c !== big && !wide.includes(c));

  return (
    <div className="rws">
      {rows.map(r => (
        <article key={r.id} className={`rw${r.mark ? ' is-mark' : ''}`}>
          <header>
            <h4>{r.cells[lead.k]}</h4>
            {r.tag && <span className="rw-tag">{r.tag}</span>}
          </header>

          {big && (
            <p className="rw-big" dir={big.ltr ? 'ltr' : undefined}>
              {r.cells[big.k] ?? '—'}
              <span>{big.label}</span>
            </p>
          )}

          {rest.length > 0 && (
            <dl className="rw-fields">
              {rest.map(c => (
                <div key={c.k}>
                  <dt>{c.label}</dt>
                  <dd dir={c.ltr ? 'ltr' : undefined} className={c.dim ? 'dim' : undefined}>
                    {r.cells[c.k] ?? '—'}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {wide.map(c => (
            <p key={c.k} className="rw-wide">{r.cells[c.k]}</p>
          ))}
        </article>
      ))}

      {total && (
        <div className="rw-total">
          <span>{total.label}</span>
          <b dir="ltr">{total.value}</b>
        </div>
      )}
    </div>
  );
}
