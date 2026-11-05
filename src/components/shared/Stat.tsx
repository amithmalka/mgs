/** **המספר הבודד — רכיב אחד במקום שלושה־עשר עותקים.**
 *
 *  **מה היה כאן.** אותה פונקציה `Stat` בדיוק, **מוגדרת מחדש בכל
 *  קובץ שהשתמש בה** — שלושה־עשר עותקים זהים בית־בבית, ועוד שלוש
 *  גרסאות חד־פעמיות בקבצים מתים. כל שיפור היה צריך לקרות שלוש־עשרה
 *  פעמים, או שהיה נוצר פער בין מסך למסך.
 *
 *  **והספירה שנוספה כאן.** המספר מטפס ליעדו כשהוא נכנס לתצוגה,
 *  כמו בדף הנחיתה. זה אפשרי רק מפני שיש רכיב אחד: אילו היו
 *  שלושה־עשר, היו מתעוררים שלושה־עשר מקומות לתקן.
 *
 *  **איך המספר מופרד מהצמד שלו.** הערך מגיע כמחרוזת מעוצבת —
 *  ‎״1,234 ₪״, ‎״12.4%״, ‎״×3.2״ — ולכן הוא **מפוצל** לקידומת,
 *  לספרות ולסיומת. רק הספרות מקבלות `data-to`, כי הוו המנגנון כותב
 *  `textContent` ישירות, ואילו הסימן היה בתוכו הוא היה נמחק
 *  באמצע האנימציה. ערך בלי ספרות כלל פשוט מוצג.
 */
import { useMemo } from 'react';

export interface StatProps {
  label: string;
  /** הערך המעוצב, כפי שהוא מוצג */
  value: string;
  sub?: string;
  tone?: 'gold' | 'up';
  /** בלי ספירה — למספרים שמשתנים תוך כדי הקלדה */
  still?: boolean;
}

/** הספרה הראשונה והאחרונה ברצף המספרי הראשון במחרוזת */
const NUM = /-?\d[\d,]*(?:\.\d+)?/;

export function Stat({ label, value, sub, tone, still }: StatProps) {
  const parts = useMemo(() => {
    if (still) return null;
    const m = NUM.exec(value);
    if (!m) return null;
    const raw = Number(m[0].replace(/,/g, ''));
    if (!Number.isFinite(raw)) return null;
    const dp = (m[0].split('.')[1] ?? '').length;
    return {
      pre: value.slice(0, m.index),
      num: m[0],
      post: value.slice(m.index + m[0].length),
      to: raw, dp,
    };
  }, [value, still]);

  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="k">{label}</span>
      <span className="n" dir="ltr">
        {parts ? (
          <>
            {parts.pre}
            <span data-to={parts.to} data-dp={parts.dp}>{parts.num}</span>
            {parts.post}
          </>
        ) : value}
      </span>
      <span className="s">{sub ?? ' '}</span>
    </div>
  );
}
