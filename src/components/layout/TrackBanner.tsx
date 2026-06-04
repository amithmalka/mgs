import { useStore } from '../../store';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { ASSET_META } from '../../constants/defaults';
import { getTrackById } from '../../constants/tracks';
import type { AssetClass } from '../../types';

/**
 * Compact, system-wide banner showing the active track: identity, the
 * traffic-light timeline, and the allocation split. Rendered at the top of the
 * Dashboard, Portfolio and Simulation pages so the whole system visibly
 * reflects the user's age-based track.
 */
export function TrackBanner() {
  const { selectedTrackId, userAge } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const track = getTrackById(selectedTrackId);
  const hasYellow = track.greenStartYear > track.yellowStartYear;

  const entries = (Object.entries(track.allocations) as [AssetClass, number][])
    .sort((a, b) => b[1] - a[1]);

  const segments = [
    { dot: '🔴', color: '#ef4444', range: `0–${track.yellowStartYear}`, label: t('phaseDepositSplit', lang), show: true,
      width: track.yellowStartYear },
    { dot: '🟡', color: '#eab308', range: `${track.yellowStartYear}–${track.greenStartYear}`, label: t('phaseSchdOnly', lang), show: hasYellow,
      width: track.greenStartYear - track.yellowStartYear },
    { dot: '🟢', color: '#22c55e', range: `${track.greenStartYear}+`, label: t('phaseHarvest', lang), show: true,
      width: Math.max(6, 30 - track.greenStartYear) },
  ].filter(s => s.show);

  return (
    <div className="glass-card rounded-2xl p-4 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-2xl">{track.icon}</span>
        <div className="flex-1 min-w-[120px]">
          <p className="text-[9px] uppercase tracking-[0.15em] text-text-dim">{t('currentTrack', lang)}</p>
          <p className="text-sm font-bold text-gold">{lang === 'he' ? track.nameHe : track.nameEn}</p>
        </div>
        <span className="text-[10px] text-text-muted px-2.5 py-1 rounded-full bg-surface-3 border border-surface-4">
          {t('ages', lang)} {track.ageMin}–{track.ageMax} · {userAge}
        </span>
        <span className="text-[9px] text-text-dim">{t('changeTrackHint', lang)}</span>
      </div>

      {/* Traffic-light timeline */}
      <div className="mt-3">
        <div className="flex h-7 w-full overflow-hidden rounded-lg border border-surface-4">
          {segments.map(s => (
            <div
              key={s.dot}
              className="flex items-center justify-center gap-1 text-[9px] font-medium text-white/90"
              style={{ flexGrow: s.width, background: s.color + 'cc' }}
              title={s.label}
            >
              <span>{s.dot}</span>
              <span className="hidden sm:inline">{s.range}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 px-0.5">
          {segments.map(s => (
            <span key={s.dot} className="text-[8px] text-text-dim">{s.label}</span>
          ))}
        </div>
      </div>

      {/* Allocation split */}
      <div className="mt-3">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-4">
          {entries.map(([ac, pct]) => (
            <div key={ac} style={{ width: `${pct}%`, background: ASSET_META[ac].color }} title={`${ASSET_META[ac].label} ${pct}%`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {entries.map(([ac, pct]) => (
            <span key={ac} className="text-[9px] text-text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ASSET_META[ac].color }} />
              {ASSET_META[ac].label} {pct}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
