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

// Simple, guided home screen — answers "what do I do this month?" in plain Hebrew,
// with live prices and a dip-aware buy plan (buy more of what dropped).
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

  const active = useMemo(() => allocations.filter(a => a.targetPercent > 0), [allocations]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    if (!active.length) return;
    setLoading(true); setErr('');
    try {
      const byTicker = await fetchPrices(active.map(a => ASSET_META[a.assetClass].proxyTicker));
      const remapped: Record<string, PriceInfo> = {};
      active.forEach(a => { remapped[a.assetClass] = byTicker[ASSET_META[a.assetClass].proxyTicker] || {}; });
      setPrices(remapped);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [active]);

  useEffect(() => { refresh(); }, [refresh]);

  const buys = useMemo(() => smartDeposit(deposit, allocations, prices), [deposit, allocations, prices]);
  const anyLive = Object.values(prices).some(p => typeof p?.price === 'number');

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* Greeting + track */}
      <Card glow>
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">{he ? 'המסלול שלך' : 'Your plan'}</p>
        <h2 className="text-2xl font-bold text-gold-gradient mt-1">{track.icon} {he ? track.nameHe : track.nameEn}</h2>
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

      {/* Portfolio value */}
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

      {/* Live market prices */}
      <Card title={`📊 ${he ? 'מחירי השוק כרגע' : 'Live Market Prices'}`}>
        <div className="flex items-center justify-between mb-3 mt-1">
          <span className="text-[11px] text-text-dim">{he ? 'מחיר נוכחי ושינוי ב-30 יום לכל מדד' : 'Current price + 30-day change'}</span>
          <button onClick={refresh} disabled={loading} className="text-xs btn-gold px-3 py-1.5 rounded-lg disabled:opacity-50">
            {loading ? (he ? 'טוען…' : 'Loading…') : (he ? '↻ רענן' : '↻ Refresh')}
          </button>
        </div>
        {err && <p className="text-[11px] text-danger mb-3">⚠ {he ? 'מחירים בזמן אמת עדיין לא מחוברים (נדרש מפתח נתוני שוק). בינתיים החלוקה לפי היעד.' : 'Live prices not connected yet.'}</p>}
        <div className="grid grid-cols-2 gap-2">
          {active.map(a => {
            const p = prices[a.assetClass]; const perf = p?.perf30;
            return (
              <div key={a.assetClass} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-3 border border-surface-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ASSET_META[a.assetClass].color }} />
                  <span className="text-xs text-text truncate">{a.label}</span>
                </div>
                <div className="text-end flex-shrink-0">
                  {typeof p?.price === 'number'
                    ? <span className="text-xs font-mono text-text">{p.price.toFixed(2)} {p.currency || ''}</span>
                    : <span className="text-xs text-text-dim">—</span>}
                  {typeof perf === 'number' && (
                    <span className={`block text-[10px] font-semibold ${perf < 0 ? 'text-danger' : 'text-success'}`}>{perf > 0 ? '+' : ''}{perf}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* THE monthly action */}
      <Card glow title={`✅ ${he ? 'מה לקנות החודש' : 'What to buy this month'}`}>
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
            <p className="text-[11px] text-text-dim mt-3">
              💡 {he ? 'פשוט קנו את הסכומים האלה בחשבון ההשקעות. אין צורך למכור כלום.' : 'Just buy these amounts. No need to sell anything.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">{he ? 'הזינו סכום הפקדה חודשי כדי לראות בדיוק מה לקנות.' : 'Enter a monthly deposit.'}</p>
        )}
      </Card>

      {/* Progress to goal */}
      {goal.targetAmount > 0 && (
        <Card title={he ? '🎯 הדרך ליעד שלך' : '🎯 Progress to your goal'}
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
        {he ? 'תחזית לטווח ארוך — טאב "סימולציה". משיכת הכנסה — טאב "חופש כלכלי".' : 'Long-term forecast — Simulation tab.'}
      </p>
    </div>
  );
}
