import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { MGS_UNIFIED_TRACK } from '../constants/investmentTracks';
import { routeDeposit } from '../utils/swrEngine';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { EngineTrack } from '../components/features/EngineTrack';
import { TrackingSection } from '../components/features/TrackingSection';

/**
 * Everything for the general investing method on one tab: its allocation, its
 * deposit routing, its own projection (inside EngineTrack) and its own
 * tracking. Nothing here refers to buying property — that is the other method.
 */
export function GeneralMethodPage() {
  const { simulationParams, setMonthlyDeposit, setSelectedStrategy } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  // Opening this tab IS choosing this method.
  useEffect(() => { setSelectedStrategy('wealth'); }, [setSelectedStrategy]);

  const deposit = simulationParams.monthlyDeposit;

  // This method sends the whole deposit into the single asset furthest below
  // its target, rather than splitting it across several.
  const route = useMemo(() => routeDeposit(
    deposit,
    MGS_UNIFIED_TRACK.assets.map(a => ({ key: a.key, value: 0, targetWeight: a.weight })),
  ), [deposit]);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

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
      <Card glow title={he ? 'איפה להשקיע וכמה' : 'Where to invest, and how much'}>
        {deposit <= 0 ? (
          <p className="text-sm text-text-muted">
            {he ? 'הזינו סכום הפקדה חודשי למעלה.' : 'Enter a monthly deposit above.'}
          </p>
        ) : (
          <>
            <p className="text-[13px] text-text-muted mb-3">
              {he
                ? 'כל ההפקדה נכנסת לנכס אחד — זה שהכי רחוק מתחת למשקל היעד שלו. כך התיק מתאזן בלי למכור ובלי אירוע מס.'
                : 'The whole deposit goes into one asset — whichever is furthest below its target weight.'}
            </p>
            <div className="space-y-2">
              {route.map(r => {
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
            <p className="text-[11px] text-text-dim mt-3 flex items-center">
              <Icon name="bulb" size={13} className="me-1.5" />
              {he ? 'קנו את הסכום הזה בנכס המסומן. אין מכירה.' : 'Buy that amount of the highlighted asset. No selling.'}
            </p>
          </>
        )}
      </Card>

      {/* ── Allocation, projection and the engine's rules ───────────────── */}
      <EngineTrack />

      {/* ── This method's own tracking ──────────────────────────────────── */}
      <TrackingSection />

      <Disclaimer variant="full" />
    </div>
  );
}
