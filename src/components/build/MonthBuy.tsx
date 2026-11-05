/** MGS · מה קונים החודש — על התיק שנבחר, לא על רכיבים קבועים.
 *
 *  **כלל החלוקה, כפי שהוא:** רכיב שנמצא על השיא הקודם שלו או מעליו
 *  מקבל **10%** מההפקדה. רכיב שמתחתיו מקבל את **אחוז הירידה שלו** —
 *  ירד 30%, מקבל 30%. **כל השארית הולכת למה שירד הכי עמוק** באותו
 *  יום. אם ביקשו יחד יותר מ-100%, החלוקה לפי היחס ביניהם; אם אף
 *  רכיב אינו מתחת לשיא, ההפקדה מתחלקת שווה בשווה.
 *
 *  **התמהיל זז בהפקדות ולא במכירות** — ולכן אין בדרך הזאת אף אירוע
 *  מס.
 *
 *  **והשיאים נשמרים מקומית.** בלעדיהם אי אפשר לדעת מה ירד ובכמה.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IRISH, BUY } from '../../constants/irish';
import { useMyPortfolio, totalWeight } from '../../store/myPortfolio';
import { ceilingFor } from '../../constants/studyFunds';
import { mix } from '../../constants/irish';
import { DIP_TILT, DIP_CAP } from '../../utils/monthPlan';
import { listDeposits, listMarks, listWithdrawals, positionsNet } from '../../lib/deposits';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

const UP_CAP = 10;
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
  const track = useMemo<'flow' | 'both' | 'growth'>(() => {
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

  /** כלל החלוקה — על המחירים והשיאים של עכשיו */
  const plan = useMemo(() => {
    const tot = totalWeight(holdings) || 1;
    const live = holdings.map(h => {
      const sym = BUY[h.k]?.sym;
      const px = sym ? quotes[sym]?.price ?? null : null;
      const pk = peaks[h.k] ?? px ?? null;
      const drop = px && pk && pk > 0 ? Math.max(0, 1 - px / pk) : null;
      return { ...h, px, pk, drop };
    });

    const haveAll = live.every(x => x.drop !== null);
    if (!haveAll) {
      // בלי מחירים — חלוקה לפי המשקלות, ומסומן ככזה
      return live.map(x => ({
        ...x, ask: (x.w / tot) * 100, why: 'לפי המשקלות שבחרתם · אין מחירים',
        deepest: false,
      }));
    }

    // **קונים לכיוון משקל היעד, ומטים לנופלים בתוך הגבול הזה.**
    //
    // רכיב שנפל הוא תת-משקל ולכן מקבל יותר — **וברגע שהוא חוזר
    // למשקל שבחרתם הוא נעצר.** זה מה שמבדיל איזון מחדש ממיצוע
    // כלפי מטה בלי גבול.
    //
    // **מה היה כאן קודם, ולמה זה תוקן ב-3.11.2026.** ההקצאה הייתה
    // לפי גודל הנפילה בלבד, והשארית הלכה כולה לנופל העמוק ביותר.
    // נמדד ש**רכיב שירד 10% בלבד קיבל 80% מכל הפקדה**, ונשאר שם
    // ככל שירד יותר. בירידה של 80% לאורך שנתיים זה שלח אליו 80%
    // מכל הכסף והפך אותו ל-61% מהתיק — **בדיוק מה שקרה למשקיעים
    // ב-KWEB.** לא הקנייה בירידה הזיקה, אלא שלא היה לה גבול.
    const pfNow = live.reduce((t, x) => t + (x.px ?? 0) * (held[x.k] ?? 0), 0);
    const pf = pfNow + toBroker;
    const tilt = DIP_TILT[track];
    let gaps = live.map(x => {
      const target = x.w / tot;
      const cur = pf > 0 ? (x.px ?? 0) * (held[x.k] ?? 0) / pf : 0;
      return Math.max(0, target - cur) * (1 + (x.drop ?? 0) * tilt);
    });
    if (gaps.reduce((a, b) => a + b, 0) <= 0) gaps = live.map(x => x.w / tot);
    const gsum = gaps.reduce((a, b) => a + b, 0);
    let share = gaps.map(g => (gsum > 0 ? g / gsum : 1 / live.length) * 100);

    // **התקרה:** אף רכיב לא מעל פי DIP_CAP ממשקל היעד שלו
    let over = 0;
    share = share.map((v, i) => {
      const max = (live[i].w / tot) * 100 * DIP_CAP;
      if (v > max) { over += v - max; return max; }
      return v;
    });
    if (over > 0.01) {
      const room = share.map((v, i) => Math.max(0, (live[i].w / tot) * 100 * DIP_CAP - v));
      const rs = room.reduce((a, b) => a + b, 0);
      if (rs > 0) share = share.map((v, i) => v + over * room[i] / rs);
    }

    let deepest = 0;
    for (let i = 1; i < live.length; i++) if (live[i].drop! > live[deepest].drop!) deepest = i;
    const anyDown = live.some(x => x.drop! > 0);

    return live.map((x, i) => ({
      ...x, ask: share[i],
      deepest: anyDown && i === deepest,
      why: !anyDown
        ? 'כל הרכיבים על השיא — ההפקדה מתחלקת לפי המשקלות שבחרתם'
        : x.drop! > 0
          ? (i === deepest
            ? `ירד ${pc(x.drop!)} — הנפילה העמוקה החודש, ולכן מקבל הכי הרבה · עד ${pc(x.w / tot)} בתיק ולא מעל`
            : `ירד ${pc(x.drop!)} — מקבל יותר, עד שיחזור ל-${pc(x.w / tot)} שבחרתם`)
          : `על השיא שלו — מקבל רק מה שצריך כדי להישאר על ${pc(x.w / tot)}`,
    }));
  }, [holdings, quotes, peaks]);

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

      <div className="scroll bleed">
        <table>
          <thead>
            <tr>
              <th className="lead">הרכיב</th>
              <th>כמה לקנות</th>
              <th>חלק מההפקדה</th>
              <th>למה</th>
              <th>סימול</th>
              <th>בורסה</th>
              <th>מטבע</th>
              <th>ISIN</th>
            </tr>
          </thead>
          <tbody>
            {plan.map(x => {
              const f = IRISH.find(y => y.k === x.k);
              const b = BUY[x.k];
              if (!f || !b) return null;
              return (
                <tr key={x.k} className={x.deepest ? 'cross' : ''}>
                  <td className="lead">
                    {f.he}
                    {x.deepest && <span className="mb-deep">מקבל את השארית</span>}
                  </td>
                  <td dir="ltr" className="gold">
                    <b>{n0(toBroker * x.ask / 100)}₪</b>
                  </td>
                  <td dir="ltr">{x.ask.toFixed(0)}%</td>
                  <td className="dim">{x.why}</td>
                  <td dir="ltr" className="tk"><b>{b.sym}</b></td>
                  <td dir="ltr" className="dim">{b.ex === 'LSE' ? 'LSEETF' : b.ex}</td>
                  <td dir="ltr">{b.cur}</td>
                  <td dir="ltr" className="dim">{f.isin}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cta">
        <button className="opt" type="button" onClick={() => void pull()}>
          רענון מחירים ושיאים
        </button>
      </div>

      <p className="note">
        <b>כלל החלוקה.</b> רכיב שנמצא על השיא הקודם שלו או מעליו מקבל{' '}
        <b>{UP_CAP}%</b> מההפקדה. רכיב שמתחתיו מקבל את <b>אחוז הירידה
        שלו</b> — ירד 30%, מקבל 30%. <b>כל השארית הולכת למה שירד הכי
        עמוק</b> באותו יום. אם ביקשו יחד יותר מ-100%, החלוקה לפי היחס
        ביניהם; אם אף רכיב אינו מתחת לשיא, ההפקדה מתחלקת שווה בשווה.
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
