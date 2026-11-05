/** **הכרטיס של המערכת — עם הזוהר שעוקב אחרי הסמן, כמו בדף הנחיתה.**
 *
 *  **למה כאן ולא ברכיב חדש.** `Card` מופיע בכל דף במערכת. לשים את
 *  האפקט כאן אומר שהוא מגיע לכולם בבת אחת, בלי לעבור דף־דף ובלי
 *  שיישאר כרטיס אחד ישן שמסגיר את ההבדל.
 *
 *  **איך זה עובד:** מקום הסמן נכתב לשני משתני CSS, `--mx` ו-`--my`,
 *  ושלוש שכבות נדלקות סביבו — מסגרת, כתם וסריג. **הכל ב-CSS**;
 *  ה-React כאן כותב שני מספרים ולא קורא ל-`setState`, ולכן אין
 *  רינדור מחדש בכל תזוזת עכבר. זה ההבדל בין אפקט חלק לאפקט שמקרטע.
 *
 *  **ובלי סמן הכרטיס נראה רגיל לחלוטין.** זה התנאי לשימוש בכלי
 *  עבודה: האפקט מוסיף למי שמחפש, ולא מסתיר ממי שקורא. במובייל הוא
 *  נדלק בנגיעה ונכבה בסופה.
 *
 *  **`plain` מבטל אותו** — למקומות שבהם הכרטיס הוא מכולה טכנית ולא
 *  משטח שמסתכלים עליו.
 */
import { useRef, type ReactNode } from 'react';
import { Explain } from '../shared/Explain';
import type { ExplainKey } from '../../constants/mgsExplain';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** מדגיש את הכרטיס — מסגרת ערה יותר, עוד לפני שנוגעים בו */
  glow?: boolean;
  float?: boolean;
  /** בלי הזוהר שעוקב אחרי הסמן */
  plain?: boolean;
  /** שואל ״?״ ליד הכותרת, שפותח את ההסבר לנושא */
  explain?: ExplainKey;
}

export function Card({
  title, subtitle, children, className = '',
  glow = false, float = false, plain = false, explain,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  /** שני מספרים ל-CSS. בלי state, ולכן בלי רינדור מחדש. */
  const at = (cx: number, cy: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${cx - r.left}px`);
    el.style.setProperty('--my', `${cy - r.top}px`);
  };
  const on = (v: boolean) => ref.current?.classList.toggle('on', v);

  const head = title && (
    <div className="mb-4 relative">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">{title}</h3>
        {explain && <Explain topic={explain} />}
      </div>
      {subtitle && <p className="text-[11px] text-text-muted mt-0.5 font-light">{subtitle}</p>}
    </div>
  );

  if (plain) {
    return (
      <div className={`glass-card rounded-2xl p-5 ${glow ? 'gold-glow' : ''} ${className}`}>
        {head}{children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`gcard card-glow ${glow ? 'lit' : ''} ${float ? 'animate-float' : ''} ${className}`}
      onMouseMove={e => at(e.clientX, e.clientY)}
      onMouseEnter={e => { on(true); at(e.clientX, e.clientY); }}
      onMouseLeave={() => on(false)}
      onTouchStart={e => { const t = e.touches[0]; if (t) { on(true); at(t.clientX, t.clientY); } }}
      onTouchMove={e => { const t = e.touches[0]; if (t) at(t.clientX, t.clientY); }}
      onTouchEnd={() => on(false)}
    >
      <span className="edge" aria-hidden="true" />
      <span className="edge-lit" aria-hidden="true" />
      <span className="face" aria-hidden="true"><span className="spot" /><span className="grid" /></span>
      <div className="body">{head}{children}</div>
    </div>
  );
}
