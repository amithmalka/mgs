import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { TrackBanner } from '../components/layout/TrackBanner';
import { AllocationPie } from '../components/charts/AllocationPie';
import { calcRebalance } from '../utils/rebalance';
import { simulateByAsset } from '../utils/math';
import { formatCurrency, formatPercent } from '../utils/format';
import { ETF_RECOMMENDATIONS } from '../constants/etfs';
import { ASSET_RETURNS, SCENARIOS, calcWeightedReturn } from '../constants/defaults';
import type { AssetClass } from '../types';

const PROJECTION_YEARS = [5, 10, 20, 30];

export function PortfolioPage() {
  const {
    allocations, setAllocations, updateAllocationValue,
    currentPortfolioValue, simulationParams, setSimulationParams,
  } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const [editMode, setEditMode] = useState(false);
  const [tempTargets, setTempTargets] = useState<Record<string, number>>({});
  const [depositAmount, setDepositAmount] = useState(simulationParams.monthlyDeposit);

  const rebalanceSuggestions = calcRebalance(depositAmount, allocations, currentPortfolioValue);

  // Live projection using moderate scenario, recalculates on every change
  const projectionData = useMemo(() => {
    const maxYears = Math.max(...PROJECTION_YEARS);
    // Use initialDeposit (not currentPortfolioValue) as the starting capital.
    // simulateByAsset automatically uses actual holdings when any currentValue > 0,
    // and falls back to distributing initialDeposit when no holdings are entered.
    const rows = simulateByAsset(
      simulationParams.initialDeposit,
      simulationParams.monthlyDeposit,
      maxYears,
      simulationParams.yearlyDepositIncrease,
      allocations,
      ASSET_RETURNS.moderate,
    );
    return PROJECTION_YEARS.map(yr => rows[yr] ?? rows[rows.length - 1]);
  }, [simulationParams.initialDeposit, simulationParams.monthlyDeposit, simulationParams.yearlyDepositIncrease, allocations]);

  const weightedReturn = calcWeightedReturn(allocations, 'moderate');
  const totalDepositsAtMax = projectionData[projectionData.length - 1]?.totalDeposited ?? 0;
  const totalGrowthAtMax = projectionData[projectionData.length - 1]?.totalGrowth ?? 0;

  const startEdit = () => {
    const targets: Record<string, number> = {};
    allocations.forEach(a => { targets[a.assetClass] = a.targetPercent; });
    setTempTargets(targets);
    setEditMode(true);
  };

  const saveTargets = () => {
    const total = Object.values(tempTargets).reduce((s, v) => s + v, 0);
    if (Math.abs(total - 100) > 0.1) {
      alert(`${lang === 'he' ? 'סך האחוזים חייב להיות 100%. נוכחי:' : 'Target allocations must sum to 100%. Current:'} ${total}%`);
      return;
    }
    setAllocations(allocations.map(a => ({ ...a, targetPercent: tempTargets[a.assetClass] ?? a.targetPercent })));
    setEditMode(false);
  };

  const handleDepositChange = (val: number) => {
    setDepositAmount(val);
    setSimulationParams({ monthlyDeposit: val });
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <TrackBanner />

      {/* Live Projection Card */}
      <Card glow title={lang === 'he' ? 'תחזית תיק — מתעדכנת בזמן אמת' : 'Portfolio Projection — Live Update'}>
        <div className="mt-2 space-y-4">
          {/* Weighted return badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-text-muted">
              {lang === 'he' ? 'תשואה שנתית משוקללת (מתון):' : 'Weighted Annual Return (Moderate):'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-muted text-gold border border-gold-border">
              {weightedReturn}%
            </span>
            <span className="text-xs text-text-dim">
              {lang === 'he' ? 'הפקדה חודשית:' : 'Monthly deposit:'}&nbsp;
              <span className="text-text">{formatCurrency(simulationParams.monthlyDeposit)}</span>
            </span>
          </div>

          {/* Year milestones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {projectionData.map((row, i) => {
              const yr = PROJECTION_YEARS[i];
              const xFactor = currentPortfolioValue > 0 ? (row.totalValue / currentPortfolioValue) : 0;
              return (
                <div key={yr} className="bg-surface-3 rounded-xl p-3 border border-surface-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-dim">
                    {yr} {lang === 'he' ? 'שנים' : 'Years'}
                  </p>
                  <p className="text-lg font-bold text-gold mt-1">{formatCurrency(row.totalValue)}</p>
                  <p className="text-[10px] text-success mt-0.5">
                    +{formatCurrency(row.totalGrowth)}
                    {xFactor > 1 && <span className="text-text-dim mr-1 ml-1">({xFactor.toFixed(1)}x)</span>}
                  </p>
                  <div className="mt-2 h-1 bg-surface-4 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-gold"
                      style={{ width: `${Math.min(100, (row.totalGrowth / Math.max(row.totalValue, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-dim mt-1">
                    {formatPercent((row.totalGrowth / Math.max(row.totalValue, 1)) * 100)} {lang === 'he' ? 'רווח' : 'growth'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Summary row */}
          {currentPortfolioValue > 0 && (
            <div className="flex gap-4 flex-wrap text-xs text-text-muted border-t border-surface-4 pt-3">
              <span>{lang === 'he' ? 'שווי נוכחי' : 'Current Value'}: <strong className="text-gold">{formatCurrency(currentPortfolioValue)}</strong></span>
              <span>{lang === 'he' ? 'סה״כ הפקדות ב-30 שנה' : 'Total deposits in 30yr'}: <strong className="text-text">{formatCurrency(totalDepositsAtMax)}</strong></span>
              <span>{lang === 'he' ? 'רווח שוק ב-30 שנה' : 'Market growth in 30yr'}: <strong className="text-success">{formatCurrency(totalGrowthAtMax)}</strong></span>
            </div>
          )}
        </div>
      </Card>

      {/* Holdings editor */}
      <Card title={t('updateHoldings', lang)} subtitle={t('enterCurrentValue', lang)}>
        <div className="space-y-3 mt-2">
          {allocations.filter(a => a.targetPercent > 0 || a.currentValue > 0).map(a => {
            const currentPct = currentPortfolioValue > 0 ? (a.currentValue / currentPortfolioValue) * 100 : 0;
            const driftAbs = Math.abs(currentPct - a.targetPercent);
            const assetReturns = ASSET_RETURNS.moderate;
            const assetReturn = assetReturns[a.assetClass];
            return (
              <div key={a.assetClass} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-sm w-28 flex-shrink-0 text-text-muted">{a.label}</span>
                <input
                  type="number"
                  value={a.currentValue || ''}
                  onChange={e => updateAllocationValue(a.assetClass as AssetClass, Number(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1"
                />
                {/* Current % */}
                <span className={`text-xs w-12 text-end font-medium ${
                  driftAbs < 2 ? 'text-success' : driftAbs < 5 ? 'text-warning' : 'text-danger'
                }`}>
                  {currentPortfolioValue > 0 ? formatPercent(currentPct) : '0%'}
                </span>
                {/* Asset expected return badge */}
                <span className="text-[10px] text-text-dim w-10 text-end" title={lang === 'he' ? 'תשואה שנתית צפויה' : 'Expected annual return'}>
                  {assetReturn}%
                </span>
              </div>
            );
          })}
          <div className="pt-3 border-t border-surface-4 flex justify-between text-sm font-medium">
            <span className="text-text-muted">{t('total', lang)}</span>
            <span className="text-gold text-base">{formatCurrency(currentPortfolioValue)}</span>
          </div>
          {/* Monthly deposit linked to simulation */}
          <div className="flex items-center gap-3 pt-2 border-t border-surface-4/50">
            <span className="text-xs text-text-muted flex-shrink-0">
              {lang === 'he' ? 'הפקדה חודשית:' : 'Monthly deposit:'}
            </span>
            <input
              type="number"
              value={simulationParams.monthlyDeposit || ''}
              onChange={e => handleDepositChange(Number(e.target.value) || 0)}
              className="w-36"
            />
            <span className="text-xs text-text-dim">₪</span>
          </div>
        </div>
      </Card>

      {/* Target Allocation */}
      <Card title={t('targetAllocation', lang)}>
        <div className="flex justify-end mb-3">
          {!editMode ? (
            <button onClick={startEdit} className="text-xs text-gold hover:text-gold-light transition-colors">
              {t('editTargets', lang)}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="text-xs text-text-muted hover:text-text">{t('cancel', lang)}</button>
              <button onClick={saveTargets} className="text-xs bg-gold text-surface px-3 py-1 rounded-lg font-medium hover:bg-gold-light">
                {t('save', lang)}
              </button>
            </div>
          )}
        </div>
        {editMode ? (
          <div className="space-y-2">
            {allocations.map(a => (
              <div key={a.assetClass} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-sm w-28 text-text-muted">{a.label}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempTargets[a.assetClass] ?? 0}
                  onChange={e => setTempTargets({ ...tempTargets, [a.assetClass]: Number(e.target.value) })}
                  className="w-20 text-center"
                />
                <span className="text-xs text-text-dim">%</span>
                <span className="text-[10px] text-text-dim">
                  {lang === 'he' ? 'תשואה' : 'Return'}: {ASSET_RETURNS.moderate[a.assetClass]}%
                </span>
              </div>
            ))}
            <div className="text-xs pt-2 flex justify-between">
              <span className="text-text-muted">{t('total', lang)}: {Object.values(tempTargets).reduce((s, v) => s + v, 0)}%</span>
              <span className="text-text-dim">
                {lang === 'he' ? 'תשואה משוקללת:' : 'Weighted return:'}
                &nbsp;{calcWeightedReturn(
                  allocations.map(a => ({ ...a, targetPercent: tempTargets[a.assetClass] ?? a.targetPercent })),
                  'moderate'
                )}%
              </span>
            </div>
          </div>
        ) : (
          <AllocationPie allocations={allocations} mode="target" />
        )}
      </Card>

      {/* Rebalance */}
      <Card title={t('rebalanceSuggestions', lang)} subtitle={t('howToDistribute', lang)}>
        <div className="flex items-center gap-3 mb-4 mt-2">
          <label className="text-xs text-text-muted">{t('depositAmount', lang)}:</label>
          <input
            type="number"
            value={depositAmount}
            onChange={e => handleDepositChange(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-xs text-text-dim">₪</span>
        </div>
        <div className="space-y-2">
          {rebalanceSuggestions.map(s => (
            <div key={s.assetClass} className="flex items-center justify-between p-3 bg-surface-3 rounded-xl border border-surface-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium text-text">{s.label}</span>
              </div>
              <div className="text-end">
                <span className="text-sm font-bold text-gold">{formatCurrency(s.amount)}</span>
                <span className="text-[10px] text-text-dim mr-2 ml-2">
                  ({formatPercent(s.currentPercent)} → {formatPercent(s.targetPercent)})
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ETF Recommendations */}
      <Card title={t('etfRecommendations', lang)} subtitle={t('etfSubtitle', lang)}>
        <div className="space-y-4 mt-2">
          {allocations.filter(a => a.targetPercent > 0).map(a => (
            <div key={a.assetClass}>
              <h4 className="text-xs font-medium text-text-muted flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.label}
                <span className="text-[10px] text-text-dim">
                  — {lang === 'he' ? 'תשואה מתונה' : 'Moderate return'}: {SCENARIOS.moderate.color && ASSET_RETURNS.moderate[a.assetClass]}%
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ms-5">
                {(ETF_RECOMMENDATIONS[a.assetClass] || []).map(etf => (
                  <div key={etf.ticker} className="bg-surface-3 rounded-xl p-3 text-sm border border-surface-4">
                    <span className="font-mono font-bold text-gold">{etf.ticker}</span>
                    <span className="text-text-muted mr-2 ml-2 text-xs">{etf.name}</span>
                    <br />
                    <span className="text-[10px] text-text-dim">ER: {etf.expenseRatio}%</span>
                    {etf.dividendYield && (
                      <span className="text-[10px] text-success mr-2 ml-2">Yield: {etf.dividendYield}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-dim mt-4 italic">{t('etfDisclaimer', lang)}</p>
      </Card>
    </div>
  );
}
