import { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, Line } from 'recharts';
import { useLangStore } from '../../store/langStore';
import { useStore } from '../../store';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { formatCurrency } from '../../utils/format';
import { simulateDividends, yearIncomeReached, MAX_MODELLED_YIELD } from '../../utils/dividends';

/**
 * Dividend income simulation for the Simulation tab: how much cash the
 * portfolio pays out year by year, with or without reinvesting.
 */
export function DividendSimulation() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { currentPortfolioValue, simulationParams } = useStore();

  const [dividendYield, setYield] = useState(4);
  const [dividendGrowth, setGrowth] = useState(7);
  const [priceReturn, setPriceReturn] = useState(7);
  const [years, setYears] = useState(30);
  const [reinvest, setReinvest] = useState(true);
  const [depositUntil, setDepositUntil] = useState(20);
  const [targetMonthly, setTargetMonthly] = useState(10000);

  const initialValue = currentPortfolioValue || simulationParams.initialDeposit;
  const monthlyDeposit = simulationParams.monthlyDeposit;

  const rows = useMemo(() => simulateDividends({
    initialValue, monthlyDeposit, years, priceReturn,
    dividendYield, dividendGrowth, reinvest, depositUntilYear: depositUntil,
  }), [initialValue, monthlyDeposit, years, priceReturn, dividendYield, dividendGrowth, reinvest, depositUntil]);

  const last = rows[rows.length - 1];
  const reachYear = yearIncomeReached(rows, targetMonthly * 12);
  const capped = last.effectiveYield >= MAX_MODELLED_YIELD;

  const L = {
    income: he ? 'הכנסה שנתית מדיבידנד' : 'Annual dividend',
    value: he ? 'שווי התיק' : 'Portfolio value',
  };

  const data = rows.filter(r => r.year > 0).map(r => ({
    year: r.year,
    [L.income]: r.annualDividend,
    [L.value]: r.value,
  }));

  return (
    <Card
      title={he ? 'סימולציית דיבידנדים' : 'Dividend Simulation'}
      subtitle={he
        ? 'כמה מזומן התיק משלם לכם בעצמו, בלי למכור כלום.'
        : 'How much cash the portfolio pays you on its own, without selling anything.'}
    >
      {/* Inputs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Field label={he ? 'תשואת דיבידנד התחלתית %' : 'Starting yield %'}
          value={dividendYield} onChange={setYield} step={0.25} min={0} max={15} />
        <Field label={he ? 'צמיחת הדיבידנד %/שנה' : 'Dividend growth %/yr'}
          value={dividendGrowth} onChange={setGrowth} step={0.5} min={0} max={20} />
        <Field label={he ? 'עליית מחיר %/שנה' : 'Price return %/yr'}
          value={priceReturn} onChange={setPriceReturn} step={0.5} min={-5} max={20} />
        <Field label={he ? 'שנים' : 'Years'}
          value={years} onChange={setYears} step={1} min={1} max={50} />
        <Field label={he ? 'מפקידים עד שנה' : 'Deposit until year'}
          value={depositUntil} onChange={setDepositUntil} step={1} min={0} max={50} />
        <Field label={he ? 'יעד הכנסה חודשית ₪' : 'Target monthly income'}
          value={targetMonthly} onChange={setTargetMonthly} step={500} min={0} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
          <input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)} />
          {he ? 'להשקיע מחדש את הדיבידנדים' : 'Reinvest dividends'}
        </label>
        <span className="text-[10px] text-text-dim">
          {he
            ? `תשואה כוללת מגולמת: ${(priceReturn + dividendYield).toFixed(1)}% (מחיר + דיבידנד)`
            : `Implied total return: ${(priceReturn + dividendYield).toFixed(1)}%`}
        </span>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label={he ? `הכנסה חודשית בשנה ${years}` : `Monthly income at year ${years}`}
          value={formatCurrency(last.monthlyDividend)} accent />
        <Stat label={he ? 'סך דיבידנדים שהתקבלו' : 'Total dividends received'}
          value={formatCurrency(last.cumulativeDividends)} />
        <Stat label={he ? 'תשואה על הכסף שהופקד' : 'Yield on cost'}
          value={`${last.yieldOnCost.toFixed(1)}%`} accent />
        <Stat label={he ? 'שווי התיק' : 'Portfolio value'}
          value={formatCurrency(last.value)} />
      </div>

      {/* Target */}
      <div className={`rounded-xl border px-4 py-3 mb-4 ${
        reachYear ? 'border-success/30 bg-success/5' : 'border-surface-4 bg-surface-3'
      }`}>
        {reachYear ? (
          <p className="text-[13px] text-success font-semibold">
            {he
              ? `יעד של ${formatCurrency(targetMonthly)} לחודש מושג בשנה ${reachYear}.`
              : `Target of ${formatCurrency(targetMonthly)}/mo is reached in year ${reachYear}.`}
          </p>
        ) : (
          <p className="text-[13px] text-text-muted">
            {he
              ? `היעד של ${formatCurrency(targetMonthly)} לחודש לא מושג בתוך ${years} שנים בהנחות האלה.`
              : `Target of ${formatCurrency(targetMonthly)}/mo is not reached within ${years} years under these assumptions.`}
          </p>
        )}
      </div>

      {capped && (
        <p className="text-[11px] text-warning flex items-start gap-1.5 mb-3">
          <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
          {he
            ? `תשואת הדיבידנד הגיעה לתקרת המודל (${MAX_MODELLED_YIELD}%) ולא תגדל מעבר לכך. צמיחת דיבידנד מתמשכת ללא תקרה מייצרת מספרים שאין להם מקבילה במציאות.`
            : `The modelled yield hit its ${MAX_MODELLED_YIELD}% ceiling. Uncapped dividend growth produces yields no real security pays.`}
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
          <Tooltip
            contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
            formatter={v => `₪${Number(v).toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
          <Area yAxisId="l" type="monotone" dataKey={L.income} stroke="#F472B6" fill="url(#divGrad)" strokeWidth={2} />
          <Line yAxisId="r" type="monotone" dataKey={L.value} stroke="#D4AF37" dot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Year table, every 5th year */}
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
                <td className="py-2 text-end text-dividend" style={{ color: '#F472B6' }}>{formatCurrency(r.annualDividend)}</td>
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
          ? 'עליית המחיר והדיבידנד מוזנים בנפרד כדי לא לספור את הדיבידנד פעמיים — התשואה הכוללת היא הסכום שלהם. המודל אינו מביא בחשבון מס על דיבידנדים, עמלות או אינפלציה, ומניח תשלום קבוע וללא הפסקה. בפועל חברות מקצצות דיבידנדים.'
          : 'Price and dividend are entered separately so the dividend is not counted twice — total return is their sum. The model ignores dividend tax, fees and inflation, and assumes an uninterrupted payout. Real companies cut dividends.'}
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
      <input
        type="number" value={value} step={step} min={min} max={max}
        onChange={e => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, max != null ? Math.min(max, n) : n));
        }}
        className="w-full"
      />
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
