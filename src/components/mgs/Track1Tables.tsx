import { useMemo, useState } from 'react';
import { Card } from '../layout/Card';
import { Collapsible } from '../layout/Collapsible';
import { ASSET_HE, targetMix, horizonFor, type T1Asset } from '../../constants/mgsTrack1';
import { T1_RETURNS, SCENARIO_LABEL, type Scenario } from '../../constants/mgsTrack1Returns';
import { projectTrack1, JEPQ_YIELD } from '../../utils/mgsTrack1Engine';
import { formatCurrency } from '../../utils/format';

const COLOR: Record<T1Asset, string> = {
  BTC: '#FBBF24', SMH: '#F87171', SPMO: '#A78BFA',
  XLK: '#7DD3FC', JEPQ: '#D4AF37', WORLD: '#10B981',
};
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/**
 * Track 1 end to end: the client's age and deposit in, every table they need
 * from today to the day they draw.
 */
export function Track1Tables({ age, monthlyDeposit = 4000 }: { age: number; monthlyDeposit?: number }) {
  const [scenario, setScenario] = useState<Scenario>('moderate');
  const h = horizonFor(age);
  const [horizon, setHorizon] = useState(h.totalYears);

  const p = useMemo(
    () => projectTrack1(age, monthlyDeposit, scenario, horizon),
    [age, monthlyDeposit, scenario, horizon],
  );

  const marks = useMemo(() => {
    const s = new Set<number>([1, 3, 5, h.depositYears, horizon]);
    for (let y = 10; y < horizon; y += 5) s.add(y);
    return [...s].filter(y => y >= 1 && y <= horizon).sort((a, b) => a - b);
  }, [h.depositYears, horizon]);

  return (
    <div dir="rtl" className="flex flex-col gap-5">
      <Card glow explain="track"
            title={`מסלול 1 · הכנסה חודשית וצמיחה — בן ${age}, ${formatCurrency(monthlyDeposit)} בחודש`}
            subtitle={`${h.depositYears} שנות השקעה, ואז ${h.shiftYears} שנות חיתוך למדד עולמי`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-[11px] text-text-muted">
            משיכה בגיל
            <input type="number" min={age + 1} max={age + 45} value={age + horizon}
              onChange={e => setHorizon(Math.max(1, (Number(e.target.value) || age + 1) - age))}
              className="w-16 bg-surface-3 border border-surface-4 rounded-lg px-2 py-1
                         text-[12px] text-text text-center" />
            <span className="text-text-dim">({horizon} שנים)</span>
          </label>
          <span className="flex items-center gap-1.5">
            {(['conservative', 'moderate', 'optimistic'] as Scenario[]).map(s => (
              <button key={s} onClick={() => setScenario(s)}
                className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-colors ${
                  scenario === s ? 'border-gold text-gold bg-gold-muted'
                                 : 'border-surface-4 text-text-dim hover:bg-surface-3/50'}`}>
                {SCENARIO_LABEL[s]}
              </button>
            ))}
          </span>
        </div>
      </Card>

      <Card title="מה יוצא בסוף" subtitle={`בגיל ${p.withdrawAge}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="סך ההפקדות" value={formatCurrency(p.totalDeposited)} />
          <Stat label="שווי התיק" value={formatCurrency(p.finalValue)} tone="gold" />
          <Stat label="מתוכו JEPQ" value={formatCurrency(p.finalJepq)} tone="gold" />
          <Stat label="הכנסה חודשית מ-JEPQ" value={formatCurrency(p.monthlyFromJepq)} tone="green" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Stat label="חלוקות שהתקבלו בדרך, נטו" value={formatCurrency(p.jepqPaidTotal)} tone="green" />
          <Stat label="נקצר לאורך הדרך, נטו" value={formatCurrency(p.totalHarvested)} />
          <Stat label="מס ששולם על הקצירות" value={formatCurrency(p.totalTax)} tone="warn" />
          <Stat label="לפי כלל 4%, נטו" value={formatCurrency(p.monthlyIncomeNet)} />
        </div>
        <p className="text-[10.5px] text-text-dim mt-3 font-light leading-relaxed">
          בסוף התקופה JEPQ הוא {pct(p.finalValue > 0 ? p.finalJepq / p.finalValue : 0)} מהתיק,
          והוא מחלק כ-{pct(JEPQ_YIELD)} בשנה. <span className="text-text-muted">החלוקה
          הזאת לא מושקעת מחדש — היא יוצאת מהתיק ומשמשת למגורים, מהחודש הראשון.</span>{' '}
          לכן הערך של JEPQ לא מצטבר אלא נשאר שטוח, ובמקום זה הצטברו
          {' '}{formatCurrency(p.jepqPaidTotal)} שהתקבלו בפועל לאורך הדרך. כלל ה-4% חל רק
          על הצד הצומח ביום המשיכה — שתי הכנסות שונות, לא אותה הכנסה.
        </p>
      </Card>

      <Card title="שנה אחר שנה, מהיום ועד המשיכה">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-gold-light">
                {['שנה', 'גיל', 'הופקד', 'שווי', 'תנודתי', 'JEPQ', 'התקבל השנה', 'נקצר השנה', 'מס', ''].map(x => (
                  <th key={x} className="text-start font-semibold py-2 px-2 whitespace-nowrap">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.rows.filter(r => marks.includes(r.year)).map(r => (
                <tr key={r.year} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="py-2 px-2 text-text-muted">{r.year}</td>
                  <td className="py-2 px-2 text-text-muted">{r.age}</td>
                  <td className="py-2 px-2 text-text-dim whitespace-nowrap">{formatCurrency(r.deposited)}</td>
                  <td className="py-2 px-2 text-text font-semibold whitespace-nowrap">{formatCurrency(r.value)}</td>
                  <td className="py-2 px-2 text-text-dim">{pct(r.volatile)}</td>
                  <td className="py-2 px-2 text-gold whitespace-nowrap">{formatCurrency(r.jepq)}</td>
                  <td className="py-2 px-2 text-success font-semibold whitespace-nowrap">{formatCurrency(r.jepqCash)}</td>
                  <td className="py-2 px-2 text-success whitespace-nowrap">{formatCurrency(r.harvested)}</td>
                  <td className="py-2 px-2 text-warning whitespace-nowrap">{formatCurrency(r.taxPaid)}</td>
                  <td className="py-2 px-2 text-[10px] text-gold whitespace-nowrap">
                    {r.year === h.depositYears ? 'חיתוך למדד עולמי' : r.year === horizon ? 'תחילת משיכה' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Collapsible explain="ageMatrix" title="מנגנון הקנייה — התמהיל לפי גיל" defaultOpen
                   subtitle="יורד 2% בשנה מהרכיב האגרסיבי, וההפרש עובר ל-SPMO ו-XLK">
        <div className="px-4 pb-4 flex flex-col gap-2">
          {Array.from({ length: Math.min(8, horizon + 1) }, (_, i) => Math.round(i * horizon / 7))
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(y => {
              const t = targetMix(age + y);
              const parts: Array<[T1Asset, number]> = (['BTC', 'SMH', 'SPMO', 'XLK'] as T1Asset[])
                .map(a => [a, t[a]]).filter(([, v]) => (v as number) > 0) as Array<[T1Asset, number]>;
              const past = y >= h.depositYears;
              return (
                <div key={y} className="flex items-center gap-3">
                  <span className="text-[10.5px] text-text-dim w-24 flex-shrink-0">
                    {y === 0 ? 'היום' : `שנה ${y}`} · גיל {age + y}
                  </span>
                  <div className="flex-1 flex rounded-lg overflow-hidden h-6">
                    {past
                      ? <div style={{ width: '100%', background: COLOR.WORLD }}
                             className="flex items-center justify-center">
                          <span className="text-[9px] font-semibold" style={{ color: '#0C0C0E' }}>
                            מדד עולמי 100%
                          </span>
                        </div>
                      : parts.map(([a, v]) => (
                          <div key={a} style={{ width: `${v * 100}%`, background: COLOR[a] }}
                               title={`${ASSET_HE[a]} ${pct(v)}`}
                               className="flex items-center justify-center">
                            {v > 0.1 && <span className="text-[9px] font-semibold"
                                              style={{ color: '#0C0C0E' }}>{pct(v)}</span>}
                          </div>
                        ))}
                  </div>
                </div>
              );
            })}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {(['BTC', 'SMH', 'SPMO', 'XLK', 'JEPQ', 'WORLD'] as T1Asset[]).map(a => (
              <span key={a} className="flex items-center gap-1 text-[9.5px] text-text-dim">
                <span className="w-2 h-2 rounded-sm" style={{ background: COLOR[a] }} />
                {ASSET_HE[a]}
              </span>
            ))}
          </div>
        </div>
      </Collapsible>

      <Collapsible explain="returns" title="על מה התחזית עומדת"
                   subtitle="העשור האחרון מול ההיסטוריה הארוכה מול ההנחה">
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-gold-light">
                {['הנכס', 'עשור אחרון', 'הטווח הארוך', 'התחזית', 'מקור'].map(x => (
                  <th key={x} className="text-start font-semibold py-2 px-2 whitespace-nowrap">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(T1_RETURNS) as T1Asset[]).map(a => {
                const r = T1_RETURNS[a];
                return (
                  <tr key={a} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="py-2 px-2 text-text whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm me-1.5" style={{ background: COLOR[a] }} />
                      {ASSET_HE[a]}
                    </td>
                    <td className="py-2 px-2 text-text-dim">{r.last10.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-text-muted">
                      {r.longRun.toFixed(1)}% <span className="text-text-dim">({r.longRunYears}ש׳)</span>
                    </td>
                    <td className="py-2 px-2 text-gold font-semibold">{r.pct[scenario]}%</td>
                    <td className="py-2 px-2 text-[10px] text-text-dim font-light">
                      {r.source}{r.assumed ? ' · הנחה' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}

function Stat({ label, value, tone = 'text' }:
  { label: string; value: string; tone?: 'text' | 'gold' | 'green' | 'warn' }) {
  const color = tone === 'gold' ? 'text-gold'
    : tone === 'green' ? 'text-success'
    : tone === 'warn' ? 'text-warning' : 'text-text';
  return (
    <div className="rounded-xl border border-surface-4 bg-surface-2/40 px-3 py-2.5">
      <p className="text-[9.5px] text-text-dim mb-1">{label}</p>
      <p className={`text-[15px] font-bold leading-tight ${color}`}>{value}</p>
    </div>
  );
}
