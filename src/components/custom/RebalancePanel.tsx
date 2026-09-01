import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { useCustomStore } from '../../store/customStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { formatCurrency } from '../../utils/format';
import { calcCustomRebalance } from '../../utils/customPortfolio';

/**
 * Where the next deposit should go. Routes money into under-weighted holdings
 * so the portfolio drifts back toward target without ever selling.
 */
export function RebalancePanel() {
  const { lang } = useLangStore();
  const { holdings, monthlyDeposit } = useCustomStore();
  const [amount, setAmount] = useState(monthlyDeposit);

  const rows = calcCustomRebalance(amount, holdings);
  const anyTargets = holdings.some(h => h.targetPercent > 0);

  return (
    <Card title={t('rebalanceTitle', lang)} subtitle={t('rebalanceSub', lang)}>
      <label className="block mb-4 max-w-[240px]">
        <span className="block text-[10px] text-text-muted mb-1">{t('depositToSplit', lang)}</span>
        <input type="number" min={0} step={100} value={amount}
          onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))} className="w-full" />
      </label>

      {!anyTargets ? (
        <p className="text-[12px] text-text-dim text-center py-4">{t('setTargetsFirst', lang)}</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-3 border border-surface-4">
              <div className="min-w-0 flex-1">
                <span className="block text-sm text-text" dir="ltr">{r.ticker}</span>
                <span className="block text-[10px] text-text-dim">
                  {t('currentVsTarget', lang, {
                    current: r.currentPercent.toFixed(1),
                    target: r.targetPercent.toFixed(1),
                  })}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                r.underweight ? 'bg-success/15 text-success' : 'bg-surface-4 text-text-dim'
              }`}>
                {r.underweight ? `+${r.deviation.toFixed(1)}%` : `${r.deviation.toFixed(1)}%`}
              </span>
              <span className="text-sm font-bold text-gold w-24 text-end flex-shrink-0">
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-text-dim mt-3">{t('rebalanceNote', lang)}</p>
    </Card>
  );
}
