/** MGS · מה קונים החודש — על התיק שנבחר, לא על רכיבים קבועים.
 *
 *  **הכלל עצמו נמצא ב-`utils/buySplit.ts`**, ושני מסכים קוראים לו:
 *  המסך הזה, שמציג, ומסך אישור ההפקדה, שרושם. אחד.
 *
 *  **מה שהיה כאן, ומה שהקוד באמת מריץ.** הכתב התחתון כאן תיאר
 *  חלוקה לפי עומק הנפילה בלבד, עם השארית כולה לנופל העמוק ביותר.
 *  **הקוד מריץ משהו אחר מאז 3.11.2026** — קנייה לכיוון משקל היעד
 *  עם הטיה לנופלים ותקרה של פי שלושה — ולכן ההסבר תוקן. בלי
 *  התקרה נמדד שרכיב שירד 10% קיבל 80% מכל הפקדה.
 *
 *  **התמהיל זז בהפקדות ולא במכירות** — ולכן אין בדרך הזאת אף אירוע
 *  מס. **והשיאים נשמרים מקומית**; בלעדיהם אי אפשר לדעת מה ירד ובכמה.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stat } from '../shared/Stat';
import { Rows } from '../shared/Rows';
import { IRISH, BUY } from '../../constants/irish';
import { useMyPortfolio } from '../../store/myPortfolio';
import { ceilingFor } from '../../constants/studyFunds';
import { mix } from '../../constants/irish';
import { buySplit } from '../../utils/buySplit';
import type { TrackKey } from '../../utils/buySplit';
import { listDeposits, listMarks, listWithdrawals, positionsNet } from '../../lib/deposits';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

const PEAKS_KEY = 'mgs-peaks';

interface Quote { price: number | null; currency: string | null; change: number | null }

function loadPeaks(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PEAKS_KEY) ?? '{}'); }
  catch { return {}; }
}
function savePeaks(p: Record<string, number>) {
  try { localStorage.setItem(PEAKS_KEY, JSON.stringify(p)); } catch { /* נפרטי או חסום */ }
}

export function MonthBuy({ onBuild }: { onBuild?: () => void }) {
  const { holdings, deposit, extra, fundStatus, annualSalary, selfIncome } = useMyPortfolio();
  // **המסלול נגזר מהתיק עצמו ולא מהגיל.** ההטיה לנופלים צריכה
  // להתאים לאופי התיק שנבחר, לא לגיל המשקיע: מי שבחר תיק בתנודתיות
  // 13% מושך ממנו, וקנייה אגרסיבית בירידה אינה מתאימה לו **גם אם
  // הוא בן עשרים.** וזו גם אותה חלוקה שהקטלוג עצמו משתמש בה.
  const track = useMemo<TrackKey>(() => {
    const v = mix(holdings).vol;
    return v < 0.145 ? 'flow' : v < 0.225 ? 'both' : 'growth';
  }, [holdings]);
  // **מה שמוחזק בפועל**, מתוך יומן ההפקדות. בלי זה אין ״תת-משקל״
  // ואי אפשר לקנות לכיוון היעד — אפשר רק לקנות לפי הנפילה, וזו
  // בדיוק התקלה שתוקנה.
  const [held, setHeld] = useState<Record<string, number>>({});
  useEffect(() => {
    // **אם היומן עוד לא מותקן, held נשאר ריק — וזה תקין.** אז כל
    // הרכיבים הם תת-משקל באותה מידה, ההטיה לנופלים עובדת, והגבול
    // של משקל היעד נשמר. ברגע שיש היסטוריית הפקדות, הקנייה מכוונת
    // למשקל האמיתי בתיק ולא למשקל המשוער.
    void (async () => {
      const [d, m, w] = await Promise.all([listDeposits(), listMarks(), listWithdrawals()]);
      if (!d.ok || !m.ok || !w.ok) return;
      const next: Record<string, number> = {};
      for (const q of positionsNet(d.data, m.data, w.data)) next[q.k] = q.units;
      setHeld(next);
    })();
  }, []);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [peaks, setPeaks] = useState<Record<string, number>>(loadPeaks);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pull = useCallback(async () => {
    if (!holdings.length) return;
    setLoading(true);
    try {
      const syms = holdings.map(h => BUY[h.k]?.sym).filter(Boolean).join(',');
      const r = await fetch(`/api/lse?symbols=${encodeURIComponent(syms)}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      if (!j.quotes || !Object.keys(j.quotes).length) throw new Error('empty');
      setQuotes(j.quotes); setErr(null);
      // מעדכנים שיאים
      setPeaks(prev => {
        const next = { ...prev };
        for (const h of holdings) {
          const sym = BUY[h.k]?.sym;
          const px = sym ? j.quotes[sym]?.price : null;
          if (px) next[h.k] = Math.max(next[h.k] ?? 0, px);
        }
        savePeaks(next);
        return next;
      });
    } catch {
      setErr('לא הצלחנו למשוך מחירים — החלוקה מוצגת לפי המשקלות');
    } finally { setLoading(false); }
  }, [holdings]);

  useEffect(() => { void pull(); }, [pull]);

  const toBroker = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    return Math.max(0, deposit - Math.min(deposit, ceil)) + extra;
  }, [deposit, extra, fundStatus]);

  /** **כלל החלוקה — ב-`buySplit`, ולא כאן.**
   *
   *  **ולמה הוא יצא מהקובץ הזה.** מסך אישור ההפקדה חייב להציג
   *  **בדיוק את אותה חלוקה**; שני עתקים של אותו חישוב נפרדים
   *  בעדכון הראשון, והמשתמש יאשר סכומים שאינם מה שראה. */
  const plan = useMemo(() => buySplit({
    holdings, quotes, peaks, held, amount: toBroker, track,
  }).lines, [holdings, quotes, peaks, held, toBroker, track]);

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">מה קונים החודש</span>
        <h2>עוד לא בחרתם תיק</h2>
        <p className="lede">
          <b>המערכת לא מציעה לכם רכיבים, בכוונה.</b> בוחרים בדף ההרכבה,
          ומכאן ואילך המסך הזה יגיד בדיוק כמה לקנות מכל אחד — לפי
          המחירים והשיאים של אותו יום.
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

  return (
    <section>
      <span className="eyebrow">מה קונים החודש</span>
      <h2>החלוקה של ההפקדה, לפי מה שירד</h2>

      <div className="stats">
        <Stat label="לביצוע החודש" value={`${n0(toBroker)}₪`}
          sub={fundStatus === 'none' ? 'אין קרן השתלמות' : 'אחרי תקרת הקרן'} tone="gold" />
        <Stat label="רכיבים" value={String(holdings.length)} sub="בתיק שלכם" />
        <Stat label="מצב מחירים"
          value={err ? 'אין' : loading ? 'נמשך' : 'חי'}
          sub={err ? 'חלוקה לפי משקלות' : 'מחירי הקווים שבחרתם'}
          tone={err ? undefined : 'up'} />
      </div>

      {err && <p className="lab-access warn">{err}.</p>}

      <Rows
        cols={[
          { k: 'he', label: 'הרכיב', lead: true },
          { k: 'amt', label: 'לקנות החודש', ltr: true, big: true },
          { k: 'ask', label: 'חלק מההפקדה', ltr: true },
          { k: 'tk', label: 'סימול', ltr: true },
          { k: 'ex', label: 'בורסה', ltr: true, dim: true },
          { k: 'cur', label: 'מטבע', ltr: true },
          { k: 'isin', label: 'ISIN', ltr: true, dim: true },
          { k: 'why', label: 'למה', wide: true, dim: true },
        ]}
        rows={plan.flatMap(x => {
          const f = IRISH.find(y => y.k === x.k);
          const b = BUY[x.k];
          if (!f || !b) return [];
          return [{
            id: x.k,
            mark: x.deepest,
            tag: x.deepest ? 'מקבל את השארית' : undefined,
            cells: {
              he: f.he,
              amt: <>{n0(toBroker * x.ask / 100)}₪</>,
              ask: `${x.ask.toFixed(0)}%`,
              tk: <span className="tk"><b>{b.sym}</b></span>,
              ex: b.ex === 'LSE' ? 'LSEETF' : b.ex,
              cur: b.cur,
              isin: f.isin,
              why: x.why,
            },
          }];
        })}
        total={{ label: 'סך הכל לברוקר החודש', value: `${n0(toBroker)}₪` }}
      />

      <div className="cta">
        <button className="opt" type="button" onClick={() => void pull()}>
          רענון מחירים ושיאים
        </button>
      </div>

      <p className="note">
        <b>כלל החלוקה.</b> קונים לכיוון המשקלות שבחרתם, ומטים לנופלים
        בתוך הגבול הזה: הפער בין משקל היעד למשקל בפועל, כפול הנפילה
        מהשיא. רכיב שנפל הוא תת-משקל ולכן מקבל יותר — <b>וברגע שהוא
        חוזר למשקל שבחרתם הוא נעצר.</b> אף רכיב לא מקבל מעל{' '}
        <b>פי שלושה</b> ממשקל היעד שלו בהפקדה אחת, והעודף עובר למי
        שיש לו מקום תחת התקרה.
      </p>
      <p className="note">
        <b>התמהיל זז בהפקדות ולא במכירות</b>, ולכן <b>אין בדרך הזאת אף
        אירוע מס</b>. השיאים נשמרים בדפדפן שלכם — בלעדיהם אי אפשר לדעת
        מה ירד ובכמה.
      </p>
      <p className="note">
        <b>וכל הניירות כאן איריים</b>, עם ISIN שמתחיל
        ב-<span dir="ltr">IE</span>, ונקנים דרך ברוקר זר.{' '}
        <b>אין כאן ביטקוין</b> — רגולציית UCITS אוסרת קריפטו בקרן
        אירית, ולכן כל חשיפה אליו מחזירה את המחזיק לבסיס מס העיזבון
        האמריקאי. <b>אין באמור המלצה ואין בו ייעוץ פיננסי או ייעוץ מס.</b>
      </p>
    </section>
  );
}

