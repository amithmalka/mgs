import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { ASSET_META } from '../constants/defaults';
import { getTrackById } from '../constants/tracks';
import { MGS_UNIFIED_TRACK } from '../constants/investmentTracks';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { smartDeposit } from '../utils/smartDeposit';
import { routeDeposit } from '../utils/swrEngine';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { MarketSection } from '../components/market/MarketSection';
import { MethodAndTrack } from '../components/features/MethodAndTrack';

/**
 * Home is the whole opening flow, in order:
 *   the market → pick a method → set a monthly deposit → what to buy and how
 *   much of each.
 *
 * Everything downstream (tracking, income) assumes those choices are made, so
 * they belong on one screen rather than scattered across the menu.
 */
export function HomePage() {
  const {
    allocations, simulationParams, setMonthlyDeposit,
    selectedTrackId, selectedStrategyId,
  } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const isGeneral = selectedStrategyId === 'wealth';
  const track = getTrackById(selectedTrackId);
  const deposit = simulationParams.monthlyDeposit;

  const active = useMemo(() => allocations.filter(a => a.targetPercent > 0), [allocations]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);

  // Prices only tilt the split toward whatever dropped; it works without them.
  const refresh = useCallback(async () => {
    if (isGeneral || !active.length) return;
    setLoading(true);
    try {
      const byTicker = await fetchPrices(active.map(a => ASSET_META[a.assetClass].proxyTicker));
      const remapped: Record<string, PriceInfo> = {};
      active.forEach(a => { remapped[a.assetClass] = byTicker[ASSET_META[a.assetClass].proxyTicker] || {}; });
      setPrices(remapped);
    } catch { /* falls back to target weights */ }
    finally { setLoading(false); }
  }, [active, isGeneral]);

  useEffect(() => { refresh(); }, [refresh]);

  const buys = useMemo(() => smartDeposit(deposit, allocations, prices), [deposit, allocations, prices]);
  const anyLive = Object.values(prices).some(p => typeof p?.price === 'number');

  // The general method sends the whole deposit into one asset — the one
  // furthest below target — rather than splitting it across several.
  const engineRoute = useMemo(() => {
    if (!isGeneral) return [];
    return routeDeposit(deposit, MGS_UNIFIED_TRACK.assets.map(a => ({
      key: a.key, value: 0, targetWeight: a.weight,
    })));
  }, [isGeneral, deposit]);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── 1. The market ───────────────────────────────────────────────── */}
      <MarketSection />

      {/* ── 2. Method (and, for the apartment method, a track) ──────────── */}
      <MethodAndTrack />

      {/* ── 3. Monthly deposit ──────────────────────────────────────────── */}
      <Card glow title={he ? 'כמה מפקידים בחודש' : 'Monthly deposit'}
            subtitle={he
              ? 'הסכום הזה מזין את החלוקה למטה ואת כל התחזיות במערכת.'
              : 'This amount drives the split below and every projection in the system.'}>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="number" min={0} step={500} value={deposit || ''}
            onChange={e => setMonthlyDeposit(Number(e.target.value) || 0)}
            className="w-36 text-center text-lg font-bold" />
          <span className="text-sm text-text-dim">₪</span>
          <div className="flex gap-1.5">
            {[1000, 3000, 5000].map(v => (
              <button key={v} onClick={() => setMonthlyDeposit(v)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                  deposit === v ? 'border-gold-border text-gold bg-gold-muted' : 'border-surface-4 text-text-muted hover:text-text'
                }`}>
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 4. Where the money goes ─────────────────────────────────────── */}
      <Card glow title={he ? 'איפה להשקיע וכמה' : 'Where to invest, and how much'}
            subtitle={isGeneral
              ? (he ? MGS_UNIFIED_TRACK.nameHe : MGS_UNIFIED_TRACK.nameEn)
              : (he ? `לפי המסלול: ${track.nameHe}` : `Track: ${track.nameEn}`)}>
        {deposit <= 0 ? (
          <p className="text-sm text-text-muted">
            {he ? 'הזינו סכום הפקדה חודשי למעלה כדי לראות בדיוק מה לקנות.' : 'Enter a monthly deposit above.'}
          </p>
        ) : isGeneral ? (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {he
                ? 'בשיטה הזו כל ההפקדה נכנסת לנכס אחד — זה שהכי רחוק מתחת למשקל היעד שלו. כך התיק מתאזן בלי למכור ובלי אירוע מס.'
                : 'The whole deposit goes into one asset — whichever is furthest below its target weight, so the portfolio rebalances without selling.'}
            </p>
            <div className="space-y-2">
              {engineRoute.map(r => {
                const a = MGS_UNIFIED_TRACK.assets.find(x => x.key === r.key)!;
                return (
                  <div key={r.key} className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    r.amount > 0 ? 'bg-success/[0.06] border-success/25' : 'bg-surface-3 border-surface-4'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-text block truncate">{he ? a.labelHe : a.labelEn}</span>
                        <span className="text-[10px] text-text-dim font-mono" dir="ltr">
                          {a.ticker} · {he ? 'יעד' : 'target'} {(a.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <span className={`text-lg font-bold flex-shrink-0 ${r.amount > 0 ? 'text-gold' : 'text-text-dim'}`}>
                      {formatCurrency(r.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {anyLive
                ? (he ? 'המערכת מגדילה קנייה בנכסים שירדו החודש — לנצל את ההנחה:' : 'We buy more of what dropped:')
                : (he ? 'הפקידו וחלקו כך (לפי היעד):' : 'Deposit and split like this:')}
              {loading && <span className="text-[10px] text-text-dim"> · {he ? 'טוען מחירים…' : 'loading…'}</span>}
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
          </>
        )}

        {deposit > 0 && (
          <p className="text-[11px] text-text-dim mt-3 flex items-center">
            <Icon name="bulb" size={13} className="me-1.5" />
            {he ? 'פשוט קנו את הסכומים האלה בחשבון ההשקעות. אין צורך למכור כלום.' : 'Just buy these amounts. No need to sell anything.'}
          </p>
        )}
      </Card>

      <Disclaimer variant="full" />
    </div>
  );
}
