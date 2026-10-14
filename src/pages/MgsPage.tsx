import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart, Line } from 'recharts';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { useMgsStore, currentPlanMonth } from '../store/mgsStore';
import type { Scenario } from '../store/mgsStore';
import { Card } from '../components/layout/Card';
import { Collapsible } from '../components/layout/Collapsible';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { TrackingSection } from '../components/features/TrackingSection';
import { formatCurrency } from '../utils/format';
import {
  MGS_ASSETS, MGS_RETURNS, milestonesFor, targetLeveraged, allocationFor, COHORTS,
} from '../constants/mgsTracks';
import type { MgsAsset } from '../constants/mgsTracks';
import {
  emptyBook, phaseOf, routeDeposit, projectMgs, insightFrom, leveragedWeight, ageAtMonth,
} from '../utils/mgsEngine';
import type { Phase } from '../utils/mgsEngine';
import { Track1Tables } from '../components/mgs/Track1Tables';

const ASSETS = Object.keys(MGS_ASSETS) as MgsAsset[];

const PHASE_LABEL: Record<Phase, { he: string; en: string; color: string }> = {
  accumulate: { he: 'צבירה', en: 'Accumulation', color: '#F87171' },
  derisk: { he: 'ייצוב — הכל ל-MWRD', en: 'De-risk — all to MWRD', color: '#FBBF24' },
  withdraw: { he: 'משיכה 4%', en: '4% withdrawals', color: '#34D399' },
};

/**
 * MGS — the single investing method.
 *
 * Top to bottom it follows the spec: onboarding routes age to a track; the
 * monthly buy applies Rule 1 to the student's REAL holdings; the projection
 * takes a standard deposit plus one-off months, redraws on every change, and
 * ends with the insight footer the spec words out.
 */
export function MgsPage() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { simulationParams, setMonthlyDeposit } = useStore();
  const {
    age, startMonth, holdings, overrides, scenario,
    setAge, setStartMonth, setHolding, setOverride, removeOverride, setScenario,
  } = useMgsStore();

  const { shiftYears, withdrawYears: horizonYears } = milestonesFor(age);
  const deposit = simulationParams.monthlyDeposit;
  const month = currentPlanMonth(startMonth);
  const phase = phaseOf(age, month);
  /**
   * Ages are anchored to the START of the plan, not to today.
   *
   * `age` is the age now, while the horizon counts from the plan's first
   * month, so for anyone who began investing earlier the two differ. Reading
   * the chart by plan year alone also made it look like the plan starts at
   * age 0, which is what these conversions fix.
   */
  const elapsedYears = (month - 1) / 12;
  const ageAtStart = age - elapsedYears;
  const ageAt = (planYear: number) => Math.round(ageAtStart + planYear);
  const retireAge = ageAt(horizonYears);

  // ── Real holdings → Rule 1 for this month ──────────────────────────────
  const book = emptyBook();
  for (const a of ASSETS) book[a] = { value: holdings[a].value, basis: holdings[a].cost || holdings[a].value };

  const liveWeight = leveragedWeight(book);
  // The leverage target follows the investor's age, stepping down each year.
  const trackCap = targetLeveraged(ageAtMonth(age, month));
  const capPct = +(trackCap * 100).toFixed(0);
  const thisMonthAmount = overrides[month] ?? deposit;
  const routing = routeDeposit(thisMonthAmount, book, age, month);

  // ── Projection from today ──────────────────────────────────────────────
  // Cheap — a few hundred months across four assets — so it simply reruns on
  // every render, which is what "recalculates instantly" needs anyway.
  const rows = projectMgs({
    startAge: age, monthlyDeposit: deposit,
    overrides, returns: MGS_RETURNS[scenario], withdrawYears: 1,
    startMonth: month,
    startBook: Object.fromEntries(ASSETS.map(a => [a, holdings[a].value])),
    startBasis: Object.fromEntries(ASSETS.map(a => [a, holdings[a].cost || holdings[a].value])),
  });

  const insight = insightFrom(rows, age);

  /**
   * Motivation strip: how far the finish line still is, and what this month's
   * deposit is buying in the end. Both come from the projection already
   * computed above, so they move the moment the deposit is edited.
   */
  const monthsToWithdraw = Math.max(0, horizonYears * 12 - month + 1);
  const yearsLeft = Math.floor(monthsToWithdraw / 12);
  const monthsLeft = monthsToWithdraw % 12;
  const depositsLeft = monthsToWithdraw * deposit;
  const atWithdraw = rows.find(r => r.month === horizonYears * 12);
  const firstDraw = rows.find(r => r.phase === 'withdraw');

  const chart = rows.filter(r => r.month % 12 === 0).map(r => ({
    year: r.month / 12,
    [he ? 'גיל' : 'Age']: ageAt(r.month / 12),
    [he ? 'שווי התיק' : 'Portfolio']: Math.round(r.value),
    [he ? 'סך הפקדות' : 'Contributions']: Math.round(r.deposited),
  }));

  const deRiskStart = shiftYears + 1;
  const tableYears = [...new Set([
    ...Array.from({ length: Math.floor(horizonYears / 5) }, (_, i) => (i + 1) * 5),
    deRiskStart,
    horizonYears,
  ])].sort((a, b) => a - b);

  const shiftRow = rows.find(r => r.shiftTax > 0);

  // One-off deposit editor
  const [ooMonth, setOoMonth] = useState(month);
  const [ooAmount, setOoAmount] = useState(8000);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── Onboarding ─────────────────────────────────────────────────── */}
      <Track1Tables age={age} monthlyDeposit={simulationParams.monthlyDeposit} />

      <Card glow explain="track" title={he ? 'המסלול שלי' : 'My track'}
            subtitle={he ? 'הגיל קובע את המסלול. אפשר לשנות ידנית.' : 'Your age sets the track. You can change it.'}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-[10px] text-text-muted mb-1">{he ? 'גיל' : 'Age'}</span>
            <input type="number" min={18} max={80} value={age}
              onChange={e => setAge(Number(e.target.value) || 0)} className="w-full" />
          </label>
          <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2">
            <p className="text-[10px] text-text-dim">{he ? 'מעבר למדד עולמי בגיל' : 'Shift to world index at'}</p>
            <p className="text-[15px] font-bold text-text">{age + shiftYears}</p>
          </div>
          <label className="block">
            <span className="block text-[10px] text-text-muted mb-1">{he ? 'תחילת ההשקעה' : 'Started'}</span>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-full" dir="ltr" />
          </label>
          <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2">
            <p className="text-[10px] text-text-dim">{he ? 'משיכה מגיל' : 'Withdraw from age'}</p>
            <p className="text-[15px] font-bold text-gold">{retireAge}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
          {COHORTS.map(c => {
            const active = age >= c.from && age <= c.to;
            return (
              <div key={c.label}
                className={`p-3 rounded-xl border ${
                  active ? 'border-gold-border bg-gold-muted' : 'border-surface-4 bg-surface-2'
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] font-semibold ${active ? 'text-gold' : 'text-text'}`}>{c.label}</span>
                  <span className="text-[10px] text-text-dim" dir="ltr">
                    {(targetLeveraged(c.from) * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  {he ? `מעבר אחרי ${c.shiftYears} שנה` : `Shift after ${c.shiftYears}y`}
                </p>
                <p className="text-[10px] text-text-dim mt-0.5">
                  {he ? `משיכה אחרי ${c.withdrawYears} שנה` : `Withdraw after ${c.withdrawYears}y`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Phase timeline */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <PhasePill color={PHASE_LABEL.accumulate.color}
            label={`${he ? PHASE_LABEL.accumulate.he : PHASE_LABEL.accumulate.en}: ${he ? 'גיל' : 'age'} ${ageAt(0)}–${ageAt(shiftYears)}`} />
          <PhasePill color={PHASE_LABEL.derisk.color}
            label={`${he ? PHASE_LABEL.derisk.he : PHASE_LABEL.derisk.en}: ${he ? 'גיל' : 'age'} ${ageAt(shiftYears)}–${ageAt(horizonYears)}`} />
          <PhasePill color={PHASE_LABEL.withdraw.color}
            label={`${he ? PHASE_LABEL.withdraw.he : PHASE_LABEL.withdraw.en}: ${he ? 'מגיל' : 'from age'} ${ageAt(horizonYears)}`} />
        </div>
      </Card>

      {/* ── How far to go, and what it buys ────────────────────────────── */}
      {phase !== 'withdraw' && atWithdraw && (
        <Card glow explain="progress" title={he ? 'כמה נשאר, וכמה זה יביא' : 'How far to go, and what it buys'}
              subtitle={he
                ? `הפקדה של ${formatCurrency(deposit)} בחודש, בתרחיש ${scenario === 'moderate' ? 'המתון' : scenario === 'conservative' ? 'השמרני' : 'האגרסיבי'}`
                : `${formatCurrency(deposit)} a month, ${scenario} scenario`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-3">
              <p className="text-[10px] text-text-dim">{he ? 'נשאר עד המשיכה' : 'Left until withdrawals'}</p>
              <p className="text-[19px] font-bold text-gold leading-tight">{monthsToWithdraw}</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {he ? `חודשים · ${yearsLeft} שנים ו-${monthsLeft} חודשים` : `months · ${yearsLeft}y ${monthsLeft}m`}
              </p>
            </div>
            <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-3">
              <p className="text-[10px] text-text-dim">{he ? 'עוד תפקידו' : 'Still to deposit'}</p>
              <p className="text-[19px] font-bold text-text leading-tight">{formatCurrency(depositsLeft)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {he ? `עד גיל ${age + horizonYears}` : `until age ${age + horizonYears}`}
              </p>
            </div>
            <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-3">
              <p className="text-[10px] text-text-dim">{he ? 'התיק בפרישה' : 'Portfolio at retirement'}</p>
              <p className="text-[19px] font-bold text-success leading-tight">{formatCurrency(atWithdraw.value)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {he ? `בגיל ${age + horizonYears}` : `at age ${age + horizonYears}`}
              </p>
            </div>
            <div className="rounded-xl bg-gold-muted border border-gold-border px-3 py-3">
              <p className="text-[10px] text-text-dim">{he ? 'תמשכו הביתה כל חודש' : 'You take home monthly'}</p>
              <p className="text-[19px] font-bold text-gold leading-tight">
                {formatCurrency(firstDraw?.net ?? 0)}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{he ? 'נטו, אחרי מס' : 'net, after tax'}</p>
            </div>
          </div>

          {/* Progress along the accumulation road */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-muted">
                {he ? `עברתם ${month - 1} מתוך ${horizonYears * 12} חודשים` : `${month - 1} of ${horizonYears * 12} months done`}
              </span>
              <span className="text-gold font-semibold" dir="ltr">
                {(((month - 1) / (horizonYears * 12)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full bg-gold transition-all"
                style={{ width: `${Math.min(100, ((month - 1) / (horizonYears * 12)) * 100)}%` }} />
            </div>
          </div>

          <p className="text-[11px] text-text-dim mt-3">
            {he
              ? `כל הפקדה חודשית נוספת מקרבת אתכם ליעד. המספרים מתעדכנים ברגע שמשנים את סכום ההפקדה, והם מניחים שתמשיכו באותו קצב עד גיל ${age + horizonYears}.`
              : `Every monthly deposit moves the line. These update the moment you change the amount, and assume you keep the same pace until age ${age + horizonYears}.`}
          </p>
        </Card>
      )}

      {/* ── This month ─────────────────────────────────────────────────── */}
      <Card glow explain="buyThisMonth" title={he ? 'מה קונים החודש' : 'What to buy this month'}
            subtitle={he
              ? `חודש ${month} בתוכנית · שלב: ${PHASE_LABEL[phase].he}`
              : `Plan month ${month} · phase: ${PHASE_LABEL[phase].en}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-text-muted">{he ? 'הפקדה חודשית קבועה:' : 'Standard monthly deposit:'}</span>
          <input type="number" min={0} step={500} value={deposit || ''}
            onChange={e => setMonthlyDeposit(Number(e.target.value) || 0)}
            className="w-32 text-center font-bold" />
          <span className="text-xs text-text-dim">₪</span>
          {overrides[month] !== undefined && (
            <span className="text-[11px] text-gold">
              {he ? `החודש: ${formatCurrency(thisMonthAmount)} (חד-פעמי)` : `This month: ${formatCurrency(thisMonthAmount)} (one-off)`}
            </span>
          )}
        </div>

        {/* QQQ3 weight vs this track's own ceiling — QA item 3 */}
        {phase === 'accumulate' && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-muted">
                {he ? `משקל QQQ3 בתיק מול ${capPct}%` : `QQQ3 weight vs ${capPct}%`}
              </span>
              <span className={liveWeight >= trackCap ? 'text-danger font-semibold' : 'text-text'} dir="ltr">
                {(liveWeight * 100).toFixed(2)}% / {capPct}%
              </span>
            </div>
            <div className="relative w-full bg-surface-4 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, liveWeight * 100)}%`, background: liveWeight >= trackCap ? '#F87171' : '#A78BFA' }} />
              <div className="absolute inset-y-0" style={{ insetInlineStart: `${trackCap * 100}%`, width: 2, background: '#D4AF37' }} />
            </div>
            <p className="text-[11px] mt-1.5 flex items-start gap-1.5">
              {routing.leverageHalted ? (
                <><Icon name="lock" size={12} className="text-danger mt-0.5 flex-shrink-0" />
                  <span className="text-danger">{he
                    ? 'QQQ3 הגיע ל-25% — הקנייה בו נעצרה. כל ההפקדה עוברת ל-I500 ו-EQQS.'
                    : 'QQQ3 is at 25% — buying is halted. The whole deposit goes to I500 and EQQS.'}</span></>
              ) : (
                <span className="text-text-dim">{he
                  ? 'מתחת ל-25% — ממשיכים לקנות QQQ3 לפי החלק שלו.'
                  : 'Below 25% — QQQ3 is bought at its share.'}</span>
              )}
            </p>
          </div>
        )}

        <div className="space-y-2 mt-4">
          {ASSETS.filter(a => (routing.split[a] ?? 0) > 0 || (allocationFor(ageAtMonth(age, month))[a] ?? 0) > 0).map(a => {
            const amt = routing.split[a] ?? 0;
            const meta = MGS_ASSETS[a];
            return (
              <div key={a} className={`flex items-center justify-between p-3 rounded-xl border ${
                amt > 0 ? 'bg-surface-3 border-surface-4' : 'bg-surface-2 border-surface-4 opacity-60'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <div className="min-w-0">
                    <span className="text-sm text-text block truncate">{he ? meta.labelHe : meta.labelEn}</span>
                    <span className="text-[10px] text-text-dim font-mono" dir="ltr">{a}{meta.isin ? ` · ${meta.isin}` : ''}</span>
                  </div>
                </div>
                <span className={`text-lg font-bold ${amt > 0 ? 'text-gold' : 'text-text-dim'}`}>{formatCurrency(amt)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Holdings ───────────────────────────────────────────────────── */}
      <Collapsible explain="holdings" title={he ? 'האחזקות שלי היום' : 'My holdings today'}
                   subtitle={he ? 'שווי נוכחי וכמה שילמתם — קובע את משקל QQQ3, את המס ואת סדר המכירה' : 'Value and cost — drives the QQQ3 weight, tax and sale order'}>
        <div className="p-4 space-y-2">
          {ASSETS.map(a => (
            <div key={a} className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
              <span className="text-[12px] text-text pb-2" dir="ltr">{a}</span>
              <label className="block">
                <span className="block text-[10px] text-text-muted mb-1">{he ? 'שווי היום ₪' : 'Value ₪'}</span>
                <input type="number" min={0} step={1000} value={holdings[a].value || ''}
                  onChange={e => setHolding(a, { value: Number(e.target.value) || 0 })} className="w-28" />
              </label>
              <label className="block">
                <span className="block text-[10px] text-text-muted mb-1">{he ? 'שולם ₪' : 'Paid ₪'}</span>
                <input type="number" min={0} step={1000} value={holdings[a].cost || ''}
                  onChange={e => setHolding(a, { cost: Number(e.target.value) || 0 })} className="w-28" />
              </label>
            </div>
          ))}
          <p className="text-[10px] text-text-dim pt-1">
            {he ? 'אם לא מזינים כמה שולם, מניחים שנקנה במחיר של היום — כלומר בלי רווח.' : 'Without a cost, the holding is assumed bought at today\'s price — no gain.'}
          </p>
        </div>
      </Collapsible>

      {/* ── Projection ─────────────────────────────────────────────────── */}
      <Card explain="projection" title={he ? 'מחשבון תחזית' : 'Projection calculator'}
            subtitle={he ? 'מתעדכן מיד עם כל שינוי בהפקדות' : 'Recalculates instantly on every deposit change'}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex gap-1.5">
            {(['conservative', 'moderate', 'aggressive'] as Scenario[]).map(s => (
              <button key={s} onClick={() => setScenario(s)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border ${
                  scenario === s ? 'border-gold-border text-gold bg-gold-muted' : 'border-surface-4 text-text-muted hover:text-text'
                }`}>
                {he ? { conservative: 'שמרני', moderate: 'מתון', aggressive: 'אגרסיבי' }[s] : s}
              </button>
            ))}
          </div>
        </div>

        {/* One-off deposits */}
        <div className="rounded-xl border border-surface-4 bg-surface-2 p-3 mb-4">
          <p className="text-[11px] text-text-muted mb-2">{he ? 'הפקדות חד-פעמיות (למשל בונוס)' : 'One-off deposits (e.g. a bonus)'}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="block text-[10px] text-text-dim mb-1">{he ? 'חודש בתוכנית' : 'Plan month'}</span>
              <input type="number" min={1} max={horizonYears * 12} value={ooMonth}
                onChange={e => setOoMonth(Math.max(1, Number(e.target.value) || 1))} className="w-24" />
            </label>
            <label className="block">
              <span className="block text-[10px] text-text-dim mb-1">{he ? 'סכום ₪' : 'Amount ₪'}</span>
              <input type="number" min={0} step={500} value={ooAmount}
                onChange={e => setOoAmount(Math.max(0, Number(e.target.value) || 0))} className="w-28" />
            </label>
            <button onClick={() => setOverride(ooMonth, ooAmount)}
              className="text-[11px] btn-gold px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
              <Icon name="plus" size={12} /> {he ? 'הוסף' : 'Add'}
            </button>
          </div>
          {Object.keys(overrides).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(overrides).sort((a, b) => +a[0] - +b[0]).map(([m, amt]) => (
                <span key={m} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-surface-3 border border-surface-4">
                  {he ? `חודש ${m}` : `Month ${m}`}: {formatCurrency(amt)}
                  <button onClick={() => removeOverride(+m)} className="text-text-dim hover:text-danger">
                    <Icon name="close" size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chart} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
            <defs>
              <linearGradient id="mgsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey={he ? 'גיל' : 'Age'} stroke="#555" tick={{ fill: '#888', fontSize: 11 }}
              label={{ value: he ? 'גיל' : 'Age', position: 'insideBottomRight', offset: -4, fill: '#666', fontSize: 10 }} />
            <YAxis tickFormatter={v => `₪${(v / 1_000_000).toFixed(1)}M`} stroke="#555" tick={{ fill: '#888', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
              formatter={v => `₪${Number(v).toLocaleString()}`}
              labelFormatter={v => (he ? `גיל ${v}` : `Age ${v}`)} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
            <Area type="monotone" dataKey={he ? 'שווי התיק' : 'Portfolio'} stroke="#D4AF37" fill="url(#mgsGrad)" strokeWidth={2} />
            <Line type="monotone" dataKey={he ? 'סך הפקדות' : 'Contributions'} stroke="#666" strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Dynamic insight footer — worded as the spec specifies */}
        <div className="rounded-xl border border-gold-border bg-gold-muted px-4 py-3 mt-3">
          {insight ? (
            <p className="text-[13px] text-text leading-relaxed">
              {he ? (
                <>אם תמשיכו בדפוס ההפקדה הנוכחי (ממוצע של <b className="text-gold">{formatCurrency(insight.avgMonthlyDeposit)}</b> לחודש),
                  סך ההפקדות הצפוי לטווח ארוך יהיה <b className="text-gold">{formatCurrency(insight.totalContributions)}</b>,
                  והמשיכה החודשית לפי כלל ה-4% תהיה כ-<b className="text-gold">{formatCurrency(insight.netMonthlyPayout)}</b> לחודש.</>
              ) : (
                <>If you continue with your current average deposit pattern (averaging <b className="text-gold">{formatCurrency(insight.avgMonthlyDeposit)}</b>/month),
                  your long-term projected total contributions will be <b className="text-gold">{formatCurrency(insight.totalContributions)}</b>,
                  and your sustainable monthly withdrawal via the 4% rule will be approx. <b className="text-gold">{formatCurrency(insight.netMonthlyPayout)}</b>/month.</>
              )}
            </p>
          ) : (
            <p className="text-[12px] text-text-muted">{he ? 'התוכנית כבר בשלב המשיכה.' : 'The plan is already in its withdrawal phase.'}</p>
          )}
          {insight && (
            <p className="text-[10px] text-text-dim mt-1">
              {he
                ? `נטו, אחרי מס רווח הון של 25% על חלק הרווח. ברוטו: ${formatCurrency((insight.netMonthlyPayout / 0.92))} לחודש.`
                : `Net of 25% capital gains tax on the profit portion. Gross: ${formatCurrency((insight.netMonthlyPayout / 0.92))}/month.`}
            </p>
          )}
        </div>

        {shiftRow && (
          <p className="text-[11px] text-warning mt-3 flex items-start gap-1.5">
            <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0" />
            {he
              ? `בתחילת שלב הייצוב (שנה ${Math.ceil(shiftRow.month / 12)}) כל האחזקות עוברות ל-MWRD. זו מכירה: רווח ממומש ${formatCurrency(shiftRow.shiftGain)}, מס ${formatCurrency(shiftRow.shiftTax)} — כבר מנוכה מהתחזית.`
              : `At de-risk start (year ${Math.ceil(shiftRow.month / 12)}) every holding moves to MWRD. That is a sale: gain ${formatCurrency(shiftRow.shiftGain)}, tax ${formatCurrency(shiftRow.shiftTax)} — already deducted.`}
          </p>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-surface-4 text-text-muted text-[11px]">
                <th className="text-start py-2">{he ? 'גיל' : 'Age'}</th>
                <th className="text-start py-2 text-[10px]">{he ? 'שנה בתוכנית' : 'Plan year'}</th>
                <th className="text-start py-2">{he ? 'שלב' : 'Phase'}</th>
                <th className="text-end py-2">{he ? 'סך הפקדות' : 'Contributions'}</th>
                <th className="text-end py-2">{he ? 'שווי התיק' : 'Portfolio'}</th>
                <th className="text-end py-2">QQQ3</th>
              </tr>
            </thead>
            <tbody>
              {tableYears.map(y => {
                const r = rows.find(x => x.month === y * 12);
                if (!r) return null;
                const ph = PHASE_LABEL[r.phase];
                return (
                  <tr key={y} className="border-b border-surface-3/50">
                    <td className="py-2 text-text font-medium">{ageAt(y)}</td>
                    <td className="py-2 text-text-dim text-[11px]">{y}</td>
                    <td className="py-2 text-[11px]" style={{ color: ph.color }}>{he ? ph.he : ph.en}</td>
                    <td className="py-2 text-end text-text-muted">{formatCurrency(r.deposited)}</td>
                    <td className="py-2 text-end text-gold font-medium">{formatCurrency(r.value)}</td>
                    <td className={`py-2 text-end text-[11px] ${r.leveragedWeight >= trackCap ? 'text-danger' : 'text-text-dim'}`} dir="ltr">
                      {(r.leveragedWeight * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-text-dim mt-3 leading-relaxed">
          {he
            ? 'תקרת ה-25% עוצרת קנייה של QQQ3 בלבד ולא מוכרת. לכן כשהוא עולה מהר יותר משאר התיק, משקלו יכול לעבור 25% — העמודה מציגה את המשקל בפועל. במשיכה נמכר קודם הנכס עם שיעור הרווח הגבוה ביותר. התחזית מבוססת על תשואות צפויות לכל נכס ואינה חיזוי.'
            : 'The 25% cap halts QQQ3 buying only and never sells, so when it outgrows the rest its weight can pass 25% — the column shows the actual weight. Withdrawals sell the highest-margin asset first. A projection from expected returns, not a forecast.'}
        </p>
      </Card>

      {/* ── Tracking ───────────────────────────────────────────────────── */}
      <TrackingSection />

      <Disclaimer variant="full" />
    </div>
  );
}

function PhasePill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface-4 bg-surface-2">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-text-muted">{label}</span>
    </span>
  );
}
