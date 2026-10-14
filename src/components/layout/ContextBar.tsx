import { useStore } from '../../store';
import { useLangStore } from '../../store/langStore';
import { useMgsStore, currentPlanMonth } from '../../store/mgsStore';
import { cohortFor, milestonesFor } from '../../constants/mgsScenarios';
import { formatCurrency } from '../../utils/format';
import { Icon } from '../shared/Icon';

/**
 * Always-visible strip naming the cohort, the current phase, the leveraged
 * target for this age and the monthly deposit, with an edit button into the
 * MGS tab where the age and deposit are set.
 */
export function ContextBar({ onEdit }: { onEdit: () => void }) {
  const { simulationParams } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { age, startMonth } = useMgsStore();

  const month = currentPlanMonth(startMonth);
  const { totalYears, shiftAtAge, withdrawAtAge } = milestonesFor(age);

  // which of the three windows the plan is in right now
  const yearsIn = Math.floor((month - 1) / 12);
  const phase = age + yearsIn >= withdrawAtAge
    ? { he: 'משיכה', en: 'Withdrawal', color: '#34D399' }
    : age + yearsIn >= shiftAtAge
      ? { he: 'חיתוך למדד עולמי', en: 'Shift to world index', color: '#FBBF24' }
      : { he: 'צבירה', en: 'Accumulation', color: '#F87171' };

  const items = [
    { label: he ? 'קבוצת גיל' : 'Cohort', value: cohortFor(age) },
    { label: he ? 'שלב' : 'Phase', value: he ? phase.he : phase.en, color: phase.color },
    { label: he ? 'אופק' : 'Horizon', value: `${totalYears} ${he ? 'שנה' : 'yrs'}` },
    { label: he ? 'חיתוך בגיל' : 'Shift at', value: String(shiftAtAge) },
    { label: he ? 'משיכה מגיל' : 'Withdraw at', value: String(withdrawAtAge) },
    { label: he ? 'הפקדה חודשית' : 'Monthly', value: formatCurrency(simulationParams.monthlyDeposit) },
  ];

  return (
    <div
      dir={he ? 'rtl' : 'ltr'}
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 rounded-xl border mb-5"
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
        onClick={onEdit}
        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-gold-border text-gold hover:bg-gold-muted transition-colors flex-shrink-0"
      >
        <Icon name="pencil" size={11} />
        {he ? 'עריכה' : 'Edit'}
      </button>
    </div>
  );
}
