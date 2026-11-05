/** MGS · קרן השתלמות — שכיר, עצמאי, ושניהם. ואיך מחלקים את ההפקדה.
 *
 *  שתי הטבות נפרדות לחלוטין, ולכן שני חשבונות שהחוק **מחייב** להפריד:
 *  §3(ה) ו-§9(16א) לשכיר · §17(5א) ו-§9(16ב) לעצמאי.
 *
 *  **והן מתנהגות הפוך זו לזו:** הניכוי של העצמאי **נשחק** לפי השכר
 *  כשכיר, ותקרת הפטור ממס רווחי הון **אינה** נשחקת. הפטור הוא הכסף
 *  הגדול; הניכוי הוא בונוס שנתי.
 *
 *  אין בזה המלצה ואין בזה ייעוץ מס או ייעוץ פנסיוני.
 */
import { useMemo, useState } from 'react';
import { Stat } from '../shared/Stat';
import { DataCards } from '../shared/DataCards';
import {
  CEILINGS, PROVIDERS, MARKET, GONE, POLICY_RISK, selfDeduction, exemptCeiling,
  ceilingFor, RATE,
} from '../../constants/studyFunds';
import { NumField } from './NumField';
import { useMyPortfolio } from '../../store/myPortfolio';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;

type Status = 'employee' | 'self' | 'both';
const STATUS_HE: Record<Status, string> = {
  employee: 'שכיר', self: 'עצמאי', both: 'שכיר וגם עצמאי',
};

/** צמיחה של הפקדה חודשית קבועה */
function grow(m: number, years: number, r: number): number {
  let v = 0;
  for (let i = 0; i < years * 12; i++) v = (v + m) * (1 + r / 12);
  return v;
}
/** אותו דבר בחשבון ממוסה — 25% על הרווח הריאלי */
function netTaxed(m: number, years: number, r: number, cpi: number): number {
  if (m <= 0) return 0;
  const v = grow(m, years, r);
  let idx = 0;
  for (let i = 0; i < years * 12; i++) idx += m * Math.pow(1 + cpi, (years * 12 - i) / 12);
  return v - Math.max(0, v - idx) * 0.25;
}

export function SplitPlan() {
  // המעמד וההפקדה מגיעים מהחנות — אותם שדות כמו בדף ההרכבה, לא כפילות
  const {
    fundStatus, setFundStatus, deposit, setDeposit,
    annualSalary: salary, setAnnualSalary: setSalary,
    selfIncome, setSelfIncome,
    fundProvider, setFundProvider,
  } = useMyPortfolio();
  const status: Status = (fundStatus === 'none' ? 'self' : fundStatus) as Status;
  const setStatus = (s: Status) => setFundStatus(s);
  const [years, setYears] = useState(30);

  /** **התקרה בפועל, לא התקרה המוחלטת.** ההפקדה המוטבת היא אחוז
   *  מההכנסה — 10% לשכיר, 7% לעצמאי — ורק הוא נחסם בתקרה המרבית.
   *  מי שמרוויח פחות פשוט אינו רשאי להפקיד את הסכום המלא. */
  const legal = ceilingFor(status, salary, selfIncome);
  const ceilMo = legal.year / 12;
  const toFund = Math.min(deposit, ceilMo);
  const toBroker = Math.max(0, deposit - toFund);

  const res = useMemo(() => {
    const f = grow(toFund, years, 0.08);
    const b = netTaxed(toBroker, years, 0.08, 0.025);
    const allBroker = netTaxed(deposit, years, 0.08, 0.025);
    return { f, b, total: f + b, allBroker, gain: f + b - allBroker };
  }, [toFund, toBroker, deposit, years]);

  const ded = status === 'employee' ? 0
    : selfDeduction(status === 'both' ? salary : 0);

  return (
    <>
      <section>
        <h2>קרן השתלמות — כמה נכנס, וכמה נשאר לברוקר</h2>
        <p className="lede">
          הרווח בקרן השתלמות <b>פטור לחלוטין</b> אחרי שש שנים. אותו רווח
          בחשבון ברוקר חייב <b>25% על הרווח הריאלי</b>, ומעל 721,560₪
          הכנסה חייבת גם 5% מס יסף. <b>אין שיקול השקעתי שמתחרה בפטור
          הזה</b> — ולכן הסדר הוא קודם למלא את התקרה, ורק העודף לברוקר.
        </p>

        <div className="chips">
          {(Object.keys(STATUS_HE) as Status[]).map(k => (
            <button key={k} className="opt" type="button"
              aria-pressed={status === k} onClick={() => setStatus(k)}>
              {STATUS_HE[k]}
            </button>
          ))}
        </div>

        <div className="grp">
          <span className="glab">הפקדה חודשית</span>
          <NumField value={deposit} min={0} max={60000} label="הפקדה חודשית"
            unit="₪" onCommit={setDeposit} width={96} />
          <span className="glab">שנים</span>
          <NumField value={years} min={1} max={45} label="שנים"
            unit="שנים" onCommit={setYears} />
          {(status === 'employee' || status === 'both') && (
            <>
              <span className="glab">שכר שנתי כשכיר</span>
              <NumField value={salary} min={0} max={600000} label="שכר שנתי כשכיר"
                unit="₪" onCommit={setSalary} width={110} />
            </>
          )}
          {(status === 'self' || status === 'both') && (
            <>
              <span className="glab">הכנסה שנתית כעצמאי</span>
              <NumField value={selfIncome} min={0} max={2000000} label="הכנסה שנתית כעצמאי"
                unit="₪" onCommit={setSelfIncome} width={110} />
            </>
          )}
        </div>

        {/* **תקרת המס חוסמת, ולא רק מסבירה.** מעל התקרה המוטבת אין
            הטבת הפקדה, והרווח חייב 25% ריאלי — בדיוק כמו בברוקר, אבל
            בלי הנזילות ובלי הבחירה החופשית. ולכן העודף מנותב לברוקר
            ואינו נכנס לקרן. */}
        {deposit > ceilMo && (
          <p className="lab-access warn sp-cap">
            <b>התקרה הפטורה ממס היא {n0(ceilMo)}₪ לחודש</b>
            {' '}({n0(legal.year)}₪ לשנה)
            {legal.capped && <> — <b>לפי ההכנסה שהזנתם</b>, לא לפי התקרה
              המרבית של {n0(exemptCeiling(status))}₪</>}.{' '}
            <b>העודף — {n0(deposit - ceilMo)}₪ לחודש — מנותב לברוקר ולא
            לקרן.</b> אין חוק שאוסר להפקיד מעל, אבל על החלק הזה אין הטבת
            הפקדה והרווח חייב 25% ריאלי — כלומר אותו מס כמו בברוקר,
            בלי הנזילות ובלי הבחירה החופשית.
          </p>
        )}

        <div className="stats">
          <Stat label="לקרן השתלמות" value={`${n0(toFund)}₪`}
            sub={legal.capped
              ? `התקרה ${n0(ceilMo)}₪ — ${status === 'self' ? `${RATE.self * 100}% מההכנסה` : `${RATE.employee * 100}% מהשכר`}`
              : `התקרה: ${n0(ceilMo)}₪ לחודש`} tone="gold" />
          <Stat label="לברוקר" value={`${n0(toBroker)}₪`}
            sub={toBroker > 0 ? 'חייב 25% ריאלי' : 'הכל נכנס לפטור'} />
          <Stat label={`בתום ${years} שנה`} value={`${n0(res.total)}₪`}
            sub="בתשואה 8%, הנחה ולא הבטחה" tone="up" />
          <Stat label="מול הכל־לברוקר" value={`+${n0(res.gain)}₪`}
            sub="זה מה שהפטור שווה" tone="gold" />
        </div>

        {/* שני היעדים ככרטיסים, והסיכום כרצועה — כי ״סך הכל״
            ו״לשם השוואה״ אינם פריט שלישי אלא תוצאה והשוואה אליה. */}
        <DataCards
          wide
          items={[
            { k: 'fund', he: 'קרן השתלמות', month: toFund, end: res.f,
              tax: 'אפס, אחרי 6 שנים', tone: 'up' as const, mark: true },
            { k: 'broker', he: 'ברוקר', month: toBroker, end: res.b,
              tax: '25% על הרווח הריאלי', tone: 'dn' as const, mark: false },
          ]}
          keyOf={r => r.k} mark={r => r.mark}
          cols={[
            { h: 'לאן', v: r => r.he },
            { h: 'לחודש', v: r => `${n0(r.month)}₪` },
            { h: 'בתום התקופה', v: r => `${n0(r.end)}₪`, tone: r => r.mark ? 'gold' : undefined },
            { h: 'המס', he: true, v: r => r.tax, tone: r => r.tone },
          ]}
        />
        <div className="dsum">
          <div className="fin">
            <span className="l">סך הכל</span>
            <span className="s">{n0(deposit)}₪ לחודש</span>
            <span className="v gold" dir="ltr">{n0(res.total)}₪</span>
          </div>
          <div>
            <span className="l">לשם השוואה — הכל לברוקר</span>
            <span className="s">25% מס על הכל</span>
            <span className="v" dir="ltr">{n0(res.allBroker)}₪</span>
          </div>
        </div>

        {status === 'both' && (
          <p className="lab-access warn">
            <b>שתי קרנות — וזה מחויב, לא אופציונלי.</b> החוק בנוי משני
            מסלולים נפרדים (§3(ה) ו-§9(16א) לשכיר, §17(5א) ו-§9(16ב)
            לעצמאי), ואי אפשר לחסוך משתי ההכנסות בחשבון אחד. תקרת הפטור
            המשולבת: <b>{n0(exemptCeiling('both'))}₪ לשנה</b>.{' '}
            <b>אבל הניכוי ממס הכנסה כן נשחק</b> — בשכר של {n0(salary)}₪
            הוא יורד ל-<b>{n0(ded)}₪</b> במקום {n0(CEILINGS.selfDeduct)}₪.
          </p>
        )}

        <p className="note">
          <b>וסייג שאני מסמן באדום דווקא כי הסכום גדול:</b> ארבעה מקורות
          מקצועיים אומרים ששתי תקרות הפטור עומדות במקביל לאותו אדם —{' '}
          <b>אבל לא נמצא חוזר של רשות המסים שאומר זאת במילים מפורשות</b>,
          ודיון מקצועי בנושא הסתיים ללא הכרעה. לפני שבונים על זה —{' '}
          <b>אימות מול רואה חשבון</b>.
        </p>
        <p className="note">
          <b>ועוד דבר מעשי:</b> כל חשבון צובר <b>ותק של שש שנים בנפרד</b>,
          ומנגנון השלכת הוותק <b>חסום כל עוד מפקידים לשתי הקרנות
          במקביל</b>. מי שפותח קרן עצמאית מאוחר יחכה שש שנים משלו —
          ולכן כדאי לפתוח מוקדם, <b>אפילו בהפקדה סמלית</b>, רק כדי
          להתחיל את השעון.
        </p>
      </section>

      <section>
        <h2>איפה לפתוח — דמי ניהול בפועל, לא מהפרסום</h2>
        <p className="lede">
          הנתונים כאן הם מ<b>גמל־נט של רשות שוק ההון</b>, ספטמבר 2026 —
          <b> דמי הניהול שנגבו בפועל</b>, לא מה שמפורסם שיווקית.
          התקרה החוקית היא {pc(MARKET.legalCap, 0)} מהצבירה,{' '}
          <b>ואפס מההפקדה</b>.
        </p>
        <div className="stats">
          <Stat label="שוק פתוח" value={pc(MARKET.open)} sub="ממוצע משוקלל, 138 מסלולים" />
          <Stat label="הסדר מגזרי" value={pc(MARKET.sectoral)} sub="ארגון עובדים, 71 מסלולים" tone="gold" />
          <Stat label="הפער" value={`פי ${(MARKET.open / MARKET.sectoral).toFixed(1)}`} sub="לטובת ההסדר" tone="up" />
        </div>
        <p>
          <b>אם יש לכם לשכה מקצועית, ארגון עובדים או הסדר במקום העבודה
          — זה לפני כל השוואה אחרת.</b> הפער הוא כמעט פי שלושה, והוא גדול
          מכל הפרש בין הגופים בשוק הפתוח.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הגוף</th>
                <th>מסלול כללי</th>
                <th>מסלול מניות</th>
                <th>מחקה S&amp;P 500</th>
                <th>תשואה 5ש׳ · כללי</th>
                <th>נכסים ב-S&amp;P</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map(p => (
                <tr key={p.he}>
                  <td className="lead">{p.he}
                    {p.note && <small className="bk-sub">{p.note}</small>}</td>
                  <td dir="ltr">{p.general ? pc(p.general) : '—'}</td>
                  <td dir="ltr">{p.equity ? pc(p.equity) : '—'}</td>
                  <td dir="ltr" className={p.sp500 && p.sp500 <= 0.0050 ? 'gold' : p.sp500 && p.sp500 >= 0.0066 ? 'warn' : ''}>
                    {p.sp500 ? pc(p.sp500) : '—'}
                  </td>
                  <td dir="ltr" className={p.gen5 && p.gen5 >= 0.50 ? 'up' : p.gen5 && p.gen5 < 0.40 ? 'warn' : ''}>
                    {p.gen5 ? `+${(p.gen5 * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td dir="ltr" className="dim">{p.sp500Assets ? `${n0(p.sp500Assets)} מ׳` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>ואזהרה על עמודת התשואה:</b> רק <b>5 מתוך 22</b> מסלולי
          ה-S&amp;P 500 בשוק צברו חמש שנות ותק. השוואת תשואות ביניהם
          כמעט חסרת משמעות כרגע — <b>השוו דמי ניהול, לא תשואות</b>.
          ובמסלול מחקה מדד, דמי הניהול הם כמעט כל ההבדל שבשליטתכם.
        </p>
        <p className="note">
          <b>ומי שכבר לא קיים:</b> {GONE.map(g => `${g.he} — ${g.why}`).join(' · ')}.
          אם ראיתם אותם ברשימת השוואה, הרשימה מיושנת.
        </p>
      </section>

      <section>
        <h2>איפה פתחתם, וכמה מפקידים לשם</h2>
        <p className="lede">
          בחרו את הגוף שבו נפתחה הקרן, וכאן יישב <b>אישור ההפקדה
          החודשי</b> — כמה, לאן, ובאיזה שיעור.
        </p>
        <div className="grp">
          <span className="glab">הגוף שבו נפתחה הקרן</span>
          {PROVIDERS.map(p => (
            <button key={p.he} className="opt" type="button"
              aria-pressed={fundProvider === p.he}
              onClick={() => setFundProvider(fundProvider === p.he ? null : p.he)}>
              {p.he}
            </button>
          ))}
        </div>
        {fundProvider && (() => {
          const p = PROVIDERS.find(x => x.he === fundProvider)!;
          const cheapest = Math.min(...PROVIDERS.map(x => x.sp500 ?? 1));
          const gap = (p.sp500 ?? 0) - cheapest;
          return (
            <>
              <div className="stats">
                <Stat label="הגוף" value={p.he}
                  sub={toFund > 0 ? 'הקרן פעילה' : 'עוד לא הוזנה הפקדה'} tone="gold" />
                <Stat label="להפקיד כל חודש" value={`${n0(toFund)}₪`}
                  sub={`התקרה: ${n0(ceilMo)}₪`} tone="up" />
                <Stat label="דמי ניהול · מחקה S&P"
                  value={p.sp500 ? pc(p.sp500) : '—'}
                  sub={gap > 0 ? `+${(gap * 100).toFixed(2)} נק׳ מהזול` : 'הזול בשוק'} />
                <Stat label="בשנה" value={`${n0(toFund * 12)}₪`}
                  sub="הפקדה מוטבת" />
              </div>
              {gap > 0 && (
                <p className="lab-access warn">
                  <b>{p.he} אינה הזולה.</b> ההפרש הוא{' '}
                  <b>{(gap * 100).toFixed(2)} נקודות</b>, ועל {years} שנה
                  בהפקדה של {n0(toFund || 1714)}₪ לחודש הוא גורע{' '}
                  <b>{n0(grow(toFund || 1714, years, 0.08 - cheapest)
                       - grow(toFund || 1714, years, 0.08 - (p.sp500 ?? 0)))}₪</b>.
                  <b> ניוד בין גופים שומר על הוותק ואינו אירוע מס</b>,
                  ודמי הניהול הם שדה למשא ומתן.
                </p>
              )}
              {p.note && <p className="note"><b>{p.he}:</b> {p.note}</p>}
            </>
          );
        })()}
        {!fundProvider && (
          <p className="note">
            עוד לא בחרתם גוף. הטבלה מתחת מסודרת <b>מהזול ליקר</b>.
          </p>
        )}
      </section>

      <section>
        <h2>מה הכי זול — ולכן הכי משתלם</h2>
        <p className="lede">
          <b>במסלול מחקה מדד, דמי הניהול הם כמעט כל ההבדל שבשליטתכם.</b>{' '}
          שני מסלולים שעוקבים אחרי S&amp;P 500 מחזיקים את אותן מניות
          בדיוק — מה שמפריד ביניהם הוא מה שנגבה מכם. הטבלה מסודרת
          מהזול ליקר, ומחשבת כמה זה שווה על פני התקופה שבחרתם.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הגוף</th>
                <th>מחקה S&amp;P 500</th>
                <th>מול הזול ביותר</th>
                <th>מה זה עולה על {years} שנה</th>
                <th>תשואה 5ש׳ · כללי</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = PROVIDERS.filter(p => p.sp500 != null)
                  .sort((a, b) => (a.sp500 ?? 1) - (b.sp500 ?? 1));
                const cheapest = rows[0]?.sp500 ?? 0;
                return rows.map((p, i) => {
                  const gap = (p.sp500 ?? 0) - cheapest;
                  // כמה הפרש דמי הניהול גורע מהצבירה על פני התקופה
                  const a = grow(toFund || 1714, years, 0.08 - cheapest);
                  const b = grow(toFund || 1714, years, 0.08 - (p.sp500 ?? 0));
                  return (
                    <tr key={p.he} className={i === 0 ? 'cross' : ''}>
                      <td className="lead">
                        {i === 0 && <span className="sp-win">הזול</span>}
                        {p.he}
                      </td>
                      <td dir="ltr" className={i === 0 ? 'gold' : gap >= 0.0015 ? 'warn' : ''}>
                        <b>{pc(p.sp500 ?? 0)}</b>
                      </td>
                      <td dir="ltr" className="dim">
                        {gap === 0 ? '—' : `+${(gap * 100).toFixed(2)} נק׳`}
                      </td>
                      <td dir="ltr" className={gap > 0 ? 'warn' : 'dim'}>
                        {gap === 0 ? '—' : `−${n0(a - b)}₪`}
                      </td>
                      <td dir="ltr" className={p.gen5 && p.gen5 >= 0.50 ? 'up' : p.gen5 && p.gen5 < 0.40 ? 'warn' : 'dim'}>
                        {p.gen5 ? `+${(p.gen5 * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>העמודה הרביעית היא הנקודה.</b> היא מחשבת כמה הפרש דמי
          הניהול גורע מהצבירה על פני {years} שנה, בהפקדה של{' '}
          {n0(toFund || 1714)}₪ לחודש ובתשואה של 8%. <b>הפרש של
          0.2 נקודות נראה זניח ואינו זניח.</b>
        </p>
        <p className="note">
          <b>ולמה לא לדרג לפי תשואה.</b> רק <b>5 מתוך 22</b> מסלולי
          ה-S&amp;P 500 בשוק צברו חמש שנות ותק, והם עוקבים אחרי אותו
          מדד — פערי התשואה ביניהם הם רעש ועיתוי, לא מיומנות. עמודת
          התשואה כאן היא של <b>המסלול הכללי</b>, שבו המנהל כן בוחר,
          והיא מובאת לעיון. <b>אין באמור המלצה ואין בו ייעוץ פיננסי
          או פנסיוני.</b>
        </p>
      </section>

      <section>
        <h2>סיכון שצריך להיכנס לחשבון</h2>
        <p>
          <b>נייר מדיניות רשמי של אגף הכלכלן הראשי באוצר, אוקטובר 2025,
          ממליץ במפורש לצמצם משמעותית את הטבת המס בקרנות השתלמות.</b>{' '}
          עלות ההטבה ב-2024 הייתה <b>{(POLICY_RISK.cost2024 / 1e9).toFixed(1)} מיליארד₪</b>,
          ו-{pc(POLICY_RISK.topDecilesShare, 0)} ממנה הולכים לשלושת
          העשירונים העליונים.
        </p>
        <ol className="ask">
          {POLICY_RISK.options.map(o => <li key={o}>{o}</li>)}
        </ol>
        <p className="note">
          <b>נכון להיום לא חוקק דבר</b> והתקרות ל-2026 זהות לאלו של 2025.
          אבל זה על השולחן — וזו סיבה נוספת להתחיל עכשיו ולא בעוד שנתיים.
        </p>
      </section>
    </>
  );
}

