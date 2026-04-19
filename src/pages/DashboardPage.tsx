import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { AllocationPie } from '../components/charts/AllocationPie';
import { formatCurrency, formatPercent } from '../utils/format';

export function DashboardPage() {
  const { allocations, currentPortfolioValue, monthlyDeposit, phase, goal, getTotalDeposited, getProfit, notifications } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';

  const totalDeposited = getTotalDeposited();
  const profit = getProfit();
  const progress = goal.targetAmount > 0 ? (currentPortfolioValue / goal.targetAmount) * 100 : 0;
  const unread = notifications.filter(n => !n.read).length;

  const phaseKey = { growth: 'growthPhase', transition: 'transitionPhase', income: 'incomePhase' } as const;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-gold-muted text-gold border border-gold-border">
          {t(phaseKey[phase], lang)}
        </span>
        {unread > 0 && (
          <span className="bg-danger/20 text-danger text-xs px-2.5 py-1 rounded-full border border-danger/30">
            {unread} {t('alerts', lang)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('portfolioValue', lang), value: formatCurrency(currentPortfolioValue), accent: true },
          { label: t('totalDeposits', lang), value: formatCurrency(totalDeposited) },
          { label: t('totalProfit', lang), value: formatCurrency(profit), color: profit >= 0 ? 'text-success' : 'text-danger' },
          { label: t('monthlyDeposit', lang), value: formatCurrency(monthlyDeposit) },
        ].map((item, i) => (
          <Card key={i} glow={item.accent} float={item.accent}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted">{item.label}</p>
            <p className={`text-2xl font-bold mt-2 ${item.color ?? (item.accent ? 'text-gold-gradient' : 'text-text')}`}>
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <Card title={t('progressToTarget', lang)} subtitle={`${t('target', lang)}: ${formatCurrency(goal.targetAmount)}`}>
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gold">{formatPercent(Math.min(100, progress))}</span>
            <span className="text-text-dim">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="w-full bg-surface-4 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700 progress-gold"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title={t('targetAllocation', lang)}>
          <AllocationPie allocations={allocations} mode="target" />
        </Card>
        <Card title={t('currentAllocation', lang)}>
          <AllocationPie allocations={allocations} mode="current" />
        </Card>
      </div>

      <Card title={t('allocationBreakdown', lang)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted font-medium text-xs">{t('asset', lang)}</th>
                <th className="text-end py-2 text-text-muted font-medium text-xs">{t('target', lang)}</th>
                <th className="text-end py-2 text-text-muted font-medium text-xs">{t('current', lang)}</th>
                <th className="text-end py-2 text-text-muted font-medium text-xs">{t('value', lang)}</th>
                <th className="text-end py-2 text-text-muted font-medium text-xs">{t('drift', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {allocations.filter(a => a.targetPercent > 0 || a.currentValue > 0).map(a => {
                const currentPct = currentPortfolioValue > 0 ? (a.currentValue / currentPortfolioValue) * 100 : 0;
                const drift = currentPct - a.targetPercent;
                return (
                  <tr key={a.assetClass} className="border-b border-surface-3/50">
                    <td className="py-2.5 flex items-center gap-2 text-text">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.label}
                    </td>
                    <td className="text-end py-2.5 text-text-muted">{formatPercent(a.targetPercent)}</td>
                    <td className="text-end py-2.5 text-text">{formatPercent(currentPct)}</td>
                    <td className="text-end py-2.5 text-text">{formatCurrency(a.currentValue)}</td>
                    <td className={`text-end py-2.5 font-medium ${Math.abs(drift) < 2 ? 'text-success' : drift > 0 ? 'text-warning' : 'text-danger'}`}>
                      {drift > 0 ? '+' : ''}{formatPercent(drift)}
                    </td>
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
