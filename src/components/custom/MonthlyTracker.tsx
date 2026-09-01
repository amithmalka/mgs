import { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, LineChart } from 'recharts';
import { useLangStore } from '../../store/langStore';
import { useCustomStore } from '../../store/customStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';
import { formatCurrency } from '../../utils/format';
import { buildProgress, currentMonthKey } from '../../utils/customPortfolio';

/**
 * Month-by-month log of what actually happened, against the plan.
 *
 * The student reports the deposit they actually made and the portfolio value
 * they actually see in their broker, so this works regardless of where the
 * money is held.
 */
export function MonthlyTracker({ blendedReturn }: { blendedReturn: number }) {
  const { lang } = useLangStore();
  const { entries, upsertEntry, removeEntry, monthlyDeposit, holdings } = useCustomStore();

  const [month, setMonth] = useState(() => currentMonthKey(new Date()));
  const [deposit, setDeposit] = useState(String(monthlyDeposit));
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');

  // The plan starts from what was held before any month was logged.
  const startingValue = useMemo(() => {
    const held = holdings.reduce((s, h) => s + h.currentValue, 0);
    const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
    // Once there is history, anchor the plan at the first reported value minus
    // that month's deposit — otherwise today's holdings would shift the whole
    // plan line every time the student updates their current balance.
    if (sorted.length > 0) return Math.max(0, sorted[0].value - sorted[0].deposit);
    return held;
  }, [holdings, entries]);

  const rows = useMemo(
    () => buildProgress(entries, monthlyDeposit, blendedReturn, startingValue),
    [entries, monthlyDeposit, blendedReturn, startingValue]
  );

  const add = () => {
    setErr('');
    if (!/^\d{4}-\d{2}$/.test(month)) { setErr(t('monthRequired', lang)); return; }
    const v = Number(value);
    if (!value.trim() || Number.isNaN(v) || v < 0) { setErr(t('valueRequired', lang)); return; }
    upsertEntry({ month, deposit: Math.max(0, Number(deposit) || 0), value: v });
    setValue('');
  };

  const labelActual = t('actualValue', lang);
  const labelPlan = t('planValue', lang);
  const chartData = rows.map(r => ({
    month: r.month,
    [labelActual]: r.actualValue,
    [labelPlan]: r.planValue,
  }));

  const latest = rows[rows.length - 1];

  return (
    <Card title={t('monthlyTitle', lang)} subtitle={t('monthlySub', lang)}>
      {/* Entry form */}
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <label className="min-w-[130px]">
          <span className="block text-[10px] text-text-muted mb-1">{t('month', lang)}</span>
          <input type="month" value={month} onChange={e => { setMonth(e.target.value); setErr(''); }} className="w-full" dir="ltr" />
        </label>
        <label className="flex-1 min-w-[110px]">
          <span className="block text-[10px] text-text-muted mb-1">{t('depositedThisMonth', lang)}</span>
          <input type="number" min={0} step={100} value={deposit} onChange={e => setDeposit(e.target.value)} className="w-full" />
        </label>
        <label className="flex-1 min-w-[110px]">
          <span className="block text-[10px] text-text-muted mb-1">{t('valueThisMonth', lang)}</span>
          <input type="number" min={0} step={100} value={value} onChange={e => { setValue(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && add()} className="w-full" />
        </label>
        <button onClick={add} className="text-[11px] btn-gold px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
          <Icon name="plus" size={13} /> {t('saveMonth', lang)}
        </button>
      </div>
      {err && <p className="text-[11px] text-danger mb-3">{err}</p>}

      {rows.length === 0 ? (
        <p className="text-[12px] text-text-dim text-center py-6">{t('noMonthlyData', lang)}</p>
      ) : (
        <>
          {/* Headline: ahead of or behind plan */}
          {latest && (
            <div className={`rounded-xl border px-4 py-3 mb-4 ${
              latest.gap >= 0 ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
            }`}>
              <p className="text-[11px] text-text-muted">{t('vsPlan', lang, { month: latest.month })}</p>
              <p className={`text-lg font-bold mt-0.5 ${latest.gap >= 0 ? 'text-success' : 'text-warning'}`}>
                {latest.gap >= 0 ? '+' : ''}{formatCurrency(latest.gap)}
              </p>
              <p className="text-[10px] text-text-dim mt-0.5">
                {t('actualVsPlanDetail', lang, {
                  actual: formatCurrency(latest.actualValue),
                  plan: formatCurrency(latest.planValue),
                })}
              </p>
            </div>
          )}

          {rows.length > 1 && (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
                  formatter={(v) => `₪${Number(v).toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
                <Line type="monotone" dataKey={labelPlan} stroke="#555" strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey={labelActual} stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-surface-4 text-text-muted text-[11px]">
                  <th className="text-start py-2">{t('month', lang)}</th>
                  <th className="text-end py-2">{t('deposited', lang)}</th>
                  <th className="text-end py-2">{t('actualValue', lang)}</th>
                  <th className="text-end py-2">{t('planValue', lang)}</th>
                  <th className="text-end py-2">{t('gap', lang)}</th>
                  <th className="text-end py-2" />
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map(r => {
                  const entry = entries.find(e => e.month === r.month);
                  return (
                    <tr key={r.month} className="border-b border-surface-3/50">
                      <td className="py-2 text-text" dir="ltr">{r.month}</td>
                      <td className="py-2 text-end text-text-muted">{formatCurrency(r.actualDeposit)}</td>
                      <td className="py-2 text-end text-text">{formatCurrency(r.actualValue)}</td>
                      <td className="py-2 text-end text-text-dim">{formatCurrency(r.planValue)}</td>
                      <td className={`py-2 text-end font-medium ${r.gap >= 0 ? 'text-success' : 'text-warning'}`}>
                        {r.gap >= 0 ? '+' : ''}{formatCurrency(r.gap)}
                      </td>
                      <td className="py-2 text-end">
                        {entry && (
                          <button onClick={() => removeEntry(entry.id)} title={t('delete', lang)}
                            className="w-6 h-6 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 inline-flex items-center justify-center">
                            <Icon name="trash" size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-[10px] text-text-dim mt-3">{t('monthlyNote', lang)}</p>
    </Card>
  );
}
