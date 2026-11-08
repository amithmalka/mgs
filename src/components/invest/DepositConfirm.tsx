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
import { Rows } from '../shared/Rows';
import { NumField } from '../build/NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n4 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
const today = () => new Date().toISOString().slice(0, 10);

/** **המחיר שהוזן בחודש שעבר, זכור.** בלי זה היה צריך להקליד מחיר
 *  לכל רכיב בכל חודש מחדש — ומחיר של קרן זזה אחוזים בחודש, לא
 *  סדרי גודל, ולכן המחיר של החודש הקודם הוא נקודת פתיחה טובה
 *  שאפשר לתקן. נשמר בדפדפן בלבד. */
const LAST_PX = 'mgs-last-px';
function loadLastPx(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(LAST_PX) ?? '{}') as Record<string, number>; }
  catch { return {}; }
}
function saveLastPx(p: Record<string, number>) {
  try { localStorage.setItem(LAST_PX, JSON.stringify(p)); } catch { /* פרטי או חסום */ }
}

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

  /** **מחיר שהוקלד ביד, לכל רכיב — וזה לא נוחות אלא הכרח.**
   *
   *  ‏`/api/lse` הוא פרוקסי ל-Yahoo, ו-Yahoo **מחזיר 429 לכל הבקשות**
   *  (נבדק 8.11.2026 גם משרת Vercel וגם ממכונה מקומית). המנוי
   *  ל-Twelve Data אינו כולל קרנות LSE בתוכנית החינמית. כלומר **אין
   *  כרגע מקור מחיר חי לקווים האיריים** — ובלי מחיר אין יחידות, ואין
   *  מחיר עלות ממוצע, ואין על מה להפעיל את כלל המשיכה.
   *
   *  לכן המחיר הוא שדה: מתמלא מהציטוט כשהוא קיים, ומוקלד כשלא.
   *  **הסכום בשקלים לא זז ממילא** — הוא מה שמחייב, והמחיר רק קובע
   *  כמה יחידות הוא קנה. */
  const [px, setPx] = useState<Record<string, number>>(loadLastPx);

  const split = useMemo(() => buySplit({
    holdings, quotes: market.quotes, peaks: market.peaks, held: market.held,
    amount: useAmount, track,
  }), [holdings, market.quotes, market.peaks, market.held, useAmount, track]);

  const rows = useMemo(() => split.lines.map(l => {
    const b = BUY[l.k];
    const f = IRISH.find(y => y.k === l.k);
    // הציטוט החי אם יש, ואחרת מה שהוקלד
    const price = l.px ?? px[l.k] ?? null;
    const units = unitsFor(l.ils, price, b?.cur ?? null, market.rates);
    return {
      ...l, price, units,
      sym: b?.sym ?? null, cur: b?.cur ?? null,
      // **רכיב שאינו בקטלוג.** תיק שנשמר בדפדפן יכול להחזיק מפתח
      // שהקטלוג כבר לא מכיר — קרן שהוסרה. בלי הדגל הזה הכרטיס היה
      // מציג מפתח עירום בלי שם, בלי מטבע ובלי דרך לקנות אותו.
      he: f?.he ?? null, orphan: !f || !b,
      live: l.px != null,
    };
  }), [split, market.rates, px]);


  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** **האישור עובד גם בלי מחירים — וזה העיקר.**
   *
   *  מה שהיה כאן דרש מחיר לכל רכיב, ובלעדיו הכפתור לא עשה כלום.
   *  כלומר מי שאין לו גישה למחירים **לא היה יכול לאשר את החודש** —
   *  והחודש היה נספר כמפוספס אף שההפקדה בוצעה.
   *
   *  עכשיו שני דברים נפרדים:
   *  · **ההכרעה החודשית** נשמרת תמיד. זה מה שעוצר את התזכורת.
   *  · **שורות היומן** נכתבות רק לרכיבים שיש להם מחיר, כי הטבלה
   *    דורשת יחידות (`units > 0`) ובלי מחיר אין יחידות. מה שחסר
   *    אפשר להשלים אחר כך ביומן, ואז העלות הממוצעת תתעדכן. */
  const save = async () => {
    setBusy(true); setMsg(null);
    const priced = rows.filter(r => r.ils >= 1 && !r.orphan && r.price && r.units);
    const lines = rows.map(r => ({
      k: r.k, ils: Math.round(r.ils), units: r.units, px: r.price,
    }));

    if (priced.length) {
      const buys: NewBuy[] = priced.map(r => ({
        fund_key: r.k, symbol: r.sym, deposited_on: today(),
        amount_ils: Math.round(r.ils * 100) / 100,
        units: Math.round(r.units! * 1e6) / 1e6,
        unit_price: r.price!,
        currency: r.cur ?? 'USD',
        fx_rate: market.rates[r.cur ?? 'USD'] ?? 1,
        note: `אושר במסך ההפקדות · ${month}`,
      }));
      const res = await addDeposits(buys);
      if (!res.ok) { setMsg(res.reason); setBusy(false); return; }
    }

    confirmDeposit(month, useAmount, lines);
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
          <div className="mt-3">
            <Rows
              cols={[
                { k: 'he', label: 'רכיב', lead: true },
                { k: 'ils', label: 'הופקד', ltr: true, big: true },
                { k: 'units', label: 'יחידות', ltr: true },
                { k: 'px', label: 'מחיר', ltr: true, dim: true },
              ]}
              rows={d.lines.filter(l => l.ils >= 1).map(l => ({
                id: l.k,
                cells: {
                  he: IRISH.find(y => y.k === l.k)?.he ?? l.k,
                  ils: <>{n0(l.ils)}₪</>,
                  units: l.units ? n4(l.units) : '—',
                  px: l.px ?? '—',
                },
              }))}
            />
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

  return (
    <Card glow id="deposit">
      <span className="eyebrow">ההפקדה של החודש</span>
      <h3 className="text-[15px] font-bold text-gold-light mb-1">
        לאן הולך הכסף החודש
      </h3>

      <div className="term cx-edit mt-3">
        <div className="grp">
          <span className="glab">הפקדתי החודש</span>
          <NumField value={useAmount} min={0} max={200000} step={50}
            label="סכום ההפקדה" unit="₪" onCommit={v => setAmount(Math.round(v))} />
        </div>
        <p className="note">
          <b>בחרתם מסלול שבו אתם מפקידים {n0(suggested)}₪ לברוקר בחודש.</b>
          {useAmount !== suggested && <> הזנתם <b>{n0(useAmount)}₪</b>, והחלוקה
            שלמטה כבר על הסכום הזה.</>}
        </p>
      </div>

      {/* **כרטיס לכל רכיב: מה לקנות, בכמה, ולמה. וזה הכל.**
          שדה המחיר ירד מכאן אל מקטע מתקפל למטה — הוא לא חלק
          מהפעולה, הוא רישום שאפשר לעשות אחר כך. */}
      <div className="dep mt-3">
        {rows.map(r => (
          <article key={r.k} className={`dep-row${r.deepest ? ' is-deep' : ''}${r.orphan ? ' is-orphan' : ''}`}>
            <header>
              <h4>{r.he ?? r.k}</h4>
              {r.sym && <span className="dep-tick" dir="ltr">{r.sym}</span>}
            </header>

            <div className="dep-money">
              <b dir="ltr">{n0(r.ils)}₪</b>
              <span>{r.ask.toFixed(0)}% מההפקדה</span>
              {r.deepest && <span className="dep-flag">מקבל את השארית</span>}
            </div>

            <p className={`dep-why${r.orphan ? ' dep-warn' : ''}`}>
              {r.orphan
                ? <><b>הרכיב הזה אינו בקטלוג</b> ולכן אי אפשר לקנות אותו.
                    בחרו תמהיל מחדש בדף ההרכבה.</>
                : r.why}
            </p>
          </article>
        ))}

        <div className="dep-sum">
          <span>סך הכל להפקדה החודש</span>
          <b dir="ltr">{n0(totalIls)}₪</b>
        </div>
      </div>

      <p className="note mt-3">
        <b>זה מה שצריך לעשות:</b> להעביר את הסכומים האלה בברוקר, ואז
        ללחוץ ״אישור הפקדה״. <b>זה הכל.</b>
      </p>
      {/* **מאיפה המחירים, ומתי.** מספר שמוצג בלי לומר ממה הוא נגזר
          אינו משהו שמותר להציג — והציטוט כאן הוא סגירה, מזירה
          שעשויה להיות לונדון או פרנקפורט לפי מה שזמין ל-ISIN. */}
      {market.quoteDate && (
        <p className="note">
          <b>החלוקה נמדדה על סגירת{' '}
          {new Date(market.quoteDate).toLocaleDateString('he-IL')}</b>
          {market.venues.length > 0 && <> ({market.venues.join(' · ')})</>} —
          לפי ה-ISIN של כל קרן. זו אותה קרן בדיוק, אבל{' '}
          <b>לא בהכרח אותה אגורה</b> כמו אצל הברוקר שלכם, ולכן מספר
          היחידות הוא אומדן. <b>הסכום בשקלים הוא מה שמחייב.</b>
        </p>
      )}

      {msg && <p className="lab-access warn mt-3">{msg}</p>}
      {market.ledger === 'missing' && (
        <p className="note mt-3">
          <b>יומן ההפקדות אינו זמין כרגע, ולכן האישור כאן לא יישמר.</b>{' '}
          החלוקה למעלה נכונה ואפשר לבצע אותה בברוקר — טיפלנו בזה,
          ואפשר לרשום את ההפקדה בהמשך.
        </p>
      )}

      <div className="cta mt-3">
        <button className="opt" type="button" disabled={busy}
          onClick={() => void save()}>
          {busy ? 'רושם…' : 'אישור הפקדה'}
        </button>
        <button className="opt" type="button" disabled={busy}
          onClick={() => skipDeposit(month)}>
          לא הפקדתי החודש
        </button>
      </div>

      {/* ───────── הרישום המדויק — מתקפל, ולא חובה ───────── */}
      <details className="dep-more">
        <summary>
          רישום מספר היחידות <span>לא חובה</span>
        </summary>
        <p className="note">
          <b>אפשר לדלג על זה לגמרי.</b> אם תכתבו כמה עלתה{' '}
          <b>יחידה אחת</b> מכל רכיב — המחיר שמופיע אצל הברוקר ליד
          הנייר — המערכת תדע כמה יחידות קניתם, ומזה את מחיר הקנייה
          הממוצע שלכם. <b>זה מה שיאפשר לה בעתיד לומר לכם מה כבר
          אפשר למשוך בלי להפסיד.</b> בלי זה ההפקדה נרשמת, פשוט בלי
          הפירוט הזה.
        </p>
        {rows.filter(r => !r.orphan).map(r => (
          <div key={r.k} className="dep-px">
            <label htmlFor={`px-${r.k}`}>
              <span>{r.he ?? r.k}{r.cur ? ` · ${r.cur}` : ''}</span>
              <input type="number" step="0.01" min="0" inputMode="decimal"
                id={`px-${r.k}`} dir="ltr"
                value={r.price ?? ''}
                placeholder="מחיר יחידה"
                readOnly={r.live}
                onChange={e => {
                  const v = Number(e.target.value);
                  setPx(o => {
                    const next = { ...o, [r.k]: Number.isFinite(v) && v > 0 ? v : 0 };
                    saveLastPx(next);
                    return next;
                  });
                }} />
            </label>
            <span className="dep-units">
              {r.units ? <>≈ <b dir="ltr">{n4(r.units)}</b> יחידות</> : ' '}
            </span>
            {r.live && <span className="dep-live">ציטוט</span>}
          </div>
        ))}
        {market.ratesSource === 'fallback' && (
          <p className="note">
            שער הדולר כאן הוא <b>{market.rates.USD}₪</b> — ברירת מחדל ולא
            שער חי. הוא משנה את מספר היחידות, לא את הסכום.
          </p>
        )}
      </details>

      <p className="note">
        <b>כלל החלוקה.</b> קונים לכיוון המשקלות שבחרתם, ומטים לנופלים
        בתוך הגבול הזה: רכיב שנפל הוא תת-משקל ולכן מקבל יותר,{' '}
        <b>וברגע שהוא חוזר למשקל שבחרתם הוא נעצר.</b> אף רכיב לא מקבל
        מעל פי שלושה ממשקל היעד שלו בהפקדה אחת.
      </p>
      <p className="note">
        <b>התמהיל זז בהפקדות ולא במכירות</b>, ולכן אין בדרך הזאת אף
        אירוע מס. <b>אין באמור המלצה ואין בו ייעוץ פיננסי או ייעוץ מס.</b>
      </p>
    </Card>
  );
}
