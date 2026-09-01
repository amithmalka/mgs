import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { useCustomStore } from '../../store/customStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { formatCurrency } from '../../utils/format';
import { calcCustomRebalance } from '../../utils/customPortfolio';
import type { PriceInfo } from '../../lib/marketData';

/**
 * Where the next deposit should go. Routes money toward whatever is trading
 * furthest below its recent peak, while still converging on the student's
 * target weights — and never suggests selling.
 */
export function RebalancePanel({ prices }: { prices: Record<string, PriceInfo> }) {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { holdings, monthlyDeposit } = useCustomStore();
  const [amount, setAmount] = useState(monthlyDeposit);

  const rows = calcCustomRebalance(amount, holdings, prices);
  const anyTargets = holdings.some(h => h.targetPercent > 0);
  const cheapest = rows.find(r => r.cheapest);
  const anyDiscount = rows.some(r => r.dipBoosted);

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
        <>
          {/* Headline: the month's biggest buy */}
          {cheapest && (
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 mb-4">
              <p className="text-[11px] text-text-muted">{t('cheapestThisMonth', lang)}</p>
              <p className="text-[15px] font-bold text-success mt-0.5" dir="ltr">
                {cheapest.ticker} · −{cheapest.discount.toFixed(1)}%
              </p>
              <p className="text-[11px] text-text-dim mt-0.5">
                {t('cheapestExplain', lang, {
                  ticker: cheapest.ticker,
                  discount: cheapest.discount.toFixed(1),
                  amount: formatCurrency(cheapest.amount),
                })}
              </p>
            </div>
          )}

          {!anyDiscount && (
            <p className="text-[11px] text-text-dim mb-3 flex items-start gap-1.5">
              <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
              {t('noDiscountNote', lang)}
            </p>
          )}

          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                r.cheapest ? 'bg-success/[0.06] border-success/25' : 'bg-surface-3 border-surface-4'
              }`}>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm text-text">
                    <span dir="ltr">{r.ticker}</span>
                    {r.cheapest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success flex-shrink-0">
                        {t('mostDiscounted', lang)}
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] text-text-dim mt-0.5">
                    {t('currentVsTarget', lang, {
                      current: r.currentPercent.toFixed(1),
                      target: r.targetPercent.toFixed(1),
                    })}
                    {r.price != null && (
                      <span dir="ltr"> · {r.price.toFixed(2)} {r.currency ?? ''}</span>
                    )}
                  </span>
                </div>

                {/* How far below its recent peak */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                  r.dipBoosted ? 'bg-danger/15 text-danger' : 'bg-surface-4 text-text-dim'
                }`}>
                  {r.dipBoosted ? `−${r.discount.toFixed(1)}%` : t('atPeak', lang)}
                </span>

                <span className="text-sm font-bold text-gold w-24 text-end flex-shrink-0">
                  {formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[10px] text-text-dim mt-3">{t('rebalanceNote', lang)}</p>
      <p className="text-[10px] text-text-dim mt-1">
        {he
          ? 'ההנחה נמדדת מול השיא של 30 הימים האחרונים. ירידה במחיר אינה ערובה לעלייה — נכס יכול להמשיך לרדת.'
          : 'The discount is measured against the last 30 days’ peak. A lower price is no guarantee of a rise.'}
      </p>
    </Card>
  );
}
