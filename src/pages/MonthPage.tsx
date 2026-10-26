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

/**
 * The index each sleeve follows. This is a price reference, not the thing
 * bought: the fall from peak that drives the month's split is the index's
 * own, and so it is the same number whichever vehicle tracks that index.
 */
const TICKER: Partial<Record<SleeveId, string>> = {
  BTC: 'BTC/USD', SMH: 'SMH', XLK: 'XLK', WORLD: 'URTH',
};

/**
 * What is actually bought, in shekels, on the Tel Aviv exchange through an
 * Israeli broker. Security numbers verified against the exchange's own
 * security feed and the issuers' KIIDs, October 2026 — the number is what
 * the order screen asks for, and two instruments can share a name.
 *
 * `irish` marks an Irish-domiciled accumulating UCITS: a corporation, so it
 * is not US-situs property. Where it is false there is no Irish fund on the
 * exchange at all and the vehicle is an Israeli trust — also not US-situs,
 * but on a weaker-documented footing. `why` says which case it is.
 */
const BUY_AS: Partial<Record<SleeveId, {
  sym: string; num: string; isin: string; fee?: string;
  irish: boolean; why: string;
}>> = {
  BTC: { sym: 'תכלית סל ביטקוין', num: '1217835', isin: 'IL0012178351',
         fee: '0.20%', irish: false,
         why: 'אין בעולם קרן אירית על ביטקוין — UCITS לא מתיר קריפטו. ' +
              'זו קרן סל ישראלית של מיטב, חשופה דרך חוזים וקרנות סל זרות ' +
              'ולא מחזיקה ביטקוין עצמו.' },
  SMH: { sym: 'קסם ETF שבבים', num: '1174119', isin: 'IL0011741191',
         fee: '0.45%', irish: false,
         why: 'אין אף קרן שבבים אירית רשומה בתל אביב. זו קרן סל ישראלית ' +
              'על אותו מדד בדיוק — MVIS US Listed Semiconductor 25, ' +
              'המדד שעליו נמדדו ההנחות כאן.' },
  XLK: { sym: 'IUIT', num: '1159193', isin: 'IE00B3WJKG14',
         fee: '0.15%', irish: true,
         why: 'iShares S&P 500 Information Technology — אירלנד, צוברת, ' +
              'מחזיקה את המניות עצמן ולא חוזה חילופין.' },
  WORLD: { sym: 'iShares MSCI ACWI', num: '1159235', isin: 'IE00B6R52259',
           fee: '0.20%', irish: true,
           why: 'iShares MSCI All Country World, תת-קרן של iShares V plc, ' +
                'אירלנד, צוברת — ״income will be included in their value״ ' +
                'בלשון ה-KIID מ-3.9.2026.' },
};

const REASON: Record<Reason, { label: string; tone: string }> = {
  high:    { label: 'על השיא שלו או מעליו — 10% מההפקדה', tone: 'var(--muted)' },
  fallen:  { label: 'מתחת לשיא — אחוז הירידה מההפקדה', tone: 'var(--up)' },
  deepest: { label: 'נפל הכי עמוק — ועוד כל מה שנשאר', tone: 'var(--gold)' },
  landing: { label: 'שנות הנחיתה — לפי תמהיל הגיל', tone: 'var(--muted)' },
};

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const DAY_CHOICES = [1, 5, 10, 15, 20, 25, 28];
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const monthName = (m: string) => `${MONTHS_HE[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const dayName = (d: Date) => `${d.getDate()} ב${MONTHS_HE[d.getMonth()]}`;

/**
 * The month's instruction: where every shekel goes, and what the withdrawal
 * due. This is the screen the plan cannot be run without, because it is the
 * only place that knows what is held and what each sleeve has already done.
 */
export function MonthPage({ onNavigate }: { onNavigate?: (tab: 'mgs') => void } = {}) {
  const { age } = useMgsStore();
  const { simulationParams } = useStore();
  const deposit = simulationParams.monthlyDeposit;
  const { started, startMonth, depositDay, remind, lots, log,
          start, setDepositDay, setRemind, recordMonth } = usePlanStore();

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
    // the month is stamped with what the portfolio was actually worth when it
    // was confirmed, so the log reads as a history and not just a list of buys
    const after = (Object.keys(next) as SleeveId[])
      .reduce((t, k) => t + next[k].units * (priceIls[k] ?? 0), 0);
    recordMonth({
      month: current,
      bought: Object.fromEntries(plan.lines.filter(l => l.amount > 0).map(l => [l.sleeve, l.amount])),
      withdrawn: plan.withdrawals.reduce((t, w) => t + w.net, 0),
      taxPaid: plan.withdrawals.reduce((t, w) => t + w.tax, 0),
      income: plan.income,
      deposit,
      portfolio: after,
    }, next);
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
        <span className="tk"><span className="sym">המשיכה החודש</span>
          <b className={plan.income > 0 ? 'gold' : ''}>
            {plan.phase === 'withdraw' ? (plan.income > 0 ? `${n0(plan.income)} ₪` : 'נחסמה') : '—'}
          </b></span>
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

      {plan.withdrawals.length > 0 && (
        <div className="final">
          <span className="fl2">המשיכה החודש · רק ממה שמעל העלות הממוצעת</span>
          {plan.withdrawals.map(w => (
            <span key={w.sleeve} style={{ flexBasis: '100%' }}>
              <span className="big" style={{ fontSize: 26 }}>{n0(w.net)} ₪</span>{' '}
              <span className="eqn">
                מ{SLEEVE_HE[w.sleeve]} · מס {n0(w.tax)} ₪ · עלות ממוצעת {n0(w.avg)} ₪
              </span>
            </span>
          ))}
        </div>
      )}
      {plan.allBelowAverage && (
        <div className="final">
          <span className="fl2">לא מושכים החודש</span>
          <span style={{ flexBasis: '100%' }}>
            <span className="eqn">
              כל האחזקות מתחת לעלות הקנייה הממוצעת שלהן, והכלל חוסם משיכה.
              זה לא תקלה — זה מה שמונע מכירה בהפסד כדי לשלם הכנסה.
            </span>
          </span>
        </div>
      )}

      <section>
        <h2>החלוקה של החודש</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="scroll" style={{ flex: '3 1 440px' }}>
          <table>
            <thead><tr>
              {['הרכיב', 'קונים', 'מה קונים', 'למה', 'חלק מההפקדה',
                'כמה מחזיקים', 'חלק בתיק', 'היעד', 'מתחת לשיא']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {plan.lines.map(l => (
                <tr key={l.sleeve} className={l.amount > 0 ? '' : 'dim'}>
                  <td>{SLEEVE_HE[l.sleeve]}</td>
                  <td className="v gold" style={{ fontSize: 15 }}>{n0(l.amount)} ₪</td>
                  <td className="v dim" style={{ whiteSpace: 'normal' }}>
                    {BUY_AS[l.sleeve]?.sym}
                    <span className="dim" dir="ltr" style={{ display: 'block', fontSize: 12 }}>
                      {BUY_AS[l.sleeve]?.num}
                    {BUY_AS[l.sleeve]?.fee ? ` · ${BUY_AS[l.sleeve]?.fee}` : ''}
                    </span>
                  </td>
                  <td style={{ color: REASON[l.reason].tone, whiteSpace: 'normal' }}>
                    {REASON[l.reason].label}
                  </td>
                  <td className="v dim">{(l.tier * 100).toFixed(0)}%</td>
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
            <b>ביום ההפקדה:</b> מפקידים {n0(deposit)} ₪ בדיוק לפי העמודה
            ״קונים״, ואז מסמנים ״ביצעתי״. התמהיל זז בהפקדות ולא במכירות,
            ולכן אין בדרך הזאת אף אירוע מס.
          </p>
          <p>
            <b>כלל החלוקה.</b> רכיב שנמצא על השיא הקודם שלו או מעליו מקבל
            <b> 10% מההפקדה</b>. רכיב שנמצא מתחתיו מקבל <b>את אחוז הירידה
            שלו</b> — ירד 30%, מקבל 30%. <b>כל שאר הכסף הולך למה שירד הכי
            עמוק</b> באותו יום. אם ביקשו יחד יותר מ-100%, החלוקה היא לפי
            היחס ביניהם; אם אף רכיב לא מתחת לשיא, ההפקדה מתחלקת שווה בשווה.
          </p>
        </aside>
        </div>
      </section>

      <section>
        <h2>דרך מה קונים — ומה מס העיזבון האמריקאי עושה כאן</h2>
        <p>
          כל נייר כאן נסחר <b>בשקלים בבורסה בתל אביב</b> ונקנה בחשבון
          מסחר ישראלי רגיל, בעמלת קרנות סל, בלי אישור מיוחד.
          <b> מספרי הניירות אומתו בפיד הניירות של הבורסה עצמה</b>,
          אוקטובר 2026 — המספר הוא מה שמסך ההוראה מבקש, ולשמות יש כפילויות.
        </p>
        <div className="scroll">
          <table>
            <thead><tr>
              {['הרכיב', 'מה קונים', 'מספר נייר', 'ISIN', 'דמי ניהול', 'אירית צוברת', 'למה זה זה']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {plan.lines.map(l => {
                const b = BUY_AS[l.sleeve];
                if (!b) return null;
                return (
                  <tr key={l.sleeve}>
                    <td>{SLEEVE_HE[l.sleeve]}</td>
                    <td>{b.sym}</td>
                    <td className="v" dir="ltr">{b.num}</td>
                    <td className="v dim" dir="ltr" style={{ fontSize: 12 }}>{b.isin}</td>
                    <td className="v dim">{b.fee ?? 'טרם אומת'}</td>
                    <td className="v" style={{ color: b.irish ? 'var(--up)' : 'var(--gold)' }}>
                      {b.irish ? 'כן' : 'לא — אין כזו'}
                    </td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 420 }}>{b.why}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          <b>מה שהכי חשוב כאן הוא לא מה שקנינו — אלא מה שלא.</b> קרן סל
          אמריקאית היא <b>נכס אמריקאי במאה אחוז משוויה</b>, בלי קשר למה
          שהיא מחזיקה בפנים. פעם היה לזה מיעוט חלקי, והוא
          <b> בוטל לנפטרים מ-1.1.2012</b>. אין אמנת מס עיזבון בין ישראל
          לארצות הברית — יש אמנת מס הכנסה, וזה לא אותו דבר ואינו מועיל כאן —
          ולכן הסכום הפטור לתושב חוץ עומד על שווה-ערך
          <b> 60 אלף דולר בלבד, שאינו מוצמד לאינפלציה</b>, ומעליו המס מגיע
          עד <b>40%</b>. חובת הדיווח נבחנת על <b>השווי ברוטו</b> של הנכסים
          האמריקאיים, כלומר ייתכן דיווח נדרש גם בלי מס לשלם. זו הסיבה
          שהניירות כאן אינם אמריקאיים.
        </p>
        <p>
          <b>הקרן האירית — הקרקע הקשה.</b> הכלל מחיל מס על מניה
          <b> ״רק אם הנפיקה אותה חברה אמריקאית״</b>. קרן אירית היא plc, כלומר
          חברה שאינה אמריקאית, והתקנה גם קובעת במפורש את ההפך: מניה של חברה
          שאינה אמריקאית נמצאת מחוץ לארצות הברית. <b>העובדה שהקרן מחזיקה
          מניות אמריקאיות אינה רלוונטית</b> — אין הסתכלות דרך הקרן.
        </p>
        <p>
          <b>הקרן הישראלית — כנראה באותו מקום, אבל מדרך אחרת ופחות מתועדת.</b>
          הסיווג הישראלי כ״נאמנות״ אינו הקובע; מה שקובע הוא הסיווג האמריקאי,
          ושם הסדר הוא הפוך ממה שנשמע: קרן שבה למנהל יש
          <b> כוח לשנות את ההשקעות</b>, ושבה אחריות המחזיקים מוגבלת, מסווגת
          <b>כחברה זרה</b> ולא כנאמנות — ואז התשובה זהה לאירית.
          <b>אבל:</b> זה נשען על סיווג של מסמכי הקרן המסוימת, ואין אף פסיקה,
          החלטה או הנחיה שעסקה בדיוק במצב הזה. ואם קרן כלשהי כן תיחשב נאמנות,
          השאלה אם מסתכלים דרכה אל נכסיה <b>אינה מוכרעת בשום מקור</b> — וקרנות
          הביטקוין הישראליות מחזיקות כ-95% מנכסיהן בקרנות סל אמריקאיות, כי
          רשות ניירות ערך אסרה עליהן להחזיק ביטקוין עצמו.
        </p>
        <p>
          <b>ושתי הפעמים שאין בכלל חלופה אירית.</b> על <b>ביטקוין</b> אין קרן
          אירית בעולם: רגולציית UCITS מגדירה רשימה סגורה של נכסים מותרים
          וקריפטו לא בתוכה. על <b>שבבים</b> אין קרן אירית רשומה למסחר בתל
          אביב — רק שתי חברות ניהול זרות רשומות כאן בכלל, ולאף אחת מהן אין
          קרן שבבים.
        </p>
        <p>
          <b>אין פטור מוחלט, ואין כאן ייעוץ.</b> אין ״פטור״ — יש נכסים
          שנופלים מחוץ להגדרה של נכס אמריקאי. על הקרן האירית זה מתועד היטב;
          על הקרן הישראלית זו עמדה סבירה בלי אסמכתה ישירה.
          <b>ההכרעה היא של יועץ מס, לא של המערכת הזאת.</b>
        </p>
      </section>

      <div className="fl">
        <div className="f">
          <span className="fk">ההכנסה</span>
          <span className="ft">
            {plan.phase === 'withdraw'
              ? (plan.income > 0 ? `${n0(plan.income)} ₪ החודש` : 'נחסמה החודש')
              : 'עוד לא נפתחה'}
          </span>
          <p>
            {plan.phase !== 'withdraw'
              ? <>המשיכה נפתחת בשלב המשיכה. עד אז כל שקל נשאר בתיק ומרכיב —
                  <b> אין קרן מחלקת ואין קציר לשיאים</b>.</>
              : plan.income > 0
                ? <>‏<b>4% בשנה, חלקי 12</b> משווי התיק — נטו אחרי מס על הרווח.
                    נמשך רק מאחזקה שמחירה <b>מעל העלות הממוצעת</b> שלה.</>
                : <>כל האחזקות מתחת לעלות הממוצעת שלהן, ולכן לא נמשך כלום החודש.</>}
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
            {onNavigate && (
              <button className="opt" type="button" onClick={() => onNavigate('mgs')}>
                <Icon name="target" size={11} /> בנה הערכת תשואה
              </button>
            )}
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <section>
          <h2>מה כבר בוצע</h2>
          <div className="scroll">
            <table>
              <thead><tr>{['חודש', 'הופקד', 'נמשך', 'מס', 'שווי התיק אז']
                .map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[...log].reverse().map(l => (
                  <tr key={l.month}>
                    <td className="dim">{monthName(l.month)}</td>
                    <td className="v">{n0(l.deposit)}</td>
                    <td className="v up">{l.income ? n0(l.income) : '—'}</td>
                    <td className="v dim">{l.taxPaid ? n0(l.taxPaid) : '—'}</td>
                    <td className="v">{l.portfolio ? n0(l.portfolio) : '—'}</td>
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
