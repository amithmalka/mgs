import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLangStore } from '../../store/langStore';
import { Card } from '../layout/Card';
import { BOARD, FX } from '../../constants/mgsBoard';
import { fetchPrices } from '../../lib/marketData';
import type { PriceInfo } from '../../lib/marketData';
import { Icon } from '../shared/Icon';
import { MarketBoard } from './MarketBoard';
import type { BoardRow } from './MarketBoard';
import { CandleChart } from './CandleChart';
import { CandleGuide } from './CandleGuide';

const UP = '#34D399';
const DOWN = '#F87171';

/**
 * The market screen.
 *
 * It lists what the method holds and nothing else: the two volatile sleeves,
 * the two core ones, the income engine, the synthetics and the landing index —
 * plus the shekel rate, which is not a holding but is what everything here is
 * quoted against.
 */
function buildBoard(he: boolean): BoardRow[] {
  return [
    { symbol: FX.symbol, label: he ? FX.he : FX.en, sub: FX.sub, color: FX.color },
    ...BOARD.map(a => ({ symbol: a.symbol, label: he ? a.he : a.en, sub: a.sub, color: a.color })),
  ];
}

export function MarketSection() {
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const board = useMemo(() => buildBoard(he), [he]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [focus, setFocus] = useState('BTC/USD');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setPrices(await fetchPrices(board.map(r => r.symbol)));
      setUpdatedAt(new Date().toLocaleTimeString(he ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [board, he]);

  useEffect(() => { refresh(); }, [refresh]);

  const usd = prices['USD/ILS'];
  const focusRow = board.find(r => r.symbol === focus);
  const focusPrice = prices[focus];

  const movers = useMemo(() => board
    .map(r => ({ row: r, p: prices[r.symbol] }))
    .filter(x => typeof x.p?.changePct === 'number')
    .sort((a, b) => Math.abs(b.p!.changePct!) - Math.abs(a.p!.changePct!))
    .slice(0, 4), [board, prices]);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>
      {/* ── Market header ────────────────────────────────────────────────── */}
      <Card glow>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gold-gradient">{he ? 'הלוח החם' : 'The Hot Board'}</h2>
            <p className="text-[12px] text-text-muted mt-1">
              {he ? 'מה קורה בשוק כרגע — מחירים, תנועה יומית ומגמה.' : 'What the market is doing right now.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {updatedAt && <span className="text-[10px] text-text-dim">{he ? 'עודכן' : 'Updated'} {updatedAt}</span>}
            <button onClick={refresh} disabled={loading}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors disabled:opacity-40">
              {loading ? (he ? 'טוען…' : 'Loading…') : (he ? 'רענן' : 'Refresh')}
            </button>
          </div>
        </div>

        {/* Dollar + top movers */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          <div className="rounded-xl bg-surface-3 border border-gold-border px-3 py-2.5">
            <p className="text-[10px] text-text-dim">{he ? 'דולר / שקל' : 'USD / ILS'}</p>
            {typeof usd?.price === 'number' ? (
              <>
                <p className="text-[17px] font-bold text-gold mt-0.5" dir="ltr">₪{usd.price.toFixed(3)}</p>
                {typeof usd.changePct === 'number' && (
                  <p className="text-[10px] font-semibold" dir="ltr"
                     style={{ color: usd.changePct >= 0 ? UP : DOWN }}>
                    {usd.changePct > 0 ? '+' : ''}{usd.changePct.toFixed(2)}% {he ? 'היום' : 'today'}
                  </p>
                )}
              </>
            ) : <p className="text-[17px] font-bold text-text-dim mt-0.5">—</p>}
          </div>

          {movers.map(({ row, p }) => {
            const up = p!.changePct! >= 0;
            return (
              <div key={row.symbol} className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2.5">
                <p className="text-[10px] text-text-dim truncate">{row.label}</p>
                <p className="text-[15px] font-bold mt-0.5" dir="ltr" style={{ color: up ? UP : DOWN }}>
                  {up ? '+' : ''}{p!.changePct!.toFixed(2)}%
                </p>
                <p className="text-[10px] text-text-muted" dir="ltr">
                  {p!.price!.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            );
          })}
        </div>

        {err && (
          <p className="mt-3 text-[11px] text-warning flex items-start gap-1.5">
            <Icon name="warning" size={13} className="mt-0.5" />
            <span>{err}</span>
          </p>
        )}
      </Card>

      {/* ── The board ───────────────────────────────────────────────────── */}
      <Card title={he ? 'כל הנכסים' : 'All instruments'}
            subtitle={he ? 'לחצו על שורה כדי לראות את גרף הנרות שלה.' : 'Click a row to see its candlestick chart.'}>
        <MarketBoard rows={board} prices={prices} onSelect={setFocus} selected={focus} />
      </Card>

      {/* ── Candlestick chart for the selected row ──────────────────────── */}
      {focusRow && (
        <Card
          title={`${he ? 'גרף נרות' : 'Candlestick'} — ${focusRow.label}`}
          subtitle={he ? 'כל נר הוא יום מסחר אחד' : 'Each candle is one trading day'}
        >
          <div className="flex flex-wrap gap-1.5 mb-4">
            {board.map(r => {
              const on = r.symbol === focus;
              const pct = prices[r.symbol]?.changePct;
              return (
                <button key={r.symbol} type="button" onClick={() => setFocus(r.symbol)}
                  aria-pressed={on}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors
                              inline-flex items-center gap-1.5 ${
                    on ? 'border-gold bg-gold-muted text-gold font-semibold'
                       : 'border-surface-4 text-text-muted hover:border-gold-border hover:text-text'}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                  {r.label}
                  {typeof pct === 'number' && (
                    <span className="tabular-nums" dir="ltr"
                          style={{ color: pct >= 0 ? UP : DOWN }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {focusPrice?.candles && focusPrice.candles.length > 1 ? (
            <CandleChart candles={focusPrice.candles} />
          ) : (
            <p className="text-[12px] text-text-dim text-center py-8">
              {focusPrice?.error
                ? <span dir="ltr" className="font-mono">{focusPrice.error}</span>
                : (he ? 'אין נתונים לנכס הזה כרגע.' : 'No data for this instrument right now.')}
            </p>
          )}
        </Card>
      )}

      {/* ── How to read candles ─────────────────────────────────────────── */}
      <CandleGuide />

      <p className="text-[11px] text-text-dim text-center">
        {he ? 'מחירי סוף יום, לא נתוני מסחר חי.' : 'End-of-day prices, not live tick data.'}
      </p>
    </div>
  );
}
