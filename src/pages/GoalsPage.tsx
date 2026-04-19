import { useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { simulateByAsset } from '../utils/math';
import { ASSET_RETURNS, calcWeightedReturn } from '../constants/defaults';

const MILESTONE_YEARS = [5, 10, 15, 20, 25, 30] as const;

export function GoalsPage() {
  const {
    currentPortfolioValue,
    simulationParams,
    allocations,
    transactions,
    getTotalDeposited,
  } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';

  const totalDeposited = getTotalDeposited();
  const actualGrowth = currentPortfolioValue - totalDeposited;
  const depositTxs = transactions.filter(tx => tx.type === 'deposit');
  const depositCount = depositTxs.length;
  const avgDeposit = depositCount > 0
    ? Math.round(depositTxs.reduce((s, tx) => s + tx.amount, 0) / depositCount)
    : simulationParams.monthlyDeposit;

  const weightedModerate = calcWeightedReturn(allocations, 'moderate');

  // Project 30yr — the source of truth for all milestones
  const projections = useMemo(() => {
    const rows = simulateByAsset(
      simulationParams.initialDeposit,
      simulationParams.monthlyDeposit,
      30, 0,
      allocations,
      ASSET_RETURNS.moderate,
    );
    return MILESTONE_YEARS.map(yr => ({
      year: yr,
      row: rows[yr] ?? rows[rows.length - 1],
    }));
  }, [simulationParams.initialDeposit, simulationParams.monthlyDeposit, allocations]);

  // A milestone is "reached" when the current portfolio >= the projected value at that year
  const reachedIndex = projections.findLastIndex(m => currentPortfolioValue >= m.row.totalValue);
  // The "active" milestone is the next one to reach (first locked)
  const nextIndex = reachedIndex + 1;

  // Deposit consistency
  const expectedByNow = simulationParams.monthlyDeposit * depositCount;
  const depositConsistency = expectedByNow > 0
    ? Math.min(100, (totalDeposited / expectedByNow) * 100)
    : 0;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Status bar ───────────────────────────────────────────── */}
      <Card glow>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{lang === 'he' ? 'שווי תיק' : 'Portfolio Value'}</p>
            <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(currentPortfolioValue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{lang === 'he' ? 'סה״כ הופקד' : 'Total Deposited'}</p>
            <p className="text-2xl font-bold text-text mt-1">{formatCurrency(totalDeposited)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{lang === 'he' ? 'רווח שוק' : 'Market Growth'}</p>
            <p className={`text-2xl font-bold mt-1 ${actualGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {actualGrowth >= 0 ? '+' : ''}{formatCurrency(actualGrowth)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{lang === 'he' ? 'הפקדה חודשית' : 'Monthly Deposit'}</p>
            <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(simulationParams.monthlyDeposit)}</p>
            {depositCount > 0 && (
              <p className="text-[9px] text-text-dim mt-0.5">
                {lang === 'he' ? `ממוצע בפועל: ${formatCurrency(avgDeposit)}` : `actual avg: ${formatCurrency(avgDeposit)}`}
              </p>
            )}
          </div>
        </div>

        {/* Consistency bar */}
        {depositCount > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-4">
            <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
              <span>{lang === 'he' ? `עקביות הפקדות · ${depositCount} פעולות` : `Deposit consistency · ${depositCount} actions`}</span>
              <span className={depositConsistency >= 90 ? 'text-success font-bold' : depositConsistency >= 60 ? 'text-warning' : 'text-danger'}>
                {Math.round(depositConsistency)}%
              </span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(3, depositConsistency)}%`,
                  background: depositConsistency >= 90
                    ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : depositConsistency >= 60
                    ? 'linear-gradient(90deg,#f59e0b,#fcd34d)'
                    : 'linear-gradient(90deg,#ef4444,#f87171)',
                }}
              />
            </div>
          </div>
        )}

        {depositCount === 0 && (
          <p className="text-xs text-text-dim mt-3 pt-3 border-t border-surface-4">
            {lang === 'he'
              ? '💡 הוסף פעולות בדף "פעולות" כדי לעקוב אחר קצב ההתקדמות שלך'
              : '💡 Add transactions in the Transactions tab to track your progress rate'}
          </p>
        )}
      </Card>

      {/* ── Milestone roadmap ────────────────────────────────────── */}
      <Card title={lang === 'he' ? 'מפת הדרך — אבני דרך כל 5 שנים' : 'Milestone Roadmap — Every 5 Years'}>
        <p className="text-[11px] text-text-dim mt-1 mb-6">
          {lang === 'he'
            ? `תשואה משוקללת מתונה ${weightedModerate}% · אבן דרך נעולה מתבהרת ברגע שהתיק מגיע לסכום`
            : `Moderate weighted return ${weightedModerate}% · A milestone unlocks once your portfolio reaches its value`}
        </p>

        {/* Connecting line + nodes */}
        <div className="relative">
          {/* Horizontal connecting line (desktop) */}
          <div className="hidden md:block absolute top-[2.75rem] inset-x-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,0.1))' }}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
            {projections.map(({ year, row }, i) => {
              const reached   = currentPortfolioValue >= row.totalValue;
              const isNext    = i === nextIndex;
              const remaining = Math.max(0, row.totalValue - currentPortfolioValue);
              const progress  = Math.min(100, (currentPortfolioValue / row.totalValue) * 100);
              const xFactor   = simulationParams.initialDeposit > 0
                ? (row.totalValue / simulationParams.initialDeposit).toFixed(1)
                : null;

              return (
                <div key={year} className="relative flex flex-col items-center text-center">
                  {/* Milestone node */}
                  <div
                    className={`relative z-10 w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 mb-3 ${
                      reached
                        ? 'border-gold bg-gold-muted shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                        : isNext
                        ? 'border-gold/50 bg-surface-3 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                        : 'border-surface-4 bg-surface-3 opacity-50'
                    }`}
                  >
                    {reached ? (
                      <span className="text-gold text-xl font-bold">✓</span>
                    ) : (
                      <>
                        <span className={`text-[9px] uppercase tracking-wider ${isNext ? 'text-gold/70' : 'text-text-dim'}`}>
                          {lang === 'he' ? 'שנה' : 'yr'}
                        </span>
                        <span className={`text-lg font-bold leading-none ${isNext ? 'text-gold' : 'text-text-dim'}`}>
                          {year}
                        </span>
                      </>
                    )}
                    {reached && (
                      <span className="absolute -top-1 -end-1 text-[9px] bg-gold text-surface rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {year}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div
                    className={`w-full rounded-xl p-3 border transition-all duration-500 ${
                      reached
                        ? 'bg-gold-muted border-gold/30'
                        : isNext
                        ? 'bg-surface-3 border-gold/20'
                        : 'bg-surface-3/50 border-surface-4/50 opacity-60'
                    }`}
                  >
                    <p className={`text-lg font-bold ${reached ? 'text-gold' : isNext ? 'text-gold' : 'text-text-dim'}`}>
                      {formatCurrency(row.totalValue)}
                    </p>
                    <p className="text-[9px] text-text-dim mt-0.5">
                      {lang === 'he' ? 'הפקדות:' : 'deposited:'} {formatCurrency(row.totalDeposited)}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${reached ? 'text-success' : 'text-text-dim'}`}>
                      +{formatCurrency(row.totalGrowth)}
                      {xFactor && <span className="mr-1 ml-1 text-[9px]">({xFactor}x)</span>}
                    </p>

                    {/* Progress toward this milestone */}
                    {!reached && (
                      <>
                        <div className="mt-2 h-1 bg-surface-4 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(2, progress)}%`,
                              background: isNext
                                ? 'linear-gradient(90deg,#B8941F,#D4AF37)'
                                : 'rgba(212,175,55,0.2)',
                            }}
                          />
                        </div>
                        <p className="text-[9px] text-text-dim mt-1">
                          {isNext
                            ? (lang === 'he' ? `עוד ${formatCurrency(remaining)} · ${Math.round(progress)}%` : `${formatCurrency(remaining)} to go · ${Math.round(progress)}%`)
                            : (lang === 'he' ? `🔒 ${formatCurrency(remaining)} לפתיחה` : `🔒 ${formatCurrency(remaining)} to unlock`)}
                        </p>
                      </>
                    )}

                    {reached && (
                      <p className="text-[9px] text-gold mt-1 font-medium">
                        {lang === 'he' ? '✓ הושג!' : '✓ Reached!'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-surface-4 flex flex-wrap gap-4 text-[10px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gold-muted border border-gold" />
            {lang === 'he' ? 'הושג — התיק הגיע לסכום' : 'Reached — portfolio hit this value'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-gold/50 bg-surface-3" />
            {lang === 'he' ? 'היעד הבא' : 'Next target'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-surface-4 bg-surface-3 opacity-50" />
            {lang === 'he' ? 'נעול' : 'Locked'}
          </span>
        </div>
      </Card>

      {/* ── Recent deposits ──────────────────────────────────────── */}
      {depositCount > 0 && (
        <Card title={lang === 'he' ? 'הפקדות אחרונות' : 'Recent Deposits'}>
          <div className="space-y-1 mt-2">
            {depositTxs.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-surface-3/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-[10px] text-success font-bold">↑</span>
                  <div>
                    <p className="text-xs text-text">{tx.notes || (lang === 'he' ? 'הפקדה' : 'Deposit')}</p>
                    <p className="text-[9px] text-text-dim">{tx.date}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-success">+{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
