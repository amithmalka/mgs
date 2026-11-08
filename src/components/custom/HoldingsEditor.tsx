import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { useCustomStore } from '../../store/customStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { Rows } from '../shared/Rows';
import { formatCurrency } from '../../utils/format';
import { fetchHistory } from '../../lib/marketData';
import type { PriceInfo, HistoryInfo, SymbolHit } from '../../lib/marketData';
import { SymbolSearch } from './SymbolSearch';
import { seedReturn, clampReturn } from './seedReturn';


/** The student's own stock list: weights, expected returns and amounts held. */
export function HoldingsEditor({ prices, history }: {
  prices: Record<string, PriceInfo>;
  history: Record<string, HistoryInfo>;
}) {
  const { lang } = useLangStore();
  const {
    holdings, addHolding, updateHolding, removeHolding, moveHolding,
    distributeEvenly, monthlyDeposit, setMonthlyDeposit, horizonYears, setHorizonYears,
  } = useCustomStore();

  const [err, setErr] = useState('');

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalTarget = holdings.reduce((s, h) => s + h.targetPercent, 0);

  const [adding, setAdding] = useState(false);

  const add = async (hit: SymbolHit) => {
    const sym = hit.symbol.trim().toUpperCase();
    setErr('');
    if (!sym) { setErr(t('tickerRequired', lang)); return; }
    if (holdings.some(h => h.ticker.toUpperCase() === sym)) { setErr(t('tickerExists', lang, { ticker: sym })); return; }

    // Seed from the asset's REAL long-run return. Annualising a single month
    // (the old behaviour) turned one random month into a decades-long forecast.
    setAdding(true);
    let seeded = { value: 8, basis: 'default' };
    try {
      const h = await fetchHistory([sym], 10);
      if (h[sym]?.error) { setErr(t('noHistoryFor', lang, { ticker: sym })); }
      seeded = seedReturn(h[sym]);
    } catch { /* keep the 8% fallback */ }
    finally { setAdding(false); }

    addHolding({
      ticker: sym,
      name: hit.name || sym,
      targetPercent: 0,
      expectedReturn: clampReturn(seeded.value),
      currentValue: 0,
    });
  };

  return (
    <Card title={t('myHoldings', lang)} subtitle={t('myHoldingsSub', lang)}>
      {/* Plan inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <label className="block">
          <span className="block text-[10px] text-text-muted mb-1">{t('monthlyDepositLabel', lang)}</span>
          <input type="number" min={0} step={100} value={monthlyDeposit}
            onChange={e => setMonthlyDeposit(Number(e.target.value) || 0)} className="w-full" />
        </label>
        <label className="block">
          <span className="block text-[10px] text-text-muted mb-1">{t('horizonYears', lang)}</span>
          <input type="number" min={1} max={50} value={horizonYears}
            onChange={e => setHorizonYears(Number(e.target.value) || 1)} className="w-full" />
        </label>
      </div>

      {/* Add an asset — searched by name, so a ticker need not be known */}
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <SymbolSearch onPick={add} busy={adding} />
      </div>
      {err && <p className="text-[11px] text-danger mb-3">{err}</p>}

      {holdings.length === 0 ? (
        <p className="text-[12px] text-text-dim text-center py-6">{t('noHoldings', lang)}</p>
      ) : (
        <>
          <Rows
            cols={[
              { k: 'ord', label: t('order', lang) },
              { k: 'tk', label: t('ticker', lang), lead: true },
              { k: 'px', label: t('livePrice', lang), ltr: true },
              { k: 'target', label: t('targetPercent', lang) },
              { k: 'hist', label: t('historicalReturn', lang), ltr: true },
              { k: 'exp', label: t('expectedReturn', lang) },
              { k: 'held', label: t('heldNow', lang) },
              { k: 'actual', label: t('actualPercent', lang), ltr: true },
              { k: 'del', label: '' },
            ]}
            rows={holdings.map((h, i) => {
              const p = prices[h.ticker.toUpperCase()];
              const hist = history[h.ticker.toUpperCase()];
              const seeded = seedReturn(hist);
              const hasHist = seeded.basis !== 'default';
              const actual = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
              return {
                id: h.id,
                cells: {
                  ord: (
                    <div className="flex gap-0.5">
                      <button onClick={() => moveHolding(i, -1)} disabled={i === 0} title={t('moveUp', lang)}
                        className="w-5 h-5 rounded border border-surface-4 text-text-muted hover:text-gold disabled:opacity-25 flex items-center justify-center">
                        <Icon name="chevronUp" size={11} />
                      </button>
                      <button onClick={() => moveHolding(i, 1)} disabled={i === holdings.length - 1} title={t('moveDown', lang)}
                        className="w-5 h-5 rounded border border-surface-4 text-text-muted hover:text-gold disabled:opacity-25 flex items-center justify-center">
                        <Icon name="chevronDown" size={11} />
                      </button>
                    </div>
                  ),
                  tk: (
                    <>
                      <span className="block text-text font-medium" dir="ltr">{h.ticker}</span>
                      <span className="block text-[10px] text-text-dim truncate max-w-[130px]">{h.name}</span>
                    </>
                  ),
                  px: (
                    <span className="block text-[11px]">
                      {p?.price != null
                        ? <span className="text-text-muted">{p.price.toFixed(2)} {p.currency ?? ''}</span>
                        : <span className="text-text-dim">—</span>}
                      {typeof p?.perf30 === 'number' && (
                        <span className={`block ${p.perf30 >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.perf30 >= 0 ? '+' : ''}{p.perf30}% / 30d
                        </span>
                      )}
                    </span>
                  ),
                  target: (
                    <input type="number" min={0} max={100} step={0.5} value={h.targetPercent}
                      id={`he-target-${h.id}`} aria-label={t('targetPercent', lang)}
                      onChange={e => updateHolding(h.id, { targetPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      className="w-[70px] text-end" />
                  ),
                  hist: hasHist ? (
                    <span className="block text-[11px]">
                      <span style={{ color: seeded.value >= 0 ? '#4ADE80' : '#F87171' }}>
                        {seeded.value > 0 ? '+' : ''}{seeded.value.toFixed(1)}%
                      </span>
                      <span className="block text-text-dim">{seeded.basis}</span>
                      {clampReturn(seeded.value) !== h.expectedReturn && (
                        <button
                          onClick={() => updateHolding(h.id, { expectedReturn: clampReturn(seeded.value) })}
                          className="mt-0.5 text-[9px] px-1.5 py-0.5 rounded border border-gold-border text-gold hover:bg-gold-muted"
                        >
                          {t('useHistorical', lang)}
                        </button>
                      )}
                    </span>
                  ) : <span className="text-text-dim">—</span>,
                  exp: (
                    <input type="number" min={-50} max={40} step={0.5} value={h.expectedReturn}
                      id={`he-exp-${h.id}`} aria-label={t('expectedReturn', lang)}
                      onChange={e => updateHolding(h.id, { expectedReturn: Number(e.target.value) || 0 })}
                      className="w-[70px] text-end" />
                  ),
                  held: (
                    <input type="number" min={0} step={100} value={h.currentValue}
                      id={`he-held-${h.id}`} aria-label={t('heldNow', lang)}
                      onChange={e => updateHolding(h.id, { currentValue: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-[95px] text-end" />
                  ),
                  actual: <span className="text-[11px] text-text-muted">{actual.toFixed(1)}%</span>,
                  del: (
                    <button onClick={() => removeHolding(h.id)} title={t('delete', lang)}
                      className="w-6 h-6 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 inline-flex items-center justify-center">
                      <Icon name="trash" size={12} />
                    </button>
                  ),
                },
              };
            })}
            total={{
              label: t('total', lang),
              value: (
                <>
                  <span className={Math.abs(totalTarget - 100) > 0.5 ? 'text-warning' : 'text-success'}>
                    {totalTarget.toFixed(1)}%
                  </span>
                  {' · '}
                  <span className="text-gold">{formatCurrency(totalValue)}</span>
                </>
              ),
            }}
          />

          <p className="text-[10px] text-text-dim mt-3 leading-relaxed">{t('historyNote', lang)}</p>

          <button onClick={distributeEvenly}
            className="mt-3 text-[11px] px-3 py-1.5 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors">
            {t('distributeEvenly', lang)}
          </button>
        </>
      )}
    </Card>
  );
}
