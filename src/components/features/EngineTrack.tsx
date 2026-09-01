import { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, Line } from 'recharts';
import { useLangStore } from '../../store/langStore';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { formatCurrency } from '../../utils/format';
import { projectEngine } from '../../utils/swrEngine';
import {
  MGS_UNIFIED_TRACK, SWR_START_MONTH, SWR_ANNUAL, CAPITAL_GAINS_TAX,
} from '../../constants/investmentTracks';

const STOPS = [36, 60, 120, 180, 240, 300, 360];

/** The "From Investing to Wealth" engine: one track, dynamic SWR from month 36. */
export function EngineTrack() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const T = MGS_UNIFIED_TRACK;

  const [deposit, setDeposit] = useState(3000);
  const [cagr, setCagr] = useState(T.expectedCagr * 100);
  const [withdraw, setWithdraw] = useState(true);

  const rows = useMemo(
    () => projectEngine({ monthlyDeposit: deposit, annualReturn: cagr / 100, months: 360, withdraw }),
    [deposit, cagr, withdraw]
  );

  const byMonth = useMemo(() => new Map(rows.map(r => [r.month, r])), [rows]);
  const chart = rows.filter(r => r.month % 12 === 0).map(r => ({
    year: r.month / 12,
    [he ? 'שווי התיק' : 'Portfolio']: r.value,
    [he ? 'קצבה נטו לחודש' : 'Net monthly']: r.netWithdrawal,
  }));

  const last = rows[rows.length - 1];

  return (
    <div className="space-y-6">
      {/* ── Allocation ─────────────────────────────────────────────────── */}
      <Card title={he ? 'הרכב המסלול' : 'Track allocation'}
            subtitle={he ? T.taglineHe : T.taglineEn}>
        <div className="space-y-2">
          {T.assets.map(a => (
            <div key={a.key} className="flex items-center gap-3 p-3 rounded-xl bg-surface-3 border border-surface-4">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <div className="min-w-0 flex-1">
                <span className="block text-[13px] text-text">{he ? a.labelHe : a.labelEn}</span>
                <span className="block text-[10px] text-text-dim font-mono" dir="ltr">
                  {a.ticker}
                  {a.proxy !== a.ticker && (
                    <span className="text-text-dim"> · {he ? 'נתונים' : 'data'}: {a.proxy}</span>
                  )}
                </span>
              </div>
              <div className="w-28 bg-surface-4 rounded-full h-1.5 overflow-hidden hidden sm:block">
                <div className="h-1.5 rounded-full" style={{ width: `${a.weight * 100}%`, background: a.color }} />
              </div>
              <span className="text-[14px] font-bold text-gold w-14 text-end flex-shrink-0">
                {(a.weight * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-text-dim mt-3 leading-relaxed">
          {he
            ? `ביטקוין נגזם חזרה ל-${(T.assets.find(a => a.key === 'BTC')!.weight * 100).toFixed(0)}% ברגע שהוא עובר ${(T.btcTakeProfitThreshold * 100).toFixed(0)}% מהתיק, והעודף עובר לליבה. זו המכירה היחידה בשלב הצבירה — הפקדות לעולם לא גורמות למכירה.`
            : `Bitcoin is trimmed back to ${(T.assets.find(a => a.key === 'BTC')!.weight * 100).toFixed(0)}% once it passes ${(T.btcTakeProfitThreshold * 100).toFixed(0)}% of the portfolio, with the excess rotated into the core. That is the only sale during accumulation — deposits never trigger one.`}
        </p>

        <p className="text-[11px] text-warning mt-2 flex items-start gap-1.5">
          <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
          {he
            ? 'שימו לב: הסימול SPXS מחזיר אצל ספק הנתונים קרן ממונפת הפוכה (בר 3X) ולא את קרן ה-S&P הסינתטית. לכן נתוני המחיר וההיסטוריה נמשכים דרך SPY.'
            : 'Note: the ticker SPXS resolves at our data provider to a leveraged inverse (Bear 3X) fund, not the synthetic S&P ETF. Price and history are therefore sourced via SPY.'}
        </p>
      </Card>

      {/* ── Projection ─────────────────────────────────────────────────── */}
      <Card title={he ? 'תחזית וקצבה חודשית' : 'Projection & monthly income'}
            subtitle={he
              ? `משיכה מתחילה בחודש ${SWR_START_MONTH} · ${(SWR_ANNUAL * 100).toFixed(0)}% בשנה · מס ${(CAPITAL_GAINS_TAX * 100).toFixed(0)}% על חלק הרווח בלבד`
              : `Withdrawals begin at month ${SWR_START_MONTH} · ${(SWR_ANNUAL * 100).toFixed(0)}%/yr · ${(CAPITAL_GAINS_TAX * 100).toFixed(0)}% tax on the profit portion only`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <label className="block">
            <span className="block text-[10px] text-text-muted mb-1">{he ? 'הפקדה חודשית ₪' : 'Monthly deposit'}</span>
            <input type="number" min={0} step={500} value={deposit}
              onChange={e => setDeposit(Math.max(0, Number(e.target.value) || 0))} className="w-full" />
          </label>
          <label className="block">
            <span className="block text-[10px] text-text-muted mb-1">{he ? 'תשואה שנתית %' : 'Annual return %'}</span>
            <input type="number" step={0.5} min={0} max={40} value={cagr}
              onChange={e => setCagr(Math.max(0, Math.min(40, Number(e.target.value) || 0)))} className="w-full" />
          </label>
          <label className="flex items-end gap-2 text-[12px] text-text-muted cursor-pointer pb-2">
            <input type="checkbox" checked={withdraw} onChange={e => setWithdraw(e.target.checked)} />
            {he ? 'למשוך בפועל' : 'Actually withdraw'}
          </label>
        </div>

        {!withdraw && (
          <p className="text-[11px] text-warning flex items-start gap-1.5 mb-3">
            <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
            {he
              ? 'מצב צבירה בלבד: הקצבה מוצגת כאילו הייתה נמשכת, אך אינה יורדת מהתיק. זהו תרחיש תיאורטי — אי אפשר גם למשוך וגם להשאיר את הכסף בפנים.'
              : 'Accumulation only: income is shown as if drawn but is not deducted. A theoretical view — you cannot both withdraw and keep the money invested.'}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-surface-4 text-text-muted text-[11px]">
                <th className="text-start py-2">{he ? 'שנה' : 'Year'}</th>
                <th className="text-end py-2">{he ? 'סך הפקדות' : 'Deposited'}</th>
                <th className="text-end py-2">{he ? 'שווי התיק' : 'Portfolio'}</th>
                <th className="text-end py-2">{he ? 'ברוטו לחודש' : 'Gross/mo'}</th>
                <th className="text-end py-2">{he ? 'נטו לכיס' : 'Net/mo'}</th>
              </tr>
            </thead>
            <tbody>
              {STOPS.map(m => {
                const r = byMonth.get(m);
                if (!r) return null;
                return (
                  <tr key={m} className="border-b border-surface-3/50">
                    <td className="py-2 text-text">{m / 12}</td>
                    <td className="py-2 text-end text-text-muted">{formatCurrency(r.totalDeposited)}</td>
                    <td className="py-2 text-end text-gold font-medium">{formatCurrency(r.value)}</td>
                    <td className="py-2 text-end text-text-dim">{formatCurrency(r.grossWithdrawal)}</td>
                    <td className="py-2 text-end text-success font-semibold">{formatCurrency(r.netWithdrawal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chart} margin={{ top: 12, right: 15, left: 15, bottom: 5 }}>
            <defs>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="year" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
            <YAxis yAxisId="l" tickFormatter={v => `₪${(v / 1_000_000).toFixed(1)}M`} stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={v => `₪${(v / 1000).toFixed(0)}K`} stroke="#555" tick={{ fill: '#666', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
              formatter={v => `₪${Number(v).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
            <Area yAxisId="l" type="monotone" dataKey={he ? 'שווי התיק' : 'Portfolio'} stroke="#D4AF37" fill="url(#engGrad)" strokeWidth={2} />
            <Line yAxisId="r" type="monotone" dataKey={he ? 'קצבה נטו לחודש' : 'Net monthly'} stroke="#34D399" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="rounded-xl bg-surface-3 border border-surface-4 px-4 py-3 mt-3">
          <p className="text-[11px] text-text-muted">
            {he ? `בשנה 30, בהנחות האלה` : 'At year 30, under these assumptions'}
          </p>
          <p className="text-[15px] font-bold text-gold mt-0.5">
            {formatCurrency(last.value)} · {formatCurrency(last.netWithdrawal)}{he ? ' נטו לחודש' : ' net/mo'}
          </p>
        </div>
      </Card>

      {/* ── Rules ──────────────────────────────────────────────────────── */}
      <Card title={he ? 'איך המנוע פועל' : 'How the engine works'}>
        <ul className="space-y-2.5 text-[12px] text-text-muted leading-relaxed">
          {(he ? [
            'הפקדה חודשית נכנסת ב-100% לנכס שהכי רחוק מתחת למשקל היעד שלו. כך התיק מתאזן בלי למכור — ובלי אירוע מס.',
            `ביטקוין שעובר ${(T.btcTakeProfitThreshold * 100).toFixed(0)} אחוז מהתיק נגזם חזרה ל-${(T.assets.find(a => a.key === 'BTC')!.weight * 100).toFixed(0)} אחוז, והעודף עובר לליבה. זו נעילת רווח, והמכירה היחידה בשלב הצבירה.`,
            `עד חודש ${SWR_START_MONTH} לא נמשך דבר. משם והלאה נמשכים ${(SWR_ANNUAL * 100).toFixed(0)} אחוז בשנה, מחולקים לחודשים.`,
            `המס הוא ${(CAPITAL_GAINS_TAX * 100).toFixed(0)} אחוז על חלק הרווח בלבד ולא על כל המשיכה — בתיק צעיר ההפרש עצום.`,
            'המכירה למשיכה מתחילה במנות שנקנו במחיר הגבוה ביותר (HIFO), כי הן מייצרות את הרווח הקטן ביותר ולכן את המס הנמוך ביותר, ומעדיפה נכסים שחרגו מעל משקל היעד.',
            'הממוצע וההפקדות מחושבים מהנתונים בפועל, והתשואה בפועל נמדדת ב-XIRR מול מועדי ההפקדה האמיתיים.',
          ] : [
            'The monthly deposit goes 100% into whichever asset is furthest below its target weight, so the portfolio rebalances without selling and without a tax event.',
            'Bitcoin above its threshold is trimmed back to target and rotated into the core — profit locking, and the only sale during accumulation.',
            `Nothing is withdrawn before month ${SWR_START_MONTH}; from then on ${(SWR_ANNUAL * 100).toFixed(0)}%/yr is drawn monthly.`,
            `Tax is ${(CAPITAL_GAINS_TAX * 100).toFixed(0)}% on the profit portion only, not the whole withdrawal.`,
            'Withdrawals sell the highest-cost lots first (HIFO) to realise the smallest gain, preferring assets that are over their target weight.',
            'Averages come from actual deposits, and the realised return is measured with XIRR against real deposit dates.',
          ]).map((line, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-gold flex-shrink-0">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
