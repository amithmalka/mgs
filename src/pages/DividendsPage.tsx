import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { TrackBanner } from '../components/layout/TrackBanner';
import { ASSET_META, WITHDRAW_RATE, ASSET_RETURNS } from '../constants/defaults';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { planWithdrawal } from '../utils/withdrawal';
import type { WithdrawHolding } from '../utils/withdrawal';
import { simulateTrack } from '../utils/math';
import { getTrackById, trackToAllocations, trackPhaseOpts } from '../constants/tracks';
import { formatCurrency } from '../utils/format';
import type { AssetClass } from '../types';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';

// The "Financial Freedom" income + withdrawal dashboard (Decision Support System).
export function DividendsPage() {
  const { allocations, currentPortfolioValue, updateAllocationValue, addTransaction, simulationParams, selectedTrackId } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const he = lang === 'he';

  const held = useMemo(() => allocations.filter(a => a.currentValue > 0), [allocations]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [manualPerf, setManualPerf] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const target = (currentPortfolioValue * WITHDRAW_RATE) / 12;

  // Forward projection: if they keep depositing until the harvest phase begins,
  // what monthly income (4% rule) will the portfolio produce?
  const track = getTrackById(selectedTrackId);
  const harvestYear = track.phaseADuration + track.phaseBDuration; // deposits end → harvest starts
  const forecast = useMemo(() => {
    const start = currentPortfolioValue || simulationParams.initialDeposit;
    const alloc = trackToAllocations(track);
    const opts = trackPhaseOpts(track);
    const at = (ret: Record<AssetClass, number>) => {
      const rows = simulateTrack(start, simulationParams.monthlyDeposit, harvestYear, alloc, ret, opts);
      const value = rows[rows.length - 1]?.totalValue ?? 0;
      return { value, monthly: Math.round((value * WITHDRAW_RATE) / 12) };
    };
    return {
      conservative: at(ASSET_RETURNS.conservative),
      moderate: at(ASSET_RETURNS.moderate),
      aggressive: at(ASSET_RETURNS.aggressive),
    };
  }, [track, harvestYear, currentPortfolioValue, simulationParams.initialDeposit, simulationParams.monthlyDeposit]);

  const refresh = useCallback(async () => {
    if (!held.length) return;
    setLoading(true); setErr('');
    try {
      const tickers = held.map(h => ASSET_META[h.assetClass].proxyTicker);
      const byTicker = await fetchPrices(tickers);
      const remapped: Record<string, PriceInfo> = {};
      held.forEach(h => { remapped[h.assetClass] = byTicker[ASSET_META[h.assetClass].proxyTicker] || {}; });
      setPrices(remapped);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setLoading(false); }
  }, [held]);

  const perfOf = (ac: AssetClass): number => {
    const p = prices[ac]?.perf30;
    return typeof p === 'number' ? p : (manualPerf[ac] ?? 0);
  };
  const priceOf = (ac: AssetClass): number => prices[ac]?.price ?? 0;

  const holdings: WithdrawHolding[] = held.map(h => ({
    assetClass: h.assetClass,
    ticker: ASSET_META[h.assetClass].proxyTicker,
    label: h.label,
    value: h.currentValue,
    perf30: perfOf(h.assetClass),
    price: priceOf(h.assetClass),
  }));

  const plan = useMemo(() => planWithdrawal(holdings, target), [holdings, target]);
  const skipped = holdings.filter(h => h.perf30 <= 0);

  const execute = () => {
    plan.instructions.forEach(ins => {
      const cur = allocations.find(a => a.assetClass === ins.assetClass)?.currentValue ?? 0;
      updateAllocationValue(ins.assetClass, Math.max(0, Math.round(cur - ins.sellValue)));
    });
    if (plan.covered > 0) {
      addTransaction({ type: 'withdrawal', amount: plan.covered, date: new Date().toISOString().slice(0, 10), notes: he ? 'משיכת הכנסה חודשית (כלל 4%)' : 'Monthly income withdrawal (4% rule)' });
    }
    setDone(he ? 'התיק עודכן והמשיכה נרשמה' : 'Portfolio updated and withdrawal recorded');
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <TrackBanner />

      {/* Income header */}
      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">{he ? 'חופש כלכלי — ההכנסה החודשית שלך' : 'Financial Freedom — Your Monthly Income'}</h2>
        <p className="text-[12px] text-text-muted mt-1.5">
          {he ? 'משנה 21 ואילך — אלגוריתם המשיכה החכם סורק את התיק ובוחר מה למכור החודש, תוך נעילת רווחים והימנעות מנכסים בתיקון.' : 'From year 21 — the smart withdrawal algorithm scans your portfolio and picks what to sell this month, locking in profits and avoiding assets in correction.'}
        </p>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="rounded-xl bg-surface-3 border border-surface-4 p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-dim">{he ? 'שווי תיק נוכחי' : 'Current Portfolio Value'}</p>
            <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(currentPortfolioValue)}</p>
          </div>
          <div className="rounded-xl bg-gold-muted border border-gold-border p-4">
            <p className="text-[10px] uppercase tracking-wider text-gold/70">{he ? 'הכנסה חודשית (כלל 4%)' : 'Monthly Income (4% Rule)'}</p>
            <p className="text-2xl font-bold text-gold mt-1">{formatCurrency(Math.round(target))}</p>
          </div>
        </div>
      </Card>

      {/* Forecast: monthly income at the start of the harvest phase */}
      <Card glow title={`${he ? `ההכנסה החודשית שלך בעוד ${harvestYear} שנים` : `Your monthly income in ${harvestYear} years`}`}>
        <p className="text-[12px] text-text-muted mb-4">
          {he
            ? `אם תמשיכו להפקיד ${formatCurrency(simulationParams.monthlyDeposit)} בכל חודש — אחרי ${track.phaseADuration} שנות צבירה + ${track.phaseBDuration} שנות איזון, זה מה שתוכלו למשוך בכל חודש (כלל 4%):`
            : `If you keep depositing ${formatCurrency(simulationParams.monthlyDeposit)}/month, this is your monthly income at harvest (4% rule):`}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'conservative', label: he ? 'שמרני' : 'Conservative', color: '#888', hi: false },
            { key: 'moderate', label: he ? 'מתון' : 'Moderate', color: '#D4AF37', hi: true },
            { key: 'aggressive', label: he ? 'אופטימי' : 'Optimistic', color: '#34D399', hi: false },
          ] as const).map(s => {
            const f = forecast[s.key];
            return (
              <div key={s.key} className={`rounded-2xl p-4 text-center border ${s.hi ? 'bg-gold-muted border-gold-border gold-glow' : 'bg-surface-3 border-surface-4'}`}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>
                <p className="text-xl font-bold mt-1" style={{ color: s.hi ? '#F5E6A3' : '#ECE7DC' }}>{formatCurrency(f.monthly)}</p>
                <p className="text-[10px] text-text-dim">{he ? 'לחודש' : '/mo'}</p>
                <p className="text-[10px] text-text-muted mt-1.5">{he ? 'שווי תיק' : 'value'}: {formatCurrency(f.value)}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-text-dim mt-3">
          {he ? 'מבוסס על התחלה משווי התיק הנוכחי + המשך ההפקדה החודשית, לפי מנוע הפאזות של המסלול. אין באמור ייעוץ השקעות.' : 'Projection only. Not financial advice.'}
        </p>
      </Card>

      {held.length === 0 ? (
        <Card><p className="text-sm text-text-muted text-center py-4">{he ? 'הזן את אחזקות התיק שלך במסך "תיק השקעות" כדי לחשב את הוראות המשיכה.' : 'Enter your holdings in the Portfolio tab to compute withdrawal instructions.'}</p></Card>
      ) : (
        <>
          {/* Market data */}
          <Card title={he ? 'נתוני שוק — תשואת 30 יום' : 'Market Data — 30-Day Performance'}>
            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="text-[11px] text-text-dim">{he ? 'מחירים חיים דרך Twelve Data (או הזנה ידנית למטה)' : 'Live prices via Twelve Data (or manual entry below)'}</span>
              <button onClick={refresh} disabled={loading} className="text-xs btn-gold px-3 py-1.5 rounded-lg disabled:opacity-50">
                {loading ? (he ? 'טוען…' : 'Loading…') : (he ? 'רענן מחירים' : 'Refresh prices')}
              </button>
            </div>
            {err && <p className="text-[11px] text-danger mb-3 flex items-center gap-1.5"><Icon name="warning" size={12} />{err} — {he ? 'אפשר להזין תשואת 30 יום ידנית:' : 'enter 30-day % manually:'}</p>}
            <div className="space-y-2">
              {held.map(h => {
                const ac = h.assetClass; const pi = prices[ac]; const perf = perfOf(ac);
                return (
                  <div key={ac} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-3 border border-surface-4">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ASSET_META[ac].color }} />
                    <span className="text-sm flex-1 min-w-0">
                      <span className="font-mono text-gold">{ASSET_META[ac].primaryTicker}</span>
                      <span className="text-text-muted mr-2 ml-2 text-xs">{h.label}</span>
                    </span>
                    <span className="text-xs text-text-dim w-24 text-center">{formatCurrency(h.currentValue)}</span>
                    {typeof pi?.perf30 === 'number' ? (
                      <span className={`text-sm font-semibold w-20 text-center ${perf > 0 ? 'text-success' : 'text-danger'}`}>{perf > 0 ? '+' : ''}{perf}%</span>
                    ) : (
                      <span className="flex items-center gap-1 w-20">
                        <input type="number" value={manualPerf[ac] ?? ''} onChange={e => setManualPerf(prev => ({ ...prev, [ac]: Number(e.target.value) || 0 }))}
                          placeholder="%30" className="w-16 text-center text-xs py-1" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Sell instructions */}
          <Card glow title={he ? 'הוראות מכירה לחודש זה' : "This Month's Sell Instructions"}>
            <div className="p-3 rounded-xl bg-surface-3/60 border border-gold/10 text-[12px] text-text-muted mb-4">
              {he
                ? 'האלגוריתם סרק את השוק ובחר את הנכסים הרווחיים ביותר למכירה החודש — תוך עקיפה מוחלטת של נכסים שנמצאים כרגע בתיקון.'
                : 'The algorithm scanned the market and selected the most profitable assets to liquidate this month — completely bypassing assets currently in a correction.'}
            </div>

            {plan.instructions.length === 0 ? (
              <p className="text-sm text-danger text-center py-4">
                {he ? 'כל הנכסים בתשואה שלילית ב-30 יום — אין מכירה מומלצת החודש (הגנת הפסד). שקול למשוך ממזומן/אג״ח.' : 'All assets are negative over 30 days — no sell recommended this month (loss protection).'}
              </p>
            ) : (
              <ol className="space-y-3">
                {plan.instructions.map((ins, i) => (
                  <li key={ins.assetClass} className="flex items-center gap-3 p-3 rounded-xl bg-surface-3 border border-surface-4">
                    <span className="w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center text-sm flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{he ? 'מכרו' : 'SELL'} <span className="font-mono text-gold font-bold">{ins.ticker}</span> <span className="text-text-muted text-xs">{ins.label}</span></p>
                      <p className="text-[10px] text-text-dim">{he ? 'תשואת 30 יום' : '30-day'}: <span className="text-success">+{ins.perf30}%</span>{ins.units != null && <> · ≈ {ins.units} {he ? 'יחידות' : 'units'}</>}</p>
                    </div>
                    <span className="text-lg font-bold text-gold">{formatCurrency(ins.sellValue)}</span>
                  </li>
                ))}
              </ol>
            )}

            {skipped.length > 0 && (
              <p className="text-[11px] text-text-dim mt-4">
                <Icon name="shield" size={12} className="me-1.5" />{he ? 'לא נמכרו (בתיקון, מוגנים)' : 'Protected (in correction, untouched)'}: {skipped.map(s => s.ticker).join(', ')}
              </p>
            )}
            {plan.shortfall > 0 && plan.instructions.length > 0 && (
              <p className="text-[11px] text-warning mt-2">{he ? `חוסר של ${formatCurrency(plan.shortfall)} — אין מספיק נכסים רווחיים לכיסוי מלא החודש.` : `Shortfall of ${formatCurrency(plan.shortfall)} — not enough profitable assets this month.`}</p>
            )}

            {plan.instructions.length > 0 && (
              <button onClick={execute} className="w-full mt-5 btn-gold py-3 rounded-xl text-sm font-semibold">
                {he ? 'ביצעתי את העסקאות — עדכן את התיק' : 'I executed these trades — update my portfolio'}
              </button>
            )}
            {done && <p className="text-[12px] text-success text-center mt-3">{done}</p>}
          </Card>

          <p className="text-[10px] text-text-dim text-center">
            {he ? 'המערכת אינה מבצעת עסקאות — היא מערכת תומכת-החלטה בלבד. אין באמור ייעוץ השקעות.' : 'The system does not execute trades — decision support only. Not financial advice.'}
          </p>
        </>
      )}
    <Disclaimer variant="full" />
    </div>
  );
}
