import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { useCustomStore } from '../../store/customStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { createStock, updateStock, deleteStock, reorderStocks } from '../../lib/customStocks';
import type { StockListData } from '../../lib/customStocks';
import type { PriceInfo } from '../../lib/marketData';
import type { CustomStock } from '../../types';
import { SymbolSearch } from './SymbolSearch';

interface Props {
  list: StockListData;
  loading: boolean;
  isAdmin: boolean;
  prices: Record<string, PriceInfo>;
  onReload: () => void;
}

/**
 * The course owner's recommended stock list, shared with every student.
 * Students can pull any row into their own portfolio in one click.
 */
export function SharedStockList({ list, loading, isAdmin, prices, onReload }: Props) {
  const { lang } = useLangStore();
  const { holdings, addHolding } = useCustomStore();
  const [form, setForm] = useState<Partial<CustomStock> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const held = new Set(holdings.map(h => h.ticker.toUpperCase()));

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= list.stocks.length) return;
    const next = list.stocks.slice();
    [next[index], next[target]] = [next[target], next[index]];
    try { await reorderStocks(next.map(s => s.id)); onReload(); }
    catch (e) { alert(String((e as Error).message)); }
  };

  const remove = async (s: CustomStock) => {
    if (!confirm(t('confirmDeleteStock', lang, { ticker: s.ticker }))) return;
    setBusyId(s.id);
    try { await deleteStock(s.id); onReload(); }
    catch (e) { alert(String((e as Error).message)); }
    finally { setBusyId(null); }
  };

  const pull = (s: CustomStock) => {
    addHolding({
      ticker: s.ticker.toUpperCase(),
      name: s.name || s.ticker,
      targetPercent: 0,
      expectedReturn: Number(s.expected_return) || 8,
      currentValue: 0,
      fromAdmin: true,
    });
  };

  return (
    <Card title={t('recommendedList', lang)} subtitle={isAdmin ? t('recommendedSubAdmin', lang) : t('recommendedSub', lang)}>
      {isAdmin && (
        <button
          onClick={() => setForm({ ticker: '', name: '', expected_return: 8, sort_order: list.stocks.length })}
          className="mb-3 text-[11px] btn-gold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
        >
          <Icon name="plus" size={13} /> {t('addStock', lang)}
        </button>
      )}

      {list.error && (
        <div className="mb-3">
          <p className="text-[12px] text-warning flex items-center gap-1.5">
            <Icon name="warning" size={13} /> {t('stockListSetupNeeded', lang)}
          </p>
          <p className="text-[10px] text-text-dim mt-1 font-mono break-all" dir="ltr">{list.error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-text-muted text-center py-4">{t('loading', lang)}</p>
      ) : list.stocks.length === 0 ? (
        <p className="text-[12px] text-text-dim text-center py-4">
          {list.error ? t('stockListUnavailable', lang) : isAdmin ? t('noStocksAdmin', lang) : t('noStocks', lang)}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-surface-4 text-text-muted text-[11px]">
                {isAdmin && <th className="text-start py-2 w-16">{t('order', lang)}</th>}
                <th className="text-start py-2">{t('ticker', lang)}</th>
                <th className="text-end py-2">{t('livePrice', lang)}</th>
                <th className="text-end py-2">{t('expectedReturn', lang)}</th>
                <th className="text-end py-2" />
              </tr>
            </thead>
            <tbody>
              {list.stocks.map((s, i) => {
                const p = prices[s.ticker.toUpperCase()];
                const already = held.has(s.ticker.toUpperCase());
                return (
                  <tr key={s.id} className="border-b border-surface-3/50">
                    {isAdmin && (
                      <td className="py-2">
                        <div className="flex gap-0.5">
                          <button onClick={() => move(i, -1)} disabled={i === 0} title={t('moveUp', lang)}
                            className="w-5 h-5 rounded border border-surface-4 text-text-muted hover:text-gold disabled:opacity-25 flex items-center justify-center">
                            <Icon name="chevronUp" size={11} />
                          </button>
                          <button onClick={() => move(i, 1)} disabled={i === list.stocks.length - 1} title={t('moveDown', lang)}
                            className="w-5 h-5 rounded border border-surface-4 text-text-muted hover:text-gold disabled:opacity-25 flex items-center justify-center">
                            <Icon name="chevronDown" size={11} />
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="py-2">
                      <span className="block text-text font-medium" dir="ltr">{s.ticker}</span>
                      <span className="block text-[10px] text-text-dim truncate max-w-[150px]">{s.name}</span>
                    </td>
                    <td className="py-2 text-end text-[11px]" dir="ltr">
                      {p?.price != null
                        ? <span className="text-text-muted">{p.price.toFixed(2)} {p.currency ?? ''}</span>
                        : <span className="text-text-dim">—</span>}
                      {typeof p?.perf30 === 'number' && (
                        <span className={`block ${p.perf30 >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.perf30 >= 0 ? '+' : ''}{p.perf30}% / 30d
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-end text-text-muted">{Number(s.expected_return).toFixed(1)}%</td>
                    <td className="py-2 text-end">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => pull(s)}
                          disabled={already}
                          className="text-[10px] px-2 py-1 rounded-lg border border-gold-border text-gold hover:bg-gold-muted disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          {already ? t('alreadyAdded', lang) : t('addToMine', lang)}
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => setForm(s)}
                              className="w-6 h-6 rounded-lg border border-surface-4 text-text-muted hover:text-text inline-flex items-center justify-center">
                              <Icon name="pencil" size={11} />
                            </button>
                            <button onClick={() => remove(s)} disabled={busyId === s.id}
                              className="w-6 h-6 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-40 inline-flex items-center justify-center">
                              <Icon name="trash" size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && <StockForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); onReload(); }} />}
    </Card>
  );
}

// ── Add / edit a recommended stock ───────────────────────────────────────────
function StockForm({ initial, onClose, onSaved }: { initial: Partial<CustomStock>; onClose: () => void; onSaved: () => void }) {
  const { lang } = useLangStore();
  const [ticker, setTicker] = useState(initial.ticker ?? '');
  const [name, setName] = useState(initial.name ?? '');
  const [ret, setRet] = useState(String(initial.expected_return ?? 8));
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial.id;

  const save = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) { alert(t('tickerRequired', lang)); return; }
    setBusy(true);
    try {
      const payload = { ticker: sym, name: name.trim(), expected_return: Number(ret) || 0 };
      if (isEdit) await updateStock(initial.id!, payload);
      else await createStock({ ...payload, sort_order: initial.sort_order ?? 0 });
      onSaved();
    } catch (e) { alert(String((e as Error).message)); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md glass-card rounded-2xl p-5" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-bold text-gold-light mb-3">{isEdit ? t('editStock', lang) : t('addStock', lang)}</h3>
        <div className="space-y-3">
          {/* Search by name, so an exact ticker never has to be known. */}
          <SymbolSearch onPick={hit => { setTicker(hit.symbol.toUpperCase()); setName(hit.name); }} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[10px] text-text-muted mb-1">{t('ticker', lang)}</span>
              <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="AAPL" className="w-full" dir="ltr" />
            </label>
            <label className="block">
              <span className="block text-[10px] text-text-muted mb-1">{t('stockName', lang)}</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full" />
            </label>
          </div>
          <label className="block">
            <span className="block text-[10px] text-text-muted mb-1">{t('expectedReturn', lang)}</span>
            <input type="number" step={0.5} value={ret} onChange={e => setRet(e.target.value)} className="w-full" />
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-text px-3 py-1.5">{t('cancel', lang)}</button>
          <button onClick={save} disabled={busy} className="text-xs btn-gold px-4 py-1.5 rounded-lg disabled:opacity-50">
            {busy ? t('saving', lang) : t('save', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
