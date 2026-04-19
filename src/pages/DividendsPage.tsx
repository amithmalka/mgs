import { useState } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { DividendChart } from '../components/charts/DividendChart';
import { fourPercentRule, futureValue } from '../utils/math';
import { formatCurrency } from '../utils/format';

export function DividendsPage() {
  const { currentPortfolioValue, transitionThreshold, setTransitionThreshold } = useStore();
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

  const transitionSteps = [
    { pct: 0, label: t('currentGrowth', lang) },
    { pct: 10, label: `${t('phase', lang)} 1` },
    { pct: 20, label: `${t('phase', lang)} 2` },
    { pct: 30, label: `${t('phase', lang)} 3` },
    { pct: 50, label: `${t('phase', lang)} 4` },
  ];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
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

      <Card title={t('transitionTitle', lang)} subtitle={t('transitionSubtitle', lang)}>
        <div className="flex items-center gap-3 mt-2 mb-4">
          <label className="text-xs text-text-muted">{t('transitionAt', lang)}:</label>
          <input type="number" value={transitionThreshold} onChange={e => setTransitionThreshold(Number(e.target.value))} className="w-40" />
          <span className="text-xs text-text-dim">₪</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4">
                <th className="text-start py-2 text-text-muted text-xs">{t('phase', lang)}</th>
                <th className="text-end py-2 text-text-muted text-xs">S&P</th>
                <th className="text-end py-2 text-text-muted text-xs">Nasdaq</th>
                <th className="text-end py-2 text-text-muted text-xs">BTC</th>
                <th className="text-end py-2 text-text-muted text-xs">Int'l</th>
                <th className="text-end py-2 text-text-muted text-xs">{t('gold', lang)}</th>
                <th className="text-end py-2 text-gold text-xs">{t('dividendEtf', lang)}</th>
              </tr>
            </thead>
            <tbody>
              {transitionSteps.map(step => {
                const r = (100 - step.pct) / 100;
                return (
                  <tr key={step.pct} className="border-b border-surface-3/50">
                    <td className="py-2 font-medium text-text">{step.label}</td>
                    <td className="text-end py-2 text-text-muted">{Math.round(30 * r)}%</td>
                    <td className="text-end py-2 text-text-muted">{Math.round(30 * r)}%</td>
                    <td className="text-end py-2 text-text-muted">{Math.round(15 * r)}%</td>
                    <td className="text-end py-2 text-text-muted">{Math.round(15 * r)}%</td>
                    <td className="text-end py-2 text-text-muted">{Math.round(10 * r)}%</td>
                    <td className="text-end py-2 text-gold font-bold">{step.pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-gold-muted rounded-xl text-xs text-gold border border-gold-border">
          {t('transitionNote', lang, { amount: formatCurrency(transitionThreshold) })}
        </div>
      </Card>
    </div>
  );
}
