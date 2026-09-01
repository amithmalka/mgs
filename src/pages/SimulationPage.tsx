import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { ScenarioChart } from '../components/charts/ScenarioChart';
import { simulateTrack, simulateTrackMonthly } from '../utils/math';
import { formatCurrency } from '../utils/format';
import { ASSET_RETURNS, SCENARIOS, calcWeightedReturn, ASSET_META, PROJECTION_HORIZON } from '../constants/defaults';
import { getTrackById, trackPhaseOpts } from '../constants/tracks';
import type { AllocationTarget, AssetClass } from '../types';
import { Dot } from '../components/shared/Icon';
import { DividendSimulation } from '../components/features/DividendSimulation';
import { Disclaimer } from '../components/shared/Disclaimer';

const MILESTONES = [5, 10, 25, 30, 40] as const;

/** Rows shown in the year-by-year table — every fifth year to the horizon. */
const YEAR_ROWS = [5, 10, 15, 20, 25, 30, 35, 40];
type MilestoneYear = typeof MILESTONES[number];


type ScenarioKey = 'conservative' | 'moderate' | 'aggressive';

export function SimulationPage() {
  const { simulationParams, setSimulationParams, allocations, setAllocations, selectedTrackId } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const p = simulationParams;
  const track = getTrackById(selectedTrackId);
  const phaseOpts = trackPhaseOpts(track);

  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('moderate');
  const [selectedYear, setSelectedYear] = useState<MilestoneYear>(30);
  const [monthlyYear, setMonthlyYear] = useState(1);

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

  // Single simulation dataset — 40 years, phase-aware (traffic light) per the
  // selected track. The horizon must exceed the green-phase start (year 31 on
  // the standard timing) or the income years would never appear on screen.
  const simData = useMemo(() => ({
    conservative: simulateTrack(p.initialDeposit, p.monthlyDeposit, PROJECTION_HORIZON, liveAllocations, ASSET_RETURNS.conservative, phaseOpts),
    moderate:     simulateTrack(p.initialDeposit, p.monthlyDeposit, PROJECTION_HORIZON, liveAllocations, ASSET_RETURNS.moderate, phaseOpts),
    aggressive:   simulateTrack(p.initialDeposit, p.monthlyDeposit, PROJECTION_HORIZON, liveAllocations, ASSET_RETURNS.aggressive, phaseOpts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [p.initialDeposit, p.monthlyDeposit, liveAllocations, track.id]);

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

  // Month-by-month simulation for the active scenario
  const monthlyData = useMemo(
    () => simulateTrackMonthly(p.initialDeposit, p.monthlyDeposit, PROJECTION_HORIZON, liveAllocations, ASSET_RETURNS[activeScenario], phaseOpts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.initialDeposit, p.monthlyDeposit, liveAllocations, activeScenario, track.id],
  );
  const monthlyReturnPct = (Math.pow(1 + weightedReturns[activeScenario] / 100, 1 / 12) - 1) * 100;
  const monthsOfYear = monthlyData.filter(r => r.year === monthlyYear);
  const MONTH_NAMES_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

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
            ? 'הסימולציה מחשבת 40 שנה קדימה — עם נקודות ציון ב-5, 10, 25, 30 ו-40 שנה'
            : 'Simulation projects 40 years — with milestones at 5, 10, 25, 30 & 40 years'}
        </p>
        <p className="text-[10px] text-gold/70 mt-1 flex items-center gap-1.5"><Dot color="green" size={6} />{t('simUsesTrack', lang)}</p>
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
                            {ASSET_META[a.assetClass].label}
                          </div>
                          <div className="text-[9px] text-text-dim font-normal">{ASSET_META[a.assetClass].index}</div>
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
              ? (lang === 'he' ? 'החלוקה תקינה' : 'Allocation valid')
              : (lang === 'he' ? `סה״כ ${totalPct}% — נדרש 100%` : `Total ${totalPct}% — must equal 100%`)}
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

      {/* ── 4b. Monthly simulation (month-by-month) ─────────────────────── */}
      <Card title={lang === 'he' ? 'סימולציה חודשית — חודש אחר חודש' : 'Monthly Simulation — Month by Month'}>
        <div className="flex flex-wrap items-center gap-3 mt-2 mb-4">
          <div className="flex gap-1 bg-surface-3 rounded-xl p-1">
            {scenarioCards.map(s => (
              <button key={s.key} onClick={() => setActiveScenario(s.key)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${activeScenario === s.key ? 'bg-surface-4 text-text' : 'text-text-muted hover:text-text'}`}
                style={activeScenario === s.key ? { color: s.color } : {}}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">{lang === 'he' ? 'שנה:' : 'Year:'}</span>
            <input type="number" min={1} max={30} value={monthlyYear}
              onChange={e => setMonthlyYear(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="w-16 text-center py-1" />
          </div>
          <span className="text-[11px] text-text-dim">
            {lang === 'he' ? 'תשואה חודשית ממוצעת:' : 'Avg monthly return:'}{' '}
            <span className="text-gold font-semibold">{monthlyReturnPct.toFixed(2)}%</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4 text-text-muted text-xs">
                <th className="text-start py-2">{lang === 'he' ? 'חודש' : 'Month'}</th>
                <th className="text-end py-2">{lang === 'he' ? 'שווי תיק' : 'Value'}</th>
                <th className="text-end py-2">{lang === 'he' ? 'הופקד' : 'Deposited'}</th>
                <th className="text-end py-2">{lang === 'he' ? 'רווח' : 'Growth'}</th>
                <th className="text-end py-2">{lang === 'he' ? 'שינוי חודשי' : 'Monthly Δ'}</th>
              </tr>
            </thead>
            <tbody>
              {monthsOfYear.map((r, i) => {
                const prev = i === 0
                  ? (monthlyData[(monthlyYear - 1) * 12 - 1]?.value ?? p.initialDeposit)
                  : monthsOfYear[i - 1].value;
                const delta = r.value - prev;
                return (
                  <tr key={r.m} className="border-b border-surface-3/50">
                    <td className="py-2 text-text-muted">{lang === 'he' ? MONTH_NAMES_HE[r.monthOfYear - 1] : r.monthOfYear}</td>
                    <td className="text-end py-2 font-medium text-gold">{formatCurrency(r.value)}</td>
                    <td className="text-end py-2 text-text-muted">{formatCurrency(r.deposited)}</td>
                    <td className="text-end py-2 text-success">{formatCurrency(r.growth)}</td>
                    <td className={`text-end py-2 ${delta >= 0 ? 'text-success' : 'text-danger'}`}>{delta >= 0 ? '+' : ''}{formatCurrency(delta)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-text-dim mt-3">
          {lang === 'he'
            ? `מציג את 12 החודשים של שנה ${monthlyYear} (${scenarioCards.find(s => s.key === activeScenario)?.label}). ריבית דריבית חודשית — כל הפקדה מרוויחה כבר באותו חודש.`
            : `Showing the 12 months of year ${monthlyYear}. Monthly compounding — each deposit earns from its own month.`}
        </p>
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
                        {ASSET_META[a.assetClass].label}
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
                <th className="text-end py-2 text-xs" style={{ color: '#22c55e' }}>{t('incomeCol', lang)}</th>
                {activeAssets.map(a => (
                  <th key={a.assetClass} className="text-end py-2 text-xs" style={{ color: a.color }}>
                    {ASSET_META[a.assetClass].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simData[activeScenario].filter(r => YEAR_ROWS.includes(r.year)).map(row => {
                const phaseColor = row.phase === 'red' ? '#ef4444' : row.phase === 'yellow' ? '#eab308' : '#22c55e';
                const phaseDot = row.phase === 'red' ? 'red' as const : row.phase === 'yellow' ? 'yellow' as const : 'green' as const;
                return (
                  <tr
                    key={row.year}
                    className="border-b border-surface-3/50"
                    style={{ boxShadow: `inset 2px 0 0 ${phaseColor}66` }}
                  >
                    <td className="py-2 text-text font-medium">
                      <Dot color={phaseDot} size={7} className="mx-1" />
                      {row.year}
                    </td>
                    <td className="text-end py-2 font-medium text-gold">{formatCurrency(row.totalValue)}</td>
                    <td className="text-end py-2 text-text-muted">{formatCurrency(row.totalDeposited)}</td>
                    <td className="text-end py-2 text-success">{formatCurrency(row.totalGrowth)}</td>
                    <td className="text-end py-2 text-xs" style={{ color: row.income ? '#22c55e' : '#444' }}>
                      {row.income ? formatCurrency(row.income) : '—'}
                    </td>
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

      {/* Dividend income simulation */}
      <DividendSimulation />

      <Disclaimer variant="full" />

    </div>
  );
}
