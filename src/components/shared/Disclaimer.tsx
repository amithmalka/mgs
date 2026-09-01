import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { Icon } from './Icon';

/**
 * Educational-use disclaimer.
 *
 * `compact` is a one-line notice for the bottom of a screen that shows numbers;
 * `full` is the expandable version with the specific points, meant for screens
 * that tell the user what to buy or project future value.
 */
export function Disclaimer({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const [open, setOpen] = useState(false);

  const points = he
    ? [
        'המערכת היא כלי חינוכי בלבד, חלק מקורס לימודי. אין בה ייעוץ השקעות, שיווק השקעות או המלצה לרכוש, למכור או להחזיק נייר ערך כלשהו.',
        'התכנים אינם מותאמים אישית. הם אינם מביאים בחשבון את מצבכם הכלכלי, צרכיכם, מטרותיכם, חבות המס שלכם או כל נתון אישי אחר.',
        'מפעילי המערכת אינם בעלי רישיון ייעוץ השקעות או שיווק השקעות. לפני כל החלטה יש להתייעץ עם בעל רישיון מתאים.',
        'התחזיות והסימולציות מבוססות על הנחות שאתם מזינים. הן אינן חיזוי ואינן הבטחה לתשואה. תשואות בפועל יהיו שונות.',
        'ביצועי עבר אינם מעידים על ביצועי עתיד.',
        'ההצעה "לאן להפקיד החודש" נגזרת מנוסחה אוטומטית לפי המשקלים והמחירים בלבד. ירידה במחיר אינה ערובה לעלייה — נכס יכול להמשיך לרדת.',
        'השקעה בניירות ערך כרוכה בסיכון, לרבות אובדן מלוא כספי ההשקעה. מכשירים ממונפים מגדילים את הסיכון באופן מהותי.',
        'נתוני השוק מסופקים על ידי צד שלישי, הם מחירי סוף יום ולא מסחר חי, ועשויים להיות שגויים, חלקיים או מעוכבים.',
        'האחריות על כל החלטה ופעולה היא שלכם בלבד.',
      ]
    : [
        'This system is an educational tool, part of a course. It does not provide investment advice or marketing, and is not a recommendation to buy, sell or hold any security.',
        'Nothing here is personalised. It does not account for your financial situation, needs, goals, tax position or any other personal circumstance.',
        'The operators are not licensed investment advisors or marketers. Consult a licensed professional before making any decision.',
        'Projections and simulations are built from assumptions you enter. They are not forecasts and not a promise of return. Actual results will differ.',
        'Past performance does not indicate future performance.',
        'The "where to deposit this month" suggestion comes from an automatic formula using only your weights and prices. A lower price is no guarantee of a rise — an asset can keep falling.',
        'Investing carries risk, including the loss of your entire investment. Leveraged instruments materially increase that risk.',
        'Market data comes from a third party, is end-of-day rather than live, and may be inaccurate, incomplete or delayed.',
        'Every decision and action is solely your responsibility.',
      ];

  const headline = he
    ? 'כלי חינוכי בלבד — אין זה ייעוץ, שיווק או המלצת השקעה.'
    : 'Educational tool only — not investment advice, marketing or a recommendation.';

  if (variant === 'compact') {
    return (
      <p className="text-[10px] text-text-dim text-center leading-relaxed px-2">
        {headline}{' '}
        {he ? 'השקעה כרוכה בסיכון, לרבות אובדן הקרן.' : 'Investing carries risk, including loss of principal.'}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-4 bg-surface-2/60 p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2.5 text-start">
        <Icon name="warning" size={14} className="text-warning flex-shrink-0" />
        <span className="flex-1 text-[12px] font-semibold text-text-muted">{headline}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={15} className="text-text-dim flex-shrink-0" />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[11px] text-text-muted leading-relaxed">
              <span className="text-text-dim flex-shrink-0 mt-[3px]">
                <span className="block w-1 h-1 rounded-full bg-current" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
