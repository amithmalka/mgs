import { useState } from 'react';
import { cohortForAge, useMyPortfolio } from '../../store/myPortfolio';
import { depositYearsFor, cohortLabel } from '../../utils/comboProject';
import { useLangStore } from '../../store/langStore';
import { useMgsStore, currentPlanMonth } from '../../store/mgsStore';
import { formatCurrency } from '../../utils/format';
import { Icon } from '../shared/Icon';
import { NumField } from '../build/NumField';

/**
 * Always-visible strip naming the cohort, the current phase, the growth
 * target for this age and the monthly deposit, with an edit button into the
 * MGS tab where the age and deposit are set.
 *
 * ("leveraged target" until 4.11.2026 — there is no leverage in the system.)
 */
/** **ההפקדה והגיל נערכים כאן, במקום.** הטאב שאליו הכפתור הצביע
 *  קודם ירד מהתפריט, ושתי חנויות נפרדות להפקדה יצרו סתירה על המסך
 *  — הפס הראה סכום אחד והכרטיסים חישבו על אחר. **מקור אחד לכל.** */
export function ContextBar({ onEdit }: { onEdit?: () => void }) {
  const [open, setOpen] = useState(false);
  const { deposit, setDeposit, extra, setExtra } = useMyPortfolio();
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { age, setAge, startMonth } = useMgsStore();

  const month = currentPlanMonth(startMonth);

  // **המודל החדש:** מפקידים מספר שנים לפי קבוצת הגיל, **עוצרים
  // לגמרי**, ומשם משיכות בלבד. אין ״חיתוך למדד עולמי״ ואין גיל
  // משיכה קבוע — אלה היו שייכים למנוע הישן.
  const cohort = cohortForAge(age);
  // **האופק נחתך בגיל העצירה.** בלי זה בן 75 קיבל ״עוד עשר שנות
  // הפקדה, עוצרים ב-85״, ומי שעבר את 80 הוצג כ״צבירה״ אף שאין לו
  // מה לצבור — וזו סתירה למסלול שהמערכת עצמה ממליצה לו.
  const { years: depYears, capped } = depositYearsFor(age, cohort);
  const yearsIn = Math.floor((month - 1) / 12);
  const stopAge = age + depYears - yearsIn;
  const phase = yearsIn >= depYears
    ? { he: 'משיכה', en: 'Withdrawal', color: '#4ADE80' }
    : { he: 'צבירה', en: 'Accumulation', color: '#F87171' };

  const items = [
    { label: he ? 'גיל' : 'Age', value: String(age) },
    { label: he ? 'קבוצה' : 'Cohort', value: cohortLabel(age, cohort) },
    { label: he ? 'שלב' : 'Phase', value: he ? phase.he : phase.en, color: phase.color },
    { label: he ? 'שנות הפקדה' : 'Deposit years',
      value: depYears > 0
        ? `${depYears} ${he ? 'שנה' : 'yrs'}${capped ? (he ? ' · עד 80' : ' · to 80') : ''}`
        : (he ? 'אין' : 'none') },
    { label: he ? 'עוצרים בגיל' : 'Stop at',
      value: depYears > 0 ? String(stopAge) : (he ? 'כבר עצרתם' : 'already') },
    { label: he ? 'הפקדה חודשית' : 'Monthly', value: formatCurrency(deposit + extra) },
  ];

  return (
    <>
    <div
      dir={he ? 'rtl' : 'ltr'}
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 rounded-xl border mb-2"
      style={{ background: 'rgba(212,175,55,0.04)', borderColor: 'rgba(212,175,55,0.14)' }}
    >
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[9px] uppercase tracking-wider text-text-dim flex-shrink-0">{it.label}</span>
          <span className="flex items-center gap-1.5 min-w-0">
            {it.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: it.color }} />}
            <span className="text-[12px] text-text truncate">{it.value}</span>
          </span>
        </div>
      ))}
      <span className="flex-1" />
      <button
        onClick={() => { setOpen(o => !o); onEdit?.(); }}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-gold-border text-gold hover:bg-gold-muted transition-colors flex-shrink-0"
      >
        <Icon name="pencil" size={11} />
        {he ? 'עריכה' : 'Edit'}
      </button>
    </div>

      {open && (
        <div className="term cx-edit">
          <div className="grp">
            <span className="glab">{he ? 'גיל' : 'Age'}</span>
            <NumField value={age} min={18} max={75} label={he ? 'גיל' : 'Age'}
              unit={he ? 'שנים' : 'yrs'} onCommit={setAge} />
            <span className="glab">{he ? 'הפקדה חודשית' : 'Monthly deposit'}</span>
            <NumField value={deposit} min={0} max={200000} step={1}
              label={he ? 'הפקדה חודשית' : 'Monthly deposit'} unit="₪"
              onCommit={setDeposit} />
            <span className="glab">{he ? 'סכום נוסף' : 'Extra'}</span>
            <NumField value={extra} min={0} max={1000000} step={1}
              label={he ? 'סכום נוסף' : 'Extra'} unit="₪"
              onCommit={setExtra} />
            <button className="opt" type="button" onClick={() => setOpen(false)}>
              {he ? 'סגירה' : 'Close'}
            </button>
          </div>
          <p className="note">
            {he
              ? 'הגיל וההפקדה מסתנכרנים מיד בכל המסכים — קבוצת הגיל, אופק ההפקדות, החלוקה לקרן ההשתלמות וכמה לקנות מכל רכיב.'
              : 'Age and deposit sync everywhere instantly.'}
          </p>
        </div>
      )}
    </>
  );
}
