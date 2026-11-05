/** **חשיפה בגלילה וספירה של מספרים — הועבר מדף הנחיתה.**
 *
 *  **הכלל שקובע את כל המימוש כאן: המצב ההתחלתי הוא גלוי.**
 *  אלמנט שיושב על `opacity: 0` וממתין ל-IntersectionObserver נעלם
 *  לחלוטין אם ה-JavaScript לא רץ, אם התצפיתן אינו נתמך, או אם הדף
 *  צולם לתצוגה מקדימה. לכן ההסתרה נדלקת **רק אחרי** ש-JS הוכיח
 *  שהוא כאן — דרך `.js-reveal` על השורש — ובלעדיה הכל פשוט מוצג.
 *
 *  **ולמה `once`.** אלמנט שנחשף נשאר חשוף. חשיפה חוזרת בכל גלילה
 *  למעלה־למטה היא בדיוק סוג התנועה שמעייף במסך עבודה שחוזרים אליו
 *  עשרות פעמים ביום.
 */
import { useEffect } from 'react';

/** כמה זמן לוקח למספר לטפס ליעד */
const COUNT_MS = 900;

export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const root = document.documentElement;
    if (!('IntersectionObserver' in window)) return;

    // מרגע זה מותר להסתיר — יש מי שיחשוף בחזרה
    root.classList.add('js-reveal');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.to);
      if (!Number.isFinite(to)) return;
      const dp = Number(el.dataset.dp ?? 0);
      const fmt = (v: number) =>
        v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
      if (reduce) { el.textContent = fmt(to); return; }
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / COUNT_MS);
        // ease-out: מהיר בהתחלה ונרגע, כדי שהנחיתה על המספר תיראה מכוונת
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('in');
        if (el.dataset.to != null) count(el);
        io.unobserve(el);          // נחשף — ולא חוזר על עצמו
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    /** **הסימון נעשה כאן ולא ב-JSX.** `Card` ו-`section` מופיעים
     *  בעשרות קבצים; לסמן אותם ידנית היה אומר לגעת בכולם ולשכוח
     *  אחד. הסלקטורים האלה תופסים את משטחי התוכן של המערכת. */
    document.querySelectorAll<HTMLElement>(
      '.term > section, .gcard, .dcards, .term > .panel'
    ).forEach(el => el.classList.add('rv'));

    document.querySelectorAll<HTMLElement>('.rv:not(.in), [data-to]:not(.in)')
      .forEach(el => io.observe(el));

    /** **רשת ביטחון, ולא קישוט.** אלמנט שמסומן `rv` אבל לעולם אינו
     *  נכנס לתצוגה — כי הוא בתוך מקטע מקופל, בלשונית אחרת, או
     *  ב-`display:none` ברגע שהתצפיתן הוקם — יישאר ב-`opacity: 0`
     *  **לנצח**, והמשתמש יראה חור. אחרי שלוש שניות כל מה שעדיין
     *  מוסתר נחשף בכוח. עדיף להחמיץ אנימציה מאשר להסתיר תוכן. */
    const safety = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.rv:not(.in)')
        .forEach(el => el.classList.add('in'));
    }, 3000);

    return () => { io.disconnect(); window.clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
