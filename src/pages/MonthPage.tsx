import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMgsStore } from '../store/mgsStore';
import { useStore } from '../store';
import { usePlanStore, planMonth, thisMonth,
         nextDepositDate, daysUntilDeposit } from '../store/planStore';
import { buildMonth, applyMonth, type Reason } from '../utils/monthPlan';
import { SLEEVE_HE, cohortFor, milestonesFor, type SleeveId } from '../constants/mgsScenarios';
import { fetchPrices } from '../lib/marketData';
import type { PriceInfo } from '../lib/marketData';
import { Icon } from '../components/shared/Icon';
import { pushSupported, pushStatus, subscribeToPush, unsubscribeFromPush } from '../lib/push';
import { supabase } from '../lib/supabase';

/** The instrument each sleeve is actually bought through. */
const TICKER: Partial<Record<SleeveId, string>> = {
  BTC: 'BTC/USD', SMH: 'SMH', SPMO: 'SPMO', XLK: 'XLK', WORLD: 'URTH',
};
const JEPQ_TICKER = 'JEPQ';
const BUY_AS: Partial<Record<SleeveId, string>> = {
  BTC: 'IBIT', SMH: 'SMH', SPMO: 'SPMO', XLK: 'XLK', WORLD: 'URTH',
};

const REASON: Record<Reason, { label: string; tone: string }> = {
  high:    { label: 'על השיא שלו — רבע מנה', tone: 'var(--muted)' },
  fallen:  { label: 'ירד מהשיא — חצי מנה, פי שתיים', tone: 'var(--up)' },
  deep:    { label: 'ירד מעל 50% — מנה מוגדלת, פי 2.8', tone: 'var(--gold)' },
  landing: { label: 'שנות הנחיתה — הכל למדד עולמי', tone: 'var(--muted)' },
};

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const DAY_CHOICES = [1, 5, 10, 15, 20, 25, 28];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthName = (m: string) => `${MONTHS_HE[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const dayName = (d: Date) => `${d.getDate()} ב${MONTHS_HE[d.getMonth()]}`;

/**
 * The month's instruction: where every shekel goes, and whether a harvest came
 * due. This is the screen the plan cannot be run without, because it is the
 * only place that knows what is held and what each sleeve has already done.
 */
export function MonthPage() {
  const { age } = useMgsStore();
  const { simulationParams } = useStore();
  const deposit = simulationParams.monthlyDeposit;
  const { started, startMonth, depositDay, remind, lots, jepq, log,
          start, setDepositDay, setRemind, recordMonth } = usePlanStore();

  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [fx, setFx] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const syms = [...new Set(Object.values(TICKER))] as string[];
      const p = await fetchPrices([...syms, JEPQ_TICKER, 'USD/ILS']);
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

  const jepqIls = (prices[JEPQ_TICKER]?.price ?? 0) * (fx ?? 0);

  const plan = useMemo(
    () => buildMonth(age, month, deposit, lots, priceIls, jepq, jepqIls),
    [age, month, deposit, lots, priceIls, jepq, jepqIls],
  );

  const confirm = () => {
    const next = applyMonth(lots, plan, priceIls, jepq, jepqIls);
    // the month is stamped with what the portfolio was actually worth when it
    // was confirmed, so the log reads as a history and not just a list of buys
    const after = (Object.keys(next.lots) as SleeveId[])
      .reduce((t, k) => t + next.lots[k].units * (priceIls[k] ?? 0), 0);
    recordMonth({
      month: current,
      bought: Object.fromEntries(plan.lines.filter(l => l.amount > 0).map(l => [l.sleeve, l.amount])),
      harvested: plan.harvests.reduce((s, h) => s + h.net, 0),
      taxPaid: plan.harvests.reduce((s, h) => s + h.tax, 0),
      income: plan.income,
      deposit,
      portfolio: after,
      jepqValue: next.jepq.units * jepqIls,
    }, next.lots, next.jepq);
  };

  // Every hook has to run on every render, so all of these sit above the
  // "not started yet" return below. Putting one after it changes the hook count
  // between renders the moment the plan starts, and React tears the tree down.
  const ms = useMemo(() => milestonesFor(age), [age]);
  const [remindMsg, setRemindMsg] = useState('');
  const [remindBusy, setRemindBusy] = useState(false);

  // Turning the reminder on has to re-register whenever the day changes: the
  // server sends on the day stored with the subscription, not the one on screen.
  const toggleRemind = async (on: boolean) => {
    setRemindBusy(true); setRemindMsg('');
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? '';
    const r = on ? await subscribeToPush(uid, depositDay) : await unsubscribeFromPush(uid);
    setRemindBusy(false);
    if (r.ok) {
      setRemind(on);
      setRemindMsg(on ? `תזכורת הופעלה — תגיע ב-${depositDay} בכל חודש.` : 'התזכורת כובתה.');
    } else {
      setRemindMsg(r.reason);
      if (!on) setRemind(false);
    }
  };
  useEffect(() => {
    if (!remind) return;
    void pushStatus().then(st => { if (st !== 'granted') setRemind(false); });
  }, [remind, setRemind]);
  useEffect(() => {
    if (!remind) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) await subscribeToPush(data.user.id, depositDay);
    })();
  }, [depositDay, remind]);

  const next = useMemo(() => nextDepositDate(depositDay), [depositDay]);
  const due = useMemo(() => daysUntilDeposit(depositDay), [depositDay]);

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
        <span className="tk"><span className="sym">יום ההפקדה</span>
          <b className={due === 0 ? 'gold' : ''}>{due === 0 ? 'היום' : dayName(next)}</b></span>
        <span className="tk"><span className="sym">שווי התיק</span>
          <b>{ready ? `${n0(plan.portfolio)} ₪` : '—'}</b></span>
        <span className="tk"><span className="sym">JEPQ</span>
          <b>{plan.jepqValue ? `${n0(plan.jepqValue)} ₪` : '—'}</b></span>
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

      {/* .f sets flex-direction: column, so the row direction has to be stated
          here or the wrapped children stack into columns and spill sideways */}
      <section className="f" style={{ display: 'flex', flexDirection: 'row',
        flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <span className="fk" style={{ flexBasis: '100%' }}>יום ההפקדה שלכם</span>
        <div className="grp" style={{ margin: 0 }}>
          {DAY_CHOICES.map(d => (
            <button key={d} className="opt" type="button" aria-pressed={depositDay === d}
              onClick={() => setDepositDay(d)}>{d} בחודש</button>
          ))}
          <label className="own">יום אחר
            <input className="amt" type="number" min={1} max={28} value={depositDay}
              inputMode="numeric" aria-label="יום בחודש להפקדה"
              onChange={e => setDepositDay(Number(e.target.value) || 1)} />
          </label>
        </div>
        <div style={{ flexBasis: '100%', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="opt" type="button" aria-pressed={remind} disabled={remindBusy}
            onClick={() => void toggleRemind(!remind)}>
            <Icon name="warning" size={11} />{' '}
            {remindBusy ? 'רגע…' : remind ? 'תזכורת חודשית פעילה' : 'הזכירו לי כל חודש'}
          </button>
          {!pushSupported() && (
            <span className="eqn" style={{ color: 'var(--muted)' }}>
              בדפדפן הזה אין התראות. באייפון — הוסיפו את האפליקציה למסך הבית.
            </span>
          )}
          {remindMsg && <span className="eqn" style={{ color: remind ? 'var(--up)' : 'var(--down)' }}>{remindMsg}</span>}
        </div>
        <p style={{ flexBasis: '100%', margin: 0 }}>
          {due === 0
            ? <b style={{ color: 'var(--gold)' }}>היום יום ההפקדה — החלוקה למטה מחושבת למחירים של עכשיו.</b>
            : <>ההפקדה הבאה ב<b>{dayName(next)}</b> — בעוד {due} {due === 1 ? 'יום' : 'ימים'}.
                {' '}החלוקה למטה מחושבת למחירים של עכשיו ותתעדכן ביום עצמו.</>}
        </p>
      </section>

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
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="scroll" style={{ flex: '3 1 440px' }}>
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
                  <td className="v dim">×{l.tier.toFixed(2)}</td>
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

        <aside className="f" style={{ flex: '1 1 250px', alignSelf: 'stretch' }}>
          <span className="fk">הוראות ההפעלה שלכם · גיל {cohortFor(age)}</span>
          <table style={{ fontSize: 13 }}>
            <tbody>
              <tr><td className="dim">שנות הפקדה</td>
                  <td className="v">{ms.depositYears}</td></tr>
              <tr><td className="dim">הסטה למדד עולמי בגיל</td>
                  <td className="v gold">{ms.shiftAtAge}</td></tr>
              <tr><td className="dim">תחילת משיכה בגיל</td>
                  <td className="v gold">{ms.withdrawAtAge}</td></tr>
              <tr><td className="dim">החודש בתוכנית</td>
                  <td className="v">{month} מתוך {ms.totalYears * 12}</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 10 }}>
            <b>ב-1 בכל חודש:</b> מפקידים {n0(deposit)} ₪ בדיוק לפי העמודה
            ״קונים״, ואז מסמנים ״ביצעתי״. התמהיל זז לבד — שתי נקודות בשנה
            יוצאות מביטקוין וממוליכים ועוברות לליבה, בהפקדות ולא במכירות,
            ולכן אין בדרך הזאת אף אירוע מס.
          </p>
          <p>
            המנה של כל רכיב נקבעת מהגיל, ואז מוכפלת לפי מה שהוא עשה: על השיא
            שלו ×0.25, ירד ממנו ×0.50, ירד מעל 50% ×0.70. כלומר רכיב שירד
            מקבל פי שתיים מרכיב שעלה. מכירה נדרשת רק כשהשורה האדומה למעלה.
          </p>
        </aside>
        </div>
      </section>

      <div className="fl">
        <div className="f">
          <span className="fk">מנוע ההכנסה</span>
          <span className="ft">JEPQ · {plan.jepqValue ? `${n0(plan.jepqValue)} ₪` : 'עוד לא נבנה'}</span>
          <p>
            {plan.jepqValue > 0
              ? <>מחלקת <b style={{ color: 'var(--up)' }}>{n0(plan.income)} ₪</b> החודש, נטו אחרי מס.
                  עד היום התקבלו <b>{n0(jepq.received)} ₪</b>.</>
              : <>JEPQ נבנית רק מקצירות — היא תתחיל לשלם אחרי הקצירה הראשונה.</>}
          </p>
        </div>
        <div className="f tot" style={{ flex: '1 1 260px' }}>
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
              <thead><tr>{['חודש', 'הופקד', 'נקצר ל-JEPQ', 'התקבל מ-JEPQ', 'מס',
                'שווי התיק אז', 'JEPQ אז'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[...log].reverse().map(l => (
                  <tr key={l.month}>
                    <td className="dim">{monthName(l.month)}</td>
                    <td className="v">{n0(l.deposit)}</td>
                    <td className="v gold">{l.harvested ? n0(l.harvested) : '—'}</td>
                    <td className="v up">{l.income ? n0(l.income) : '—'}</td>
                    <td className="v dim">{l.taxPaid ? n0(l.taxPaid) : '—'}</td>
                    <td className="v">{l.portfolio ? n0(l.portfolio) : '—'}</td>
                    <td className="v gold">{l.jepqValue ? n0(l.jepqValue) : '—'}</td>
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
