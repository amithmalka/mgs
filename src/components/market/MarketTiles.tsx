import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLangStore } from '../../store/langStore';
import { ASSET_META } from '../../constants/defaults';
import { fetchPrices } from '../../lib/marketData';
import type { PriceInfo } from '../../lib/marketData';
import { Icon } from '../shared/Icon';

interface Tile { symbol: string; label: string; sub: string; color: string }

/** The same eight the board shows, kept at eight for the data plan's budget. */
function tiles(he: boolean): Tile[] {
  const a = (k: keyof typeof ASSET_META): Tile => ({
    symbol: ASSET_META[k].proxyTicker,
    label: he ? ASSET_META[k].label : ASSET_META[k].index,
    sub: ASSET_META[k].index,
    color: ASSET_META[k].color,
  });
  return [
    { symbol: 'USD/ILS', label: he ? 'דולר / שקל' : 'USD / ILS', sub: 'FX', color: '#D4AF37' },
    a('p500'), a('eqqs'), a('xmwo'), a('dbxb'),
    { symbol: 'BTC/USD', label: he ? 'ביטקוין' : 'Bitcoin', sub: 'Crypto', color: '#F59E0B' },
    { symbol: 'GLD', label: he ? 'זהב' : 'Gold', sub: 'SPDR Gold', color: '#FFD700' },
    { symbol: 'SCHD', label: he ? 'דיבידנדים' : 'Dividends', sub: 'Schwab', color: '#F472B6' },
  ];
}

const fmt = (v?: number) =>
  v === undefined ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 3 : 2 });

/**
 * The market as a grid of tiles for the home page: name, price and the day's
 * move, large enough to read at a glance. The full board, the candles and the
 * guide stay on their own screen.
 */
export function MarketTiles() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const list = useMemo(() => tiles(he), [he]);

  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [at, setAt] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setPrices(await fetchPrices(list.map(t => t.symbol)));
      setAt(new Date().toLocaleTimeString(he ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [list, he]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">
          {he ? 'הלוח החם' : 'The board'}
          {at && <span className="text-[10px] text-text-dim font-normal mr-2">{he ? 'עודכן' : 'at'} {at}</span>}
        </h3>
        <button onClick={() => void refresh()} disabled={loading}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-surface-4 text-text-muted
                     hover:border-gold-border hover:text-text disabled:opacity-50
                     inline-flex items-center gap-1.5">
          <Icon name="chart" size={11} />{loading ? (he ? 'טוען…' : 'Loading…') : (he ? 'רענן' : 'Refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {list.map(t => {
          const p = prices[t.symbol];
          const pct = p?.changePct;
          const tone = pct === undefined ? 'text-text-dim'
                     : pct >= 0 ? 'text-success' : 'text-danger';
          return (
            <div key={t.symbol}
                 className="bg-surface-2 border border-surface-4 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="text-[11.5px] text-text truncate">{t.label}</span>
              </div>
              <span className="text-[17px] font-semibold text-text tabular-nums leading-none" dir="ltr">
                {fmt(p?.price)}
              </span>
              <span className={`text-[11px] font-semibold tabular-nums ${tone}`} dir="ltr">
                {pct === undefined ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                {p?.perf30 !== undefined && (
                  <span className="text-text-dim font-normal">
                    {'  '}· 30{he ? 'י' : 'd'} {p.perf30 >= 0 ? '+' : ''}{p.perf30.toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {err && (
        <p className="text-[11px] text-warning flex items-center gap-1.5">
          <Icon name="warning" size={11} />{err}
        </p>
      )}
      <p className="text-[10px] text-text-dim">
        {he ? 'מחירי סוף יום, לא נתוני מסחר חי.' : 'End-of-day prices, not live quotes.'}
      </p>
    </div>
  );
}
