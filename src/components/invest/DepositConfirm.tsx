/** **אישור ההפקדה של החודש.**
 *
 *  **מה המסך הזה סוגר.** עד כאן ״מה קונים החודש״ הציג את החלוקה,
 *  ויומן ההפקדות דרש להקליד את אותם סכומים מחדש — שורה שורה, לפי
 *  משקלות שטוחים שאינם החלוקה שהוצגה. כלומר המסך שחישב והמסך
 *  שרשם **לא דיברו**. כאן הם אותו מסך: החלוקה מגיעה מ-`buySplit`,
 *  אותה פונקציה בדיוק, והאישור כותב בדיוק אותה.
 *
 *  **ושלושה דברים נאמרים ולא מוסתרים.**
 *  1. **המחיר משוער.** הציטוט הוא סוף יום, ולכן **מספר היחידות הוא
 *     אומדן**. מה שמחייב הוא הסכום בשקלים, והיחידות נרשמות כדי
 *     שיהיה מחיר עלות — אפשר לתקן אותן ביומן אחר כך.
 *  2. **אפשר לדווח שלא הופקד.** בלי זה אין דרך להבדיל בין ״עוד לא״
 *     ל״הוחלט שלא״, והתזכורת תנדנד למי שכבר ענה.
 *  3. **בלי יומן ב-Supabase אין כתיבה.** אז המסך אומר מה חסר ולא
 *     מתיימר לשמור.
 */
import { useMemo, useState } from 'react';
import { IRISH, BUY, mix } from '../../constants/irish';
import { useMyPortfolio } from '../../store/myPortfolio';
import { ceilingFor } from '../../constants/studyFunds';
import { buySplit, unitsFor } from '../../utils/buySplit';
import type { TrackKey } from '../../utils/buySplit';
import { useMarket } from '../../hooks/useMarket';
import { useMonthLog } from '../../store/monthLog';
import { thisMonth } from '../../store/planStore';
import { addDeposits } from '../../lib/deposits';
import type { NewBuy } from '../../lib/deposits';
import { Card } from '../layout/Card';
import { NumField } from '../build/NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n4 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
const today = () => new Date().toISOString().slice(0, 10);

export function DepositConfirm({ onBuild }: { onBuild?: () => void }) {
  const { holdings, deposit, extra, fundStatus, annualSalary, selfIncome } = useMyPortfolio();
  const market = useMarket(holdings);
  const month = thisMonth();
  const entry = useMonthLog(s => s.entries[month]);
  const confirmDeposit = useMonthLog(s => s.confirmDeposit);
  const skipDeposit = useMonthLog(s => s.skipDeposit);
  const clearMonth = useMonthLog(s => s.clearMonth);

  const track = useMemo<TrackKey>(() => {
    const v = mix(holdings).vol;
    return v < 0.145 ? 'flow' : v < 0.225 ? 'both' : 'growth';
  }, [holdings]);

  /** מה שמגיע לברוקר — ההפקדה פחות מה שנכנס לקרן ההשתלמות, ועוד התוספת */
  const suggested = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    return Math.round(Math.max(0, deposit - Math.min(deposit, ceil)) + extra);
  }, [deposit, extra, fundStatus, annualSalary, selfIncome]);

  /** **הסכום שהוזן, ולא הסכום שתוכנן.** אם הופקד אחרת — זה מה שנרשם. */
  const [amount, setAmount] = useState<number | null>(null);
  const useAmount = amount ?? suggested;

  const split = useMemo(() => buySplit({
    holdings, quotes: market.quotes, peaks: market.peaks, held: market.held,
    amount: useAmount, track,
  }), [holdings, market.quotes, market.peaks, market.held, useAmount, track]);

  const rows = useMemo(() => split.lines.map(l => {
    const b = BUY[l.k];
    const units = unitsFor(l.ils, l.px, b?.cur ?? null, market.rates);
    return { ...l, sym: b?.sym ?? null, cur: b?.cur ?? null, units };
  }), [split, market.rates]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    const buys: NewBuy[] = rows
      .filter(r => r.ils >= 1 && r.px && r.units)
      .map(r => ({
        fund_key: r.k, symbol: r.sym, deposited_on: today(),
        amount_ils: Math.round(r.ils * 100) / 100,
        units: Math.round(r.units! * 1e6) / 1e6,
        unit_price: r.px!,
        currency: r.cur ?? 'USD',
        fx_rate: market.rates[r.cur ?? 'USD'] ?? 1,
        note: `אושר במסך ההפקדות · ${month}`,
      }));
    if (!buys.length) {
      setMsg('אין מה לרשום — אין מחירים לרכיבים, ולכן אי אפשר לגזור יחידות.');
      setBusy(false); return;
    }
    const res = await addDeposits(buys);
    if (!res.ok) { setMsg(res.reason); setBusy(false); return; }
    confirmDeposit(month, useAmount,
      rows.map(r => ({ k: r.k, ils: Math.round(r.ils), units: r.units, px: r.px })));
    market.refresh();
    setBusy(false);
  };

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">ההפקדה של החודש</span>
        <h2>עוד לא בחרתם תיק</h2>
        <p className="lede">
          <b>אין מה לאשר לפני שיש תיק.</b> בוחרים בדף ההרכבה, ומכאן
          ואילך המסך הזה יגיד כמה לקנות מכל רכיב — ויאשר את זה ביומן.
        </p>
        {onBuild && (
          <div className="cta">
            <button className="opt mp-go" type="button" onClick={onBuild}>
              לבחור את התיק שלי
            </button>
          </div>
        )}
      </section>
    );
  }

  // ───────── אחרי שהחודש הוכרע ─────────
  if (entry?.deposit) {
    const d = entry.deposit;
    return (
      <Card id="deposit">
        <span className="eyebrow">ההפקדה של החודש</span>
        <h3 className="text-[15px] font-bold text-gold-light mb-2">
          {d.decision === 'done'
            ? `הופקדו ${n0(d.amount)}₪ החודש`
            : 'דווח שלא הופקד החודש'}
        </h3>
        <p className="note">
          {d.decision === 'done'
            ? <>נרשם ב-{new Date(d.at).toLocaleDateString('he-IL')}. הסכומים נכנסו
                ליומן ההפקדות, והם אלה שקובעים את מחיר העלות הממוצע — ולכן גם
                את מה שיהיה אפשר למשוך.</>
            : <>נרשם ב-{new Date(d.at).toLocaleDateString('he-IL')}. <b>חודש בלי
                הפקדה אינו טעות</b> — הוא פשוט נספר כך, והתזכורת לא תחזור
                החודש.</>}
        </p>
        {d.decision === 'done' && d.lines && (
          <div className="ptable bleed mt-3">
            <table>
              <thead><tr><th>רכיב</th><th>סכום ₪</th><th>יחידות</th><th>מחיר</th></tr></thead>
              <tbody>
                {d.lines.filter(l => l.ils >= 1).map(l => (
                  <tr key={l.k}>
                    <td><b>{IRISH.find(y => y.k === l.k)?.he ?? l.k}</b></td>
                    <td dir="ltr">{n0(l.ils)}</td>
                    <td dir="ltr">{l.units ? n4(l.units) : '—'}</td>
                    <td dir="ltr" className="dim">{l.px ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cta mt-3">
          <button className="opt" type="button" onClick={() => clearMonth(month)}>
            לבטל את הדיווח של החודש
          </button>
        </div>
        <p className="note">
          <b>הביטול מוחק את ההכרעה, לא את השורות.</b> אם ההפקדה נרשמה
          ביומן היא נשארת שם — למחוק שורה עושים ביומן עצמו, כדי שלא
          יימחק כסף בלחיצה אחת.
        </p>
      </Card>
    );
  }

  // ───────── לפני ההכרעה ─────────
  const totalIls = rows.reduce((t, r) => t + r.ils, 0);
  const missing = rows.filter(r => !r.px).length;

  return (
    <Card glow id="deposit">
      <span className="eyebrow">ההפקדה של החודש</span>
      <h3 className="text-[15px] font-bold text-gold-light mb-1">
        לאן הולך הכסף החודש
      </h3>
      <p className="note">
        <b>על המחירים של הרגע הזה.</b> {market.at
          ? <>הציטוטים נמשכו ב-{market.at.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })},
              והם <b>מחירי סוף יום</b> ולא זמן אמת — ולכן מספר היחידות הוא
              אומדן. <b>הסכום בשקלים הוא מה שמחייב.</b></>
          : <>מחירים עוד לא נמשכו.</>}
        {market.ratesSource === 'fallback' && (
          <> <b>ושערי המטבע כאן הם ברירת מחדל</b> (דולר {market.rates.USD}₪) ולא
            שער חי — שער שגוי מזיז את מספר היחידות, לא את הסכום.</>
        )}
      </p>

      <div className="term cx-edit mt-3">
        <div className="grp">
          <span className="glab">הפקדתי החודש</span>
          <NumField value={useAmount} min={0} max={200000} step={50}
            label="סכום ההפקדה" unit="₪" onCommit={v => setAmount(Math.round(v))} />
        </div>
        <p className="note">
          התוכנית אומרת <b>{n0(suggested)}₪</b> החודש
          {fundStatus !== 'none' && <> — אחרי מה שנכנס לקרן ההשתלמות</>}.
          {useAmount !== suggested && <> <b>הזנתם {n0(useAmount)}₪</b>, והחלוקה
            שלמטה כבר על הסכום הזה.</>}
        </p>
      </div>

      {market.err && <p className="lab-access warn mt-3">{market.err}.</p>}

      <div className="ptable bleed mt-3">
        <table>
          <thead>
            <tr>
              <th>הרכיב</th><th>כמה ₪</th><th>חלק</th><th>יחידות (אומדן)</th>
              <th>מחיר</th><th>סימול</th><th>למה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.k} className={r.deepest ? 'cross' : ''}>
                <td><b>{IRISH.find(y => y.k === r.k)?.he ?? r.k}</b></td>
                <td dir="ltr" className="gold"><b>{n0(r.ils)}</b></td>
                <td dir="ltr">{r.ask.toFixed(0)}%</td>
                <td dir="ltr">{r.units ? n4(r.units) : '—'}</td>
                <td dir="ltr" className="dim">{r.px ?? '—'} {r.cur}</td>
                <td dir="ltr" className="tk"><b>{r.sym}</b></td>
                <td className="dim">{r.why}</td>
              </tr>
            ))}
            <tr>
              <td><b>סך הכל</b></td>
              <td dir="ltr"><b>{n0(totalIls)}</b></td>
              <td colSpan={5} />
            </tr>
          </tbody>
        </table>
      </div>

      {msg && <p className="lab-access warn mt-3">{msg}</p>}
      {market.ledger === 'missing' && (
        <p className="note mt-3">
          <b>יומן ההפקדות עוד לא הותקן, ולכן אין לאן לרשום.</b> צריך
          להריץ פעם אחת את <code>supabase/deposits-setup.sql</code>.
          עד אז החלוקה למעלה נכונה ואפשר לבצע אותה בברוקר — רק
          האישור כאן לא יישמר.
        </p>
      )}

      <div className="cta mt-3">
        <button className="opt" type="button" disabled={busy || market.ledger !== 'ok'}
          onClick={() => void save()}>
          {busy ? 'רושם…' : 'אישור הפקדה'}
        </button>
        <button className="opt" type="button" disabled={busy}
          onClick={() => skipDeposit(month)}>
          לא הפקדתי החודש
        </button>
        <button className="opt" type="button" onClick={market.refresh}>
          רענון מחירים ושערים
        </button>
      </div>

      <p className="note">
        <b>כלל החלוקה.</b> קונים לכיוון המשקלות שבחרתם, ומטים לנופלים
        בתוך הגבול הזה: רכיב שנפל הוא תת-משקל ולכן מקבל יותר,{' '}
        <b>וברגע שהוא חוזר למשקל שבחרתם הוא נעצר.</b> אף רכיב לא מקבל
        מעל פי שלושה ממשקל היעד שלו בהפקדה אחת.
        {missing > 0 && <> <b>ל-{missing} רכיבים אין מחיר</b>, ולכן החלוקה
          שלמעלה היא לפי המשקלות בלבד.</>}
      </p>
      <p className="note">
        <b>התמהיל זז בהפקדות ולא במכירות</b>, ולכן אין בדרך הזאת אף
        אירוע מס. <b>אין באמור המלצה ואין בו ייעוץ פיננסי או ייעוץ מס.</b>
      </p>
    </Card>
  );
}
