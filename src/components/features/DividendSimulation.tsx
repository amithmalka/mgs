import { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, Line } from 'recharts';
import { useLangStore } from '../../store/langStore';
import { useStore } from '../../store';
import { useCustomStore } from '../../store/customStore';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { formatCurrency } from '../../utils/format';
import { simulateDividends, yearIncomeReached, MAX_MODELLED_YIELD } from '../../utils/dividends';
import { defaultYieldFor } from '../../constants/dividendYields';
import { ASSET_META, ASSET_RETURNS, PROJECTION_HORIZON } from '../../constants/defaults';
import { getTrackById } from '../../constants/tracks';

/** One asset feeding the dividend calculation. */
interface DivAsset {
  key: string;
  ticker: string;
  label: string;
  /** share of the portfolio, % */
  weight: number;
  /** expected TOTAL return %/yr for this asset (price + dividend) */
  totalReturn: number;
  color: string;
}

type Source = 'custom' | 'track';

/**
 * Dividend income simulation built from the user's actual holdings.
 *
 * The portfolio yield is not a single guess — it is the weighted average of a
 * per-asset yield across whatever the user actually entered, so changing the
 * mix changes the income. Price return is derived per asset by dividing the
 * dividend out of its total return, because a published total return already
 * contains the dividend; adding the yield on top would count it twice.
 */
export function DividendSimulation() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { currentPortfolioValue, simulationParams, allocations, selectedTrackId } = useStore();
  const { holdings } = useCustomStore();
  const track = getTrackById(selectedTrackId);

  const hasCustom = holdings.length > 0;
  const [source, setSource] = useState<Source>(hasCustom ? 'custom' : 'track');
  useEffect(() => { if (!hasCustom) setSource('track'); }, [hasCustom]);

  // ── Build the asset list from whichever portfolio is selected ────────────
  const assets: DivAsset[] = useMemo(() => {
    if (source === 'custom') {
      const withWeight = holdings.filter(h => h.targetPercent > 0);
      // No targets set yet — weight them equally rather than showing nothing.
      const list = withWeight.length ? withWeight : holdings;
      const even = 100 / (list.length || 1);
      return list.map((h, i) => ({
        key: h.id,
        ticker: h.ticker.toUpperCase(),
        label: h.name || h.ticker,
        weight: withWeight.length ? h.targetPercent : even,
        totalReturn: h.expectedReturn,
        color: ['#D4AF37', '#A78BFA', '#34D399', '#F59E0B', '#60A5FA', '#F472B6'][i % 6],
      }));
    }
    return allocations
      .filter(a => a.targetPercent > 0)
      .map(a => ({
        key: a.assetClass,
        ticker: ASSET_META[a.assetClass].proxyTicker,
        label: a.label,
        weight: a.targetPercent,
        totalReturn: ASSET_RETURNS.moderate[a.assetClass],
        color: a.color,
      }));
  }, [source, holdings, allocations]);

  // ── Per-asset yields, seeded from the ticker and then user-editable ──────
  const [yieldOverrides, setYieldOverrides] = useState<Record<string, number>>({});
  const yieldOf = (a: DivAsset) => yieldOverrides[a.key] ?? defaultYieldFor(a.ticker);

  const totalWeight = assets.reduce((s, a) => s + a.weight, 0);
  const portfolioYield = totalWeight > 0
    ? assets.reduce((s, a) => s + yieldOf(a) * (a.weight / totalWeight), 0)
    : 0;

  /**
   * Strip the dividend out of a total return.
   *
   * A dividend yield is quoted against the current price, so the two compound
   * rather than add: total = (1 + price)(1 + yield) − 1. Subtracting the yield
   * would leave a residue that shows up as a few percent of drift over decades,
   * so the inverse is divided out instead — this round-trips exactly.
   */
  const stripYield = (totalReturn: number, y: number) =>
    ((1 + totalReturn / 100) / (1 + y / 100) - 1) * 100;

  const portfolioPriceReturn = totalWeight > 0
    ? assets.reduce((s, a) => s + stripYield(a.totalReturn, yieldOf(a)) * (a.weight / totalWeight), 0)
    : 0;

  /** Recombine for display, the same way the model compounds them. */
  const portfolioTotalReturn =
    ((1 + portfolioPriceReturn / 100) * (1 + portfolioYield / 100) - 1) * 100;

  // Default 0: a company that grows its payout while its price grows too keeps
  // roughly the same yield. Compounding the YIELD upward is the aggressive case,
  // and over a 40-year horizon it runs away — hence the default and the warning.
  const [dividendGrowth, setGrowth] = useState(0);
  const [years, setYears] = useState(PROJECTION_HORIZON);
  const [reinvest, setReinvest] = useState(true);
  // Deposits run for the track's accumulation phase — 25 years on the standard
  // timing — rather than an arbitrary default, so this follows the MGS model.
  const [depositUntil, setDepositUntil] = useState(track.phaseADuration);
  const [targetMonthly, setTargetMonthly] = useState(10000);

  // Switching track changes the accumulation length; follow it.
  useEffect(() => { setDepositUntil(track.phaseADuration); }, [track.phaseADuration]);

  const initialValue = currentPortfolioValue || simulationParams.initialDeposit;
  const monthlyDeposit = simulationParams.monthlyDeposit;

  const rows = useMemo(() => simulateDividends({
    initialValue, monthlyDeposit, years,
    priceReturn: portfolioPriceReturn,
    dividendYield: portfolioYield,
    dividendGrowth, reinvest, depositUntilYear: depositUntil,
  }), [initialValue, monthlyDeposit, years, portfolioPriceReturn, portfolioYield, dividendGrowth, reinvest, depositUntil]);

  const last = rows[rows.length - 1];
  const reachYear = yearIncomeReached(rows, targetMonthly * 12);
  const capped = last.effectiveYield >= MAX_MODELLED_YIELD;

  const L = { income: he ? 'הכנסה שנתית מדיבידנד' : 'Annual dividend', value: he ? 'שווי התיק' : 'Portfolio value' };
  const data = rows.filter(r => r.year > 0).map(r => ({
    year: r.year, [L.income]: r.annualDividend, [L.value]: r.value,
  }));

  if (assets.length === 0) {
    return (
      <Card title={he ? 'סימולציית דיבידנדים' : 'Dividend Simulation'}>
        <p className="text-[12px] text-text-dim text-center py-6">
          {he
            ? 'אין נכסים להרכיב מהם תיק. הוסיפו מניות בטאב "השקעה בהתאמה אישית", או קבעו אחוזי הקצאה למעלה.'
            : 'No assets to build from. Add stocks in the Custom Portfolio tab, or set allocation percentages above.'}
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={he ? 'סימולציית דיבידנדים' : 'Dividend Simulation'}
      subtitle={he
        ? 'כמה מזומן הנכסים שלכם משלמים לכם, לפי התמהיל שהזנתם — בלי למכור כלום.'
        : 'How much cash your own assets pay you, from the mix you entered — without selling anything.'}
    >
      {/* Which portfolio */}
      {hasCustom && (
        <div className="flex gap-2 mb-4">
          {([['custom', he ? 'המניות שלי' : 'My stocks'], ['track', he ? 'נכסי המסלול' : 'Track assets']] as [Source, string][]).map(([k, lbl]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                source === k ? 'border-gold-border text-gold bg-gold-muted' : 'border-surface-4 text-text-muted hover:text-text'
              }`}>
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Per-asset yields — this is what drives the portfolio yield */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="border-b border-surface-4 text-text-muted text-[11px]">
              <th className="text-start py-2">{he ? 'נכס' : 'Asset'}</th>
              <th className="text-end py-2">{he ? 'משקל' : 'Weight'}</th>
              <th className="text-end py-2">{he ? 'תשואה כוללת' : 'Total return'}</th>
              <th className="text-end py-2">{he ? 'תשואת דיבידנד %' : 'Dividend yield %'}</th>
              <th className="text-end py-2">{he ? 'תרומה לתשואת התיק' : 'Contribution'}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => {
              const y = yieldOf(a);
              const share = totalWeight > 0 ? a.weight / totalWeight : 0;
              return (
                <tr key={a.key} className="border-b border-surface-3/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <div className="min-w-0">
                        <span className="block text-[13px] text-text truncate">{a.label}</span>
                        <span className="block text-[10px] text-text-dim font-mono" dir="ltr">{a.ticker}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-end text-text-muted">{a.weight.toFixed(1)}%</td>
                  <td className="py-2 text-end text-text-muted">{a.totalReturn.toFixed(1)}%</td>
                  <td className="py-2 text-end">
                    <input
                      type="number" step={0.1} min={0} max={20} value={y}
                      onChange={e => {
                        const n = Number(e.target.value);
                        if (Number.isNaN(n)) return;
                        setYieldOverrides(o => ({ ...o, [a.key]: Math.max(0, Math.min(20, n)) }));
                      }}
                      className="w-[72px] text-end"
                    />
                  </td>
                  <td className="py-2 text-end" style={{ color: '#F472B6' }}>
                    {(y * share).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-[12px]">
              <td className="py-2 text-text-muted">{he ? 'תיק' : 'Portfolio'}</td>
              <td className="py-2 text-end text-text-muted">{totalWeight.toFixed(1)}%</td>
              <td className="py-2 text-end text-text-muted">{portfolioTotalReturn.toFixed(2)}%</td>
              <td className="py-2 text-end font-bold" style={{ color: '#F472B6' }}>{portfolioYield.toFixed(2)}%</td>
              <td className="py-2 text-end text-text-dim">{he ? 'מחיר' : 'price'} {portfolioPriceReturn.toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {Object.keys(yieldOverrides).length > 0 && (
        <button onClick={() => setYieldOverrides({})}
          className="text-[11px] px-3 py-1.5 mb-4 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors">
          {he ? 'איפוס תשואות לברירת מחדל' : 'Reset yields to defaults'}
        </button>
      )}

      {/* Scenario inputs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Field label={he ? 'עליית תשואה %/שנה (מעבר למחיר)' : 'Yield growth %/yr (above price)'}
          value={dividendGrowth} onChange={setGrowth} step={0.5} min={0} max={10} />
        <Field label={he ? 'שנים' : 'Years'} value={years} onChange={setYears} step={1} min={1} max={50} />
        <Field label={he ? `מפקידים עד שנה (מסלול: ${track.phaseADuration})` : `Deposit until year (track: ${track.phaseADuration})`}
          value={depositUntil} onChange={setDepositUntil} step={1} min={0} max={50} />
        <Field label={he ? 'יעד הכנסה חודשית ₪' : 'Target monthly ₪'} value={targetMonthly} onChange={setTargetMonthly} step={500} min={0} />
      </div>

      <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer mb-4">
        <input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)} />
        {he ? 'להשקיע מחדש את הדיבידנדים' : 'Reinvest dividends'}
      </label>

      {/* Headline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label={he ? `הכנסה חודשית בשנה ${years}` : `Monthly income at year ${years}`} value={formatCurrency(last.monthlyDividend)} accent />
        <Stat label={he ? 'סך דיבידנדים שהתקבלו' : 'Total dividends'} value={formatCurrency(last.cumulativeDividends)} />
        <Stat label={he ? 'תשואה על הכסף שהופקד' : 'Yield on cost'} value={`${last.yieldOnCost.toFixed(1)}%`} accent />
        <Stat label={he ? 'שווי התיק' : 'Portfolio value'} value={formatCurrency(last.value)} />
      </div>

      <div className={`rounded-xl border px-4 py-3 mb-4 ${reachYear ? 'border-success/30 bg-success/5' : 'border-surface-4 bg-surface-3'}`}>
        <p className={`text-[13px] ${reachYear ? 'text-success font-semibold' : 'text-text-muted'}`}>
          {reachYear
            ? (he ? `יעד של ${formatCurrency(targetMonthly)} לחודש מושג בשנה ${reachYear}.` : `Target reached in year ${reachYear}.`)
            : (he ? `היעד של ${formatCurrency(targetMonthly)} לחודש לא מושג בתוך ${years} שנים בתמהיל הזה.` : `Target not reached within ${years} years with this mix.`)}
        </p>
      </div>

      {dividendGrowth > 0 && (
        <p className="text-[11px] text-text-dim flex items-start gap-1.5 mb-3">
          <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
          {he
            ? 'שדה זה מעלה את תשואת הדיבידנד עצמה בכל שנה, והוא מצטבר. בפועל, כשחברה מגדילה דיבידנד והמחיר עולה איתו — התשואה נשארת דומה, וההכנסה גדלה ממילא כי התיק גדל. ערך גבוה על פני עשרות שנים מנפח את התחזית.'
            : 'This raises the yield itself every year and compounds. In reality a rising payout usually comes with a rising price, so the yield stays similar while income grows anyway as the portfolio grows. A high value over decades inflates the projection.'}
        </p>
      )}

      {capped && (
        <p className="text-[11px] text-warning flex items-start gap-1.5 mb-3">
          <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
          {he
            ? `תשואת הדיבידנד הגיעה לתקרת המודל (${MAX_MODELLED_YIELD}%) ולא תגדל מעבר לכך.`
            : `The modelled yield hit its ${MAX_MODELLED_YIELD}% ceiling.`}
        </p>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
          <defs>
            <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F472B6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#F472B6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="year" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
          <YAxis yAxisId="l" tickFormatter={v => `₪${(v / 1000).toFixed(0)}K`} stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
          <YAxis yAxisId="r" orientation="right" tickFormatter={v => `₪${(v / 1000000).toFixed(1)}M`} stroke="#555" tick={{ fill: '#666', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
            formatter={v => `₪${Number(v).toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
          <Area yAxisId="l" type="monotone" dataKey={L.income} stroke="#F472B6" fill="url(#divGrad)" strokeWidth={2} />
          <Line yAxisId="r" type="monotone" dataKey={L.value} stroke="#D4AF37" dot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-surface-4 text-text-muted text-[11px]">
              <th className="text-start py-2">{he ? 'שנה' : 'Year'}</th>
              <th className="text-end py-2">{he ? 'תשואה בפועל' : 'Yield'}</th>
              <th className="text-end py-2">{he ? 'דיבידנד שנתי' : 'Annual'}</th>
              <th className="text-end py-2">{he ? 'לחודש' : 'Monthly'}</th>
              <th className="text-end py-2">{he ? 'מצטבר' : 'Cumulative'}</th>
              <th className="text-end py-2">{he ? 'שווי התיק' : 'Value'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.year > 0 && (r.year % 5 === 0 || r.year === years)).map(r => (
              <tr key={r.year} className="border-b border-surface-3/50">
                <td className="py-2 text-text">{r.year}</td>
                <td className="py-2 text-end text-text-muted">{r.effectiveYield.toFixed(2)}%</td>
                <td className="py-2 text-end" style={{ color: '#F472B6' }}>{formatCurrency(r.annualDividend)}</td>
                <td className="py-2 text-end text-text">{formatCurrency(r.monthlyDividend)}</td>
                <td className="py-2 text-end text-text-muted">{formatCurrency(r.cumulativeDividends)}</td>
                <td className="py-2 text-end text-gold">{formatCurrency(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-text-dim mt-3">
        {he
          ? 'תשואת הדיבידנד של התיק היא ממוצע משוקלל של הנכסים שהזנתם. עליית המחיר נגזרת מהתשואה הכוללת בניכוי הדיבידנד, כדי לא לספור אותו פעמיים — הדיבידנד משולם על המחיר הנוכחי ולכן השניים מוכפלים ולא נסכמים. ברירות המחדל לתשואת הדיבידנד הן הערכות בלבד וניתנות לעריכה — הן אינן נתון חי. המודל אינו כולל מס על דיבידנדים, עמלות או אינפלציה, ומניח תשלום רציף. בפועל חברות מקצצות דיבידנדים.'
          : 'The portfolio yield is a weighted average of the assets you entered. Price return is total return with the dividend divided out, so it is not counted twice — a yield is quoted on the current price, so the two compound rather than add. Default yields are rough estimates and editable — not live data. The model excludes dividend tax, fees and inflation, and assumes an uninterrupted payout. Real companies cut dividends.'}
      </p>
    </Card>
  );
}

function Field({ label, value, onChange, step, min, max }: {
  label: string; value: number; onChange: (n: number) => void; step: number; min: number; max?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] text-text-muted mb-1">{label}</span>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, max != null ? Math.min(max, n) : n));
        }}
        className="w-full" />
    </label>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2.5">
      <p className="text-[10px] text-text-dim truncate">{label}</p>
      <p className={`text-[15px] font-bold mt-0.5 ${accent ? 'text-gold' : 'text-text'}`}>{value}</p>
    </div>
  );
}
