/** **כרטיס עם זוהר שעוקב אחרי הסמן.** הועבר מדף הנחיתה.
 *
 *  **איך זה עובד:** מקום הסמן נכתב לשני משתני CSS, `--mx` ו-`--my`,
 *  ושלוש שכבות רקע נדלקות סביבו — מסגרת, כתם וסריג. **הכל ב-CSS**;
 *  ה-React כאן כותב שני מספרים ולא יותר, ולכן אין רינדור מחדש
 *  בכל תזוזת עכבר.
 *
 *  **ובלי סמן הכרטיס נראה רגיל לחלוטין** — זה התנאי לשימוש בכלי
 *  עבודה: האפקט מוסיף למי שמחפש, ולא מסתיר ממי שקורא.
 */
import { useRef, type ReactNode } from 'react';

export function GlowCard({ children, className = '' }: {
  children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const at = (cx: number, cy: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${cx - r.left}px`);
    el.style.setProperty('--my', `${cy - r.top}px`);
  };

  return (
    <div
      ref={ref}
      className={`gcard ${className}`}
      onMouseMove={e => at(e.clientX, e.clientY)}
      onMouseEnter={e => { ref.current?.classList.add('on'); at(e.clientX, e.clientY); }}
      onMouseLeave={() => ref.current?.classList.remove('on')}
      onTouchStart={e => {
        const t = e.touches[0]; if (!t) return;
        ref.current?.classList.add('on'); at(t.clientX, t.clientY);
      }}
      onTouchMove={e => { const t = e.touches[0]; if (t) at(t.clientX, t.clientY); }}
      onTouchEnd={() => ref.current?.classList.remove('on')}
    >
      <span className="edge" aria-hidden="true" />
      <span className="edge-lit" aria-hidden="true" />
      <span className="face" aria-hidden="true"><span className="spot" /><span className="grid" /></span>
      <div className="body">{children}</div>
    </div>
  );
}
