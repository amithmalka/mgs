/** MGS · מעבדת התמהיל האירי.
 *
 *  שלושה דברים בדף אחד:
 *
 *  1. **דירוג** כל שמונה הקרנות האיריות לשלוש רמות תנודתיות, מנתונים שנמדדו
 *     על הקרן האירית עצמה ולא על הנייר האמריקאי המקביל.
 *  2. **מעבדה** שבה מוסיפים ומורידים קרנות ורואים מיד מה זה עושה
 *     לתנודתיות, לתשואה ולנפילה — מהמתאמים המדודים, לא מהערכה.
 *  3. **מטרת המסלול**, ומה היה משיג אותה בחלון שנמדד.
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
import { useState, useMemo } from 'react';
import { DataCards } from '../shared/DataCards';
import {
  IRISH, TIER_HE, TIER_BAND, WINDOW,
  RULE_BY_SIZE, RULE_BY_PICK, RULE_FLOOR, mix, corr,
  type Tier, type IrishFund,
} from '../../constants/irish';
import { FRONTIER, COMBOS_COUNT, ILLIQUID, peakOf, topOf } from '../../constants/frontier';
import { COMBOS, type Combo } from '../../constants/combos';
import { ACCESS, TURNOVER, MIN_TURNOVER, EXPOSURES, ASK } from '../../constants/access';
import { BUY } from '../../constants/irish';
import { LADDER, LADDER_COMBOS, LADDER_FUNDS, ladderPeak } from '../../constants/ladder';
import { OUT_OF_SAMPLE, RULE_DRIFT, CONCENTRATION_WARNING } from '../../constants/routing';
import { useMyPortfolio } from '../../store/myPortfolio';
import { UMBRELLA, REPL, REPL_HE, withholds } from '../../constants/irish';

const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

const TIERS: Tier[] = ['calm', 'mid', 'hot'];

/** מה התפקיד של כל רמה בתמהיל — לא דירוג, חלוקת עבודה. */
const TIER_ROLE: Record<Tier, string> = {
  calm: 'הבסיס. מחזיק את התיק כשהשאר נופל, ומאפשר למשוך בלי לנעול נפילה.',
  mid: 'מנוע הצמיחה. כאן התשואה, וגם רוב התנודתיות שאפשר לחיות איתה.',
  hot: 'התבלין. במינון קטן מוסיף תשואה ומפזר; במינון גדול שולט בתיק.',
};

/** **מה כל מסלול בא להשיג — והמשקולות נגזרות מ-`combos.ts`.**
 *
 *  **תוקן 4.11.2026.** עד כאן החזיקו שלוש הרשומות האלה תמהילים
 *  מקובעים שלא היו בשום מקום אחר במערכת: `FWRA/CSPX/MXWO` בתזרים,
 *  `CSPX/CNDX/IUIT/SEMI/GDX` במשולב ו-`IUIT/CNDX/SEMI/CSPX` בצמיחה.
 *  **אחד מהם החזיק 10% כורות זהב, עם טקסט שמסביר למה הם טובים** —
 *  נכס שהוצא מכל המצגות ומכל הקומבינציות בגלל חציון התאוששות של 29
 *  חודשים. ארבע מחמש הקרנות שם כבר לא בקטלוג.
 *
 *  **מעתה: התמהיל הרגוע ביותר של כל מסלול, ישירות מ-`combos.ts`.**
 *  הוא נקודת פתיחה למעבדה — לא יעד ולא המלצה. */
const GOAL_TEXT: Record<Combo['track'], { he: string; goal: string; why: string }> = {
  flow: {
    he: 'תזרים בלבד',
    goal: 'לשמור על הקרן ולמשוך ממנה בלי שנפילה תאכל את המשיכה',
    why: 'כאן התנודתיות היא האויב, לא התשואה. מי שמושך 4% בשנה מתיק '
       + 'שירד 50% מושך מחצי קרן, והקרן לא מתאוששת. לכן הגרעין רחב '
       + 'ושכבת הצמיחה דקה.',
  },
  both: {
    he: 'תזרים וצמיחה',
    goal: 'למשוך בהווה ושהיתרה תמשיך לגדול',
    why: 'גרעין רחב שמחזיק את התזרים, ועליו שכבת טכנולוגיה ושבבים '
       + 'שנושאת את הצמיחה. המשיכה נפתחת מאוחר יותר מאשר בתזרים — '
       + 'בשנה העשירית ולא בשישית — כדי שהקרן תהיה גדולה יותר כשהיא מתחילה.',
  },
  growth: {
    he: 'צמיחה בלבד',
    goal: 'מקסימום צבירה לאורך 20 שנה ומעלה, בלי משיכה בדרך',
    why: 'אופק ארוך סופג נפילות, ולכן התנודתיות פחות מזיקה — אבל רק אם '
       + 'אין משיכה בדרך. מי שיימשוך באמצע נפילה של 33% ינעל אותה.',
  },
};

/** התמהיל הרגוע ביותר בכל מסלול — נקודת הפתיחה למעבדה. */
const GOALS: Array<{
  key: string; he: string; goal: string; why: string;
  parts: Record<string, number>;
}> = (['flow', 'both', 'growth'] as const).map(t => {
  const c = COMBOS.filter(x => x.track === t).sort((a, b) => a.vol - b.vol)[0];
  return {
    key: t, ...GOAL_TEXT[t],
    parts: Object.fromEntries(c.parts.map(p => [p.k, p.w])),
  };
});

function Bar({ v, max, tone }: { v: number; max: number; tone: string }) {
  return (
    <span className="lab-bar" aria-hidden="true">
      <i style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: tone }} />
    </span>
  );
}

export function IrishLab() {
  // הבחירה נשמרת בחנות, לא ב-state מקומי — דף הכניסה קורא ממנה.
  // **אין ברירת מחדל**: מי שלא בחר מתחיל ריק.
  const { holdings, setHoldings } = useMyPortfolio();
  const sel = useMemo(
    () => Object.fromEntries(holdings.map(h => [h.k, h.w])) as Record<string, number>,
    [holdings]);
  const setSel = (f: (s: Record<string, number>) => Record<string, number>) => {
    const next = f(sel);
    setHoldings(Object.entries(next).filter(([, w]) => w > 0).map(([k, w]) => ({ k, w })));
  };
  const [goal, setGoal] = useState<string | null>(null);
  // ברירת המחדל היא **כל** הקטלוג — שמונה קרנות, כולן נגישות דרך
  // אינטראקטיב ישראל בבורסות לונדון ואירופה.
  // **הסינון לת״א ובורר הבריכה מיותרים מאז 4.11.2026** — תל אביב
  // אינה מסלול קנייה, ושתי הבריכות מחזירות את אותה רשימה. הם
  // נשארים כאן עד שה-UI יוסר, ולא משנים שום מספר.
  const [onlyTase, setOnlyTase] = useState(false);
  const [frPool, setFrPool] = useState<'tase' | 'all'>('tase');
  const peakRung = useMemo(() => ladderPeak(), []);
  const ilsFunds = useMemo(
    () => IRISH.filter(f => ACCESS[f.k] === 'ils')
      .sort((a, b) => (TURNOVER[b.k] ?? 0) - (TURNOVER[a.k] ?? 0)), []);
  const eurFunds = useMemo(
    () => IRISH.filter(f => ACCESS[f.k] === 'eur')
      .sort((a, b) => b.cagr - a.cagr), []);
  const peak = useMemo(() => peakOf(frPool), [frPool]);
  const top = useMemo(() => topOf(frPool), [frPool]);

  // קרן שכבר בתמהיל נשארת בטבלה גם כשהסינון דולק — אחרת היא נספרת בתוצאה
  // אבל אין דרך להוריד אותה
  const pool = useMemo(
    () => IRISH.filter(f => !onlyTase || f.tase || (sel[f.k] ?? 0) > 0),
    [onlyTase, sel],
  );

  const parts = useMemo(
    () => Object.entries(sel).filter(([, w]) => w > 0).map(([k, w]) => ({ k, w })),
    [sel],
  );
  const m = useMemo(() => mix(parts), [parts]);
  const active = GOALS.find(g => g.key === goal);

  /** מה כל רכיב עושה לתיק: הפרש התנודתיות בלעדיו.
   *  שלילי = הרכיב מרים את התנודתיות. חיובי = הוא מוריד אותה. */
  const attrib = useMemo(() => parts.map(p => {
    const without = mix(parts.filter(q => q.k !== p.k));
    const f = IRISH.find(x => x.k === p.k)!;
    return {
      ...p, f,
      delta: parts.length > 1 ? without.vol - m.vol : 0,
      dCagr: parts.length > 1 ? without.cagr - m.cagr : 0,
      vsMix: parts.filter(q => q.k !== p.k).length
        ? parts.filter(q => q.k !== p.k)
            .reduce((s, q) => s + corr(p.k, q.k), 0) / (parts.length - 1)
        : 1,
    };
  }).sort((a, b) => a.delta - b.delta), [parts, m.vol, m.cagr]);

  const set = (k: string, w: number) =>
    setSel(s => {
      const n = { ...s };
      if (w <= 0) delete n[k]; else n[k] = w;
      return n;
    });

  const total = parts.reduce((s, p) => s + p.w, 0);
  /** רכיבים שהמנגנון עלול להציף בהפקדות: תשואה מתחת לרצפה */
  const risky = useMemo(
    () => parts.map(p => IRISH.find(f => f.k === p.k)!).filter(f => f && f.cagr < RULE_FLOOR),
    [parts]);

  return (
    <>
      <section>
        <h2>מה מזה באמת אפשר להחזיק בקרן השתלמות</h2>
        <p className="lede">
          הקטלוג כאן הוא של <b>חשבון השקעות רגיל</b>. בקרן השתלמות יש
          שלוש שכבות של אישור שצריכות להתקיים <b>יחד</b>, וכל אחת מהן
          יכולה לחסום נייר שהשתיים האחרות מתירות.
        </p>
        <div className="exps">
          <div className="exp">
            <b>1 · החוק</b>
            <span>תקנה 5(א)(1) — רשימה סגורה. ״קרן חוץ״ נבחנת מהותית
              לפי §113א: ייעוד ומקום התאגדות, בלי דרישת רישום.
              קרן אירית עוברת.</span>
          </div>
          <div className="exp">
            <b>2 · החברה המנהלת</b>
            <span>תקנה 4(א)(2) — היא נוקבת בשמות הברוקרים המותרים.
              גם אם החוק מתיר, היא יכולה לא להתיר.</span>
          </div>
          <div className="exp">
            <b>3 · הברוקר</b>
            <span>אם הוא לא מגיע ל-LSE או ל-Xetra, הנייר לא ניתן
              לקנייה בפועל — ולא משנה מה כתוב בשתי השכבות מעליו.</span>
          </div>
        </div>
        <p className="note">
          <b>והשכבה השלישית היא החוסם האמיתי.</b> מה שנסחר בתל אביב
          עובר את שלושתן בוודאות. מה שנסחר רק באירופה תלוי בכך שגם
          החברה המנהלת וגם הברוקר יתירו — <b>וזה לא אומת אצל אף גוף</b>.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הקרן</th>
                <th>בת״א</th>
                <th>מבנה</th>
                <th>שחזור</th>
                <th>ניכוי 15% על דיבידנד</th>
                <th>תשואה</th>
                <th>תנודתיות</th>
                <th>בקרן השתלמות</th>
              </tr>
            </thead>
            <tbody>
              {IRISH.filter(f => ACCESS[f.k] !== 'out').map(f => {
                const il = ACCESS[f.k] === 'ils';
                const t = TURNOVER[f.k];
                return (
                  <tr key={f.k}>
                    <td className="lead">{f.he}</td>
                    <td dir="ltr" className={il ? 'gold' : 'dim'}>
                      {il ? f.tase : '—'}
                    </td>
                    <td dir="ltr" className={UMBRELLA[f.k] === 'ICAV' ? 'warn' : 'dim'}>
                      {UMBRELLA[f.k] ?? '—'}
                    </td>
                    <td>{REPL[f.k] ? REPL_HE[REPL[f.k]] : '—'}</td>
                    <td dir="ltr" className={withholds(f.k) ? 'warn' : 'up'}>
                      {withholds(f.k) ? 'כן' : 'לא'}
                    </td>
                    <td dir="ltr" className="up">{sg(f.cagr)}
                      {f.short && <span className="lab-flag">חלון קצר</span>}</td>
                    <td dir="ltr">{pc(f.vol, 0)}</td>
                    <td>
                      {il && (t ?? 0) !== 0
                        ? <span className="bk-flag bk-ok">עוברת שלוש השכבות</span>
                        : <span className="bk-flag bk-warn">תלוי בברוקר · לא אומת</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>ועמודת הניכוי אינה זניחה דווקא כאן.</b> קרן פיזית אירית
          שמחזיקה מניות אמריקאיות סופגת <b>15% ניכוי במקור על הדיבידנד</b>,
          ואינו ניתן להשבה. קרן בחוזה חילופין מקבלת את המדד ברוטו.
          נמדד: על S&P 500, קרן החילופין הניבה <b>0.20 נקודות</b> יותר
          משתי קרנות פיזיות, והחיסכון התיאורטי הוא 0.18.
          <b> אבל זה לא אוניברסלי</b> — על MSCI World היא דווקא פיגרה.
        </p>
      </section>

      <section>
        <h2>סדר הגישה — מה באמת אפשר לקנות</h2>
        <p className="lede">
          ״רשומה בתל אביב״ ו״נסחרת בתל אביב״ <b>אינם אותו דבר</b>, וההפרש
          ביניהם הוא כסף. קרן שרשומה אך התמורה היומית שלה אפסית אי אפשר
          לקנות בפועל במחיר סביר. הטבלה הזאת מסודרת לפי מה שנבדק בדף המסחר
          של הבורסה ב-30.10.2026, ולא לפי מה שרשום בפרוספקט.
        </p>

        <h3 className="lab-h3">
          <span className="lab-dot lab-calm" aria-hidden="true" />
          א · בשקלים בתל אביב — {ilsFunds.length} קרנות
        </h3>
        <p className="say-sm">
          מסחר מקוון רגיל, בשקלים, <b>בלי עמלת המרת מט״ח</b>. כל ברוקר
          ישראלי, בלי חדר מסחר ובלי טלפון.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הקרן</th>
                <th>נייר</th>
                <th>סימול</th>
                <th>תמורה יומית</th>
                <th>דמי ניהול</th>
                <th>תשואה</th>
                <th>תנודתיות</th>
              </tr>
            </thead>
            <tbody>
              {ilsFunds.map(f => {
                const t = TURNOVER[f.k] ?? 0;
                return (
                  <tr key={f.k}>
                    <td className="lead">{f.he}
                      <small className="lab-sub">{f.desc}</small></td>
                    <td dir="ltr" className="gold">{f.tase}</td>
                    <td dir="ltr" className="tk">{f.tick}</td>
                    <td dir="ltr" className={t < 0 ? 'gold' : ''}>
                      {t < 0 ? 'מ-5.11.2026' : `${t.toLocaleString('en-US')}₪`}
                    </td>
                    <td dir="ltr">{pc(f.ter, 2)}</td>
                    <td dir="ltr" className="up">{sg(f.cagr)}
                      {f.short && <span className="lab-flag">חלון קצר</span>}</td>
                    <td dir="ltr">{pc(f.vol, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>אבל {ilsFunds.length} קרנות אינן {ilsFunds.length} אפשרויות.</b>{' '}
          קרנות שמתואמות 0.92 ומעלה הן אותו נכס באריזה אחרת, ואין טעם
          להחזיק כמה מהן. בפועל יש כאן <b>{EXPOSURES.length} חשיפות נבדלות
          בלבד</b>:
        </p>
        <div className="exps">
          {EXPOSURES.map(g => (
            <div key={g.he} className="exp">
              <b>{g.he}</b>
              <span>{g.keys.map(k => IRISH.find(f => f.k === k)?.tick).join(' · ')}</span>
            </div>
          ))}
        </div>

        <h3 className="lab-h3">
          <span className="lab-dot lab-mid" aria-hidden="true" />
          ב · ברוקר אירופי — {eurFunds.length} קרנות
        </h3>
        <p className="say-sm">
          <b>אינן רשומות בתל אביב כלל.</b> ברוקר ישראלי <b>אולי</b> מגיע
          אליהן דרך חדר מסחר ניירות ערך זרים — בטלפון, במטבע זר, עם המרה.
          <b> זה לא אומת</b>: פסגות ואקסלנס מפרסמות גישה לבורסות אירופה,
          ומיטב אינה נוקבת בשם של אף בורסה אירופית באתר שלה.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הקרן</th>
                <th>סימול</th>
                <th>ISIN</th>
                <th>מחליפה את</th>
                <th>דמי ניהול</th>
                <th>תשואה</th>
                <th>תנודתיות</th>
              </tr>
            </thead>
            <tbody>
              {eurFunds.map(f => (
                <tr key={f.k}>
                  <td className="lead">{f.he}</td>
                  <td dir="ltr" className="tk">{f.tick}</td>
                  <td dir="ltr" className="dim">{f.isin}</td>
                  <td dir="ltr" className="dim">{f.us}</td>
                  <td dir="ltr">{pc(f.ter, 2)}</td>
                  <td dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}
                    {f.short && <span className="lab-flag">חלון קצר</span>}</td>
                  <td dir="ltr">{pc(f.vol, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lab-goal">
          <b>מה לשאול בכתב כדי להפוך את דרגה ב׳ לוודאית</b>
          <ol className="ask">{ASK.map(q => <li key={q}>{q}</li>)}</ol>
        </div>

        <h3 className="lab-h3">
          <span className="lab-dot lab-hot" aria-hidden="true" />
          ג · הוצאו — רשומות בת״א אך לא נסחרות
        </h3>
        <p className="say-sm">
          אלה <b>כן</b> מופיעות ברשימת הבורסה, ולכן קל לחשוב שאפשר לקנות
          אותן. התמורה היומית אומרת אחרת. הן הוצאו מכל חישוב בדף הזה.
        </p>
        <DataCards
          wide items={ILLIQUID} keyOf={f => f.tase}
          cols={[
            { h: 'הקרן', v: f => f.he },
            { h: 'נייר בת״א', mono: true, v: f => f.tase },
            { h: 'תמורה יומית', tone: () => 'dn',
              v: f => `${f.turn.toLocaleString('en-US')}₪` },
          ]}
          note={f => f.turn === 0 ? 'לא נסחרה כלל באותו יום'
            : `מתחת לסף של ${MIN_TURNOVER.toLocaleString('en-US')}₪ ליום`}
        />
        <p className="note">
          <b>וזו לא הערת שוליים.</b> טכנולוגיה (1159193) החזיקה את כל הגבול
          היעיל של תל אביב עד 22% תנודתיות — והיא נסחרת ב-46 אלף ש״ח ביום.
          בלעדיה ובלי רובוטיקה ובלוקצ׳יין, <b>הגבול בת״א נעצר ב-15.0%
          במקום ב-21.9%</b>, וכל מה שנשאר הוא מדדים רחבים.
          <b> אין בתל אביב אף קרן סקטור נזילה.</b>
        </p>
      </section>

      <section>
        <h2>דירוג כל הקרנות האיריות — שלוש רמות תנודתיות</h2>
        <p className="lede">
          עד כאן התנודתיות נגזרה מהנייר <b>האמריקאי</b> המקביל. כאן היא נמדדה{' '}
          <b>על הקרן האירית עצמה</b>, בבורסה שבה היא באמת נסחרת, והומרה לדולר.
          החלון אחיד לכולן: <b>{WINDOW.months} החודשים</b> שבין {WINDOW.from}{' '}
          ל-{WINDOW.to}.
        </p>
        <p className="note">
          <b>סייג שחשוב לקרוא לפני הטבלה:</b> קרן שהושקה לאחרונה מסומנת{' '}
          <b>״חלון קצר״</b>. היא נמדדה על פחות מ-60 חודשים, והחודשים שהיו לה
          היו כולם שוק עולה — ולכן המספר שלה <b>מוטה כלפי מעלה</b> ואינו
          בר־השוואה לקרן עם היסטוריה מלאה. אין בטבלה הזאת המלצה ואין בה
          ייעוץ פיננסי; תשואת עבר אינה מנבאת את העתיד.
        </p>

        {TIERS.map(t => {
          const rows = IRISH.filter(f => f.tier === t);
          const maxC = Math.max(...rows.map(r => Math.abs(r.cagr)), 0.01);
          return (
            <div key={t} className="lab-tier">
              <h3>
                <span className={`lab-dot lab-${t}`} aria-hidden="true" />
                {TIER_HE[t]}
                <small>{TIER_BAND[t]} · {rows.length} קרנות</small>
              </h3>
              <div className="scroll bleed">
                <table>
                  <thead>
                    <tr>
                      <th className="lead">הקרן</th>
                      <th>סימול</th>
                      <th>מחליפה את</th>
                      <th>איפה אפשר לקנות</th>
                      <th>דמי ניהול</th>
                      <th>תשואה שנתית</th>
                      <th>תנודתיות</th>
                      <th>תשואה לכל יחידת תנודתיות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(f => (
                      <tr key={f.k}>
                        <td className="lead">
                          {f.he}
                          {f.short && <span className="lab-flag">חלון קצר · {f.months} חודשים</span>}
                          <small className="lab-sub">{f.desc}</small>
                        </td>
                        <td dir="ltr" className="tk">{f.tick}</td>
                        <td dir="ltr" className="dim">{f.us}</td>
                        <td>{f.tase ? `ת״א ${f.tase}` : 'ברוקר אירופי'}</td>
                        <td dir="ltr">{pc(f.ter, 2)}</td>
                        <td className={f.cagr >= 0 ? 'up' : 'warn'} dir="ltr">
                          {sg(f.cagr)}
                          <Bar v={Math.abs(f.cagr)} max={maxC}
                            tone={f.cagr >= 0 ? 'var(--up, #3fb950)' : 'var(--dn, #d2504b)'} />
                        </td>
                        <td dir="ltr">{pc(f.vol, 0)}</td>
                        <td dir="ltr" className={f.cagr / f.vol >= 1 ? 'gold' : ''}>
                          {(f.cagr / f.vol).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2>לכל רמת תנודתיות — מה הניב הכי הרבה</h2>
        <p className="lede">
          נבדקו <b>כל</b> צירופי המשקולות בקפיצות של 10%, עד ארבעה רכיבים —{' '}
          <b>{COMBOS_COUNT.all.toLocaleString('en-US')}</b> שילובים. מכל
          שילוב נשמר רק הטוב ביותר ברמת התנודתיות שלו, ומה שנשאר הם{' '}
          <b>{COMBOS.length}</b> התמהילים שלמטה.
        </p>
        <p className="note">
          <b>ולמה אין כאן טבלה מדורגת לפי תשואה.</b> בראש טבלה כזאת תמיד
          תשב <b>קרן אחת ב-100%</b> — זו בדיוק התשובה לשאלה ״מה הניב הכי
          הרבה״, וכאן זה היה יוצא מוליכים למחצה לבדם. דירוג לפי תשואה{' '}
          <b>מלמד לרכז</b>, והמדידה אומרת את ההפך: כל עשרת התמהילים
          שעברו את המסנן מחזיקים <b>שניים עד ארבעה רכיבים</b>.
          ולכן הטבלה היא לפי <b>רמת תנודתיות</b>: בוחרים כמה סיכון, ורואים
          מה הניב הכי הרבה באותה רמה.
        </p>

        <div className="chips">
          <button className="opt" type="button" aria-pressed={frPool === 'tase'}
            onClick={() => setFrPool('tase')}>רק בשקלים בת״א</button>
          <button className="opt" type="button" aria-pressed={frPool === 'all'}
            onClick={() => setFrPool('all')}>כל 24 הקרנות</button>
        </div>

        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">תנודתיות</th>
                <th>תשואה שנתית</th>
                <th>יחס</th>
                <th>התמהיל שהשיג את זה</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {FRONTIER[frPool].map((p, i) => {
                const prev = FRONTIER[frPool][i - 1];
                const back = prev && p.cagr < prev.cagr;
                return (
                  <tr key={`${p.vol}-${i}`}
                    className={p === peak ? 'cross' : back ? 'dim' : ''}>
                    <td className="lead" dir="ltr">{pc(p.vol, 0)}</td>
                    <td dir="ltr" className="up">{sg(p.cagr)}</td>
                    <td dir="ltr" className={p.cagr / p.vol >= 1 ? 'gold' : ''}>
                      {(p.cagr / p.vol).toFixed(2)}
                    </td>
                    <td>
                      {p.parts.map(q => (
                        <span key={q.k} className="lab-part">
                          {IRISH.find(f => f.k === q.k)?.he ?? q.k}
                          <b dir="ltr">{q.w}%</b>
                        </span>
                      ))}
                    </td>
                    <td className="dim">
                      {p === peak ? 'היחס הטוב ביותר'
                        : p === top ? 'התשואה הגבוהה ביותר'
                        : back ? 'הגבול מתהפך — פחות תשואה' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p>
          <b>שתי קריאות מהטבלה הזאת.</b> ראשית, <b>הגבול מתהפך בסביבות
          16.5% תנודתיות</b>. שם היחס תשואה־תנודתיות מגיע לשיא שלו,{' '}
          <b>0.969</b>, ומשם ומעלה כל תנודתיות נוספת קונה תשואה{' '}
          <b>פחות יעילה</b> — עד 0.832 בתמהיל התנודתי ביותר. התשואה
          הגבוהה ביותר אינה באותו מקום כמו התשואה היעילה ביותר, וזה
          ההבדל שכל המסלולים נבנו סביבו.
        </p>
        <p>
          שנית — ו<b>זו התוצאה החזקה כאן</b> — <b>טכנולוגיה ושבבים
          מופיעים ב-9 מתוך 10 התמהילים</b>, מהרגוע ועד התנודתי. אין
          תמהיל יעיל אחד שמסתדר בלעדיהם. ומנגד, <b>כל עשרת התמהילים
          מחזיקים שניים עד ארבעה רכיבים</b> — אף אחד לא יותר, ואף אחד
          לא רכיב בודד.
        </p>
        <p className="note">
          <b>ומה שאין כאן, בכוונה.</b> כורות זהב היו בתמהילים של הגרסה
          הקודמת בזכות מתאם 0.06 לשוק, <b>והוצאו</b>: חציון ההתאוששות
          שלהם <b>29 חודשים</b> מול 11 למוליכים למחצה, ומהשיא של 2011
          לקח להם <b>יותר מעשר שנים</b> לחזור. מנגנון הקנייה שלנו מפנה
          כסף לרכיב שנפל — וזה עובד רק אם הוא חוזר, ובזמן סביר.{' '}
          <b>שמונה מועמדים נוספים נבדקו מאז ונפלו באותו מסנן</b>:
          אורניום, חלל, רובוטיקה, בינה מלאכותית, קוונטים, בלוקצ׳יין,
          מניות קטנות וסייבר.
        </p>
      </section>

      <section>
        <h2>מנגנון הקנייה — על מה להפעיל אותו, ועל מה לא</h2>
        <p className="lede">
          הרצתי את מנגנון הקנייה עצמו על ההפקדות החודשיות האמיתיות —
          בשיא 10%, מתחת לשיא אחוז הירידה, והשארית לנופל העמוק ביותר —
          והשוויתי אותו לחלוקה שווה פשוטה. <b>התוצאה לא תלויה בגודל
          היוניברס אלא באיכותו.</b>
        </p>
        <DataCards
          items={RULE_BY_SIZE} keyOf={r => String(r.n)}
          mark={r => r.rule < r.equal}
          cols={[
            { h: 'כמה קרנות ביוניברס', v: r => `${r.n} קרנות` },
            { h: 'עם המנגנון', tone: () => 'up', v: r => sg(r.rule) },
            { h: 'חלוקה שווה', v: r => sg(r.equal) },
            { h: 'מה המנגנון הוסיף', tone: r => r.rule >= r.equal ? 'gold' : 'dn',
              v: r => `${((r.rule - r.equal) * 100).toFixed(1)} נק׳` },
          ]}
        />
        <p>
          <b>מ-3 קרנות ועד 20, המנגנון ניצח את החלוקה השווה בכל גודל</b> —
          בין 3.4 ל-5.4 נקודות. ואז, בארבע הקרנות האחרונות שנוספו,{' '}
          <b>הוא התהפך ל-5.1 נקודות מתחת</b>. ארבע קרנות הפכו יתרון של
          חמש נקודות לחיסרון של חמש.
        </p>
        <p>
          <b>הסיבה, והיא פשוטה:</b> המנגנון מנתב לנופל העמוק ביותר, ו
          <b>אינו יודע להבחין בין ירידה זמנית לקריסה מתמשכת</b>. קרן
          שיורדת שנה אחרי שנה היא <em>לנצח</em> הנופלת העמוקה ביותר. בהרצה
          על 24 הקרנות, <b>אינטרנט סיני בלעה 37.2% מכל הכסף</b> — קרן
          שהניבה 17%− לשנה. התשואה המשוקללת של מה שהמנגנון <i>קנה</i> היתה{' '}
          <b>2.4%+</b>, מול 13.4%+ בחלוקה שווה.
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr><th className="lead">איך נבחר היוניברס</th><th>קרנות</th>
                <th>עם המנגנון</th><th>חלוקה שווה</th><th>מה המנגנון הוסיף</th></tr>
            </thead>
            <tbody>
              {RULE_BY_PICK.map(r => (
                <tr key={r.he}>
                  <td className="lead">{r.he}</td>
                  <td dir="ltr">{r.n}</td>
                  <td dir="ltr" className="up">{sg(r.rule)}</td>
                  <td dir="ltr">{sg(r.equal)}</td>
                  <td dir="ltr" className={r.rule >= r.equal ? 'gold' : 'warn'}>
                    {((r.rule - r.equal) * 100).toFixed(1)} נק׳
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>ושימו לב לשורה ״התנודתיות ביותר״.</b> בחירה לפי תנודתיות היא
          בדיוק המסנן ההפוך: היא בוחרת את הנכסים ש<b>נופלים הכי עמוק</b>,
          ואז המנגנון מגדיל אותם עוד. זו מלכודת כפולה — <b>10.9 נקודות
          מתחת</b> לחלוקה שווה על אותן קרנות בדיוק. לעומת זאת בחירה לפי{' '}
          <b>היחס תשואה־תנודתיות</b> נתנה למנגנון לעבוד.
        </p>
        <p>
          <b>המסקנה המעשית:</b> המנגנון <b>אינו תחליף לבחירה</b> — הוא
          מגדיל את מה שבחרתם, לטוב ולרע. להפעיל אותו על ״כל מה שיש״
          מסוכן; להפעיל אותו על יוניברס מסונן מראש, של נכסים שמאמינים
          בהם, <b>מוסיף בין 3 ל-5 נקודות בשנה</b>.
        </p>
      </section>

      <section>
        <h2>לחלק על הכל לפי המנגנון, או לבחור כמה?</h2>
        <p className="lede">
          זו השאלה המעשית, והיא נמדדה — על <b>הפקדות חודשיות אמיתיות</b>,
          לא על תשואת מדד. והמדידה נעשתה <b>מחוץ למדגם</b>: בוחרים
          תמהיל על המחצית הראשונה של התקופה, <b>בלי לראות את ההמשך</b>,
          ובודקים אותו על המחצית השנייה. בלי זה כל השוואה מרמה את עצמה.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">החלון</th>
                <th>תקופת האימון</th>
                <th>תקופת המבחן</th>
                <th>המנגנון על כל הקרנות</th>
                <th>חלוקה שווה על הכל</th>
                <th>התמהיל שנבחר</th>
                <th>ההפרש</th>
              </tr>
            </thead>
            <tbody>
              {OUT_OF_SAMPLE.map(t => (
                <tr key={t.months}>
                  <td className="lead">{t.months} חודשים</td>
                  <td dir="ltr" className="dim">{t.train}</td>
                  <td dir="ltr" className="dim">{t.test}</td>
                  <td dir="ltr" className="warn">{sg(t.ruleAll, 1)}</td>
                  <td dir="ltr">{sg(t.equalAll, 1)}</td>
                  <td dir="ltr" className="gold"><b>{sg(t.picked, 1)}</b></td>
                  <td dir="ltr" className="up">
                    +{((Math.max(t.picked, t.rulePicked) - t.ruleAll) * 100).toFixed(1)} נק׳
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <b>הבחירה ניצחה בכל שלושת החלונות</b>, ובהפרש של 2.4 עד 17.5
          נקודות בשנה. <b>והמנגנון על יוניברס רחב היה הגרוע ביותר</b>{' '}
          בשניים מתוך שלושה — גרוע אפילו מחלוקה שווה פשוטה.
        </p>
        <p>
          <b>והסיבה בתמונה אחת.</b> המנגנון מנתב לנופל העמוק ביותר,
          ו<b>אינו מבחין בין ירידה זמנית לקריסה מתמשכת</b>. בהרצה על
          24 הקרנות, <b>{RULE_DRIFT.worst.he} בלעה{' '}
          {pc(RULE_DRIFT.worst.share, 1)} מכל ההפקדות</b> — קרן שהניבה{' '}
          {sg(RULE_DRIFT.worst.cagr)} לשנה, כל שנה, ולכן הייתה לנצח
          הנופלת העמוקה ביותר. התשואה המשוקללת של מה שהמנגנון{' '}
          <i>קנה</i> הייתה <b>{sg(RULE_DRIFT.boughtAvg)}</b>, מול{' '}
          {sg(RULE_DRIFT.equalAvg)} בחלוקה שווה.
        </p>
        <p className="note">
          <b>אבל המנגנון כן עובד — על יוניברס מסונן.</b> על התמהיל
          הנבחר הוא נתן כמעט בדיוק אותו דבר כמו משקלות קבועים
          ({OUT_OF_SAMPLE.map(t => sg(t.rulePicked, 1)).join(' · ')}).
          כלומר <b>הסינון הוא כל הסיפור, לא המנגנון</b>. המנגנון אינו
          תחליף לבחירה — הוא מכפיל אותה, לטוב ולרע.
        </p>
        <p className="note">
          <b>ואזהרה שאני אומר בקול:</b> {CONCENTRATION_WARNING}
        </p>
      </section>

      <section>
        <h2>סולם התשואות — לבחור לפי כמה סיכון סופגים</h2>
        <p className="lede">
          <b>{LADDER_COMBOS.toLocaleString('en-US')}</b> שילובים נבדקו על{' '}
          <b>{LADDER_FUNDS}</b> הקרנות עם היסטוריה מלאה. בכל רמת
          תנודתיות נשמר רק מה שהניב הכי הרבה. <b>הסולם לא אומר איפה
          לשבת</b> — הוא אומר מה עלה כל שלב.
        </p>
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">תנודתיות</th>
                <th>תשואה</th>
                <th>יחס</th>
                <th>למי</th>
                <th>התמהיל — עם הטיקר להזמנה</th>
              </tr>
            </thead>
            <tbody>
              {LADDER.map(r => (
                <tr key={r.vol} className={r === peakRung ? 'cross' : ''}>
                  <td className="lead" dir="ltr">{pc(r.vol, 0)}</td>
                  <td dir="ltr" className="up">{sg(r.cagr)}</td>
                  <td dir="ltr" className={r.cagr / r.vol >= 1.14 ? 'gold' : ''}>
                    {(r.cagr / r.vol).toFixed(2)}
                  </td>
                  <td>{r.track}</td>
                  <td>
                    {r.parts.map(q => {
                      const f = IRISH.find(x => x.k === q.k);
                      const b = BUY[q.k];
                      return (
                        <span key={q.k} className="lab-part">
                          {f?.he ?? q.k}
                          {b && <code dir="ltr">{b.sym}</code>}
                          <b dir="ltr">{q.w}%</b>
                        </span>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>הטיקר בכל שורה הוא מה שמקלידים באינטראקטיב</b> — אבל
          מחפשים לפי <b>ISIN</b>, לא לפי טיקר. ורובם המוחלט נסחרים
          ב-<span dir="ltr">LSEETF</span> בדולר.
        </p>
      </section>

      <section>
        <h2>מעבדה — הוסיפו והורידו, ותראו מה זה עושה</h2>
        <p className="lede">
          כל שינוי מחושב <b>מהמתאמים שנמדדו</b> בין כל זוג קרנות, ולא מממוצע.
          זו הסיבה שהוספת קרן תנודתית יכולה <b>להוריד</b> את תנודתיות התיק:
          אם היא זזה בכיוון אחר מהשאר, היא מקזזת יותר ממה שהיא מוסיפה.
        </p>

        <div className="chips">
          {GOALS.map(g => (
            <button key={g.key} className="opt" type="button"
              aria-pressed={goal === g.key}
              onClick={() => { setGoal(g.key); setSel(() => g.parts); }}>
              {g.he}
            </button>
          ))}
        </div>

        {active && <div className="lab-goal">
          <b>המטרה של {active.he}:</b> {active.goal}
          <p>{active.why}</p>
          {(() => {
            const inMix = IRISH.filter(f => (sel[f.k] ?? 0) > 0);
            const off = inMix.filter(f => !f.tase);
            if (!off.length) {
              return (
                <p className="lab-access ok">
                  <b>כל הרכיבים בתמהיל הזה נקנים בשקלים בבורסה בתל אביב.</b>{' '}
                  מספרי הנייר: {inMix.map(f => f.tase).join(' · ')}
                </p>
              );
            }
            return (
              <p className="lab-access warn">
                <b>{off.length} מתוך {inMix.length} רכיבים אינם נסחרים בתל אביב</b>{' '}
                ודורשים ברוקר אירופי — {off.map(f => f.he).join(' · ')}. את
                היתר אפשר בשקלים.
              </p>
            );
          })()}
        </div>}

        <div className="stats">
          <Stat label="תשואה שנתית" value={sg(m.cagr)} sub={`על ${WINDOW.months} חודשים`} tone="up" />
          <Stat label="תנודתיות" value={pc(m.vol, 0)}
            sub={`בלי פיזור היתה ${pc(m.naive, 0)}`} tone="gold" />
          <Stat label="רווח הפיזור"
            value={`${((m.naive - m.vol) * 100).toFixed(1)} נק׳`}
            sub={`מתאם ממוצע ${m.avgCorr.toFixed(2)}`} />
        </div>

        {risky.length > 0 && (
          <p className="lab-access warn">
            <b>שימו לב למנגנון הקנייה.</b> {risky.map(f => f.he).join(' · ')}{' '}
            {risky.length > 1 ? 'הניבו' : 'הניבה'} מתחת
            ל-{pc(RULE_FLOOR, 0)} בחלון שנמדד. מנגנון הקנייה מנתב את השארית
            אל <b>הנופל העמוק ביותר</b>, ורכיב שיורד ברציפות הוא לנצח
            הנופל העמוק ביותר — ולכן הוא יבלע חלק גדל והולך מההפקדות.
            בהרצה על 24 הקרנות, רכיב אחד כזה בלע <b>37% מכל הכסף</b>.
          </p>
        )}

        <label className="lab-only">
          <input type="checkbox" checked={onlyTase}
            onChange={e => setOnlyTase(e.target.checked)} />
          רק מה שנקנה בשקלים בבורסה בתל אביב ({IRISH.filter(f => f.tase).length} קרנות)
        </label>

        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">בתמהיל</th>
                <th>רמה</th>
                <th>משקל</th>
                <th>תשואה</th>
                <th>תנודתיות</th>
                <th>מה היא עושה לתנודתיות התיק</th>
                <th>מה היא עושה לתשואה</th>
                <th>מתאם לשאר התיק</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.flatMap(t => {
                const rows = pool.filter(f => f.tier === t);
                if (!rows.length) return [];
                return [
                  <tr key={`hd-${t}`} className="cross">
                    <td className="lead" colSpan={8}>
                      <span className={`lab-dot lab-${t}`} aria-hidden="true" />
                      <b>{TIER_HE[t]}</b> · {TIER_BAND[t]} · {rows.length} קרנות
                      <small className="lab-sub">{TIER_ROLE[t]}</small>
                    </td>
                  </tr>,
                  ...rows.map(f => {
                const a = attrib.find(x => x.k === f.k);
                const w = sel[f.k] ?? 0;
                return (
                  <tr key={f.k} className={w > 0 ? '' : 'dim'}>
                    <td className="lead">
                      <label className="lab-pick">
                        <input type="checkbox" checked={w > 0}
                          onChange={e => set(f.k, e.target.checked ? 10 : 0)} />
                        {f.he}
                        {BUY[f.k] && <code dir="ltr">{BUY[f.k].sym}</code>}
                      </label>
                    </td>
                    <td><span className={`lab-dot lab-${f.tier}`} aria-hidden="true" />{TIER_HE[f.tier]}</td>
                    <td>
                      <input className="amt lab-w" type="number" min={0} max={100} step={5}
                        value={w} aria-label={`משקל ${f.he}`}
                        onChange={e => set(f.k, Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                      {w > 0 && total > 0 && <small className="lab-sub">{pc(w / total, 0)} מהתיק</small>}
                    </td>
                    <td dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</td>
                    <td dir="ltr">{pc(f.vol, 0)}</td>
                    <td dir="ltr" className={a && a.delta < 0 ? 'warn' : a ? 'up' : 'dim'}>
                      {a && parts.length > 1
                        ? `${a.delta < 0 ? 'מרימה' : 'מורידה'} ${Math.abs(a.delta * 100).toFixed(1)} נק׳`
                        : '—'}
                    </td>
                    <td dir="ltr" className={a && a.dCagr < 0 ? 'up' : 'dim'}>
                      {a && parts.length > 1 ? `${sg(-a.dCagr, 1)}` : '—'}
                    </td>
                    <td dir="ltr" className={a && a.vsMix < 0.4 ? 'gold' : ''}>
                      {a && parts.length > 1 ? a.vsMix.toFixed(2) : '—'}
                    </td>
                  </tr>
                );
              }),
                ];
              })}
            </tbody>
          </table>
        </div>

        <p className="note">
          <b>איך לקרוא את שתי העמודות האמצעיות.</b> ״מרימה 3 נק׳״ אומר שבלי
          הקרן הזאת תנודתיות התיק היתה <b>נמוכה</b> ב-3 נקודות — כלומר היא
          מוסיפה סיכון. ״מורידה״ אומר ההפך: בלעדיה התיק היה{' '}
          <b>תנודתי יותר</b>, והיא מקזזת. ועמודת התשואה אומרת כמה התיק
          מרוויח או מאבד מכך שהיא בתוכו. <b>מתאם מתחת ל-0.40 מסומן בזהב</b> —
          שם הפיזור באמת עובד.
        </p>
      </section>

    </>
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

export type { IrishFund };
