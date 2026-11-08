/** **הלוח החם — מה הנכסים שאנחנו עובדים איתם עשו בשנה.**
 *
 *  **מה היה כאן קודם.** שלוש מטרות, ואחריהן חמישה כללים — טקסט
 *  סטטי שחזר על עצמו בכל טעינה, במקום שבו עין מצפה למשהו שזז.
 *
 *  ───────────────────────────────────────────────────────────────
 *  **הנתון מגיע מהקו האמריקאי, ולא מהקרן האירית. וזה לא קוצר דרך.**
 *
 *  נבדק 8.11.2026, שני המקורות שיש:
 *  · **Yahoo מחזיר 429 לכל בקשה** — גם משרת Vercel וגם ממכונה
 *    מקומית. ‏`/api/lse`, הפרוקסי שמשרת את מסך הקנייה, מוחזר ריק.
 *  · **Twelve Data אינו כולל קרנות LSE בתוכנית החינמית**
 *    (״available starting with the Grow plan״), ו-**FMP מחזיר
 *    ״no history״** ל-`XLKS.L`, ל-`SMH.L` ול-`SPXS.L`.
 *
 *  כלומר **אין כרגע שום מקור לסדרה היסטורית של הקווים האיריים**.
 *  מה שכן זמין הוא הקו האמריקאי שעוקב אחרי אותו מדד, והוא נשלף
 *  דרך `/api/series` — שמחזיר **סגירות חודשיות מתואמות דיבידנד**
 *  (`how: "close+dividends"`). זה חשוב: הקרנות האיריות **צוברות**,
 *  ולכן רק תשואה כוללת משתווה אליהן. מחיר בלבד היה מחסיר להן את
 *  הדיבידנד ומציג אותן נמוך מדי.
 *
 *  **וההבדל שנשאר, ונאמר על המסך:** הקו האמריקאי משלם מס במקור על
 *  דיבידנד, הקרן האירית לא — ולכן המספר כאן הוא **אומדן זהיר**,
 *  והקרן עצמה גבוהה ממנו בשבריר אחוז. העדפנו להציג נמוך.
 *  ───────────────────────────────────────────────────────────────
 *
 *  **כרטיס לכל מדד, ולא לכל קרן.** ‏SPXS ו-CSPX עוקבות שתיהן אחרי
 *  S&P 500, ו-IWDA ו-MXWO אחרי MSCI World. שני כרטיסים עם מספר
 *  זהה נראים כמו באג, ולכן הכרטיס הוא המדד והקרנות מופיעות בתוכו.
 *
 *  **המספר המוביל הוא התשואה השנתית**, מהגבוה לנמוך. והשני, השקט,
 *  הוא **הנפילה מהשיא שבתוך החלון** — כי זה המספר שכלל הקנייה פועל
 *  עליו. הם לא אומרים אותו דבר, ו-SMH ב-8.11.2026 הוא הדוגמה:
 *  **+32% בשנה, ו-29% מתחת לשיא** — הוא פסגה ב-660.81 ביוני וירד
 *  ל-467.44. כלומר הוא גם הרץ של השנה **וגם** זה שמקבל את רוב
 *  ההפקדה החודש. מספר אחד לבדו לא היה מספר את זה.
 *
 *  **והשיא נמדד על סגירות חודשיות** — שיא תוך־חודשי שלא נסגר בו
 *  אינו נספר, ולכן הנפילה שמוצגת קטנה ולא גדולה מהאמת.
 *
 *  **ובטעינה הוא לא ריק** — הכרטיסים מוצגים מיד עם השמות ו-״—״
 *  במקום המספר. מסך שמחכה לרשת הוא מסך ריק בצילום ובקישור משותף.
 */
import { useEffect, useState } from 'react';
import { Explain } from './Explain';

interface Point { t: string; c: number; a: number }
interface Series { months?: number; series?: Point[]; last?: string; error?: string }

/** המדדים שהקטלוג עוקב אחריהם, והקו האמריקאי של כל אחד */
const BOARD = [
  { us: 'SPY', he: 'S&P 500', funds: 'SPXS · CSPX', sub: '500 החברות הגדולות בארה״ב' },
  { us: 'URTH', he: 'MSCI World', funds: 'IWDA · MXWO', sub: '23 שווקים מפותחים' },
  { us: 'VT', he: 'All-World', funds: 'VWRA', sub: 'כל העולם, פיזור מקסימלי' },
  { us: 'XLK', he: 'טכנולוגיה S&P', funds: 'XLKS', sub: 'סקטור הטכנולוגיה ב-S&P 500' },
  { us: 'IXN', he: 'טכנולוגיה עולמית', funds: 'WTEC', sub: 'טכנולוגיה בכל העולם' },
  { us: 'SMH', he: 'שבבים', funds: 'SMH', sub: '25 יצרניות השבבים הגדולות' },
] as const;

interface Row {
  us: string; he: string; funds: string; sub: string;
  y1?: number | null; fromHigh?: number | null;
  from?: string; to?: string;
}

const pc1 = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;

/** **שנה אחורה מהסדרה החודשית.** שלוש עשרה נקודות הן שנים עשר
 *  חודשים; פחות מזה אינו שנה ואין מה לדווח עליו. השיא נמדד על
 *  אותן נקודות — ברזולוציה חודשית, ולכן הוא שמרני: שיא תוך־חודשי
 *  שלא נסגר בו אינו נספר, והנפילה שתוצג קטנה ולא גדולה מהאמת. */
function fromSeries(s: Series | undefined): {
  y1: number | null; fromHigh: number | null; from?: string; to?: string;
} {
  const pts = s?.series;
  if (!pts || pts.length < 13) return { y1: null, fromHigh: null };
  const win = pts.slice(-13);
  const first = win[0].a, last = win[win.length - 1].a;
  if (!(first > 0) || !(last > 0)) return { y1: null, fromHigh: null };
  const high = Math.max(...win.map(p => p.a));
  return {
    y1: last / first - 1,
    fromHigh: high > 0 ? Math.max(0, 1 - last / high) : null,
    from: win[0].t, to: win[win.length - 1].t,
  };
}

function AssetCard({ r, dup }: { r: Row; dup?: boolean }) {
  const has = r.y1 != null;
  return (
    <article className="mq-card ab-card" tabIndex={dup ? -1 : 0}>
      <span className="k" dir="ltr">{r.funds}</span>
      <h3>{r.he}</h3>
      <p className={`ab-n ${!has ? 'ab-skip' : r.y1! >= 0 ? 'ab-up' : 'ab-dn'}`} dir="ltr">
        {has ? pc1(r.y1!) : '—'}
      </p>
      <p className="ab-sub">
        {has
          ? <>מאז {new Date(r.from!).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })}{r.fromHigh != null && (
              r.fromHigh > 0.005
                ? <> · <b>{(r.fromHigh * 100).toFixed(0)}% מתחת לשיא</b></>
                : <> · <b>על השיא</b></>
            )}</>
          : <>{r.sub} · הנתון עוד לא נמשך</>}
      </p>
    </article>
  );
}

export function AssetBoard() {
  const [rows, setRows] = useState<Row[]>(() => BOARD.map(b => ({ ...b })));
  const [err, setErr] = useState(false);
  /** **החלון שנמדד, ולא ״שנה״.** הסדרה חודשית והנקודה האחרונה היא
   *  חודש חלקי, ולכן 13 נקודות הן בדרך כלל כאחת עשרה חודשים וחצי
   *  ולא שנים עשר בדיוק. להציג ״12 החודשים האחרונים״ זה לעגל כלפי
   *  מעלה; להציג את שני התאריכים זה לומר מה נמדד. */
  const [win, setWin] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const syms = BOARD.map(b => b.us).join(',');
        const r = await fetch(`/api/series?symbols=${encodeURIComponent(syms)}&years=2`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json() as { series?: Record<string, Series> };
        if (!j.series || !Object.keys(j.series).length) throw new Error('empty');
        const next = BOARD.map(b => ({ ...b, ...fromSeries(j.series![b.us]) }));
        if (next.every(x => x.y1 == null)) throw new Error('no data');
        // מהגבוה לנמוך; מי שאין לו נתון נופל לסוף ולא נראה כגרוע
        next.sort((a, b) => {
          if (a.y1 == null && b.y1 == null) return 0;
          if (a.y1 == null) return 1;
          if (b.y1 == null) return -1;
          return b.y1 - a.y1;
        });
        setRows(next);
        const w = next.find(x => x.from && x.to);
        if (w?.from && w.to) setWin({ from: w.from, to: w.to });
      } catch { setErr(true); }
    })();
  }, []);

  return (
    <>
      <section className="mq" aria-label="התשואה השנתית של המדדים שהמערכת עובדת איתם"
        style={{ ['--mq-dur' as string]: '38s' }}>
        <div className="mq-rail">
          {rows.map(r => <AssetCard key={r.us} r={r} />)}
          <div aria-hidden="true" style={{ display: 'contents' }}>
            {rows.map(r => <AssetCard key={`${r.us}-2`} r={r} dup />)}
          </div>
        </div>
      </section>
      {/* **שתי הפסקאות שהיו כאן ירדו מהדף.** הן היו קיר טקסט מתחת
          לפס נע, ומי שמגיע לדף רוצה לראות מספרים ולא הסתייגות
          באורך פסקה. **אבל הן לא נמחקו** — מספר בלי מקור אינו משהו
          שמותר להציג, ולכן כל מה שנאמר שם יושב ב-״?״ שליד הכותרת:
          מה נמדד, על איזה קו, למה הוא זהיר, ושתשואת העבר אינה
          כלל הקנייה. */}
      <div className="ab-meta">
        <span>
          {err
            ? 'הנתונים לא נמשכו הפעם'
            : win
              ? `שנה אחורה · עד ${new Date(win.to).toLocaleDateString('he-IL')}`
              : 'נמשכים…'}
        </span>
        <Explain topic="assetBoard" />
      </div>
    </>
  );
}
