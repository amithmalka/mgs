import { useState, useMemo, useEffect, useRef } from 'react';
import {
  simulateStudy, CEILING, type Status,
} from '../utils/studySim';
import { COHORT_YEAR, type Track, type Cohort, type Scenario } from '../utils/mgsSim';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

const TRACK_HE: Record<Track, string> = {
  flow: 'תזרים בלבד', both: 'תזרים וצמיחה', growth: 'צמיחה בלבד',
};
const COHORTS = Object.keys(COHORT_YEAR) as Cohort[];

function Num({ value, min, max, step, unit, onCommit }: {
  value: number; min: number; max: number; step: number; unit: string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="own">
      <input className="amt" type="number" min={min} max={max} step={step}
        value={draft ?? String(value)}
        onChange={e => {
          const t = e.target.value; setDraft(t);
          const n = Number(t);
          if (t !== '' && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
        }}
        onBlur={() => {
          const t = (draft ?? '').trim();
          if (t !== '') { const n = Number(t); if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n))); }
          setDraft(null);
        }} />
      <span>{unit}</span>
    </label>
  );
}
function Opt({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className="opt" type="button" aria-pressed={on} onClick={onClick}>{children}</button>;
}
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'gold' | 'up' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="k">{label}</span>
      <span className="n" dir="ltr">{value}</span>
      <span className="s">{sub ?? ' '}</span>
    </div>
  );
}

/**
 * קרן השתלמות בניהול אישי — אותו מנגנון, עטיפת מס אחרת.
 * שלושת הכללים שמייחדים אותה מודלים במנוע: התקרה המוטבת, אכשרת
 * שש השנים, והסולם שנוצר מכך שמשיכה סוגרת את החשבון להפקדות.
 */
export function StudyPage() {
  const [track, setTrack] = useState<Track>('growth');
  const [scenario, setScenario] = useState<Scenario>('real');
  const [cohort, setCohort] = useState<Cohort>('40-50');
  const [status, setStatus] = useState<Status>('self');
  const [base, setBase] = useState(4000);
  const [growth, setGrowth] = useState(7);
  const [years, setYears] = useState(30);

  const live = { track, scenario, cohort, status, base, growth, years };
  const [settled, setSettled] = useState(live);
  const pending = JSON.stringify(settled) !== JSON.stringify(live);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSettled(live), 450);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, scenario, cohort, status, base, growth, years]);
  const runNow = () => { window.clearTimeout(timer.current); setSettled(live); };

  const { ira, tax } = useMemo(() => ({
    ira: simulateStudy({ ...settled, growth: settled.growth / 100, paths: 900 }),
    tax: simulateStudy({ ...settled, growth: settled.growth / 100, paths: 900, taxable: true }),
  }), [settled]);

  const yearly = base * 12;
  const cap = CEILING[status];
  const over = Math.max(0, yearly - cap);
  const last = ira.rows[ira.rows.length - 1];
  const lastT = tax.rows[tax.rows.length - 1];
  const taxSaved = tax.taxPaid - ira.taxPaid;
  const blockedYears = ira.rows.filter(r => r.blocked).length;

  return (
    <div className="term">
      <p className="eyebrow">קרן השתלמות בניהול אישי · IRA</p>
      <h1>אותו מנגנון, <em>בלי מס</em></h1>
      <p className="lede">
        אותה חלוקת הפקדה לפי אחוז הירידה מהשיא, אותו לוח משיכות — בתוך קרן
        השתלמות בניהול אישי. שלושה כללים משנים את התוצאה, וכולם מודלים כאן:
        <b> התקרה המוטבת</b>, <b>אכשרה של שש שנים</b>, ו<b>סולם החשבונות</b>
        שנוצר מכך שמשיכה סוגרת את החשבון להפקדות.
      </p>

      <section>
        <h2>ההרכבה</h2>
        <div className="grp">
          <span className="glab">המסלול</span>
          {(Object.keys(TRACK_HE) as Track[]).map(t =>
            <Opt key={t} on={track === t} onClick={() => setTrack(t)}>{TRACK_HE[t]}</Opt>)}
        </div>
        <div className="grp">
          <span className="glab">המעמד</span>
          <Opt on={status === 'self'} onClick={() => setStatus('self')}>עצמאי · 20,566₪</Opt>
          <Opt on={status === 'employee'} onClick={() => setStatus('employee')}>שכיר · 18,854₪</Opt>
        </div>
        <div className="grp">
          <span className="glab">התרחיש</span>
          <Opt on={scenario === 'pess'} onClick={() => setScenario('pess')}>פסימי</Opt>
          <Opt on={scenario === 'real'} onClick={() => setScenario('real')}>ריאלי</Opt>
        </div>
        {track === 'growth' && (
          <div className="grp">
            <span className="glab">קבוצת הגיל</span>
            {COHORTS.map(c => <Opt key={c} on={cohort === c} onClick={() => setCohort(c)}>{c}</Opt>)}
          </div>
        )}
        <div className="grp">
          <span className="glab">הפקדה חודשית</span>
          <Num value={base} min={100} max={100000} step={100} unit="שקלים" onCommit={setBase} />
          <span className="glab">עליה שנתית</span>
          <Num value={growth} min={0} max={25} step={0.5} unit="אחוזים" onCommit={setGrowth} />
          <span className="glab">שנים</span>
          <Num value={years} min={7} max={50} step={1} unit="שנים" onCommit={setYears} />
        </div>
        <div className="grp">
          <button className="opt" type="button" onClick={runNow} aria-pressed={pending}>
            {pending ? 'הרץ סימולציה ←' : 'הסימולציה מעודכנת'}
          </button>
        </div>

        <div className="note"><p>
          <b>התקרה המוטבת ל{status === 'self' ? 'עצמאי' : 'שכיר'}: {n0(cap)}₪ בשנה.</b>{' '}
          אתה מפקיד <b>{n0(yearly)}₪</b>.
          {over > 0 ? (
            <> כלומר <b>{n0(cap)}₪ מוטבים</b> ועוד <b>{n0(over)}₪ מעל התקרה</b>.
              <b> אין חוק שאוסר להפקיד מעל</b> — אבל על החלק הזה אין הטבת הפקדה,
              והרווח עליו חייב 25% על הרווח הריאלי. המנוע מפצל, וחלק ההפקדה
              המוטב שיצא בפועל הוא <b>{pc(ira.exemptShare)}</b> (הוא עולה בשנים
              שבהן ההפקדה יורדת מתחת לתקרה).</>
          ) : <> הכל בתוך התקרה — <b>כל הרווח פטור</b>.</>}
        </p></div>

        {blockedYears > 0 && (
          <div className="note"><p>
            <b>{blockedYears} השנים הראשונות חסומות למשיכה.</b> הקרן נזילה רק
            אחרי <b>שש שנים</b>, ולוח המשיכות של המסלול הזה מתחיל לפני כן.
            המשיכה לא מבוטלת — היא <b>נדחית</b>, והכסף ממשיך לצמוח.
            {ira.firstIncome !== null &&
              <> המשיכה הראשונה בפועל: <b>שנה {Math.floor(ira.firstIncome / 12) + 1}</b>.</>}
          </p></div>
        )}
      </section>

      <section>
        <h2>מה יצא</h2>
        <div className="stats">
          <Stat label="שווי התיק בסוף" value={`${n0(ira.value)} ₪`} tone="gold"
            sub={`עשירון תחתון ${n0(last.valueP10)} ₪`} />
          <Stat label="הכנסה לחודש בסוף" value={`${n0(last.income)} ₪`} tone="up"
            sub={`עשירון תחתון ${n0(last.incomeP10)} ₪`} />
          <Stat label="מס שנחסך" value={`${n0(taxSaved)} ₪`} tone="up"
            sub={`בהשתלמות ${n0(ira.taxPaid)} ₪ · בממוסה ${n0(tax.taxPaid)} ₪`} />
          <Stat label="חשבונות בסולם" value={String(ira.accounts)}
            sub="משיכה מהוותיק, עד שיתרוקן" />
        </div>
        <p>
          <b>המס שנחסך הוא המספר היציב כאן</b>, ולכן הוא זה שמוצג.
          אחוז ההטבה בשווי הסופי <b>נע בין 0.4% ל-11.3%</b> כשמשנים את מספר
          מסלולי הדגימה — הוא יחס של שני חציונים של התפלגות מוטה, ולכן
          רועש מדי להציג אותו כמספר.
        </p>
        <div className="scroll">
          <table>
            <thead><tr>{['', 'שווי בסוף', 'הכנסה לחודש', 'נמשך מצטבר', 'מס שולם']
              .map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <tr className="mark">
                <td className="lead">השתלמות IRA</td>
                <td className="v">{n0(ira.value)}</td>
                <td className="v gold">{n0(last.income)}</td>
                <td className="v">{n0(ira.taken)}</td>
                <td className="v up">{n0(ira.taxPaid)}</td>
              </tr>
              <tr>
                <td className="lead">חשבון ממוסה</td>
                <td className="v">{n0(tax.value)}</td>
                <td className="v dim">{n0(lastT.income)}</td>
                <td className="v dim">{n0(tax.taken)}</td>
                <td className="v dn">{n0(tax.taxPaid)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>שנה אחר שנה</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['שנה', 'הפקדה לחודש', 'שווי התיק', 'שווי · עשירון תחתון',
                'הכנסה לחודש', 'נמשך מצטבר', 'חשבונות']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ira.rows.map(r => (
                <tr key={r.year} className={r.blocked ? 'zero' : ''}>
                  <td className="lead">{r.year}</td>
                  <td className="v dim">{r.deposit > 0 ? n0(r.deposit) : '—'}</td>
                  <td className="v">{n0(r.value)}</td>
                  <td className="v dim">{n0(r.valueP10)}</td>
                  <td className="v gold" style={{ fontSize: 15 }}>
                    {r.blocked ? 'חסום' : r.income > 0 ? n0(r.income) : '—'}</td>
                  <td className="v dim">{n0(r.taken)}</td>
                  <td className="v dim">{r.accounts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>שלושת הכללים, ומאיפה הם</h2>
        <p>
          <b>התקרה המוטבת.</b> {n0(CEILING.self)}₪ לעצמאי, {n0(CEILING.employee)}₪
          לשכיר, מוקפאות עד 2027. <b>מעל התקרה מותר להפקיד</b> — משרד האוצר
          כותב במפורש ״ניתן להפקיד לקרן ההשתלמות סכום העולה על גובה התקרה
          הנ״ל אולם כלל ההפקדות מעבר לתקרה יחויבו במס״.
        </p>
        <p>
          <b>אכשרה של שש שנים.</b> סעיף 9(16א)(א) לפקודה. לפני כן אין משיכה
          בכלל, ולכן לוח משיכות שמתחיל בשנה 2 או 5 נדחה בפועל לשנה 7.
        </p>
        <p>
          <b>וסולם החשבונות.</b> תקנה 37(א) לתקנות מס הכנסה:
          ״לא יהיה רשאי להפקיד כספים נוספים <b>באותו חשבון</b>״ — על החשבון
          הספציפי, לא על כל הקרנות. ולכן הספק פותח חשבון חדש להפקדות, שנזיל
          שש שנים אחר כך. <b>נמדד כאן ששתי מדיניות המשיכה נותנות אותה תשואה
          בדיוק</b>, אבל ״מהוותיק עד שיתרוקן״ משאיר פחות חשבונות — ולכן זו
          המדיניות במנוע.
        </p>
        <p>
          <b>ומה שהתקרה לא עושה:</b> היא <b>לאדם, לא לחשבון</b>. סעיף 3(ה)
          כתוב בלשון רבים — ״לקרנות השתלמות״ — עם משכורת קובעת אחת.
          <b> סולם של עשר קרנות לא מכפיל את ההטבה.</b>
        </p>
        <p>
          <b>וסייג שלא נסגר.</b> שני ספקים בלבד — מיטב וגלובל נט — מפרסמים
          שמגבלת 10% לתאגיד <b>אינה חלה על קרן סל</b>, בנוסח זהה. ספק שלישי
          מפרסם את ההפך, ושלושה לא מפרסמים כלום.
          <b> לכן אישור בכתב מהחברה המנהלת לפני העברת כסף.</b> אין בזה המלצה,
          ייעוץ מס או ייעוץ פנסיוני.
        </p>
      </section>
    </div>
  );
}
