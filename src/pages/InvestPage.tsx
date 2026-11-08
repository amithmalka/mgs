/** **הפקדות ומשיכות — הטאב שסוגר את החודש.**
 *
 *  **מה היה כאן קודם, ולמה זה השתנה.** הטאב היה ״מחשבון מס משיכה״:
 *  הוא ידע לחשב מה המס על משיכה, **ולא ידע לרשום כלום.** כלומר
 *  הוא ענה על שאלה אחת מתוך שלוש. השתיים האחרות — *הפקדתי, מה
 *  לעשות עם הכסף* ו-*לא הפקדתי החודש* — לא היו בשום מקום, ולכן
 *  התזכורת לא ידעה אם מישהו ענה לה.
 *
 *  עכשיו הטאב הוא ארבעה חלקים, בסדר שבו החודש באמת מתקדם:
 *
 *  1. **הפופאפ** שנפתח מהתזכורת ושואל: עכשיו, או בעוד 5 / 10 ימים.
 *  2. **אישור ההפקדה** — החלוקה על מחירי הרגע, ואישור שנכתב ליומן.
 *  3. **אישור המשיכה** — מה למכור, כמה מס, ומה נשאר בתיק.
 *  4. **מחשבון המס** נשאר במלואו, מתחת — הוא הפירוק לפי סעיף 88,
 *     והוא שימושי גם כשאין משיכה החודש.
 *
 *  **ומה שלא זז: הכסף.** היחידות והעלות ממשיכות להיות ב-Supabase
 *  (`mgs_deposits`, `mgs_withdrawals`), והם מקור האמת. מה שנוסף כאן
 *  הוא **ההכרעה החודשית** — הופקד / לא הופקד / נדחה — ששמורה
 *  בדפדפן, כי בלעדיה ״אין שורה״ דו־משמעי.
 */
import { useMemo } from 'react';
import { useMyPortfolio } from '../store/myPortfolio';
import { ceilingFor } from '../constants/studyFunds';
import { useMonthLog } from '../store/monthLog';
import { thisMonth } from '../store/planStore';
import { RemindPopup } from '../components/invest/RemindPopup';
import { DepositConfirm } from '../components/invest/DepositConfirm';
import { WithdrawConfirm } from '../components/invest/WithdrawConfirm';
import { DepositReminder } from '../components/build/DepositReminder';
import { DepositLog } from '../components/build/DepositLog';
import { Card } from '../components/layout/Card';
import { Disclaimer } from '../components/shared/Disclaimer';
import { TaxPage } from './TaxPage';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

const MONTH_HE = (m: string) => {
  const names = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const [y, mm] = m.split('-').map(Number);
  return `${names[mm - 1]} ${y}`;
};

export function InvestPage({ onNavigate }: { onNavigate?: (t: 'build') => void } = {}) {
  const { deposit, extra, fundStatus, annualSalary, selfIncome } = useMyPortfolio();
  const month = thisMonth();
  const entry = useMonthLog(s => s.entries[month]);

  const toBroker = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    return Math.max(0, deposit - Math.min(deposit, ceil)) + extra;
  }, [deposit, extra, fundStatus, annualSalary, selfIncome]);

  const depState = entry?.deposit
    ? (entry.deposit.decision === 'done' ? 'הופקד' : 'דווח שלא')
    : entry?.snoozeUntil ? 'נדחה' : 'ממתין';
  const wState = entry?.withdraw
    ? (entry.withdraw.decision === 'done' ? 'נמשך' : 'דווח שלא')
    : 'ממתין';

  return (
    <div className="space-y-6" dir="rtl">
      <RemindPopup amount={toBroker} deposit={deposit + extra}
        toFund={Math.max(0, (deposit + extra) - toBroker)} />

      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">הפקדות ומשיכות</h2>
        <p className="text-[12px] text-text-muted mt-1.5 leading-relaxed">
          החודש של <b className="text-text">{MONTH_HE(month)}</b>. כאן מאשרים
          את ההפקדה ואת המשיכה, <b className="text-gold">או מדווחים שלא
          היו</b> — כדי שהתזכורת תדע שעניתם, ושחודש בלי הפקדה ייספר
          כבחירה ולא כפספוס.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-4">
          {[
            ['ההפקדה החודש', depState],
            ['המשיכה החודש', wState],
            ['מגיע לברוקר', `${n0(toBroker)} ₪`],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5">
              <p className="text-[9.5px] text-text-dim tracking-wide">{k}</p>
              <p className="text-[14px] font-semibold text-text tabular-nums" dir="auto">{v}</p>
            </div>
          ))}
        </div>
        {entry?.snoozeUntil && !entry.deposit && (
          <p className="note mt-3">
            <b>התזכורת נדחתה ל-{new Date(entry.snoozeUntil).toLocaleDateString('he-IL')}.</b>{' '}
            אפשר לאשר גם עכשיו — הדחייה רק משתיקה את השאלה, היא לא
            חוסמת כלום.
          </p>
        )}
      </Card>

      <div className="term"><DepositConfirm onBuild={() => onNavigate?.('build')} /></div>

      <div className="term"><WithdrawConfirm /></div>

      {/* **היומן המלא — עבר לכאן מ״התיק שלי״.** שם הוא היה טבלאות
          של הפקדות ומשיכות בטאב שעוסק במה שמחזיקים; כאן הוא יושב
          ליד כפתורי האישור, ושם הוא מתקן שורה שנרשמה לא מדויק. */}
      <div className="term">
        <DepositLog toBroker={toBroker} onBuild={() => onNavigate?.('build')} />
      </div>

      <div className="term">
        <DepositReminder toBroker={toBroker} />
      </div>

      {/* מחשבון המס במלואו — הפירוק לפי סעיף 88 */}
      <TaxPage embedded />

      <Disclaimer />
    </div>
  );
}
