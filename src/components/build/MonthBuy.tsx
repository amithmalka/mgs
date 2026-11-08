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
import { useMemo } from 'react';
import { Stat } from '../shared/Stat';
import { Rows } from '../shared/Rows';
import { IRISH, BUY } from '../../constants/irish';
import { useMyPortfolio } from '../../store/myPortfolio';
import { ceilingFor } from '../../constants/studyFunds';
import { mix } from '../../constants/irish';
import { buySplit } from '../../utils/buySplit';
import type { TrackKey } from '../../utils/buySplit';
import { useMarket } from '../../hooks/useMarket';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

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

  // **מחירים, שיאים ומה שמוחזק — מהוק אחד.**
  //
  // עד כאן הקובץ הזה משך בעצמו מ-`/api/lse`, החזיק שיאים משלו
  // ב-localStorage, וקרא את היומן בנפרד — **עותק שני של אותה
  // לוגיקה**, שנשאר מאחור כש-Yahoo הפסיק להחזיר מחירים ומסך
  // האישור עבר ל-`/api/etf`. עכשיו שניהם על אותו מקור, ולכן גם על
  // אותם מספרים.
  const market = useMarket(holdings);

  const toBroker = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    return Math.max(0, deposit - Math.min(deposit, ceil)) + extra;
  }, [deposit, extra, fundStatus, annualSalary, selfIncome]);

  /** **כלל החלוקה — ב-`buySplit`, ולא כאן.**
   *
   *  **ולמה הוא יצא מהקובץ הזה.** מסך אישור ההפקדה חייב להציג
   *  **בדיוק את אותה חלוקה**; שני עתקים של אותו חישוב נפרדים
   *  בעדכון הראשון, והמשתמש יאשר סכומים שאינם מה שראה. */
  const plan = useMemo(() => buySplit({
    holdings, quotes: market.quotes, peaks: market.peaks, held: market.held,
    amount: toBroker, track,
  }).lines, [holdings, market.quotes, market.peaks, market.held, toBroker, track]);

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
          value={market.err ? 'אין' : market.loading ? 'נמשך' : 'חי'}
          sub={market.err ? 'חלוקה לפי משקלות'
            : market.quoteDate ? `סגירת ${new Date(market.quoteDate).toLocaleDateString('he-IL')}` : 'לפי ISIN'}
          tone={market.err ? undefined : 'up'} />
      </div>

      {market.err && <p className="lab-access warn">{market.err}.</p>}

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
        <button className="opt" type="button" onClick={market.refresh}>
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

