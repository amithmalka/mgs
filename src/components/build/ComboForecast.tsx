/** MGS · תחזית שנה-אחר-שנה לתמהיל שנבחר.
 *
 *  **מה שהטבלה הזאת עונה עליו, ושום מספר בודד לא יכול:**
 *  מתי ההפקדה מפסיקה לעלות, מתי היא נעצרת לגמרי, ומה התיק שווה
 *  בכל נקודה — גם כשלא הולך.
 *
 *  **שלושת השלבים גלויים בטור ״שלב״:**
 *  · **עולה** — שנים 1–5, ההפקדה מטפסת באחוז שנבחר.
 *  · **יורדת** — מהשנה השישית, ההפקדה יורדת לינארית עד שהיא
 *    מתאפסת בסוף תקופת ההפקדות. הכסף מרוכז מוקדם, שם הוא שווה
 *    הכי הרבה.
 *  · **משיכה** או **צמיחה** — אחרי העצירה. בתזרים מושכים אחוז
 *    מהיתרה; בצמיחה לא נוגעים, והכסף ממשיך לעבוד.
 *
 *  **ואחוזון 10 אינו קישוט.** הוא המסלול הגרוע מתוך עשרה שנדגמו,
 *  ובשנים הראשונות הוא נמוך מהסכום שהופקד — כלומר הפסד על הנייר.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { runMix } from '../../utils/mixEngine';
import { forwardFor, OUTLOOK_HE, type Outlook } from '../../constants/forward';
import { WITHDRAW_AFTER_STOP, depositYearsFor } from '../../utils/comboProject';
import { TRACK_HE, type Combo, type TrackKey } from '../../constants/combos';
import { useMgsStore } from '../../store/mgsStore';
import { cohortForAge } from '../../store/myPortfolio';
import { NumField } from './NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

const PHASE_CLASS: Record<string, string> = {
  'עולה': 'fc-up', 'יורדת': 'fc-hold', 'משיכה': 'fc-draw', 'צמיחה': 'fc-grow',
};

export function ComboForecast({ combo, base, onClose }: {
  combo: Combo; base: number; onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [combo]);
  const age = useMgsStore(st => st.age);
  const cohort = cohortForAge(age);
  const [growth, setGrowth] = useState(5);
  const [drawYears, setDrawYears] = useState(20);
  const [outlook, setOutlook] = useState<Outlook>('real');

  const parts = useMemo(() => combo.parts.map(p => ({ k: p.k, w: p.w })), [combo]);
  const depYears = depositYearsFor(age, cohort).years;

  const res = useMemo(() => runMix({
    parts, track: combo.track, cohort, depYears,
    base, growth: growth / 100, drawYears, outlook,
    useRule: true, paths: 400,
  }), [parts, combo.track, cohort, depYears, base, growth, drawYears, outlook]);

  const fwd = useMemo(() => forwardFor(parts, outlook), [parts, outlook]);
  // **מאז תקרת ה-4% כל שלושת המסלולים מושכים**, ולכן הדגל הזה
  // תמיד אמת. הוא נשאר כדי לא לשכתב את כל הרינדור — אבל הענף
  // ״אין משיכות״ שהיה תלוי בו היה הופך לטקסט מת שטוען שצמיחה
  // לא מושכת, וזה כבר לא נכון. הוא הוסר.
  const drawing = WITHDRAW_AFTER_STOP[combo.track] > 0;
  /** השנה הראשונה שבה באמת נמשך כסף — מגיעה מהמנוע, לא מניחוש. */
  const firstW = res.firstWithdrawYear;
  const stopRow = res.rows.find(r => r.year === depYears);
  const lastRow = res.rows[res.rows.length - 1];

  if (base <= 0) {
    return (
      <div className="fc fc-panel" ref={box}>
        <FcHead combo={combo} onClose={onClose} />
        <p className="lab-access warn">
          <b>הזינו הפקדה חודשית</b> בראש הדף כדי שהתחזית תרוץ.
        </p>
      </div>
    );
  }

  return (
    <div className="fc fc-panel" ref={box}>
      <FcHead combo={combo} onClose={onClose} />

      <div className="grp">
        <span className="glab">עליה שנתית, שנים 1–5</span>
        <NumField value={growth} min={0} max={10} step={0.5} label="עליה שנתית"
          unit="%" onCommit={setGrowth} />
        <span className="glab">{drawing ? 'שנות משיכה' : 'שנות צמיחה אחרי העצירה'}</span>
        <NumField value={drawYears} min={1} max={40} label="שנים"
          unit="שנים" onCommit={setDrawYears} />
        {(Object.keys(OUTLOOK_HE) as Outlook[]).map(o => (
          <button key={o} className="opt" type="button"
            aria-pressed={outlook === o} onClick={() => setOutlook(o)}>
            {OUTLOOK_HE[o]}
          </button>
        ))}
      </div>

      <div className="cm-shared">
        <div>
          <span className="k">מפקידים עד שנה</span>
          <b dir="ltr">{depYears}</b>
          <small>גיל {age} · עוצרים בגיל {age + depYears}</small>
        </div>
        <div>
          <span className="k">הצבירה ברגע העצירה</span>
          <b dir="ltr">{n0(stopRow?.value ?? res.atStop)}₪</b>
          <small>עשירון תחתון {n0(stopRow?.valueP10 ?? res.atStopP10)}₪</small>
        </div>
        <div>
          <span className="k">{drawing ? 'ונמשך אחר כך' : 'ושווי בסוף האופק'}</span>
          <b dir="ltr" className={drawing ? 'up' : 'gold'}>
            {n0(drawing ? res.taken : (lastRow?.value ?? res.value))}₪
          </b>
          <small>
            {drawing
              ? `לאורך ${drawYears} שנות משיכה`
              : `אחרי עוד ${drawYears} שנות צמיחה בלי לגעת`}
          </small>
        </div>
        <div>
          <span className="k">ההנחה שהמנוע קיבל</span>
          <b dir="ltr">{pc(fwd.cagr, 2)}</b>
          <small>בשנה, נטו אחרי דמי ניהול</small>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="lead">שנה</th>
              <th>הפקדה לחודש</th>
              <th>שווי התיק</th>
              <th>עשירון תחתון</th>
              {drawing && <th>משיכה לחודש</th>}
              {drawing && <th>נמשך מצטבר</th>}
              <th>הופקד מצטבר</th>
              <th>שלב</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map(r => (
              <tr key={r.year} className={r.year === depYears ? 'cross' : ''}>
                <td className="lead">{r.year}</td>
                <td dir="ltr" className={r.deposit > 0 ? 'gold' : 'dim'}>
                  {r.deposit > 0 ? `${n0(r.deposit)}₪` : '—'}
                </td>
                <td dir="ltr"><b>{n0(r.value)}₪</b></td>
                <td dir="ltr" className="dim">{n0(r.valueP10)}₪</td>
                {drawing && (
                  <td dir="ltr" className={r.income > 0 ? 'up' : 'dim'}>
                    {r.income > 0 ? `${n0(r.income)}₪` : '—'}
                  </td>
                )}
                {drawing && (
                  <td dir="ltr" className="dim">
                    {r.takenSoFar > 0 ? `${n0(r.takenSoFar)}₪` : '—'}
                  </td>
                )}
                <td dir="ltr" className="dim">{n0(r.paidSoFar)}₪</td>
                <td>
                  <span className={`fc-ph ${PHASE_CLASS[r.phase]}`}>{r.phase}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawing && firstW !== null && (
        <p className="note">
          <b>המשיכה מתחילה כבר בשנה {firstW}, תוך כדי ההפקדות.</b>{' '}
          {combo.track === 'flow'
            ? <>בתזרים מושכים <b>1% בשנה משנה 2</b>, 2% בשנה 6, 3%
              בשנה 7 ו-<b>4% מהשנה השמינית</b> — כי זה מה שהמסלול
              הזה הוא: חיים מהכסף תוך כדי שממשיכים להפקיד.</>
            : <>בתזרים וצמיחה המשיכה מתחילה <b>בשנה 5</b> ב-1%
              ועולה ל-<b>4% בשנה 11</b> — חלק להכנסה, והשאר ממשיך
              לעבוד.</>}{' '}
          <b>אחרי עצירת ההפקדות</b> השיעור קבוע על{' '}
          <b>{pc(WITHDRAW_AFTER_STOP[combo.track], 1)} בשנה</b>.
        </p>
      )}

      {outlook === 'cont' && (
        <p className="lab-access dk-good">
          <b>״המשכיות״ מתחילה מהתשואה שנמדדה לתמהיל הזה</b> ודועכת
          לינארית אל ההנחה המפורסמת לאורך <b>עשר שנים</b>. מהשנה
          העשירית — ההנחה בלבד.
        </p>
      )}

      <p className="note">
        <b>ההפקדה עולה חמש שנים ואז יורדת.</b> האחוז שבחרתם מעלה
        אותה בשנים <b>1–5</b>; משנה <b>6</b> היא <b>יורדת לינארית</b>{' '}
        עד שהיא מתאפסת בסוף תקופת ההפקדות. <b>שקל שנכנס מוקדם עובד
        את כל התקופה ושקל שנכנס בסוף כמעט לא</b> — ולכן הכסף מרוכז
        בשנים הראשונות.
      </p>
      <p className="note">
        <b>השורה המודגשת היא שנת העצירה</b> — שנה {depYears}, גיל{' '}
        {age + depYears}. ממנה ואילך <b>ההפקדה היא אפס</b>
        , ומתחילות משיכות של <b>{pc(WITHDRAW_AFTER_STOP[combo.track], 1)} מהיתרה בשנה</b>.
        המשיכה החודשית <b>עולה</b> עם השנים כי היא אחוז קבוע מיתרה שגדלה.
        {combo.track === 'growth' && <>{' '}<b>ובצמיחה המשיכה נפתחת רק
        בשנת המעבר של קבוצת הגיל</b> — עד אז הכסף כולו ממשיך לעבוד.</>}
      </p>
      <p className="note">
        <b>עשירון תחתון = המסלול הגרוע מתוך עשרה</b> שנדגמו, לא הגרוע
        ביותר. בשנים הראשונות הוא לרוב <b>נמוך ממה שהופקד</b> — כלומר
        הפסד על הנייר, וזה נורמלי ולא תקלה.{' '}
        <b>התנודתיות והמתאמים נמדדו; התשואה קדימה היא הנחה מפורסמת
        ולא הבטחה. אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
      </p>
    </div>
  );
}

function FcHead({ combo, onClose }: { combo: Combo; onClose: () => void }) {
  return (
    <header className="fc-head">
      <div>
        <span className="eyebrow">תחזית משוערת</span>
        <h3>
          {TRACK_HE[combo.track as TrackKey]} · תנודתיות {pc(combo.vol)}
          <small>
            {combo.parts.map(p => p.k).join(' · ')}
          </small>
        </h3>
      </div>
      <button className="opt" type="button" onClick={onClose}>סגירה</button>
    </header>
  );
}
