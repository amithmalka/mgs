import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { Collapsible } from '../components/layout/Collapsible';
import { formatCurrency } from '../utils/format';
import { ASSET_META } from '../constants/defaults';
import { getTrackById } from '../constants/tracks';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { smartDeposit } from '../utils/smartDeposit';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { MethodAndTrack } from '../components/features/MethodAndTrack';
import { TrackingSection } from '../components/features/TrackingSection';
import { SimulationPage } from './SimulationPage';

/**
 * Everything for the "משקיעה להשקעה (במקום דירה)" method on one tab: its
 * track, its deposit split, its own projection and its own tracking.
 *
 * The two methods used to share a single simulation tab and a single tracking
 * tab, so it was never clear which method a number belonged to.
 */
export function ApartmentMethodPage() {
  const {
    allocations, simulationParams, setMonthlyDeposit,
    selectedTrackId, setSelectedStrategy,
  } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  // Opening this tab IS choosing this method — everything downstream follows.
  useEffect(() => { setSelectedStrategy('apartment'); }, [setSelectedStrategy]);

  const track = getTrackById(selectedTrackId);
  const deposit = simulationParams.monthlyDeposit;

  const active = useMemo(() => allocations.filter(a => a.targetPercent > 0), [allocations]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!active.length) return;
    setLoading(true);
    try {
      const byTicker = await fetchPrices(active.map(a => ASSET_META[a.assetClass].proxyTicker));
      const remapped: Record<string, PriceInfo> = {};
      active.forEach(a => { remapped[a.assetClass] = byTicker[ASSET_META[a.assetClass].proxyTicker] || {}; });
      setPrices(remapped);
    } catch { /* falls back to target weights */ }
    finally { setLoading(false); }
  }, [active]);

  useEffect(() => { refresh(); }, [refresh]);

  const buys = useMemo(() => smartDeposit(deposit, allocations, prices), [deposit, allocations, prices]);
  const anyLive = Object.values(prices).some(p => typeof p?.price === 'number');

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── The track ───────────────────────────────────────────────────── */}
      <MethodAndTrack />

      {/* ── Deposit ─────────────────────────────────────────────────────── */}
      <Card glow title={he ? 'כמה מפקידים בחודש' : 'Monthly deposit'}>
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

      {/* ── Where the deposit goes ──────────────────────────────────────── */}
      <Card glow title={he ? 'איפה להשקיע וכמה' : 'Where to invest, and how much'}
            subtitle={he ? `לפי המסלול: ${track.nameHe}` : `Track: ${track.nameEn}`}>
        {deposit <= 0 ? (
          <p className="text-sm text-text-muted">
            {he ? 'הזינו סכום הפקדה חודשי למעלה.' : 'Enter a monthly deposit above.'}
          </p>
        ) : (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {anyLive
                ? (he ? 'המערכת מגדילה קנייה בנכסים שירדו החודש:' : 'We buy more of what dropped:')
                : (he ? 'הפקידו וחלקו כך (לפי היעד):' : 'Deposit and split like this:')}
              {loading && <span className="text-[10px] text-text-dim"> · {he ? 'טוען…' : 'loading…'}</span>}
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
                    {b.dipBoosted && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-danger/15 text-danger flex-shrink-0">{he ? 'ירד' : 'dip'}</span>}
                  </div>
                  <span className="text-lg font-bold text-gold flex-shrink-0">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-dim mt-3 flex items-center">
              <Icon name="bulb" size={13} className="me-1.5" />
              {he ? 'פשוט קנו את הסכומים האלה. אין צורך למכור כלום.' : 'Just buy these amounts. No need to sell.'}
            </p>
          </>
        )}
      </Card>

      {/* ── This method's own tracking ──────────────────────────────────── */}
      <TrackingSection />

      {/* ── This method's own projection ────────────────────────────────── */}
      <Collapsible title={he ? 'סימולציה של המסלול הזה' : "This track's projection"}
                   subtitle={he ? '40 שנה קדימה, שלושה תרחישים, פירוט חודשי ופר-נכס' : '40 years, three scenarios, monthly and per-asset detail'}>
        <SimulationPage />
      </Collapsible>

      <Disclaimer variant="full" />
    </div>
  );
}
