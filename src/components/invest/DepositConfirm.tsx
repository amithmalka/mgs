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
  const [px, setPx] = useState<Record<string, number>>({});

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

  const save = async () => {
    setBusy(true); setMsg(null);
    const buys: NewBuy[] = rows
      .filter(r => r.ils >= 1 && !r.orphan && r.price && r.units)
      .map(r => ({
        fund_key: r.k, symbol: r.sym, deposited_on: today(),
        amount_ils: Math.round(r.ils * 100) / 100,
        units: Math.round(r.units! * 1e6) / 1e6,
        unit_price: r.price!,
        currency: r.cur ?? 'USD',
        fx_rate: market.rates[r.cur ?? 'USD'] ?? 1,
        note: `אושר במסך ההפקדות · ${month}`,
      }));
    if (!buys.length) {
      setMsg('אין מה לרשום — צריך מחיר לכל רכיב, אחרת אין יחידות ואין מחיר עלות.');
      setBusy(false); return;
    }
    const res = await addDeposits(buys);
    if (!res.ok) { setMsg(res.reason); setBusy(false); return; }
    confirmDeposit(month, useAmount,
      rows.map(r => ({ k: r.k, ils: Math.round(r.ils), units: r.units, px: r.price })));
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
  const noPrice = rows.filter(r => !r.orphan && !r.price).length;

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

      {/* **כרטיס לכל רכיב, ולא טבלה של שבע עמודות.** שבע עמודות
          בעברית מימין לשמאל נשברות כבר במסך של טלפון: הסימול נופל
          לשורה משלו, עמודת ״למה״ גולשת, והשורות מתערבבות. כאן כל
          רכיב הוא גוש אחד שנקרא מלמעלה למטה בכל רוחב. */}
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

            {r.orphan ? (
              <p className="dep-why dep-warn">
                <b>הרכיב הזה אינו בקטלוג.</b> הוא נשמר בתיק שלכם
                מגרסה קודמת, ואין לנו בשבילו סימול או מטבע — ולכן
                אי אפשר לרשום אותו. <b>הסירו אותו בדף ההרכבה</b>, או
                בחרו תמהיל מחדש.
              </p>
            ) : (
              <>
                <div className="dep-px">
                  <label>
                    <span>מחיר יחידה{r.cur ? ` · ${r.cur}` : ''}</span>
                    <input type="number" step="0.01" min="0" inputMode="decimal"
                      id={`px-${r.k}`} dir="ltr"
                      value={r.price ?? ''}
                      placeholder="הקלידו מחיר"
                      readOnly={r.live}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setPx(o => ({ ...o, [r.k]: Number.isFinite(v) && v > 0 ? v : 0 }));
                      }} />
                  </label>
                  <span className="dep-units">
                    {r.units ? <>≈ <b dir="ltr">{n4(r.units)}</b> יחידות</> : 'בלי מחיר אין יחידות'}
                  </span>
                  {r.live && <span className="dep-live">ציטוט</span>}
                </div>
                <p className="dep-why">{r.why}</p>
              </>
            )}
          </article>
        ))}

        <div className="dep-sum">
          <span>סך הכל להפקדה החודש</span>
          <b dir="ltr">{n0(totalIls)}₪</b>
        </div>
      </div>

      {noPrice > 0 && (
        <p className="note mt-3">
          <b>אין כרגע מחירים חיים לקווים האיריים</b>, ולכן המחיר הוא
          שדה שממלאים. פתחו את הנייר אצל הברוקר, העתיקו את מחיר
          היחידה, והיחידות יחושבו. <b>הסכום בשקלים הוא מה שמחייב</b> —
          המחיר רק קובע כמה יחידות הוא קנה, ואפשר לתקן אותו אחר כך.
        </p>
      )}
      {market.ratesSource === 'fallback' && (
        <p className="note mt-3">
          <b>שער המטבע כאן הוא ברירת מחדל</b> — דולר {market.rates.USD}₪ —
          ולא שער חי. הוא משנה את מספר היחידות, לא את הסכום.
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
      </p>
      <p className="note">
        <b>התמהיל זז בהפקדות ולא במכירות</b>, ולכן אין בדרך הזאת אף
        אירוע מס. <b>אין באמור המלצה ואין בו ייעוץ פיננסי או ייעוץ מס.</b>
      </p>
    </Card>
  );
}
