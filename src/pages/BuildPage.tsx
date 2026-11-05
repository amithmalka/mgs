import { useState, useMemo, useEffect, useRef } from 'react';
import { DataCards } from '../components/shared/DataCards';
import {
  MEASURED, ASSUME, FUND, ALT, BY_RETURN, corr, type SleeveKey,
} from '../constants/sleeveCatalog';
import { attributeVol } from '../utils/volAttrib';
import { BuyHeader } from '../components/build/BuyHeader';
import { Combos } from '../components/build/Combos';
import { useMyPortfolio } from '../store/myPortfolio';
import { ceilingFor } from '../constants/studyFunds';
import {
  simulatePortfolio, substituted, terOf, EQUITY, type Basis,
} from '../utils/portfolioSim';
import { COHORT_YEAR, depositsEndYear, type Track, type Cohort, type Scenario } from '../utils/mgsSim';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

const TRACK_HE: Record<Track, string> = {
  flow: 'תזרים בלבד', both: 'תזרים וצמיחה', growth: 'צמיחה בלבד',
};
const COHORTS = Object.keys(COHORT_YEAR) as Cohort[];
const GOALS = [5000, 10000, 20000, 40000];
/** מעל זה הכלל נרווה: כל רכיב מעל השיא מבקש 10%, והבקשות עוברות 100% */
const SATURATES_AT = 10;

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
 * הרכבה חופשית. המשתמש בוחר רכיבים מתוך קטלוג מדוד, והמנוע מריץ עליהם
 * **בדיוק אותו כלל** של שאר המערכת — חלוקת ההפקדה לפי אחוז הירידה מהשיא,
 * לוח המשיכות לפי מסלול וגיל, מס ריאלי. התנודתיות והמתאם נמדדו מנתונים
 * אמיתיים; התשואה קדימה היא הנחה מפורסמת, ואיפה שאין — הצבה מוצהרת.
 */
/** **מי מפרסם גישה לבורסות אירופה, ומה כתוב אצלו בתעריפון.**
 *
 *  **אינטראקטיב ישראל ראשון כי זו הדרך בפועל** — כל שמונת הניירות
 *  נסחרים בלונדון בדולר, ושם הם נקנים. **את העמלה שלכם בדקו בכתב
 *  מול ה-ISIN:** היא תלויה בסוג החשבון ובמחזור, ואני לא נוקב במספר
 *  שלא אימתתי.
 *
 *  שאר השורות אומתו בתעריפונים הפומביים, אוקטובר 2026. *גישה
 *  בתעריפון אינה הבטחה* שהמערכת שלהם מכירה ISIN מסוים.
 */
const BROKERS: Array<{
  he: string; access: string; tariff: string;
  tone: 'up' | 'gold' | 'dn'; ours: boolean;
}> = [
  { he: 'אינטראקטיב ישראל', access: 'כן — לונדון, מקוון, בדולר', tone: 'up', ours: true,
    tariff: 'זו הדרך שכל המערכת בנויה עליה: פקודה מקוונת לפי ISIN, בלי חדר '
          + 'מסחר טלפוני. את העמלה והמרת המט״ח בדקו בכתב — הן תלויות בסוג '
          + 'החשבון, ולא נוקב כאן במספר שלא אומת.' },
  { he: 'פסגות טרייד', access: 'כן, כולל ETF במפורש', tone: 'up', ours: false,
    tariff: '0.15% מהעסקה, מינימום €15. יש בתעריפון גם דוגמה לעמלה בפרנק שוויצרי.' },
  { he: 'אקסלנס · הפניקס', access: 'כן', tone: 'up', ours: false,
    tariff: 'מסלול Global EXtrade — 0.15%, מינימום €20 / £20 / CHF 30. ופטור מדמי שמירה.' },
  { he: 'IBI טרייד', access: 'כן, אך לא בפלטפורמה העצמאית', tone: 'gold', ours: false,
    tariff: '0.3%, מינימום 30 במטבע העסקה — תחת ״עסקאות מיוחדות בבורסות זרות״, '
          + 'כלומר דרך חדר המסחר.' },
  { he: 'מיטב טרייד', access: 'אין ראיה', tone: 'dn', ours: false,
    tariff: 'אין תעריפון אירופי פומבי, וכל עמודי המסחר בחו״ל שלהם הם ארה״ב. '
          + 'זה היעדר תיעוד ולא הכחשה — שווה לשאול.' },
  { he: 'בנקים', access: 'אפשרי, אך לא כדאי', tone: 'dn', ours: false,
    tariff: 'לאומי: 0.9% קנייה ועוד 0.2% דמי ניהול פיקדון לרבעון = 0.8% לשנה. '
          + 'על עשר שנים זה כעשירית מההשקעה.' },
];

export function BuildPage() {
  // **זרימה אחת בלבד.** כלי ההרכבה הישן נשאר בקובץ ועבר ל״ללמוד״
  // כחומר מתקדם — שתי מערכות בחירה על דף אחד הן בדיוק הבלבול.
  return (
    <div className="term">
      <BuyHeader />
      <Combos />
    </div>
  );
}

export function LegacyBuild() {
  const [picked, setPicked] = useState<SleeveKey[]>([]);
  const scenario: Scenario = 'real';   // תרחיש יחיד — הפסימי ירד
  const [track, setTrack] = useState<Track>('growth');
  const [cohort, setCohort] = useState<Cohort>('30-40');
  // ההפקדה מגיעה מראש הדף, ו**רק החלק שמגיע לברוקר** נכנס לסימולציה —
  // קרן השתלמות קיבלה את התקרה שלה שם, ואין טעם לספור אותה פעמיים.
  const { deposit: grossDep, extra: extraDep, fundStatus,
          annualSalary, selfIncome } = useMyPortfolio();
  const base = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    const toBroker = Math.max(0, grossDep - Math.min(grossDep, ceil)) + extraDep;
    return Math.max(0, Math.round(toBroker));
  }, [grossDep, extraDep, fundStatus]);
  // העלייה השנתית נבחרת, עד 5%. היה 7% קבוע, שהוא מעל כל
// תרחיש שכר סביר ושימש כאילו הוא נתון.
  const [growth, setGrowth] = useState(3);
  const [years, setYears] = useState(30);
  const [lump, setLump] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const live = { picked: picked.join(','), scenario, track, cohort, base, growth, years, lump };
  const [settled, setSettled] = useState(live);
  const pending = JSON.stringify(settled) !== JSON.stringify(live);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSettled(live), 400);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, scenario, track, cohort, base, growth, years, lump]);
  const runNow = () => { window.clearTimeout(timer.current); setSettled(live); };

  const sleeves = useMemo(() => settled.picked.split(',').filter(Boolean) as SleeveKey[], [settled.picked]);
  const res = useMemo(() => {
    if (sleeves.length < 2) return null;
    return simulatePortfolio({
      sleeves, basis: 'published' as Basis, scenario: settled.scenario,
      track: settled.track, cohort: settled.cohort, base: settled.base,
      growth: settled.growth / 100, years: settled.years,
      lump: settled.lump, targets: GOALS, paths: 700,
    });
  }, [sleeves, settled]);

  const vol = useMemo(() => (res ? attributeVol(res.weights) : null), [res]);
  const sub = substituted(picked);
  const depEnd = depositsEndYear(track, cohort, base, growth / 100, years);
  const shown = showAll ? BY_RETURN : BY_RETURN.filter(k => MEASURED[k].vol > 0.17 || ASSUME[k] || FUND[k]);

  const toggle = (k: SleeveKey) =>
    setPicked(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

  /** הזוג הדומה ביותר מבין מה שנבחר — האזהרה שבאמת חשובה */
  const twin = useMemo(() => {
    let best: [SleeveKey, SleeveKey, number] | null = null;
    for (let i = 0; i < picked.length; i++)
      for (let j = i + 1; j < picked.length; j++) {
        const c = corr(picked[i], picked[j]);
        if (!best || c > best[2]) best = [picked[i], picked[j], c];
      }
    return best;
  }, [picked]);

  return (
    <div className="term">
      <p className="eyebrow">הרכבה חופשית · קרנות איריות צוברות</p>
      <h1>תבנו תיק, ותריצו עליו <em>את אותו כלל</em></h1>
      <p className="lede">
        בוחרים רכיבים מהקטלוג, ואותו מנגנון של כל המערכת רץ עליהם: ההפקדה
        נחלקת <b>לפי אחוז הירידה מהשיא</b> של כל רכיב, המשיכה לפי המסלול והגיל,
        והמס ריאלי. <b>התנודתיות והמתאם נמדדו מנתונים אמיתיים</b> — התשואה
        קדימה היא הנחה מפורסמת, ואיפה שאין מקור, הצבה שכתובה במפורש.
      </p>

      <section>
        <h2>הקטלוג</h2>
        <p>
          כל שורה נמדדה מתשואות חודשיות אמיתיות <b>כולל דיבידנדים</b>, על הנייר
          שעוקב את אותו מדד. <b>העמודה ״תשואה שנמדדה״ היא היסטוריה — לא תחזית</b>,
          ואינה מוקרנת קדימה: ההקרנה נשענת על ההנחה המפורסמת בלבד.
        </p>
        <div className="scroll bleed">
          <table>
            <thead><tr>
              {['', 'הרכיב', 'תשואה שנמדדה', 'תנודתיות', 'נפילה מהשיא', 'נמדד מאז',
                'מתאם לשבבים', 'הקרן האירית', 'דמי ניהול',
                'איפה אפשר לקנות', 'תמורה יומית בת״א', 'בסיס התחזית']
                .map((h, i) => <th key={i}>{h}</th>)}
            </tr></thead>
            <tbody>
              {shown.map(k => {
                const m = MEASURED[k], f = FUND[k], a = ASSUME[k];
                const on = picked.includes(k);
                return (
                  <tr key={k} className={on ? 'mark' : ''}>
                    <td><input type="checkbox" checked={on} onChange={() => toggle(k)}
                      aria-label={m.he} /></td>
                    <td style={{ fontWeight: on ? 700 : 400 }}>{m.he}</td>
                    <td className="v" style={{ color: f?.px === 'near' ? 'var(--gold)' : 'var(--muted)' }}>
                      {pc(m.cagr)}{f?.px === 'near' ? ' *' : ''}</td>
                    <td className="v" style={{ color: m.vol > 0.3 ? 'var(--gold)' : 'var(--muted)' }}>{pc(m.vol, 0)}</td>
                    <td className="v dim">{pc(m.dd, 0)}</td>
                    <td className="v dim" dir="ltr">{m.since} · {m.months} ח׳</td>
                    <td className="v" style={{ color: k !== 'SEM' && corr(k, 'SEM') > 0.85 ? 'var(--gold)' : 'var(--muted)' }}>
                      {corr(k, 'SEM').toFixed(2)}</td>
                    <td dir="ltr" style={{ whiteSpace: 'normal' }}>
                      {f ? `${f.tick} · ${f.isin}` : <span className="dim">טרם אומתה</span>}
                      {f?.aum && <span className="dim" style={{ display: 'block', fontSize: 12 }}>
                        נכסים {f.aum}</span>}</td>
                    <td className="v dim">{f?.ter != null ? pc(f.ter, 2) : '—'}</td>
                    <td className="v" style={{ color: f?.tase ? 'var(--up)' : 'var(--gold)' }}>
                      {f?.tase ? `ת״א ${f.tase}` : 'בורסה אירופית'}</td>
                    <td className="v" style={{
                      color: f?.turn == null ? 'var(--muted)'
                        : f.turn === 0 ? 'var(--down)'
                        : f.turn < 100000 ? 'var(--gold)' : 'var(--up)',
                    }}>
                      {f?.turn == null ? (f?.tase ? 'טרם נסחרת' : '—')
                        : f.turn === 0 ? 'לא נסחרה' : `₪${n0(f.turn)}`}</td>
                    <td className="v" style={{ color: a ? 'var(--up)' : 'var(--gold)' }}>
                      {a ? 'הנחה מפורסמת' : 'הצבה'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          <b>כוכבית על התשואה</b> אומרת שהנייר שעליו נמדד עוקב <b>מדד דומה אך
          לא זהה</b> לזה של הקרן האירית. התנודתיות והמתאם מהימנים גם כך;
          התשואה ההיסטורית — פחות.
        </p>
        <div className="note"><p>
          <b>שתי העמודות האחרונות אומרות דברים שונים לגמרי.</b>{' '}
          <b>״איפה אפשר לקנות״</b> היא עניין מעשי: ״ת״א״ עם מספר נייר = נקנית
          <b>בשקלים</b> בבורסה בתל אביב, בלי המרת מט״ח. <b>״בורסה
          אירופית״ = אין לה רישום בת״א</b> — צריך לקנות אותה בלונדון, בפרנקפורט
          או באמסטרדם, במט״ח. <b>זה לא אומר שנדרש ברוקר זר:</b> פסגות
          ואקסלנס מפרסמים בתעריפון שלהם מסחר בבורסות אירופה (0.15%, מינימום
          €15–€20), כך שאפשר גם דרך ברוקר ישראלי — <b>אם המערכת שלו מכירה
          את ה-ISIN, וזה שווה לאמת מולו לפני</b>.{' '}
          <b>״בסיס התחזית״</b> הוא עניין מתודולוגי: ״הנחה מפורסמת״ = יש לרכיב
          תשואה צפויה שפורסמה בשם בית השקעות או אקדמיה, ו״הצבה״ = אין כזו,
          ולכן המערכת מציבה את הנחת המניות הרחבה. <b>אין שום קשר בין השתיים</b> —
          רכיב יכול להיות נקנה בת״א ולרוץ על הצבה, או להיות זמין רק בחו״ל ולרוץ
          על הנחה מפורסמת.
        </p></div>
        <div className="note"><p>
          <b>איזה ברוקר קונה מה.</b> כל שמונת הניירות שהמערכת עובדת
          איתם נסחרים <b>בלונדון בדולר</b>, ושם הם נקנים —
          <b> דרך אינטראקטיב ישראל</b>. מי שרוצה להשוות, אלה מה
          שמפרסמים גישה לבורסות אירופה בתעריפון שלהם:
        </p>
        <DataCards
          items={BROKERS} keyOf={b => b.he} mark={b => b.ours}
          titleSub={b => b.ours ? 'הברוקר שהמערכת בנויה עליו' : undefined}
          cols={[
            { h: 'ברוקר', v: b => b.he },
            { h: 'גישה לבורסות אירופה', he: true, v: b => b.access, tone: b => b.tone },
          ]}
          note={b => b.tariff}
        />
        <p>
          <b>מה שלא אומת:</b> שהמערכת של אף אחד מהם מכירה את ה-ISIN
          הספציפי. גישה בתעריפון אינה אותו דבר כמו יכולת להציב פקודה על
          נייר נתון — <b>שווה לבקש מהם אישור על ה-ISIN לפני שפותחים
          חשבון</b>. ומרווח המרת המט״ח הוא כ-0.5% אצל כולם, וכ-70% מהעלות
          האמיתית — <b>עליו צריך להתמקח, לא על העמלה</b>.
        </p></div>
        <div className="note"><p>
          <b>ולמה שווה לרכז את הכל בחשבון אחד.</b> בברוקר ישראלי אחד, הפסד
          ברכיב אחד <b>מתקזז אוטומטית</b> מול רווח ברכיב אחר, חודש בחודשו,
          ו<b>מגן המס עובר הלאה עד סוף שנת המס</b> — טופס 867 מציג את הנטו,
          וייתכן שתהיו פטורים מדוח שנתי. <b>מפוצל בין ברוקר ישראלי לברוקר
          זר, הקיזוז נעשה רק בדוח השנתי ובאחריותכם</b>, והגשת דוח הופכת
          לחובה. <b>הערך של זה גדול מהפרש העמלות</b> — ולכן קרן ש״בורסה
          אירופית״ שווה לנסות לקנות דרך אותו ברוקר ישראלי גם במחיר עמלה
          גבוה יותר. <b>הפטור מדוח אינו חל</b> אם נכסי החוץ עולים על
          1,500,000 ₪, או אם אתם חייבים במס נוסף לפי סעיף 121ב.
        </p></div>
        <div className="note"><p>
          <b>ומס עיזבון אמריקאי אינו תלוי באף אחת מהשתיים.</b> הוא נקבע לפי
          מדינת ההתאגדות של הקרן, שמופיעה בעמודת <b>״הקרן האירית״</b>:
          כל 14 הרכיבים בקטלוג הם קרנות אירלנד — ה-ISIN מתחיל ב-<span dir="ltr">IE</span> —
          ולכן <b>אף אחד מהם אינו נכס אמריקאי לצורכי מס עיזבון, בלי תלות בבורסה
          שבה קניתם אותו או בברוקר.</b> קרן אירית שנקנתה בלונדון, באמסטרדם או
          בתל אביב — אותו דין.
        </p></div>
        {picked.map(k => FUND[k]?.note).filter(Boolean).length > 0 && (
          <div className="note"><p>
            {picked.filter(k => FUND[k]?.note).map(k => (
              <span key={k} style={{ display: 'block', marginBottom: 4 }}>
                <b>{MEASURED[k].he}:</b> {FUND[k]!.note}
              </span>
            ))}
          </p></div>
        )}
        {picked.some(k => ALT[k]) && (
          <>
            <h3>אותו מדד, קרן אחרת — מה שאומת</h3>
            <div className="scroll bleed">
              <table>
                <thead><tr>{['הרכיב', 'הקרן', 'ISIN', 'דמי ניהול', 'נכסים',
                  'איפה אפשר לקנות', 'תמורה יומית בת״א', 'שכפול']
                  .map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {picked.flatMap(k => (ALT[k] ?? []).map(a => (
                    <tr key={k + a.isin}>
                      <td>{MEASURED[k].he}</td>
                      <td dir="ltr">{a.tick} · {a.name}</td>
                      <td className="v dim" dir="ltr" style={{ fontSize: 12 }}>{a.isin}</td>
                      <td className="v">{pc(a.ter, 2)}</td>
                      <td className="v dim" dir="ltr">{a.aum}</td>
                      <td className="v" style={{ color: a.tase ? 'var(--up)' : 'var(--gold)' }}>
                        {a.tase ? `ת״א ${a.tase}` : 'בורסה אירופית'}</td>
                      <td className="v" style={{
                        color: a.turn == null ? 'var(--muted)'
                          : a.turn === 0 ? 'var(--down)'
                          : a.turn < 100000 ? 'var(--gold)' : 'var(--up)',
                      }}>
                        {a.turn == null ? (a.tase ? 'טרם נסחרת' : '—')
                          : a.turn === 0 ? 'לא נסחרה' : `₪${n0(a.turn)}`}</td>
                      <td className="v" style={{ color: a.swap ? 'var(--gold)' : 'var(--up)' }}>
                        {a.swap ? 'חוזה חילופין' : 'פיזי'}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            <p>
              <b>״חוזה חילופין״ אינו פרט טכני.</b> קרן כזאת אינה מחזיקה את
              המניות אלא חוזה מול צד נגדי, ולכן נושאת <b>סיכון צד נגדי</b>
              שלקרן פיזית אין. היא לרוב זולה יותר — וזה המחיר. <b>במניות
              אמריקאיות יש לה גם יתרון מיסויי</b>: היא אינה מקבלת דיבידנד,
              ולכן אינה סובלת ניכוי מקור אמריקאי כלל.
            </p>
            <div className="note"><p>
              <b>העמודה ״תמורה יומית בת״א״ היא מחזור המסחר בשקלים ביום אחד —
              30.10.2026</b>, כפי שהבורסה פרסמה אותו. <b>היא לא פרט שולי:</b>{' '}
              <b>״לא נסחרה״ אומר שבאותו יום לא בוצעה בה אף עסקה</b>, ולכן
              המחיר תלוי כולו בציטוט של עושה השוק ובפקודה גדולה תשלמו מרווח.
              מתוך 32 הקרנות האיריות הצוברות הרשומות בת״א, <b>13 סיימו את
              אותו יום בתמורה אפס</b>. יום אחד אינו מדגם — אך קרן שלא נסחרה
              בו כלל אינה קרן נזילה בשקלים.
            </p></div>
          </>
        )}
        {!showAll && (
          <button className="opt" type="button" onClick={() => setShowAll(true)}>
            הצג את כל {BY_RETURN.length} הרכיבים
          </button>
        )}
      </section>

      <section>
        <h2>ההרכבה</h2>
        <div className="grp">
          <span className="glab">המסלול</span>
          {(Object.keys(TRACK_HE) as Track[]).map(t =>
            <Opt key={t} on={track === t} onClick={() => setTrack(t)}>{TRACK_HE[t]}</Opt>)}
        </div>
        {track === 'growth' && (
          <div className="grp">
            <span className="glab">קבוצת הגיל</span>
            {COHORTS.map(c =>
              <Opt key={c} on={cohort === c} onClick={() => setCohort(c)}>{c}</Opt>)}
          </div>
        )}
        <div className="grp">
          <span className="glab">
            לברוקר מהראש: <b>{Math.round(base).toLocaleString('en-US')}₪</b> לחודש
          </span>
          <span className="glab">עליה שנתית, שנים 1–5</span>
          <Num value={growth} min={0} max={5} step={0.5} unit="אחוזים" onCommit={setGrowth} />
          <span className="glab">סכום ראשוני</span>
          <Num value={lump} min={0} max={10000000} step={1000} unit="שקלים" onCommit={setLump} />
          <span className="glab">שנים</span>
          <Num value={years} min={5} max={50} step={1} unit="שנים" onCommit={setYears} />
        </div>
        <div className="grp">
          <button className="opt" type="button" onClick={runNow} aria-pressed={pending}>
            {pending ? 'הרץ סימולציה ←' : 'הסימולציה מעודכנת'}
          </button>
          <span className="glab">
            {picked.length} רכיבים · הנחות: {picked.length - sub.length} ממקור, {sub.length} בהצבה
          </span>
        </div>

        {picked.length < 2 && (
          <div className="note dn"><p>בחרו לפחות שני רכיבים — כלל החלוקה צריך משהו להשוות אליו.</p></div>
        )}
        {picked.length >= SATURATES_AT && (
          <div className="note"><p>
            <b>ב-{picked.length} רכיבים הכלל נרווה.</b> כל רכיב שמעל השיא מבקש 10%
            מההפקדה, ומעשרה רכיבים ומעלה הבקשות עוברות 100% — ואז החלוקה נעשית
            יחסית והכלל <b>מפסיק לרכז</b>. מדדתי: בשלושה רכיבים הכלל מסוגל לייצר
            משקל של 39% לרכיב אחד, ב-15 רכיבים רק 10%. אם אתם רוצים שהמנגנון
            יעבוד — <b>שלושה עד שישה רכיבים</b>.
          </p></div>
        )}
        {twin && twin[2] > 0.85 && (
          <div className="note"><p>
            <b>{MEASURED[twin[0]].he}</b> ו<b>{MEASURED[twin[1]].he}</b> במתאם{' '}
            <b>{twin[2].toFixed(2)}</b>. זה אותו דבר פעמיים, לא פיזור — והכלל
            יראה אותם נופלים יחד ויזרים לשניהם באותו רגע.
          </p></div>
        )}
        {sub.length > 0 && (
          <div className="note"><p>
            <b>{sub.length} רכיבים רצים על הצבה:</b> {sub.map(k => MEASURED[k].he).join(' · ')}.
            אימתתי ש<b>אף בית מכובד אינו מפרסם</b> הנחת תשואה לנושא צר כזה —
            לא פער בחיפוש, אלא מאפיין של התחום. לכן הם מקבלים את{' '}
            <b>הנחת המניות הרחבה</b> ({pc(EQUITY.real)}) עם <b>התנודתיות המדודה שלהם</b>:
            <b> לא הנחתי שהנושא מרוויח יותר מהשוק</b>, רק שהוא מיטלטל יותר.
            זו גם מה שג׳יי-פי מורגן עצמה עושה עם תמות. {EQUITY.src}.
          </p></div>
        )}
      </section>

      {res && (
        <>
          <section>
            <h2>מה יצא</h2>
            <div className="stats">
              <Stat label="שווי התיק בסוף" value={`${n0(res.value)} ₪`} tone="gold"
                sub={`עשירון תחתון ${n0(res.rows[res.rows.length - 1].valueP10)} ₪`} />
              <Stat label="הכנסה לחודש בסוף" value={`${n0(res.rows[res.rows.length - 1].income)} ₪`} tone="up"
                sub={`עשירון תחתון ${n0(res.rows[res.rows.length - 1].incomeP10)} ₪`} />
              <Stat label="תשואה שנתית פנימית" value={pc(res.irr)}
                sub="על זרם ההפקדות, אחרי דמי ניהול ומס" />
              <Stat label="הופקד בסך הכל" value={`${n0(res.paid)} ₪`}
                sub={depEnd ? `ההפקדות נגמרות בשנה ${depEnd}` : 'ההפקדות נמשכות עד הסוף'} />
            </div>
            <h3>המשקלים ש<em>הכלל</em> ייצר — לא שבחרתם</h3>
            <div className="tape">
              {sleeves.map(k => (
                <span className="tk" key={k}>
                  <span className="sym">{MEASURED[k].he}</span>
                  <b dir="ltr">{pc(res.weights[k] ?? 0, 0)}</b>
                </span>
              ))}
            </div>
            <p>
              הכלל מזרים לאן שנפל — ולכן <b>הרכיב התנודתי ביותר מקבל את רוב הכסף</b>,
              כי הוא נופל הכי עמוק והכי הרבה פעמים. זה פלט של המנגנון, לא יעד
              שהוגדר לו. דמי הניהול שנלקחו בחשבון:{' '}
              {sleeves.map(k => `${MEASURED[k].he} ${pc(terOf(k), 2)}`).join(' · ')}
              {sleeves.some(k => FUND[k]?.ter == null) &&
                <> — לרכיב שהקרן שלו טרם אומתה הוצבו {pc(0.0045, 2)} שמרניים.</>}
            </p>
          </section>
          {vol && (<>
          <section>
            <h2>מה מרים את התנודתיות ומה מוריד אותה</h2>
            <p>
              תנודתיות התיק אינה הממוצע של הרכיבים — היא תלויה גם{' '}
              <b>במתאמים ביניהם</b>. רכיב תנודתי עם מתאם נמוך יכול{' '}
              <b>להוריד</b> את תנודתיות התיק, ושני רכיבים רגועים עם מתאם 0.95
              לא מפזרים כלום. הטור ״בלעדיו״ הוא התשובה המעשית: מה היתה
              תנודתיות התיק אם הרכיב הזה לא היה בו.
            </p>
            <div className="stats">
              <Stat label="תנודתיות התיק" value={pc(vol.sigma, 1)}
                sub="מהמשקלים שהכלל ייצר, על המתאמים שנמדדו" tone="gold" />
              <Stat label="ממוצע משוקלל של הרכיבים" value={pc(vol.weighted, 1)}
                sub="אילו לא היה פיזור כלל" />
              <Stat label="מה שהפיזור חסך" value={pc(vol.saved, 1)}
                tone={vol.saved > 0.02 ? 'up' : undefined}
                sub={vol.saved > 0.02 ? 'הפיזור עובד' : 'כמעט ולא — הרכיבים דומים מדי'} />
              <Stat label="חלון המדידה הקצר" value={`${vol.months} ח׳`}
                sub={vol.shortest ? `${vol.shortest.he}, מאז ${vol.since}` : ''} />
            </div>
            <div className="scroll bleed">
              <table>
                <thead><tr>{['הרכיב', 'משקל', 'תנודתיות שלו', 'חלקו בתנודתיות',
                  'מתאם לשאר התיק', 'התיק בלעדיו', 'ההשפעה', 'נמדד מאז', 'חודשים']
                  .map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {vol.rows.map(r => (
                    <tr key={r.k}>
                      <td style={{ fontWeight: 600 }}>{r.he}</td>
                      <td className="v">{pc(r.w, 0)}</td>
                      <td className="v" style={{ color: r.vol > 0.3 ? 'var(--gold)' : 'var(--muted)' }}>
                        {pc(r.vol, 0)}</td>
                      <td className="v" style={{ color: r.share > 0.4 ? 'var(--gold)' : 'var(--mid)' }}>
                        {pc(r.share, 0)}</td>
                      <td className="v" style={{ color: r.avgCorr > 0.85 ? 'var(--gold)' : 'var(--muted)' }}>
                        {r.avgCorr.toFixed(2)}</td>
                      <td className="v dim">{pc(r.without, 1)}</td>
                      <td className="v" style={{ color: r.delta < 0 ? 'var(--down)' : 'var(--up)' }}>
                        {r.delta < 0 ? `מרים ${pc(-r.delta, 1)}` : `מוריד ${pc(r.delta, 1)}`}</td>
                      <td className="v dim" dir="ltr">{r.since}</td>
                      <td className="v dim">{r.months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="note"><p>
              <b>איך לקרוא את הטור ״ההשפעה״.</b> הוא מחושב מהטור שלפניו:
              ״מרים״ אומר שבלי הרכיב התיק היה <b>רגוע יותר</b>, ו״מוריד״ אומר
              שבלעדיו הוא היה <b>תנודתי יותר</b> — כלומר הרכיב מפזר בפועל.{' '}
              <b>וזה יוצא הפוך מהאינטואיציה:</b> רכיב תנודתי יכול
              <b>להוריד</b> את התנודתיות הכוללת כשמתאמו לשאר התיק נמוך —
              הוא מדלל במקום להוסיף.{' '}
              <b>רכיב שמרים הרבה ומתאמו לשאר התיק גבוה הוא המועמד הראשון
              להסרה</b> — הוא מוסיף סיכון בלי להוסיף פיזור.
            </p></div>
            <div className="note"><p>
              <b>ועל כמה זמן אחורה נבדק כל דבר.</b> התנודתיות והמתאמים נמדדו
              מתשואות חודשיות אמיתיות כולל דיבידנדים, אבל{' '}
              <b>לא על אותו חלון</b> — לכל רכיב ההיסטוריה שלו, והמתאם בין שני
              רכיבים נמדד על החיתוך ביניהם.{' '}
              {vol.shortest && <>
                <b>הרכיב הקצר הוא {vol.shortest.he} — {vol.shortest.months} חודשים
                בלבד, מאז {vol.shortest.since}</b>, והוא זה שקובע את מידת
                הביטחון בכל המטריצה.
              </>}{' '}
              <b>חלון של פחות מ-120 חודשים לא ראה מחזור שלם</b>, ומתאם שנמדד
              רק בשוק עולה נוטה להיראות נמוך מכפי שיתגלה בנפילה. המתאמים
              כולם כוונצו ב-2% לעבר מטריצת היחידה כדי לא להציג פיזור שלא
              בטוח שקיים.
            </p></div>
          </section>
          </>)}

          <section>
            <h2>היעדים</h2>
            <DataCards
              items={GOALS} wide keyOf={g => String(g)}
              mark={g => res.goals[g] !== null}
              cols={[
                { h: 'הכנסה לחודש', v: g => `${n0(g)} ₪` },
                {
                  h: 'מתי מושגת', he: true,
                  v: g => res.goals[g] === null ? 'לא מושגת בחלון'
                    : `שנה ${Math.floor(res.goals[g]! / 12) + 1}`,
                  tone: g => res.goals[g] === null ? 'dim' : 'gold',
                },
              ]}
            />
          </section>

          <section>
            <h2>שנה אחר שנה</h2>
            <div className="scroll">
              <table>
                <thead><tr>
                  {['שנה', 'הפקדה לחודש', 'שווי התיק', 'שווי · עשירון תחתון',
                    'הכנסה לחודש', 'הכנסה · עשירון תחתון', 'נמשך מצטבר']
                    .map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {res.rows.map((r, i) => (
                    <tr key={i} className={res.crossover !== null && i === Math.floor(res.crossover / 12) ? 'cross' : ''}>
                      <td className="lead">{i + 1}</td>
                      <td className="v dim">{r.deposit > 0 ? n0(r.deposit) : '—'}</td>
                      <td className="v">{n0(r.value)}</td>
                      <td className="v dim">{n0(r.valueP10)}</td>
                      <td className="v gold" style={{ fontSize: 15 }}>{r.income > 0 ? n0(r.income) : '—'}</td>
                      <td className="v dim">{r.incomeP10 > 0 ? n0(r.incomeP10) : '—'}</td>
                      <td className="v dim">{n0(r.cash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {res.crossover !== null && (
              <p>
                <b>שנה {Math.floor(res.crossover / 12) + 1}</b> היא הנקודה שבה ההכנסה
                החודשית עוברת את ההפקדה החודשית — מכאן התיק מזין את עצמו.
              </p>
            )}
            {res.skipped > 0 && (
              <p>
                ב-<b>{res.skipped} חודשים</b> לא נמשך כלום, כי כל האחזקות היו מתחת
                לעלות הממוצעת שלהן. זה לא כשל — זה הכלל שמונע מכירה בהפסד.
              </p>
            )}
          </section>
        </>
      )}

      <section>
        <h2>איפה קונים כל אחד, ומה זה אומר על מס עיזבון</h2>
        <p>
          <b>לא כל מה שבטבלה נסחר בתל אביב, וזה ההבדל שעולה כסף.</b> בבורסה
          בתל אביב רשומות <b>שתי חברות ניהול זרות בלבד</b> — בלאקרוק אירלנד
          ואינבסקו — ובסך הכל <b>40 קרנות חוץ</b>. כל השאר דורש ברוקר עם גישה
          לבורסות אירופה.
        </p>
        <div className="scroll">
          <table>
            <thead><tr>{['הרכיב', 'הקרן', 'איפה נסחרת', 'עמלה מוערכת', 'מס עיזבון אמריקאי']
              .map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {BY_RETURN.filter(k => FUND[k]).map(k => {
                const f = FUND[k]!;
                return (
                  <tr key={k} className={picked.includes(k) ? 'mark' : ''}>
                    <td>{MEASURED[k].he}</td>
                    <td dir="ltr">{f.tick}</td>
                    <td className="v" style={{ color: f.tase ? 'var(--up)' : 'var(--gold)' }}>
                      {f.tase ? `ת״א ${f.tase}` : 'ברוקר אירופי'}</td>
                    <td className="v dim" style={{ whiteSpace: 'normal' }}>
                      {f.tase ? 'כקרן סל רגילה · 0.07%, מינימום ₪4.65'
                              : '0.25%, מינימום 25 במטבע + עד 0.8% המרה לכל כיוון'}</td>
                    <td className="v up">אינה נכס אמריקאי</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          <b>על מס עיזבון — כל הקרנות בטבלה הזאת הן איריות, וזו התשובה החזקה
          שיש.</b> הכלל האמריקאי מחיל מס על מניה <b>״רק אם הנפיקה אותה חברה
          אמריקאית״</b>, והתקנה קובעת במפורש את ההפך: מניה של חברה שאינה
          אמריקאית נמצאת מחוץ לארצות הברית. <b>העובדה שהקרן מחזיקה מניות
          אמריקאיות אינה רלוונטית</b> — אין הסתכלות דרך הקרן. זה מתועד היטב,
          וזו הסיבה היחידה שהקטלוג הזה אירי.
        </p>
        <p>
          <b>וקרן בחוזה חילופין אינה חריג לכך.</b> מי שמחזיק אותה מחזיק מניה
          של חברה אירית, ולכן התשובה על מס העיזבון זהה. החוזה הוא <b>סיכון צד
          נגדי</b>, שהוא שאלה אחרת לגמרי — אל תבלבלו בין השתיים.
        </p>
        <p>
          <b>שני סייגים שאני לא מחליק.</b> ראשית, <b>אין ״פטור״</b> — יש נכסים
          שנופלים מחוץ להגדרה, וזו טענה אחרת. שנית, חלק מהקרנות כאן מאוגדות
          כ-ICAV ולא כ-plc. ICAV היא גם גוף מאוגד, אבל <b>אימתתי את הניתוח
          על plc, לא על ICAV</b>, ולא מצאתי אסמכתה שעוסקת ב-ICAV במפורש.
          ההכרעה היא של יועץ מס אמריקאי.
        </p>
        <p>
          <b>ומה שאין בטבלה הזאת בכלל: ביטקוין.</b> אין בעולם קרן אירית
          על ביטקוין — רגולציית UCITS מגדירה רשימה סגורה של נכסים
          וקריפטו אינו בתוכה, והבנק המרכזי האירי כתב שהוא ״בלתי סביר
          ביותר״ שיאשר כזו. <b>ולכן אין ביטקוין במערכת, בשום מסלול
          ובשום משקל.</b> הדרכים העקיפות שכן קיימות נופלות בדיוק על
          מה שהקטלוג הזה נבנה בשבילו: אחת מהן נייר חוב בלי ערב, והאחרת
          מחזיקה קרנות סל אמריקאיות בפנים — כלומר החשיפה למס עיזבון
          שאנחנו מנסים להימנע ממנה.
        </p>
        <p>
          <b>והברוקר — אינטראקטיב ישראל.</b> הוא נותן גישה מקוונת
          לבורסת לונדון, וזו הדרך שכל המערכת בנויה עליה: הזמנה בדולר,
          לפי ISIN, בלי חדר מסחר טלפוני ובלי אישור מיוחד.
          <b> מה שצריך לאמת לפני הפקדה ראשונה</b> זה שהחשבון שלכם
          פתוח למסחר באירופה ולא רק בארה״ב, ושעמלת ההמרה שאתם מקבלים
          היא זו שבפרוספקט. <b>בדקו את זה בכתב, עם ה-ISIN.</b>
        </p>
      </section>

      <section>
        <h2>מה כאן מדוד, מה מונח, ומה אין</h2>
        <p>
          <b>מדוד מנתונים אמיתיים:</b> התנודתיות, מטריצת המתאמים, התשואה
          ההיסטורית והנפילה המקסימלית — מתשואות חודשיות כולל דיבידנדים. כל זוג
          רכיבים נמדד על החלון המשותף הארוך שלו, והמטריצה כוּוצה ב-2% כדי להיות
          פריקה מתמטית.
        </p>
        <p>
          <b>מונח קדימה:</b> הנחות מפורסמות ל<b>שבעה רכיבים</b> — שבבים
          בשתי הגרסאות, טכנולוגיה, ביוטק, אנרגיה נקייה, ביטחון וכורות
          זהב — כולן מדאמודראן NYU, ינואר 2026. לשאר הוצבה הנחת המניות
          הרחבה, וזה כתוב בעמודה ״בסיס התחזית״ שורה־שורה.
        </p>
        <p>
          <b>וכמה רחב הפיזור בין הבתים, כדי שלא תתבלבלו שיש כאן ודאות:</b> על
          מניות אמריקאיות, באותו רבעון — בלאקרוק <b>8.97%</b>, ג׳יי-פי מורגן{' '}
          <b>7.50%</b>, ואנגארד <b>5.8%</b>, ו-GMO <b>7.3%−</b> ריאלית.
          זה <b>יותר מ-3 נקודות</b> הפרש על אותו נכס, ובית אחד שחוזה הפסד.
          <b>אין קונצנזוס להישען עליו</b> — ולכן התרחיש הריאלי כאן הוא
          ג׳יי-פי מורגן, בית אמיתי ולא מספר שהמצאתי.
        </p>
        <p>
          <b>ומה שלא עשיתי בכוונה:</b> לא הקרנתי את ההיסטוריה קדימה.
          לשבבים נמדדו כאן <b>29.6% לשנה</b> על 158 חודשים — הקרנה של
          המספר הזה על 30 שנה מכפילה כל שקל פי יותר מאלפיים, וזו אינה
          תחזית אלא מה שקורה כשלוקחים את העשור החזק בהיסטוריה ומניחים
          שהוא יחזור על עצמו שלוש פעמים. <b>ההנחה קדימה לאותו רכיב היא
          10.72%</b>, מדאמודראן. היסטוריה מוצגת כאן, ולעולם לא מוקרנת.
        </p>
        <p>
          <b>ואיפה קונים — לא בתל אביב.</b> הקנייה בכל המערכת היא דרך
          אינטראקטיב ישראל בבורסת לונדון, בדולר. <b>זו לא פשרה אלא
          הדרישה שהקטלוג נבנה עליה:</b> בתל אביב רשומות שתי חברות ניהול
          זרות בלבד — בלאקרוק אירלנד ואינבסקו — והתמורה היומית של חלק
          מהניירות שלהן נמדדה <b>מתחת ל-100,000₪</b>, כלומר פחות מהפקדה
          בודדת גדולה. נייר שאין לו קונים אינו נזיל, גם כשהוא רשום.
        </p>
        <p>
          <b>ולמה בכלל לא ת״א.</b> כל שמונת הניירות שהמערכת עובדת
          איתם נסחרים <b>בלונדון בדולר</b>, ושם הם נקנים — אותה קרן,
          אותו ISIN, בלי המרת שקל־דולר־שקל ובלי להיתלות בשאלה אם היא
          רשומה בת״א. <b>VanEck אינה רשומה בתל אביב כלל</b>, וקרן
          השבבים היא רכיב בכל אחד מעשרת התמהילים — כלומר גם אם ת״א
          הייתה מסלול, היא לא הייתה מספיקה.
        </p>
        <p>
          <b>וסייג על הקטלוג:</b> הקרנות המסומנות ״טרם אומתה״ — לא אימתתי להן
          מספר נייר, דמי ניהול או שהן אכן צוברות, ולכן הוצבו להן דמי ניהול
          שמרניים. אין בזה המלצה.
        </p>
      </section>
    </div>
  );
}
