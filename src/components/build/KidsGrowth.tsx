/** MGS קידס · צמיחה בלבד, על התיק שנבחר.
 *
 *  **למה צמיחה בלבד ולא שלושת המסלולים.** לילד בן אפס יש עשרים שנה
 *  עד שהוא נוגע בכסף, ואין שום סיבה למשוך בדרך. כל שקל שנמשך הוא
 *  שקל שלא עבד עשרים שנה. ולכן כאן **אין לוח משיכות** — יש הפקדה,
 *  זמן, ומה שנצבר ביום שהוא מקבל אותו.
 *
 *  **ואותו מנוע בדיוק כמו שאר המערכת.** קודם רץ כאן חישוב נפרד —
 *  ריבית דריבית שטוחה על התיק כנכס אחד — והוא היה שגוי בשני
 *  הכיוונים:
 *
 *  · **הוא פספס את מה שהפקדה חודשית עושה בנכס תנודתי.** קונים יותר
 *    יחידות כשהוא זול, ולכן ה-IRR גבוה מה-CAGR. בתמהיל של עולמי,
 *    שבבים וכורות זהב ההנחה היא 8.29% **וה-IRR שנמדד 11.51%**.
 *  · **והוא לא הפעיל את מנגנון הקנייה כלל.** באותו תמהיל המנגנון
 *    לבדו הוסיף **71,353₪** — כי כורות הזהב נעים במתאם 0.055 ל-S&P,
 *    וכשאחד נופל הכלל קונה דווקא אותו.
 *
 *  יחד הפער הגיע ל-**39%** בחסר. ובכיוון ההפוך, `v*(1+r/12)` חישב
 *  ריבית חודשית כחלוקה ב-12 — מה שמנפח 9% ל-9.38% — ולכן ברכיב
 *  בודד הוא דווקא הגזים. שני הדברים ירדו, והחישוב הוא `runMix`
 *  עם `drawYears: 0`.
 */
import { useMemo, useState } from 'react';
import { IRISH, BUY, mix, type Tier } from '../../constants/irish';
import { forwardFor, OUTLOOK_HE, type Outlook } from '../../constants/forward';
import { runMix } from '../../utils/mixEngine';
import { useMyPortfolio, totalWeight } from '../../store/myPortfolio';
import { NumField } from './NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };

export function KidsGrowth({ onBuild }: { onBuild?: () => void }) {
  const { holdings } = useMyPortfolio();
  const [childAge, setChildAge] = useState(0);
  const [handAge, setHandAge] = useState(20);
  const [deposit, setDeposit] = useState(500);
  const [growth, setGrowth] = useState(3);
  const [outlook, setOutlook] = useState<Outlook>('real');
  /** **שני כיווני חישוב.** ״מהפקדה״ — כמה ייצא. ״מיעד״ — כמה צריך
   *  להפקיד כדי להגיע לסכום. זה אותו מנוע, רק נפתר הפוך. */
  const [mode, setMode] = useState<'from' | 'goal'>('from');
  const [goal, setGoal] = useState(500000);

  const years = Math.max(1, handAge - childAge);
  const parts = useMemo(() => holdings.map(h => ({ k: h.k, w: h.w })), [holdings]);
  const m = useMemo(() => mix(parts), [parts]);
  const fwd = useMemo(() => forwardFor(parts, outlook), [parts, outlook]);
  const tot = totalWeight(holdings);

  /** **פתרון הפוך: כמה להפקיד כדי להגיע לסכום.**
   *
   *  אין לזה נוסחה סגורה — המנוע מריץ סימולציה, ומנגנון הקנייה תלוי
   *  במה שקרה בדרך. אבל התוצאה **לינארית בהפקדה**: אותם מסלולי
   *  מחיר, רק מוכפלים. ולכן מספיקה הרצה אחת עם הפקדת ייחוס, והיחס
   *  נותן את התשובה — במקום עשרים הרצות של חיפוש בינארי.
   *
   *  נבדק: הרצה ב-1,000₪ נתנה בדיוק פי שניים מהרצה ב-500₪. */
  const needed = useMemo(() => {
    if (!holdings.length || goal <= 0) return null;
    const REF = 1000;
    const r = runMix({
      parts, track: 'growth', cohort: '30-40', depYears: years,
      base: REF, growth: growth / 100, drawYears: 0,
      outlook, useRule: true, paths: 400,
    });
    if (r.atStop <= 0) return null;
    return {
      perMonth: Math.ceil(REF * goal / r.atStop / 10) * 10,
      low: r.atStopP10 > 0 ? Math.ceil(REF * goal / r.atStopP10 / 10) * 10 : null,
      paidRatio: r.paid / r.atStop,
    };
  }, [parts, years, goal, growth, outlook, holdings.length]);

  /** **אותו מנוע של כל המערכת**, רק בלי משיכות: כל רכיב בנפרד,
   *  המתאמים שנמדדו, ומנגנון הקנייה פועל. */
  const base = mode === 'goal' ? (needed?.perMonth ?? 0) : deposit;
  const res = useMemo(() => {
    if (!holdings.length || base <= 0) return null;
    return runMix({
      parts, track: 'growth', cohort: '30-40', depYears: years,
      base, growth: growth / 100, drawYears: 0,
      outlook, useRule: true, paths: 400,
    });
  }, [parts, years, base, growth, outlook, holdings.length]);

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">MGS קידס</span>
        <h2>אותו תיק, לילד</h2>
        <p className="lede">
          <b>אין כאן מערכת שנייה.</b> אותו קטלוג אירי, אותו מנוע ואותו
          מנגנון קנייה — רק <b>בלי משיכות</b>, כי לילד יש עשרים שנה עד
          שהוא נוגע בכסף.
        </p>
        {onBuild && (
          <div className="cta">
            <button className="opt mp-go" type="button" onClick={onBuild}>
              קודם לבחור תיק
            </button>
          </div>
        )}
      </section>
    );
  }

  const value = res?.atStop ?? 0;
  const low = res?.atStopP10 ?? 0;
  const paid = res?.paid ?? 0;

  return (
    <section>
      <span className="eyebrow">MGS קידס · צמיחה בלבד</span>
      <h2>מה נצבר עד שהוא מקבל את זה</h2>
      <p className="lede">
        <b>אין כאן לוח משיכות, בכוונה.</b> כל שקל שנמשך בדרך הוא שקל
        שלא עבד עשרים שנה. יש הפקדה, יש זמן, ויש מה שנצבר ביום
        שהוא מקבל אותו.
      </p>

      <div className="grp kg-mode">
        <button className="opt" type="button" aria-pressed={mode === 'from'}
          onClick={() => setMode('from')}>יש לי סכום להפקיד</button>
        <button className="opt" type="button" aria-pressed={mode === 'goal'}
          onClick={() => setMode('goal')}>יש לי יעד לגיל {handAge}</button>
      </div>

      <div className="grp">
        <span className="glab">גיל הילד היום</span>
        <NumField value={childAge} min={0} max={20} label="גיל הילד"
          unit="שנים" onCommit={setChildAge} />
        <span className="glab">מקבל בגיל</span>
        <NumField value={handAge} min={childAge + 1} max={40} label="גיל קבלת הכסף"
          unit="שנים" onCommit={setHandAge} />
        {mode === 'from' ? (
          <>
            <span className="glab">הפקדה חודשית</span>
            <NumField value={deposit} min={0} max={20000} label="הפקדה חודשית"
              unit="₪" onCommit={setDeposit} width={96} />
          </>
        ) : (
          <>
            <span className="glab">שיקבל בגיל {handAge}</span>
            <NumField value={goal} min={0} max={50000000} label="סכום היעד"
              unit="₪" onCommit={setGoal} width={128} />
          </>
        )}
        <span className="glab">עליה שנתית, שנים 1–5</span>
        <NumField value={growth} min={0} max={10} step={0.5} label="עליה שנתית"
          unit="%" onCommit={setGrowth} />
        {(Object.keys(OUTLOOK_HE) as Outlook[]).map(o => (
          <button key={o} className="opt" type="button"
            aria-pressed={outlook === o} onClick={() => setOutlook(o)}>
            {OUTLOOK_HE[o]}
          </button>
        ))}
      </div>

      {/* **התשובה לשאלה ההפוכה, לפני כל השאר.** מי שבא עם יעד רוצה
          מספר אחד: כמה בחודש. השאר הוא אימות. */}
      {mode === 'goal' && needed && (
        <div className="kg-answer">
          <span className="k">כדי ש{handAge === 20 ? 'יקבל בגיל 20' : `יקבל בגיל ${handAge}`} {n0(goal)}₪</span>
          <b dir="ltr">{n0(needed.perMonth)}₪</b>
          <span className="kg-per">לחודש, החל מהיום</span>
          {needed.low && (
            <small>
              זה לפי החציון. <b>כדי להגיע לסכום גם בתרחיש הגרוע
              מתוך עשרה</b> צריך {n0(needed.low)}₪ לחודש.
            </small>
          )}
        </div>
      )}

      {!res ? (
        <p className="lab-access warn">
          <b>{mode === 'goal' ? 'הזינו סכום יעד' : 'הזינו הפקדה חודשית'}</b> כדי שהמנוע ירוץ.
        </p>
      ) : (
        <>
          <div className="cm-shared">
            <div>
              <span className="k">בגיל {handAge}, אחרי {years} שנה</span>
              <b dir="ltr">{n0(value)}₪</b>
              <small>חציון מתוך 400 הרצות</small>
            </div>
            <div>
              <span className="k">בתרחיש הגרוע מתוך עשרה</span>
              <b dir="ltr" className="warn">{n0(low)}₪</b>
              <small>אחוזון 10 — ככה זה נראה כשלא הולך</small>
            </div>
            <div>
              <span className="k">מתוך זה הפקדתם</span>
              <b dir="ltr" className="dim">{n0(paid)}₪</b>
              <small>{pc(paid / Math.max(1, value))} מהסכום הסופי</small>
            </div>
          </div>

          <div className="stats">
            <Stat label="מה הכסף הניב בפועל" value={sg(res.irr, 2)}
              sub={`בשנה, על ההפקדות שלכם`} tone="gold" />
            <Stat label="ההנחה שהמנוע קיבל" value={pc(fwd.cagr, 2)}
              sub="ממקורות מפורסמים, בשנה" />
            <Stat label="תנודתיות התיק" value={pc(m.vol)}
              sub={`בלי פיזור היתה ${pc(m.naive)}`} />
          </div>

          {/* **המספר הזה דרש הסבר, ולכן הוא יושב כאן ולא כתווית.**
              ״הפרש מול ההנחה״ בארבע מילים לא אמר כלום. */}
          <p className="note">
            <b>למה {res.irr > fwd.cagr ? 'יצא יותר' : 'יצא פחות'} מההנחה.</b>{' '}
            ההנחה היא תשואה שנתית על <b>סכום שיושב</b>. אתם מפקידים{' '}
            <b>כל חודש</b>, ושלושה כוחות מושכים את התוצאה לכיוונים שונים:{' '}
            <b>קונים יותר יחידות כשהתיק זול ופחות כשהוא יקר</b>, ולכן
            הכסף שהפקדתם מרוויח יותר מהאחוז עצמו;{' '}
            {holdings.length >= 2 ? (
              <><b>מנגנון הקנייה מגביר את זה</b> — השארית הולכת לרכיב
              שנפל הכי עמוק, כלומר קונים הכי הרבה בדיוק כשהוא הכי זול;{' '}</>
            ) : (
              <><b>ברכיב אחד אין לאן לנתב</b>, ולכן המנגנון לא מוסיף כאן
              דבר;{' '}</>
            )}
            <b>ותנודתיות לבדה גורעת</b> — דרך מתנדנדת מצטברת לפחות
            מדרך חלקה באותו ממוצע. <b>בתיק הזה הסכום הוא{' '}
            {sg(res.irr - fwd.cagr, 2)} בשנה.</b>
          </p>
        </>
      )}

      <div className="scroll bleed">
        <table>
          <thead>
            <tr>
              <th className="lead">הרכיב</th>
              <th>משקל</th>
              <th>כמה בחודש</th>
              <th>סימול</th>
              <th>ההנחה</th>
              <th>תנודתיות</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(h => {
              const f = IRISH.find(x => x.k === h.k);
              const b = BUY[h.k];
              if (!f) return null;
              return (
                <tr key={h.k}>
                  <td className="lead">
                    <span className={`lab-dot ${DOT[f.tier]}`} aria-hidden="true" />
                    {f.he}
                  </td>
                  <td dir="ltr">{pc(tot ? h.w / tot : 0)}</td>
                  <td dir="ltr" className="gold">
                    <b>{n0(base * (tot ? h.w / tot : 0))}₪</b>
                  </td>
                  <td dir="ltr" className="tk">{b ? b.sym : '—'}</td>
                  <td dir="ltr">{sg(f.cagr)}</td>
                  <td dir="ltr">{pc(f.vol)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="note">
        <b>זה אותו מנוע של כל המערכת</b> — כל רכיב מדומה בנפרד עם
        המתאמים שנמדדו, ומנגנון הקנייה פועל. <b>התנודתיות והמתאמים
        נמדדו; התשואה קדימה היא הנחה מפורסמת ולא הבטחה.</b>{' '}
        <b>אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
      </p>
    </section>
  );
}

function Stat({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone?: 'gold' | 'up';
}) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="k">{label}</span>
      <span className="n" dir="ltr">{value}</span>
      <span className="s">{sub ?? ' '}</span>
    </div>
  );
}
