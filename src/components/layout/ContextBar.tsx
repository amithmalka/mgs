import { useStore } from '../../store';
import { useLangStore } from '../../store/langStore';
import { getTrackById } from '../../constants/tracks';
import { getStrategy } from '../../constants/strategies';
import { formatCurrency } from '../../utils/format';
import { Dot } from '../shared/Icon';
import type { DotColor } from '../shared/Icon';

/**
 * A always-visible strip naming the method, track, phase and monthly deposit.
 *
 * Two clicks into the app it was no longer clear which method or track was
 * active, so every screen's numbers looked arbitrary. This keeps the answer on
 * screen without the user having to navigate back to find it.
 */
export function ContextBar() {
  const { selectedStrategyId, selectedTrackId, simulationParams } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const strategy = getStrategy(selectedStrategyId);
  const track = getTrackById(selectedTrackId);
  const isGeneral = selectedStrategyId === 'wealth';

  // Which traffic-light phase year 1 sits in — the phase the student is in now.
  const phase: { label: string; dot: DotColor } = isGeneral
    ? { label: he ? 'צבירה' : 'Accumulation', dot: 'green' }
    : { label: he ? 'צבירה (אדום)' : 'Accumulation (red)', dot: 'red' };

  const items: Array<{ label: string; value: string; dot?: DotColor }> = [
    { label: he ? 'שיטה' : 'Method', value: he ? strategy.nameHe : strategy.nameEn },
    ...(isGeneral ? [] : [{ label: he ? 'מסלול' : 'Track', value: he ? track.nameHe : track.nameEn, dot: track.dot }]),
    { label: he ? 'שלב' : 'Phase', value: phase.label, dot: phase.dot },
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
            {it.dot && <Dot color={it.dot} size={6} />}
            <span className="text-[12px] text-text truncate">{it.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
