import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { ScenarioChart } from '../components/charts/ScenarioChart';
import { simulateByAsset } from '../utils/math';
import { formatCurrency } from '../utils/format';
import { ASSET_RETURNS, SCENARIOS, calcWeightedReturn } from '../constants/defaults';
import type { AssetClass, AllocationTarget } from '../types';

const ASSET_LABELS: Record<AssetClass, string> = {
  sp500: 'S&P 500', nasdaq: 'Nasdaq 100', bitcoin: 'Bitcoin',
  dividend: 'SCHD',
};
const ASSET_SOURCE: Record<AssetClass, string> = {
  sp500:         'SPY/VOO · CAGR ~10.5% since 1957',
  nasdaq:        'QQQ · CAGR ~16% since 1985',
  bitcoin:       'BTC · Modelled as maturing store-of-value',
  dividend:      'SCHD · ~10-12% total return',
};

const MILESTONES = [5, 10, 20, 30] as const;
type MilestoneYear = typeof MILESTONES[number];
type ScenarioKey = 'conservative' | 'moderate' | 'aggressive';

export function SimulationPage() {
  const { simulationParams, setSimulationParams, allocations, setAllocations } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const p = simulationParams;

  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('moderate');
  const [selectedYear, setSelectedYear] = useState<MilestoneYear>(30);

  // Local allocation % — live editing without touching the store until Save
  const [localTargets, setLocalTargets] = useState<Record<AssetClass, number>>(
    () => Object.fromEntries(allocations.map(a => [a.assetClass, a.targetPercent])) as Record<AssetClass, number>
  );

  const liveAllocations: AllocationTarget[] = useMemo(
    () => allocations.map(a => ({ ...a, targetPercent: localTargets[a.assetClass] ?? a.targetPercent })),
    [allocations, localTargets]
  );

  const totalPct = Object.values(localTargets).reduce((s, v) => s + v, 0);
  const pctOk = Math.abs(totalPct - 100) < 0.5;

  // Single simulation dataset — always 30 years, used everywhere
  const simData = useMemo(() => ({
    conservative: simulateByAsset(p.initialDeposit, p.monthlyDeposit, 30, 0, liveAllocations, ASSET_RETURNS.conservative),
    moderate:     simulateByAsset(p.initialDeposit, p.monthlyDeposit, 30, 0, liveAllocations, ASSET_RETURNS.moderate),
    aggressive:   simulateByAsset(p.initialDeposit, p.monthlyDeposit, 30, 0, liveAllocations, ASSET_RETURNS.aggressive),
  }), [p.initialDeposit, p.monthlyDeposit, liveAllocations]);

  const toChartData = (rows: typeof simData.moderate) =>
    rows.map(r => ({ year: r.year, value: r.totalValue, totalDeposited: r.totalDeposited, growth: r.totalGrowth }));

  const weightedReturns = useMemo(() => ({
    conservative: calcWeightedReturn(liveAllocations, 'conservative'),
    moderate:     calcWeightedReturn(liveAllocations, 'moderate'),
    aggressive:   calcWeightedReturn(liveAllocations, 'aggressive'),
  }), [liveAllocations]);

  const scenarioCards = [
    { key: 'conservative' as const, label: t('conservative', lang), color: SCENARIOS.conservative.color },
    { key: 'moderate'     as const, label: t('moderate',     lang), color: SCENARIOS.moderate.color     },
    { key: 'aggressive'   as const, label: t('aggressive',   lang), color: SCENARIOS.aggressive.color   },
  ];

  const activeAssets = liveAllocations.filter(a => (localTargets[a.assetClass] ?? 0) > 0);
  // Row for the selected milestone year in the active scenario
  const selectedRow = simData[activeScenario][selectedYear];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── 1. Parameters ────────────────────────────────────────────── */}
      <Card title={t('simulationParams', lang)}>
        <div className="grid grid-cols-2 gap-4 mt-2">
          {[
            { key: 'initialDeposit', label: t('initialDeposit', lang) + ' (₪)', hint: lang === 'he' ? 'מסונכרן עם התיק' : 'Synced with portfolio' },
            { key: 'monthlyDeposit', label: t('monthlyDeposit', lang) + ' (₪)', hint: lang === 'he' ? 'מסונכרן עם התיק' : 'Synced with portfolio' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                {f.label}
                {f.hint && <span className="normal-case tracking-normal text-gold/50 mr-1 ml-1">· {f.hint}</span>}
              </label>
              <input
                type="number"
                value={p[f.key as keyof typeof p]}
                onChange={e => setSimulationParams({ [f.key]: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-dim mt-3">
          {lang === 'he'
            ? 'הסימולציה מחשבת תמיד 30 שנה קדימה — עם נקודות ציון ב-5, 10, 20, 30 שנה'
            : 'Simulation always projects 30 years — with milestones at 5, 10, 20 & 30 years'}
        </p>
      </Card>

      {/* ── 2. Asset allocation + per-scenario return rates ──────────── */}
      <Card title={lang === 'he' ? 'חלוקת נכסים ותשואות צפויות' : 'Asset Allocation & Expected Returns'}>
        <p className="text-[11px] text-text-dim mt-1 mb-3">
          {lang === 'he'
            ? 'ערוך אחוזים — הסימולציה מתעדכנת מיידית בכל שינוי'
            : 'Edit percentages — every change recalculates the simulation instantly'}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted text-xs">{t('asset', lang)}</th>
                <th className="text-center py-2 text-xs text-gold">{t('allocation', lang)} %</th>
                <th className="text-center py-2 text-xs" style={{ color: SCENARIOS.conservative.color }}>{t('conservative', lang)}</th>
                <th className="text-center py-2 text-xs" style={{ color: SCENARIOS.moderate.color }}>{t('moderate', lang)}</th>
                <th className="text-center py-2 text-xs" style={{ color: SCENARIOS.aggressive.color }}>{t('aggressive', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(a => {
                const pct = localTargets[a.assetClass] ?? 0;
                return (
                  <tr key={a.assetClass} className="border-b border-surface-3/50">
                    <td className="py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                        <div>
                          <div style={{ color: a.color }}>
                            {lang === 'he' ? t(a.assetClass === 'dividend' ? 'dividendEtf' : a.assetClass as any, lang) : ASSET_LABELS[a.assetClass]}
                          </div>
                          <div className="text-[9px] text-text-dim font-normal">{ASSET_SOURCE[a.assetClass]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number" min="0" max="100" value={pct}
                          onChange={e => setLocalTargets(prev => ({ ...prev, [a.assetClass]: Number(e.target.value) || 0 }))}
                          className="w-16 text-center py-1.5 px-2"
                          style={{ fontSize: '13px' }}
                        />
                        <span className="text-text-dim text-xs">%</span>
                      </div>
                    </td>
                    <td className="text-center py-2" style={{ color: pct > 0 ? SCENARIOS.conservative.color : '#333' }}>
                      {pct > 0 ? `${ASSET_RETURNS.conservative[a.assetClass]}%` : '—'}
                    </td>
                    <td className="text-center py-2" style={{ color: pct > 0 ? SCENARIOS.moderate.color : '#333' }}>
                      {pct > 0 ? `${ASSET_RETURNS.moderate[a.assetClass]}%` : '—'}
                    </td>
                    <td className="text-center py-2" style={{ color: pct > 0 ? SCENARIOS.aggressive.color : '#333' }}>
                      {pct > 0 ? `${ASSET_RETURNS.aggressive[a.assetClass]}%` : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gold/20">
                <td className="py-2 font-bold text-gold text-xs uppercase tracking-wider">{t('weightedReturn', lang)}</td>
                <td className="text-center py-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctOk ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {totalPct}%
                  </span>
                </td>
                <td className="text-center py-2 font-bold" style={{ color: SCENARIOS.conservative.color }}>{weightedReturns.conservative}%</td>
                <td className="text-center py-2 font-bold" style={{ color: SCENARIOS.moderate.color }}>{weightedReturns.moderate}%</td>
                <td className="text-center py-2 font-bold" style={{ color: SCENARIOS.aggressive.color }}>{weightedReturns.aggressive}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-4">
          <span className={`text-xs ${pctOk ? 'text-success' : 'text-danger'}`}>
            {pctOk
              ? (lang === 'he' ? '✓ החלוקה תקינה' : '✓ Allocation valid')
              : (lang === 'he' ? `⚠ סה״כ ${totalPct}% — נדרש 100%` : `⚠ Total ${totalPct}% — must equal 100%`)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setLocalTargets(Object.fromEntries(allocations.map(a => [a.assetClass, a.targetPercent])) as Record<AssetClass, number>)}
              className="text-xs text-text-muted hover:text-text px-3 py-1.5 rounded-lg border border-surface-4 transition-colors"
            >
              {lang === 'he' ? 'איפוס' : 'Reset'}
            </button>
            <button
              onClick={() => setAllocations(liveAllocations)}
              disabled={!pctOk}
              className="text-xs btn-gold px-4 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lang === 'he' ? 'שמור לתיק' : 'Save to Portfolio'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── 3. Milestone projections (5 / 10 / 20 / 30 yr) ──────────── */}
      <Card glow title={lang === 'he' ? 'תחזית ערך לאורך זמן — כל 3 תרחישים' : 'Wealth Milestones — All 3 Scenarios'}>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted text-xs">{lang === 'he' ? 'תרחיש' : 'Scenario'}</th>
                <th className="text-center py-2 text-text-muted text-xs">{lang === 'he' ? 'תשואה' : 'Return'}</th>
                {MILESTONES.map(yr => (
                  <th key={yr} className="text-end py-2 text-text-muted text-xs">
                    {yr} {lang === 'he' ? 'שנה' : 'yr'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarioCards.map(s => (
                <tr key={s.key} className="border-b border-surface-3/50">
                  <td className="py-3">
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                  </td>
                  <td className="text-center py-3">
                    <span className="text-xs font-bold" style={{ color: s.color }}>{weightedReturns[s.key]}%</span>
                  </td>
                  {MILESTONES.map(yr => {
                    const row = simData[s.key][yr];
                    if (!row) return <td key={yr} className="text-end py-3 text-text-dim text-xs">—</td>;
                    const xFactor = p.initialDeposit > 0 ? (row.totalValue / p.initialDeposit).toFixed(1) : null;
                    return (
                      <td key={yr} className="text-end py-3">
                        <div className="font-bold" style={{ color: s.color }}>{formatCurrency(row.totalValue)}</div>
                        <div className="text-[9px] text-text-dim">
                          +{formatCurrency(row.totalGrowth)}
                          {xFactor && yr >= 10 && <span className="mr-1 ml-1">({xFactor}x)</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-gold/10">
                <td className="py-2 text-xs text-text-dim" colSpan={2}>{lang === 'he' ? 'סה״כ הפקדות' : 'Total deposited'}</td>
                {MILESTONES.map(yr => {
                  const row = simData.moderate[yr];
                  return (
                    <td key={yr} className="text-end py-2 text-xs text-text-dim">
                      {row ? formatCurrency(row.totalDeposited) : '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 4. Growth chart (30yr, all 3 scenarios) ──────────────────── */}
      <Card title={t('portfolioGrowth', lang)}>
        <ScenarioChart
          conservative={toChartData(simData.conservative)}
          moderate={toChartData(simData.moderate)}
          aggressive={toChartData(simData.aggressive)}
        />
      </Card>

      {/* ── 5. Per-asset breakdown — scenario + milestone year selector ── */}
      <Card title={lang === 'he' ? 'פירוט פר-נכס' : 'Per-Asset Breakdown'}>
        {/* Selectors */}
        <div className="flex flex-wrap gap-3 mt-2 mb-4">
          {/* Scenario selector */}
          <div className="flex gap-1 bg-surface-3 rounded-xl p-1">
            {scenarioCards.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveScenario(s.key)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  activeScenario === s.key ? 'bg-surface-4 text-text' : 'text-text-muted hover:text-text'
                }`}
                style={activeScenario === s.key ? { color: s.color } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* Year selector */}
          <div className="flex gap-1 bg-surface-3 rounded-xl p-1">
            {MILESTONES.map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  selectedYear === yr ? 'bg-gold text-surface' : 'text-text-muted hover:text-text'
                }`}
              >
                {yr}{lang === 'he' ? 'ש׳' : 'yr'}
              </button>
            ))}
          </div>
        </div>

        {selectedRow && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activeAssets.map(a => {
                const d = selectedRow.assets[a.assetClass];
                if (!d) return null;
                const shareOfTotal = selectedRow.totalValue > 0 ? (d.value / selectedRow.totalValue) * 100 : 0;
                return (
                  <div key={a.assetClass} className="glass-card rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                      <span className="text-xs font-medium" style={{ color: a.color }}>
                        {lang === 'he' ? t(a.assetClass === 'dividend' ? 'dividendEtf' : a.assetClass as any, lang) : ASSET_LABELS[a.assetClass]}
                      </span>
                      <span className="text-[10px] text-text-dim mr-auto">{d.returnRate}% · {localTargets[a.assetClass]}%</span>
                    </div>
                    <p className="text-lg font-bold text-gold">{formatCurrency(d.value)}</p>
                    <div className="mt-1.5 h-1 bg-surface-4 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${shareOfTotal}%`, background: a.color }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-text-muted mt-1">
                      <span>{formatCurrency(d.deposited)} {lang === 'he' ? 'הופקד' : 'in'}</span>
                      <span className="text-success">+{formatCurrency(d.growth)}</span>
                      <span className="text-text-dim">{shareOfTotal.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-surface-3/50 border border-gold/10 flex justify-between items-center">
              <span className="text-sm font-medium text-text-muted">{t('total', lang)}</span>
              <div className="text-end">
                <p className="text-xl font-bold text-gold">{formatCurrency(selectedRow.totalValue)}</p>
                <p className="text-[10px] text-text-dim">
                  {t('deposited', lang)}: {formatCurrency(selectedRow.totalDeposited)}&nbsp;|&nbsp;
                  {t('growth', lang)}: <span className="text-success">{formatCurrency(selectedRow.totalGrowth)}</span>&nbsp;
                  <span>({selectedRow.totalDeposited > 0 ? (selectedRow.totalValue / selectedRow.totalDeposited).toFixed(1) : 0}x)</span>
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── 6. Year-by-year table (active scenario, full 30yr) ────────── */}
      <Card title={`${t('yearByYear', lang)} — ${scenarioCards.find(s => s.key === activeScenario)?.label}`}>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted text-xs">{t('year', lang)}</th>
                <th className="text-end py-2 text-text-muted text-xs">{t('portfolioValue', lang)}</th>
                <th className="text-end py-2 text-text-muted text-xs">{t('totalDeposits', lang)}</th>
                <th className="text-end py-2 text-text-muted text-xs">{t('growth', lang)}</th>
                {activeAssets.map(a => (
                  <th key={a.assetClass} className="text-end py-2 text-xs" style={{ color: a.color }}>
                    {lang === 'he' ? t(a.assetClass === 'dividend' ? 'dividendEtf' : a.assetClass as any, lang) : ASSET_LABELS[a.assetClass]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simData[activeScenario].slice(1).map(row => {
                const isMilestone = (MILESTONES as readonly number[]).includes(row.year);
                return (
                  <tr
                    key={row.year}
                    className={`border-b border-surface-3/50 ${isMilestone ? 'bg-gold/[0.03]' : ''}`}
                  >
                    <td className={`py-2 ${isMilestone ? 'text-gold font-semibold' : 'text-text-muted'}`}>
                      {row.year}
                      {isMilestone && <span className="text-[9px] text-gold/50 mr-1 ml-1">★</span>}
                    </td>
                    <td className="text-end py-2 font-medium text-gold">{formatCurrency(row.totalValue)}</td>
                    <td className="text-end py-2 text-text-muted">{formatCurrency(row.totalDeposited)}</td>
                    <td className="text-end py-2 text-success">{formatCurrency(row.totalGrowth)}</td>
                    {activeAssets.map(a => (
                      <td key={a.assetClass} className="text-end py-2 text-text-dim text-xs">
                        {row.assets[a.assetClass] ? formatCurrency(row.assets[a.assetClass].value) : '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
