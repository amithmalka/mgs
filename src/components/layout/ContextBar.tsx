import { useStore } from '../../store';
import { useLangStore } from '../../store/langStore';
import { useMgsStore, currentPlanMonth } from '../../store/mgsStore';
import { getMgsTrack } from '../../constants/mgsTracks';
import { phaseOf } from '../../utils/mgsEngine';
import { formatCurrency } from '../../utils/format';
import { Icon } from '../shared/Icon';

/**
 * Always-visible strip naming the MGS track, phase and monthly deposit, with an
 * edit button into the MGS tab where all three are set.
 */
export function ContextBar({ onEdit }: { onEdit: () => void }) {
  const { simulationParams } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { trackId, horizonYears, startMonth } = useMgsStore();

  const track = getMgsTrack(trackId);
  const phase = phaseOf(track, horizonYears, currentPlanMonth(startMonth));
  const phaseLabel = {
    accumulate: { he: 'צבירה', en: 'Accumulation', color: '#F87171' },
    derisk: { he: 'ייצוב', en: 'De-risk', color: '#FBBF24' },
    withdraw: { he: 'משיכה', en: 'Withdrawal', color: '#34D399' },
  }[phase];

  const items = [
    { label: he ? 'מסלול' : 'Track', value: he ? track.nameHe : track.nameEn },
    { label: he ? 'שלב' : 'Phase', value: he ? phaseLabel.he : phaseLabel.en, color: phaseLabel.color },
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
