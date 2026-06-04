import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { TrackBanner } from '../components/layout/TrackBanner';
import { DividendChart } from '../components/charts/DividendChart';
import { fourPercentRule, futureValue, simulateTrack } from '../utils/math';
import { formatCurrency } from '../utils/format';
import { ASSET_RETURNS, WITHDRAW_RATE } from '../constants/defaults';
import { getTrackById, trackToAllocations } from '../constants/tracks';

export function DividendsPage() {
  const { currentPortfolioValue, selectedTrackId, simulationParams } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const [portfolioForCalc, setPortfolioForCalc] = useState(currentPortfolioValue || 2000000);
  const [dividendYield, setDividendYield] = useState(3.5);

  const withdrawals = fourPercentRule(portfolioForCalc);

  const projectionData = Array.from({ length: 20 }, (_, i) => {
    const year = i + 1;
    const growth = futureValue(portfolioForCalc, 0, 7, year);
    const futurePortfolio = growth[growth.length - 1].value;
    return { year, income: Math.round(futurePortfolio * (dividendYield / 100)), portfolioValue: futurePortfolio };
  });

  // ── Track-aware income plan (traffic light) ────────────────────────────────
  const track = getTrackById(selectedTrackId);
  const trackProjection = useMemo(
    () => simulateTrack(
      simulationParams.initialDeposit,
      simulationParams.monthlyDeposit,
      30,
      trackToAllocations(track),
      ASSET_RETURNS.moderate,
      { yellowStartYear: track.yellowStartYear, greenStartYear: track.greenStartYear, withdrawRate: WITHDRAW_RATE },
    ),
    [track, simulationParams.initialDeposit, simulationParams.monthlyDeposit],
  );
  const planYears = [15, 20, 30];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <TrackBanner />
      <Card title={t('fourPercentRule', lang)} subtitle={t('fourPercentSubtitle', lang)}>
        <div className="flex items-center gap-3 mt-2 mb-4">
          <label className="text-xs text-text-muted">{t('portfolioValue', lang)}:</label>
          <input type="number" value={portfolioForCalc} onChange={e => setPortfolioForCalc(Number(e.target.value))} className="w-40" />
          <span className="text-xs text-text-dim">₪</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: `3% (${t('safe', lang)})`, value: withdrawals.safe, highlight: false },
            { label: `4% (${t('standard', lang)})`, value: withdrawals.normal, highlight: true },
            { label: `5% (${t('aggressive', lang)})`, value: withdrawals.aggressive, highlight: false },
          ].map(item => (
            <div key={item.label} className={`rounded-2xl p-4 text-center border ${item.highlight ? 'bg-gold-muted border-gold-border gold-glow' : 'bg-surface-3 border-surface-4'}`}>
              <p className={`text-[10px] uppercase tracking-wider ${item.highlight ? 'text-gold' : 'text-text-muted'}`}>{item.label}</p>
              <p className={`text-lg font-bold mt-1 ${item.highlight ? 'text-gold' : 'text-text'}`}>{formatCurrency(item.value)}{t('yr', lang)}</p>
              <p className="text-xs text-text-dim">{formatCurrency(Math.round(item.value / 12))}{t('mo', lang)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('dividendProjection', lang)}>
        <div className="flex items-center gap-4 mt-2 mb-4">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">{t('dividendYield', lang)} (%)</label>
          <input type="number" value={dividendYield} onChange={e => setDividendYield(Number(e.target.value))} step="0.1" min="0" max="15" className="w-24" />
        </div>
        <DividendChart data={projectionData.slice(0, 10)} />
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[4, 9, 19].map(i => (
            <div key={i} className="bg-surface-3 rounded-xl p-3 text-center border border-surface-4">
              <p className="text-[10px] text-gold">{t('inYears', lang, { n: projectionData[i].year })}</p>
              <p className="text-lg font-bold text-gold-light">{formatCurrency(projectionData[i].income)}{t('yr', lang)}</p>
              <p className="text-xs text-text-dim">{formatCurrency(Math.round(projectionData[i].income / 12))}{t('mo', lang)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('incomePlanTitle', lang)} subtitle={t('incomePlanSub', lang)}>
        {/* Phase legend for the selected track */}
        <div className="grid gap-2 sm:grid-cols-3 mt-2 mb-4">
          {[
            { dot: '🔴', color: '#ef4444', titleKey: 'redTitle', descKey: 'redDesc' },
            { dot: '🟡', color: '#eab308', titleKey: 'yellowTitle', descKey: 'yellowDesc', hide: track.greenStartYear === track.yellowStartYear },
            { dot: '🟢', color: '#22c55e', titleKey: 'greenTitle', descKey: 'greenDesc' },
          ].filter(p => !p.hide).map(p => (
            <div key={p.titleKey} className="rounded-xl p-3 border" style={{ borderColor: p.color + '44', background: p.color + '12' }}>
              <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: p.color }}>{p.dot} {t(p.titleKey as 'redTitle', lang)}</p>
              <p className="text-[10px] text-text-muted mt-1 leading-snug">{t(p.descKey as 'redDesc', lang)}</p>
            </div>
          ))}
        </div>

        {/* Milestone income table driven by the track simulation */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted text-xs">{t('year', lang)}</th>
                <th className="text-center py-2 text-text-muted text-xs">{t('phaseLabel', lang)}</th>
                <th className="text-end py-2 text-text-muted text-xs">{t('portfolioAtYear', lang)}</th>
                <th className="text-end py-2 text-gold text-xs">{t('schdValue', lang)}</th>
                <th className="text-end py-2 text-success text-xs">{t('totalIncome', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {planYears.map(yr => {
                const row = trackProjection[yr];
                if (!row) return null;
                const schdVal = row.assets.dividend?.value ?? 0;
                const dividendIncome = schdVal * (dividendYield / 100);
                const ruleIncome = row.phase === 'green' ? row.totalValue * WITHDRAW_RATE : 0;
                // In green the 4% rule already captures income; before it, show
                // the SCHD dividend stream that is being reinvested.
                const totalInc = row.phase === 'green' ? ruleIncome : dividendIncome;
                const dot = row.phase === 'red' ? '🔴' : row.phase === 'yellow' ? '🟡' : '🟢';
                return (
                  <tr key={yr} className="border-b border-surface-3/50">
                    <td className="py-2.5 font-medium text-text">{yr}</td>
                    <td className="text-center py-2.5">{dot}</td>
                    <td className="text-end py-2.5 text-text-muted">{formatCurrency(row.totalValue)}</td>
                    <td className="text-end py-2.5 text-gold font-medium">{formatCurrency(schdVal)}</td>
                    <td className="text-end py-2.5 text-success font-bold">
                      {formatCurrency(totalInc)}
                      <span className="block text-[9px] text-text-dim font-normal">{formatCurrency(Math.round(totalInc / 12))}{t('mo', lang)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-gold-muted rounded-xl text-[11px] text-gold border border-gold-border">
          {lang === 'he'
            ? `במסלול "${track.nameHe}" — עד שנה ${track.yellowStartYear} ההפקדות מפוצלות, ואז ${track.greenStartYear === track.yellowStartYear ? 'מתחילים משיכות 4%' : 'הכל ל-SCHD ואז משיכות 4% משנה ' + track.greenStartYear}.`
            : `In the "${track.nameEn}" track — deposits are split until year ${track.yellowStartYear}, then ${track.greenStartYear === track.yellowStartYear ? '4% withdrawals begin' : 'everything goes to SCHD, with 4% withdrawals from year ' + track.greenStartYear}.`}
        </div>
      </Card>
    </div>
  );
}
