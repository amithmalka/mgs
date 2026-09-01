import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { ASSET_META } from '../constants/defaults';
import { getTrackById } from '../constants/tracks';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { smartDeposit } from '../utils/smartDeposit';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';

/**
 * "This month" — the one screen that answers what to actually do now.
 *
 * It used to also carry the market board, candles, the track picker, portfolio
 * value and the goal: six unrelated questions on one screen. The market moved
 * to its own page and the track picker to the start screen, leaving this to do
 * one job.
 */
export function HomePage() {
  const {
    allocations, currentPortfolioValue, simulationParams, setMonthlyDeposit,
    selectedTrackId, goal, getProfit,
  } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const track = getTrackById(selectedTrackId);
  const deposit = simulationParams.monthlyDeposit;
  const profit = getProfit();
  const progress = goal.targetAmount > 0
    ? Math.min(100, (currentPortfolioValue / goal.targetAmount) * 100) : 0;

  const active = useMemo(() => allocations.filter(a => a.targetPercent > 0), [allocations]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);

  // Prices are needed only to tilt the split toward whatever dropped.
  const refresh = useCallback(async () => {
    if (!active.length) return;
    setLoading(true);
    try {
      const byTicker = await fetchPrices(active.map(a => ASSET_META[a.assetClass].proxyTicker));
      const remapped: Record<string, PriceInfo> = {};
      active.forEach(a => { remapped[a.assetClass] = byTicker[ASSET_META[a.assetClass].proxyTicker] || {}; });
      setPrices(remapped);
    } catch { /* the split falls back to target weights */ }
    finally { setLoading(false); }
  }, [active]);

  useEffect(() => { refresh(); }, [refresh]);

  const buys = useMemo(() => smartDeposit(deposit, allocations, prices), [deposit, allocations, prices]);
  const anyLive = Object.values(prices).some(p => typeof p?.price === 'number');

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── The monthly action ──────────────────────────────────────────── */}
      <Card glow title={he ? 'מה לעשות החודש' : 'What to do this month'}
            subtitle={he ? `לפי המסלול: ${track.nameHe}` : `Track: ${track.nameEn}`}>
        <div className="flex items-center gap-3 mt-1 mb-4 flex-wrap">
          <span className="text-sm text-text-muted">{he ? 'סכום ההפקדה החודשית:' : 'Monthly deposit:'}</span>
          <input type="number" value={deposit || ''} onChange={e => setMonthlyDeposit(Number(e.target.value) || 0)}
            className="w-28 text-center font-semibold" />
          <span className="text-xs text-text-dim">₪</span>
          {loading && <span className="text-[10px] text-text-dim">{he ? 'טוען מחירים…' : 'Loading prices…'}</span>}
        </div>

        {deposit > 0 ? (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {anyLive
                ? (he ? 'המערכת מגדילה קנייה בנכסים שירדו החודש — לנצל את ההנחה:' : 'We buy more of what dropped:')
                : (he ? 'הפקידו וחלקו כך (לפי היעד):' : 'Deposit and split like this:')}
            </p>
            <div className="space-y-2">
              {buys.filter(b => b.amount > 0).map(b => (
                <div key={b.assetClass} className={`flex items-center justify-between p-3.5 rounded-xl border ${b.dipBoosted ? 'bg-danger/[0.06] border-danger/25' : 'bg-surface-3 border-surface-4'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ASSET_META[b.assetClass].color }} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-text block truncate">{b.label}</span>
                      <span className="text-[10px] text-text-dim font-mono">
                        {b.ticker}
                        {typeof b.perf30 === 'number' && (
                          <span className={b.perf30 < 0 ? 'text-danger' : 'text-success'}> · {b.perf30 > 0 ? '+' : ''}{b.perf30}%</span>
                        )}
                      </span>
                    </div>
                    {b.dipBoosted && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-danger/15 text-danger flex-shrink-0">{he ? 'ירד — קונים יותר' : 'dip'}</span>}
                  </div>
                  <span className="text-lg font-bold text-gold flex-shrink-0">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-dim mt-3 flex items-center">
              <Icon name="bulb" size={13} className="me-1.5" />
              {he ? 'פשוט קנו את הסכומים האלה בחשבון ההשקעות. אין צורך למכור כלום.' : 'Just buy these amounts. No need to sell anything.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">{he ? 'הזינו סכום הפקדה חודשי כדי לראות בדיוק מה לקנות.' : 'Enter a monthly deposit.'}</p>
        )}
      </Card>

      {/* ── Where I stand ───────────────────────────────────────────────── */}
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

      <Disclaimer variant="full" />
    </div>
  );
}
