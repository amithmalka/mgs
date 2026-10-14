import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMgsStore } from '../store/mgsStore';
import { useStore } from '../store';
import { usePlanStore, planMonth, thisMonth } from '../store/planStore';
import { buildMonth, applyMonth, type Reason } from '../utils/monthPlan';
import { SLEEVE_HE, type SleeveId } from '../constants/mgsScenarios';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { Icon } from '../components/shared/Icon';

/** The instrument each sleeve is actually bought through. */
const TICKER: Partial<Record<SleeveId, string>> = {
  BTC: 'BTC/USD', SMH: 'SMH', SPMO: 'SPMO', XLK: 'XLK', WORLD: 'URTH',
};
const BUY_AS: Partial<Record<SleeveId, string>> = {
  BTC: 'IBIT', SMH: 'SMH', SPMO: 'SPMO', XLK: 'XLK', WORLD: 'URTH',
};

const REASON: Record<Reason, { label: string; tone: string }> = {
  onTarget: { label: 'על היעד', tone: 'var(--muted)' },
  over:     { label: 'מעל היעד — חצי מנה', tone: 'var(--down)' },
  under:    { label: 'מתחת ליעד — מנה מלאה', tone: 'var(--up)' },
  deep:     { label: 'ירד מעל 50% מהשיא — מנה מוגדלת', tone: 'var(--gold)' },
  landing:  { label: 'שנות הנחיתה — הכל למדד עולמי', tone: 'var(--muted)' },
};

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthName = (m: string) => `${MONTHS_HE[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/**
 * The month's instruction: where every shekel goes, and whether a harvest came
 * due. This is the screen the plan cannot be run without, because it is the
 * only place that knows what is held and what each sleeve has already done.
 */
export function MonthPage() {
  const { age } = useMgsStore();
  const { simulationParams } = useStore();
  const deposit = simulationParams.monthlyDeposit;
  const { started, startMonth, lots, log, start, recordMonth } = usePlanStore();

  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [fx, setFx] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const syms = [...new Set(Object.values(TICKER))] as string[];
      const p = await fetchPrices([...syms, 'USD/ILS']);
      setPrices(p); setFx(p['USD/ILS']?.price);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  /** unit price in shekels, so every figure on this screen is in one currency */
  const priceIls = useMemo(() => {
    const out: Partial<Record<SleeveId, number>> = {};
    for (const [k, t] of Object.entries(TICKER) as Array<[SleeveId, string]>) {
      const usd = prices[t]?.price;
      if (usd && fx) out[k] = usd * fx;
    }
    return out;
  }, [prices, fx]);

  const month = planMonth(startMonth);
  const current = thisMonth();
  const doneThisMonth = log.some(l => l.month === current);
  const ready = Object.keys(priceIls).length > 0;

  const plan = useMemo(
    () => buildMonth(age, month, deposit, lots, priceIls),
    [age, month, deposit, lots, priceIls],
  );

  const confirm = () => {
    const next = applyMonth(lots, plan, priceIls);
    recordMonth({
      month: current,
      bought: Object.fromEntries(plan.lines.filter(l => l.amount > 0).map(l => [l.sleeve, l.amount])),
      harvested: plan.harvests.reduce((s, h) => s + h.net, 0),
      taxPaid: plan.harvests.reduce((s, h) => s + h.tax, 0),
      deposit,
    }, next);
  };

  if (!started) {
    return (
      <div className="term">
        <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="eyebrow">MONEY GROWTH SYSTEM</span>
          <h1>נתחיל את התוכנית</h1>
          <p className="lede">
            מכאן והלאה המערכת זוכרת מה אתה מחזיק, מה העלות של כל רכיב, מה השיא שלו,
            ומתי קצרת ממנו לאחרונה — ואומרת לך בכל חודש בדיוק לאן ההפקדה הולכת.
          </p>
        </header>
        <div className="panel" style={{ gap: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--mid)' }}>
            מתחילים מאפס, או ממה שכבר מוחזק? אפשר להזין אחזקות קיימות אחרי הכניסה.
          </p>
          <button className="opt" type="button" aria-pressed
            onClick={() => start(thisMonth())}
            style={{ alignSelf: 'flex-start', padding: '9px 20px', fontSize: 13.5 }}>
            להתחיל ב{monthName(thisMonth())}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="term">
      <div className="tape">
        <span className="tk"><span className="sym">חודש {month}</span><b>{monthName(current)}</b></span>
        <span className="tk"><span className="sym">גיל</span><b>{plan.age}</b></span>
        <span className="tk"><span className="sym">הפקדה</span><b>{n0(deposit)} ₪</b></span>
        <span className="tk"><span className="sym">שווי התיק</span>
          <b>{ready ? `${n0(plan.portfolio)} ₪` : '—'}</b></span>
        {fx && <span className="tk"><span className="sym">דולר</span><b>{fx.toFixed(3)}</b></span>}
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="eyebrow">{monthName(current)} · חודש {month} בתוכנית</span>
        <h1>{doneThisMonth ? 'החודש בוצע' : 'מה קונים החודש'}</h1>
        {!ready && (
          <p className="lede" style={{ color: 'var(--down)' }}>
            אין מחירים כרגע, ולכן אי אפשר לחשב את החלוקה. {err}
          </p>
        )}
      </header>

      {plan.harvests.length > 0 && (
        <div className="final">
          <span className="fl2">שיא חדש אחרי נפילה — הגיעה קצירה</span>
          {plan.harvests.map(h => (
            <span key={h.sleeve} style={{ flexBasis: '100%' }}>
              <span className="big" style={{ fontSize: 26 }}>{n0(h.net)} ₪</span>{' '}
              <span className="eqn">
                מ{SLEEVE_HE[h.sleeve]} ל-JEPQ · מס {n0(h.tax)} ₪ · עבר את {n0(h.bar)} ₪
              </span>
            </span>
          ))}
        </div>
      )}

      <section>
        <h2>החלוקה של החודש</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['הרכיב', 'קונים', 'דרך', 'למה', 'כמה מחזיקים', 'חלק בתיק', 'היעד', 'מתחת לשיא']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {plan.lines.map(l => (
                <tr key={l.sleeve} className={l.amount > 0 ? '' : 'dim'}>
                  <td>{SLEEVE_HE[l.sleeve]}</td>
                  <td className="v gold" style={{ fontSize: 15 }}>{n0(l.amount)} ₪</td>
                  <td className="v dim" dir="ltr">{BUY_AS[l.sleeve]}</td>
                  <td style={{ color: REASON[l.reason].tone, whiteSpace: 'normal' }}>
                    {REASON[l.reason].label}
                  </td>
                  <td className="v">{ready ? n0(l.value) : '—'}</td>
                  <td className="v dim">{ready ? `${(l.share * 100).toFixed(0)}%` : '—'}</td>
                  <td className="v dim">{(l.target * 100).toFixed(0)}%</td>
                  <td className="v" style={{ color: l.fromHigh > 0.3 ? 'var(--gold)' : 'var(--muted)' }}>
                    {l.fromHigh > 0 ? `${(l.fromHigh * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fl">
        <div className="f tot" style={{ flex: '1 1 100%' }}>
          <span className="fk">{doneThisMonth ? 'בוצע' : 'לביצוע החודש'}</span>
          <span className="ft" style={{ fontSize: 22 }}>{n0(plan.total)} ₪</span>
          <p>
            {doneThisMonth
              ? 'רשמנו את החודש. האחזקות, העלויות והשיאים עודכנו.'
              : 'בצעו את הקניות בברוקר, ואז סמנו כאן — המערכת תעדכן את האחזקות, את העלויות ואת השיאים.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button className="opt" type="button" aria-pressed={!doneThisMonth}
              disabled={doneThisMonth || !ready} onClick={confirm}
              style={{ padding: '8px 18px', fontSize: 13 }}>
              {doneThisMonth ? 'החודש כבר נרשם' : 'ביצעתי את הקניות'}
            </button>
            <button className="opt" type="button" onClick={() => void refresh()} disabled={loading}>
              <Icon name="chart" size={11} /> {loading ? 'טוען…' : 'רענון מחירים'}
            </button>
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <section>
          <h2>מה כבר בוצע</h2>
          <div className="scroll">
            <table>
              <thead><tr>{['חודש', 'הופקד', 'נקצר ל-JEPQ', 'מס'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[...log].reverse().map(l => (
                  <tr key={l.month}>
                    <td className="dim">{monthName(l.month)}</td>
                    <td className="v">{n0(l.deposit)}</td>
                    <td className="v gold">{l.harvested ? n0(l.harvested) : '—'}</td>
                    <td className="v dim">{l.taxPaid ? n0(l.taxPaid) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="note">
        הקצירה נדלקת רק כשהרכיב ירד קודם מתחת לסף שלו — ביטקוין 50%, מניות 30% —
        ואז חזר ועבר את השיא הישן ב-10%. המערכת שומרת את השיא, את מצב החימוש ואת
        העלות של כל רכיב, כי בלעדיהם אי אפשר לדעת מתי לקצור וכמה מס לשלם.
        מחירי סוף יום. אין כאן המלצה להשקעה.
      </p>
    </div>
  );
}
