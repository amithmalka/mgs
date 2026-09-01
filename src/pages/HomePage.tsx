import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { ASSET_META } from '../constants/defaults';
import { getTrackById, recommendTrackByAge } from '../constants/tracks';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { smartDeposit } from '../utils/smartDeposit';
import { Icon, Dot } from '../components/shared/Icon';
import { MarketBoard } from '../components/market/MarketBoard';
import type { BoardRow } from '../components/market/MarketBoard';
import { CandleChart } from '../components/market/CandleChart';
import { CandleGuide } from '../components/market/CandleGuide';

const UP = '#34D399';
const DOWN = '#F87171';

/**
 * The market board. Kept at 8 symbols on purpose: Twelve Data's free tier
 * bills one credit per symbol against an ~8/minute budget, so a wider board
 * would rate-limit itself on every refresh.
 */
function buildBoard(he: boolean): BoardRow[] {
  const asset = (k: keyof typeof ASSET_META): BoardRow => ({
    symbol: ASSET_META[k].proxyTicker,
    label: he ? ASSET_META[k].label : ASSET_META[k].index,
    sub: ASSET_META[k].index,
    color: ASSET_META[k].color,
  });
  return [
    { symbol: 'USD/ILS', label: he ? 'דולר / שקל' : 'USD / ILS', sub: 'FX', color: '#D4AF37' },
    asset('p500'),
    asset('eqqs'),
    asset('xmwo'),
    asset('dbxb'),
    { symbol: 'BTC/USD', label: he ? 'ביטקוין' : 'Bitcoin', sub: 'Crypto', color: '#F59E0B' },
    { symbol: 'GLD', label: he ? 'זהב' : 'Gold', sub: 'SPDR Gold', color: '#FFD700' },
    { symbol: 'SCHD', label: he ? 'דיבידנדים' : 'Dividends', sub: 'Schwab Dividend', color: '#F472B6' },
  ];
}

export function HomePage() {
  const {
    allocations, currentPortfolioValue, simulationParams, setMonthlyDeposit,
    userAge, setUserAge, selectedTrackId, setSelectedTrack, goal, getProfit,
  } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const track = getTrackById(selectedTrackId);
  const recommendedId = recommendTrackByAge(userAge);
  const deposit = simulationParams.monthlyDeposit;
  const profit = getProfit();
  const progress = goal.targetAmount > 0 ? Math.min(100, (currentPortfolioValue / goal.targetAmount) * 100) : 0;

  const board = useMemo(() => buildBoard(he), [he]);
  const active = useMemo(() => allocations.filter(a => a.targetPercent > 0), [allocations]);

  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [focus, setFocus] = useState('SPY');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const data = await fetchPrices(board.map(r => r.symbol));
      setPrices(data);
      setUpdatedAt(new Date().toLocaleTimeString(he ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [board, he]);

  useEffect(() => { refresh(); }, [refresh]);

  // The buy plan reads prices keyed by asset class, not by ticker.
  const pricesByAsset = useMemo(() => {
    const out: Record<string, PriceInfo> = {};
    active.forEach(a => { out[a.assetClass] = prices[ASSET_META[a.assetClass].proxyTicker] ?? {}; });
    return out;
  }, [active, prices]);

  const buys = useMemo(() => smartDeposit(deposit, allocations, pricesByAsset), [deposit, allocations, pricesByAsset]);
  const anyLive = Object.values(prices).some(p => typeof p?.price === 'number');

  const usd = prices['USD/ILS'];
  const focusRow = board.find(r => r.symbol === focus);
  const focusPrice = prices[focus];

  // Biggest movers today, for the headline strip.
  const movers = useMemo(() => {
    return board
      .map(r => ({ row: r, p: prices[r.symbol] }))
      .filter(x => typeof x.p?.changePct === 'number')
      .sort((a, b) => Math.abs(b.p!.changePct!) - Math.abs(a.p!.changePct!))
      .slice(0, 4);
  }, [board, prices]);

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

      {/* ── Your plan ───────────────────────────────────────────────────── */}
      <Card>
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">{he ? 'המסלול שלך' : 'Your plan'}</p>
        <h2 className="text-2xl font-bold text-gold-gradient mt-1 flex items-center">
          <Dot color={track.dot} size={12} className="me-2" />{he ? track.nameHe : track.nameEn}
        </h2>
        <p className="text-[13px] text-text-muted mt-1">{he ? track.taglineHe : track.taglineEn}</p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs text-text-muted">{he ? 'הגיל שלי:' : 'My age:'}</label>
          <input type="number" min={18} max={80} value={userAge}
            onChange={e => setUserAge(Number(e.target.value) || 0)} className="w-20 text-center" />
          {recommendedId !== selectedTrackId && (
            <button onClick={() => setSelectedTrack(recommendedId)} className="text-[11px] text-gold underline">
              {he ? `מומלץ לגילך: ${getTrackById(recommendedId).nameHe} — בחר` : 'Use recommended'}
            </button>
          )}
        </div>
      </Card>

      {/* ── Portfolio value ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">{he ? 'שווי התיק שלי' : 'My portfolio'}</p>
          <p className="text-3xl font-bold text-gold-gradient mt-1.5">{formatCurrency(currentPortfolioValue)}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">{he ? 'רווח עד היום' : 'Profit so far'}</p>
          <p className={`text-3xl font-bold mt-1.5 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(profit)}</p>
        </Card>
      </div>

      {/* ── THE monthly action ──────────────────────────────────────────── */}
      <Card glow title={he ? 'מה לקנות החודש' : 'What to buy this month'}>
        <div className="flex items-center gap-3 mt-1 mb-4 flex-wrap">
          <span className="text-sm text-text-muted">{he ? 'סכום ההפקדה החודשית:' : 'Monthly deposit:'}</span>
          <input type="number" value={deposit || ''} onChange={e => setMonthlyDeposit(Number(e.target.value) || 0)}
            className="w-28 text-center font-semibold" />
          <span className="text-xs text-text-dim">₪</span>
        </div>

        {deposit > 0 ? (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {anyLive
                ? (he ? 'המערכת מגדילה קנייה בנכסים שירדו החודש — לנצל את ההנחה ולמקסם את העלייה הבאה:' : 'We buy more of what dropped — to maximise the discount:')
                : (he ? 'הפקידו וחלקו כך (לפי היעד):' : 'Deposit and split like this:')}
            </p>
            <div className="space-y-2">
              {buys.filter(b => b.amount > 0).map(b => (
                <div key={b.assetClass} className={`flex items-center justify-between p-3.5 rounded-xl border ${b.dipBoosted ? 'bg-danger/[0.06] border-danger/25' : 'bg-surface-3 border-surface-4'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ASSET_META[b.assetClass].color }} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-text block truncate">{b.label}</span>
                      <span className="text-[10px] text-text-dim font-mono">{b.ticker}{typeof b.perf30 === 'number' && <span className={b.perf30 < 0 ? 'text-danger' : 'text-success'}> · {b.perf30 > 0 ? '+' : ''}{b.perf30}%</span>}</span>
                    </div>
                    {b.dipBoosted && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-danger/15 text-danger flex-shrink-0">{he ? 'ירד — קונים יותר' : 'dip'}</span>}
                  </div>
                  <span className="text-lg font-bold text-gold flex-shrink-0">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-dim mt-3 flex items-center">
              <Icon name="bulb" size={13} className="me-1.5" />{he ? 'פשוט קנו את הסכומים האלה בחשבון ההשקעות. אין צורך למכור כלום.' : 'Just buy these amounts. No need to sell anything.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">{he ? 'הזינו סכום הפקדה חודשי כדי לראות בדיוק מה לקנות.' : 'Enter a monthly deposit.'}</p>
        )}
      </Card>

      {/* ── Progress to goal ────────────────────────────────────────────── */}
      {goal.targetAmount > 0 && (
        <Card title={he ? 'הדרך ליעד שלך' : 'Progress to your goal'}
              subtitle={`${he ? 'יעד' : 'Target'}: ${formatCurrency(goal.targetAmount)}`}>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gold">{progress.toFixed(0)}%</span>
              <span className="text-text-dim">{formatCurrency(currentPortfolioValue)} / {formatCurrency(goal.targetAmount)}</span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full progress-gold transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-text-dim text-center">
        {he ? 'מחירי סוף יום, לא נתוני מסחר חי. תחזית לטווח ארוך — טאב "סימולציה".' : 'End-of-day prices, not live tick data.'}
      </p>
    </div>
  );
}
