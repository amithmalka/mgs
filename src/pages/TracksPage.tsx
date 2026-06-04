import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import type { Lang, TranslationKey } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { simulateTrack, simulateByAsset } from '../utils/math';
import { formatCurrency } from '../utils/format';
import { ASSET_RETURNS, ASSET_META, WITHDRAW_RATE } from '../constants/defaults';
import { TRACKS, getTrackById, recommendTrackByAge, trackToAllocations } from '../constants/tracks';
import type { AssetClass, Track } from '../types';

const ASSET_LABEL_KEY: Record<AssetClass, TranslationKey> = {
  sp500: 'sp500', nasdaq: 'nasdaq', bitcoin: 'bitcoin',
  dividend: 'dividendEtf', msci: 'msci', bonds: 'bonds',
};

function assetLabel(ac: AssetClass, lang: Lang): string {
  return lang === 'he' ? t(ASSET_LABEL_KEY[ac], lang) : ASSET_META[ac].label;
}

/** Stacked horizontal bar showing a track's allocation split. */
function AllocationBar({ track }: { track: Track }) {
  const entries = (Object.entries(track.allocations) as [AssetClass, number][])
    .sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-4">
      {entries.map(([ac, pct]) => (
        <div key={ac} style={{ width: `${pct}%`, background: ASSET_META[ac].color }} title={`${ASSET_META[ac].label} ${pct}%`} />
      ))}
    </div>
  );
}

export function TracksPage() {
  const { userAge, selectedTrackId, setUserAge, setSelectedTrack, simulationParams } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';

  const recommendedId = recommendTrackByAge(userAge);
  const track = getTrackById(selectedTrackId);

  // ── Phase-aware projection for the selected track (moderate scenario) ──────
  const projection = useMemo(() => {
    const allocations = trackToAllocations(track);
    return simulateTrack(
      simulationParams.initialDeposit,
      simulationParams.monthlyDeposit,
      30,
      allocations,
      ASSET_RETURNS.moderate,
      { yellowStartYear: track.yellowStartYear, greenStartYear: track.greenStartYear, withdrawRate: WITHDRAW_RATE },
    );
  }, [track, simulationParams.initialDeposit, simulationParams.monthlyDeposit]);

  const milestoneYears = [15, 20, 30];
  const hasYellow = track.greenStartYear > track.yellowStartYear;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">{t('tracksTitle', lang)}</h2>
        <p className="text-[12px] text-text-muted mt-2 leading-relaxed">{t('tracksSubtitle', lang)}</p>

        {/* Age input + recommendation */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-1.5">{t('yourAge', lang)}</label>
            <input
              type="number" min={18} max={80} value={userAge}
              onChange={e => setUserAge(Number(e.target.value) || 0)}
              className="w-24 text-center"
            />
          </div>
          <div className="flex-1 min-w-[200px] rounded-xl bg-gold-muted border border-gold-border px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-gold/70">{t('recommendedForYou', lang)}</p>
            <p className="text-sm font-semibold text-gold mt-0.5">
              {getTrackById(recommendedId).icon} {lang === 'he' ? getTrackById(recommendedId).nameHe : getTrackById(recommendedId).nameEn}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Track cards ─────────────────────────────────────────────────── */}
      <Card title={t('chooseTrack', lang)} subtitle={t('chooseTrackSub', lang)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-2">
          {TRACKS.map(tr => {
            const isSelected = tr.id === selectedTrackId;
            const isRecommended = tr.id === recommendedId;
            return (
              <button
                key={tr.id}
                onClick={() => setSelectedTrack(tr.id)}
                className={`text-start rounded-2xl p-4 border transition-all duration-300 ${
                  isSelected
                    ? 'border-gold bg-gold-muted gold-glow'
                    : 'border-surface-4 bg-surface-3 hover:border-gold-border'
                }`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{tr.icon}</span>
                  {isRecommended && (
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold-border">
                      {t('recommendedTrack', lang)}
                    </span>
                  )}
                </div>
                <h4 className={`mt-2 text-sm font-bold ${isSelected ? 'text-gold' : 'text-text'}`}>
                  {lang === 'he' ? tr.nameHe : tr.nameEn}
                </h4>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {t('ages', lang)} {tr.ageMin}–{tr.ageMax}
                </p>
                <p className="text-[11px] text-text-dim mt-1.5 leading-snug min-h-[28px]">
                  {lang === 'he' ? tr.taglineHe : tr.taglineEn}
                </p>
                <div className="mt-3">
                  <AllocationBar track={tr} />
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2">
                    {(Object.entries(tr.allocations) as [AssetClass, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([ac, pct]) => (
                        <span key={ac} className="text-[9px] text-text-muted flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ASSET_META[ac].color }} />
                          {assetLabel(ac, lang)} {pct}%
                        </span>
                      ))}
                  </div>
                </div>
                <div className={`mt-3 text-center text-[11px] font-medium rounded-lg py-1.5 ${
                  isSelected ? 'bg-gold text-surface' : 'text-gold border border-gold-border'
                }`}>
                  {isSelected ? `✓ ${t('selected', lang)}` : t('selectTrack', lang)}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Traffic light ───────────────────────────────────────────────── */}
      <Card title={t('trafficLightTitle', lang)} subtitle={t('trafficLightSub', lang)}>
        <div className="grid gap-3 md:grid-cols-3 mt-2">
          {[
            { color: '#ef4444', glow: 'rgba(239,68,68,0.15)', dot: '🔴', titleKey: 'redTitle', descKey: 'redDesc', labelKey: 'redPhase', active: true },
            { color: '#eab308', glow: 'rgba(234,179,8,0.15)', dot: '🟡', titleKey: 'yellowTitle', descKey: 'yellowDesc', labelKey: 'yellowPhase', active: hasYellow },
            { color: '#22c55e', glow: 'rgba(34,197,94,0.15)', dot: '🟢', titleKey: 'greenTitle', descKey: 'greenDesc', labelKey: 'greenPhase2', active: true },
          ].map(p => (
            <div
              key={p.titleKey}
              className="rounded-2xl p-4 border"
              style={{
                borderColor: p.active ? p.color + '55' : 'rgba(255,255,255,0.06)',
                background: p.active ? p.glow : 'rgba(255,255,255,0.02)',
                opacity: p.active ? 1 : 0.45,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{p.dot}</span>
                <span className="text-sm font-bold" style={{ color: p.color }}>{t(p.labelKey as TranslationKey, lang)}</span>
              </div>
              <p className="text-[11px] font-semibold text-text mt-2">{t(p.titleKey as TranslationKey, lang)}</p>
              <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{t(p.descKey as TranslationKey, lang)}</p>
            </div>
          ))}
        </div>
        {!hasYellow && (
          <p className="text-[11px] text-gold mt-3 px-3 py-2 rounded-xl bg-gold-muted border border-gold-border">
            ⚡ {t('trackEarlyHarvest', lang)}
          </p>
        )}
      </Card>

      {/* ── Track projection ────────────────────────────────────────────── */}
      <Card title={t('trackProjection', lang)}>
        <div className="grid gap-3 sm:grid-cols-3 mt-2">
          {milestoneYears.map(yr => {
            const row = projection[yr];
            if (!row) return null;
            const isGreen = row.phase === 'green';
            const annualIncome = isGreen ? row.totalValue * WITHDRAW_RATE : 0;
            return (
              <div key={yr} className="rounded-2xl p-4 bg-surface-3 border border-surface-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-text-dim">{t('atYear', lang, { n: yr })}</p>
                  <span className="text-sm">{row.phase === 'red' ? '🔴' : row.phase === 'yellow' ? '🟡' : '🟢'}</span>
                </div>
                <p className="text-[9px] text-text-muted">{t('portfolioAtYear', lang)}</p>
                <p className="text-xl font-bold text-gold mt-0.5">{formatCurrency(row.totalValue)}</p>
                {isGreen && (
                  <div className="mt-2 pt-2 border-t border-surface-4">
                    <p className="text-[9px] text-success">{t('annualIncome', lang)}</p>
                    <p className="text-base font-bold text-success">{formatCurrency(annualIncome)}</p>
                    <p className="text-[10px] text-text-dim">{t('monthlyIncome', lang)}: {formatCurrency(Math.round(annualIncome / 12))}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-text-dim mt-3">
          {lang === 'he'
            ? `הפקדה חודשית ${formatCurrency(simulationParams.monthlyDeposit)} · הון התחלתי ${formatCurrency(simulationParams.initialDeposit)} · עריכה במסך הסימולציה`
            : `Monthly ${formatCurrency(simulationParams.monthlyDeposit)} · Initial ${formatCurrency(simulationParams.initialDeposit)} · Edit in the Simulation tab`}
        </p>
      </Card>

      {/* ── Apartment vs investment ─────────────────────────────────────── */}
      <ApartmentComparison />

    </div>
  );
}

/** Side-by-side: buy a property vs. invest the same equity + monthly amount. */
function ApartmentComparison() {
  const { simulationParams, selectedTrackId } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const track = getTrackById(selectedTrackId);

  const [price, setPrice] = useState(1_800_000);
  const [equity, setEquity] = useState(simulationParams.initialDeposit || 400_000);
  const [appreciation, setAppreciation] = useState(4);
  const [rentYieldPct, setRentYieldPct] = useState(3);
  const [horizon, setHorizon] = useState(20);

  // Apartment side: value appreciates; rent income on the appreciated value.
  const apartmentValue = Math.round(price * Math.pow(1 + appreciation / 100, horizon));
  const apartmentIncome = Math.round(apartmentValue * (rentYieldPct / 100));

  // Investment side: same equity as starting capital + same monthly deposit,
  // grown through the selected track allocation (pure accumulation, moderate).
  const investValue = useMemo(() => {
    const rows = simulateByAsset(
      equity,
      simulationParams.monthlyDeposit,
      horizon,
      0,
      trackToAllocations(track),
      ASSET_RETURNS.moderate,
    );
    return rows[horizon]?.totalValue ?? rows[rows.length - 1]?.totalValue ?? 0;
  }, [equity, simulationParams.monthlyDeposit, horizon, track]);
  const investIncome = Math.round(investValue * WITHDRAW_RATE);
  const diff = investValue - apartmentValue;

  const fields = [
    { label: t('apartmentPrice', lang), value: price, set: setPrice },
    { label: t('downPayment', lang), value: equity, set: setEquity },
    { label: t('horizonYears', lang) + ' (' + (lang === 'he' ? 'שנים' : 'yrs') + ')', value: horizon, set: setHorizon },
    { label: t('apartmentAppreciation', lang) + ' %', value: appreciation, set: setAppreciation },
    { label: t('rentYield', lang) + ' %', value: rentYieldPct, set: setRentYieldPct },
  ];

  return (
    <Card title={t('apartmentTitle', lang)} subtitle={t('apartmentSub', lang)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 mb-5">
        {fields.map(f => (
          <div key={f.label}>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-1">{f.label}</label>
            <input type="number" value={f.value} onChange={e => f.set(Number(e.target.value) || 0)} className="w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Apartment */}
        <div className="rounded-2xl p-4 bg-surface-3 border border-surface-4">
          <p className="text-sm font-bold text-text">🏠 {t('buyApartment', lang)}</p>
          <p className="text-[10px] text-text-dim mt-2">{t('afterYears', lang, { n: horizon })}</p>
          <p className="text-2xl font-bold text-text mt-0.5">{formatCurrency(apartmentValue)}</p>
          <p className="text-[10px] text-text-muted mt-2">{t('passiveIncome', lang)}</p>
          <p className="text-base font-semibold text-text-muted">{formatCurrency(apartmentIncome)}{t('yr', lang)}</p>
        </div>

        {/* Investment */}
        <div className="rounded-2xl p-4 bg-gold-muted border border-gold-border gold-glow">
          <p className="text-sm font-bold text-gold">📈 {t('investInstead', lang)}</p>
          <p className="text-[10px] text-gold/60 mt-2">{t('afterYears', lang, { n: horizon })}</p>
          <p className="text-2xl font-bold text-gold mt-0.5">{formatCurrency(investValue)}</p>
          <p className="text-[10px] text-gold/60 mt-2">{t('passiveIncome', lang)} (4%)</p>
          <p className="text-base font-semibold text-success">{formatCurrency(investIncome)}{t('yr', lang)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-3/50 border border-gold/10 px-4 py-2.5">
        <span className="text-xs text-text-muted">{t('difference', lang)}</span>
        <span className={`text-sm font-bold ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
          {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
        </span>
      </div>
      <p className="text-[10px] text-text-dim mt-3 italic">{t('apartmentNote', lang)}</p>
    </Card>
  );
}
