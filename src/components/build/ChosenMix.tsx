/** MGS · התמהיל שנבחר, בשלושת המסלולים.
 *
 *  **מה שזה עונה עליו.** התמהיל נותן תשואה ותנודתיות — אבל מה שקורה
 *  לכסף תלוי במה שעושים איתו. אותו תיק בדיוק, בשלושה תפקידים: אחד
 *  שמושכים ממנו מהתחלה, אחד שמושכים ממנו מעט, ואחד שלא נוגעים בו.
 *
 *  **ולמה שני מספרים ולא אחד.** עם משיכות, **סדר השנים משנה** — מי
 *  שסופג נפילה בשנים הראשונות של המשיכה מושך מקרן קטנה יותר והיא
 *  לא מתאוששת. ולכן מוצג גם החציון וגם אחוזון 10: אחד מעשרה מסלולים
 *  הסתיים שם או נמוך מזה.
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { useMgsStore } from '../../store/mgsStore';
import { IRISH, BUY, mix, type Tier } from '../../constants/irish';
import { TRACK_HE, TRACK_WHY, type TrackKey } from '../../constants/combos';
import { useMyPortfolio, totalWeight, cohortForAge } from '../../store/myPortfolio';
import { depositYearsFor, WITHDRAW_AFTER_STOP } from '../../utils/comboProject';
import { runAllTracks } from '../../utils/mixEngine';
import { forwardFor, FORWARD, OUTLOOK_HE, type Outlook } from '../../constants/forward';
import { COHORT_YEAR, type Cohort, type Track } from '../../utils/mgsSim';
import { ceilingFor } from '../../constants/studyFunds';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };
const TRACKS: Track[] = ['flow', 'both', 'growth'];

/** **שיעור המשיכה שמוצג לצמיחה — בתום התקופה בלבד.**
 *
 *  בצמיחה לא נמשך דבר לאורך האופק, ולכן אין לה ״הכנסה חודשית״
 *  בדרך. מה שכן רלוונטי הוא **מה הסכום שנצבר יוכל לתת מרגע
 *  שמתחילים למשוך** — וזה מה שמוצג, בשיעור השמרני מבין השלושה. */
const END_DRAW = 0.04;
const COHORTS = Object.keys(COHORT_YEAR) as Cohort[];

export function ChosenMix() {
  const { holdings, deposit, extra, fundStatus, annualSalary, selfIncome } = useMyPortfolio();
  const age = useMgsStore(st => st.age);
  // קבוצת הגיל נגזרת מהגיל שהוזן, ואפשר לדרוס אותה ידנית
  const [override, setOverride] = useState<Cohort | null>(null);
  const cohort: Cohort = override ?? cohortForAge(age);
  const setCohort = (c: Cohort) => setOverride(c);
  const [drawYears, setDrawYears] = useState(20);
  const [outlook, setOutlook] = useState<Outlook>('real');
  const fwd = useMemo(
    () => forwardFor(holdings.map(h => ({ k: h.k, w: h.w })), outlook),
    [holdings, outlook]);
  const depYears = depositYearsFor(age, cohort).years;

  const m = useMemo(() => mix(holdings.map(h => ({ k: h.k, w: h.w }))), [holdings]);
  const tot = totalWeight(holdings);

  const toBroker = useMemo(() => {
    const ceil = fundStatus === 'none' ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
    return Math.max(0, deposit - Math.min(deposit, ceil)) + extra;
  }, [deposit, extra, fundStatus]);

  // כשלא הוזנה הפקדה מריצים על סכום הדגמה, ומסמנים זאת במפורש —
  // עדיף להראות מה התמהיל עושה מאשר להציג מסך ריק.
  const isDemo = toBroker <= 0;
  const runBase = isDemo ? 2000 : toBroker;

  // כשנבחר תמהיל, מגלגלים אליו — אחרת הלחיצה מסמנת ולא נראה שקרה דבר
  const box = useRef<HTMLElement | null>(null);
  const sig = holdings.map(h => `${h.k}:${h.w}`).sort().join('|');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!sig) return;
    box.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [sig]);

  // המנוע האמיתי: כל רכיב בנפרד, עם המתאמים, ועם מנגנון הקנייה
  const [useRule, setUseRule] = useState(true);
  const [growth, setGrowth] = useState(5);
  const proj = useMemo(() => {
    if (holdings.length < 1) return null;
    return runAllTracks({
      parts: holdings.map(h => ({ k: h.k, w: h.w })),
      cohort, base: runBase, drawYears, outlook, useRule, growth: growth / 100,
    });
  }, [holdings, runBase, cohort, drawYears, outlook, useRule, growth]);

  // כמה המנגנון מוסיף — נמדד, לא מונח
  const noRule = useMemo(() => {
    if (holdings.length < 1) return null;
    return runAllTracks({
      parts: holdings.map(h => ({ k: h.k, w: h.w })),
      cohort, base: runBase, drawYears, outlook, useRule: false, growth: growth / 100,
    });
  }, [holdings, runBase, cohort, drawYears, outlook, growth]);

  if (!holdings.length) return null;

  const rows = holdings
    .map(h => ({ h, f: IRISH.find(x => x.k === h.k) }))
    .filter((r): r is { h: typeof holdings[0]; f: NonNullable<typeof r.f> } => !!r.f)
    .sort((a, b) => b.h.w - a.h.w);

  /** **אין כאן ״מנצח״, ובכוונה.**
   *
   *  צמיחה מושכת מאוחר הרבה יותר מהשניים האחרים, ולכן היא כמעט
   *  תמיד תוביל ב״סך הכל״ — היא פשוט לא נתנה לכם שקל לחיות ממנו
   *  במשך רוב התקופה. לסמן אותה כמנצחת זה להשוות בין תשובות
   *  לשאלות שונות.
   *
   *  **ההשוואה ההוגנת היחידה היא בין שני מסלולי המשיכה**, שעונים
   *  על אותה שאלה: כמה הכסף נותן למי שחי ממנו. */
  const bestDrawing = proj
    ? (['flow', 'both'] as const)
        .reduce((a, b) => (proj[b].delivered > proj[a].delivered ? b : a))
    : null;

  return (
    <section className="cm" ref={box}>
      <span className="eyebrow">התמהיל שנבחר</span>
      <h2>אותו תיק, בשלושת המסלולים</h2>

      <div className="cm-mix">
        {rows.map(({ h, f }) => (
          <span key={f.k} className="cm-chip">
            <span className={`lab-dot ${DOT[f.tier]}`} aria-hidden="true" />
            {f.he}
            {BUY[f.k] && <code dir="ltr">{BUY[f.k].sym}</code>}
            <b dir="ltr">{pc(tot ? h.w / tot : 0)}</b>
          </span>
        ))}
      </div>

      <div className="stats">
        <Stat label="תשואה שנמדדה" value={sg(m.cagr)} sub="60 חודשים, בדולר" tone="gold" />
        <Stat label="תנודתיות" value={pc(m.vol)} sub={`בלי פיזור ${pc(m.naive)}`} />
        <Stat label="לברוקר כל חודש" value={`${n0(runBase)}₪`}
          sub={isDemo ? 'סכום הדגמה — הזינו הפקדה בראש הדף'
            : fundStatus === 'none' ? 'אין קרן השתלמות' : 'אחרי תקרת הקרן'}
          tone={isDemo ? undefined : 'up'} />
      </div>

      <div className="grp">
        <span className="glab">קבוצת גיל</span>
        {COHORTS.map(c => (
          <button key={c} className="opt" type="button"
            aria-pressed={cohort === c} onClick={() => setCohort(c)}>{c}</button>
        ))}
        <span className="glab">התרחיש</span>
        {(Object.keys(OUTLOOK_HE) as Outlook[]).map(o => (
          <button key={o} className="opt" type="button"
            aria-pressed={outlook === o} onClick={() => setOutlook(o)}>
            {OUTLOOK_HE[o]}
          </button>
        ))}
        <span className="glab">עליה שנתית, שנים 1–5</span>
        <label className="own">
          <input className="amt" type="number" min={0} max={10} step={0.5} value={growth}
            aria-label="עליה שנתית בהפקדה"
            onChange={e => setGrowth(Math.min(10, Math.max(0, Number(e.target.value) || 0)))} />
          <span>%</span>
        </label>
        <label className="lab-only">
          <input type="checkbox" checked={useRule}
            onChange={e => setUseRule(e.target.checked)} />
          מנגנון הקנייה פעיל
        </label>
        <span className="glab">שנות משיכה</span>
        <label className="own">
          <input className="amt" type="number" min={5} max={40} step={1} value={drawYears}
            aria-label="שנות משיכה"
            onChange={e => setDrawYears(Math.min(40, Math.max(5, Number(e.target.value) || 5)))} />
          <span>שנים</span>
        </label>
        {(
          <span className="cb-hint">
            {override
              ? <>נדרס ידנית · הגיל שהזנתם {age} ({cohortForAge(age)})
                  {' '}<button className="opt cm-reset" type="button"
                    onClick={() => setOverride(null)}>לחזור לגיל</button></>
              : <>נגזר מהגיל שהזנתם: {age}</>}
          </span>
        )}

      </div>

      {/* **המספר שבולט חייב להיות התוצאה, לא הקלט.**
          ההנחה לרכיבים היא מה שנכנס למנוע; מה שיוצא ממנו הוא ה-IRR
          על ההפקדות, והוא גבוה ממנה — כי הפקדה חודשית לנכס תנודתי
          קונה יותר יחידות כשהוא זול, ומנגנון הקנייה מגביר את זה.
          להציג רק את הקלט גרם לקריאה ש״התשואה נמוכה מדי״. */}
      {proj && (
        <div className="fw-top">
          <div>
            <span className="k">ההנחה שנכנסת למנוע</span>
            <b dir="ltr" className="dim">{pc(fwd.cagr, 2)}</b>
            <small>ממוצע משוקלל של הנחות מפורסמות, נטו</small>
          </div>
          <span className="fw-arrow" aria-hidden="true">←</span>
          <div>
            <span className="k">ומה שהתיק מוציא בפועל</span>
            <b dir="ltr" className="gold">{sg(proj.growth.irr, 2)}</b>
            <small>IRR על ההפקדות שלכם, בהרצה</small>
          </div>
          <div className="fw-gap">
            <span className="k">ההפרש</span>
            <b dir="ltr" className={proj.growth.irr > fwd.cagr ? 'up' : 'warn'}>
              {sg(proj.growth.irr - fwd.cagr, 2)}
            </b>
            <small>הפקדה חודשית ומנגנון הקנייה</small>
          </div>
        </div>
      )}

      <details className="fw">
        <summary>
          <b>מאיפה הגיעו שני המספרים האלה</b>
          <span>לפתוח כדי לראות את ההנחה לכל רכיב, והמקור שלה</span>
        </summary>
        <div className="fw-body">
          {outlook === 'cont' && (
            <p className="lab-access dk-good">
              <b>בתרחיש ״המשכיות״ נקודת הפתיחה היא מה שנמדד בפועל</b> —{' '}
              <b dir="ltr">{sg(m.cagr)}</b> לתמהיל הזה — <b>והיא דועכת
              לינארית אל ההנחה המפורסמת לאורך עשר שנים.</b> מהשנה
              העשירית ואילך פועלת ההנחה בלבד.{' '}
              <b>זה אינו ״אופטימי יותר״</b> — זו הנחה אחרת: שמגמה
              שנמדדה דועכת, ולא נעצרת ביום שפתחתם את התיק.
            </p>
          )}
          <p className="note">
            <b>ההנחה אינה התשואה שתקבלו — היא הקלט.</b> היא מתארת מה
            נכס כזה מניב ל<b>סכום שיושב</b>. אתם מפקידים <b>כל חודש</b>,
            ולכן קונים יותר יחידות כשהתיק זול — <b>וה-IRR בפועל גבוה
            ממנה</b>. זה לא בונוס שהוספנו; זו תוצאה של ההרצה.
          </p>
          <p className="note">
            <b>ולמה לא פשוט להשתמש במה שנמדד.</b> ה-{sg(m.cagr)} שנמדדו
            הם מה שקרה ב-60 חודשים שהיו <b>העשור של הבינה המלאכותית</b>.
            בבדיקה, הקרנה של המספר הזה ארבעים שנה הפיקה{' '}
            <b>208 מיליון ש״ח</b> מ-2,286₪ בחודש. זה לא מספר אמיתי,
            ולכן ההנחות כאן נמוכות בהרבה מהמדידה — <b>בכוונה</b>.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th className="lead">הרכיב</th><th>משקל</th>
                  <th>ההנחה</th><th>המקור</th></tr>
              </thead>
              <tbody>
                {rows.map(({ h, f }) => {
                  const a = FORWARD[f.k];
                  return (
                    <tr key={f.k}>
                      <td className="lead">{f.he}</td>
                      <td dir="ltr">{pc(tot ? h.w / tot : 0)}</td>
                      <td dir="ltr" className="gold">{a ? pc(a.real, 2) : '—'}</td>
                      <td className="dim">{a ? a.src : 'לא אומת'}</td>
                    </tr>
                  );
                })}
                <tr className="cross">
                  <td className="lead"><b>ברוטו משוקלל</b></td>
                  <td />
                  <td dir="ltr" className="gold"><b>{pc(fwd.gross, 2)}</b></td>
                  <td className="dim">
                    {outlook !== 'real' && `כולל התאמת תרחיש ${OUTLOOK_HE[outlook]}`}
                  </td>
                </tr>
                <tr>
                  <td className="lead">פחות דמי ניהול</td>
                  <td />
                  <td dir="ltr" className="warn">−{pc(fwd.ter, 2)}</td>
                  <td className="dim">משוקלל לפי המשקלות</td>
                </tr>
                <tr className="fin">
                  <td className="lead"><b>נטו — מה שנכנס לחישוב</b></td>
                  <td />
                  <td dir="ltr" className="gold"><b>{pc(fwd.cagr, 2)}</b></td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            <b>המקורות:</b> דאמודראן NYU ינואר 2026 לעלות ההון הענפית,
            וג׳יי־פי מורגן LTCMA 2027 למניות רחבות.{' '}
            <b>הפיזור בין הבתים גדול</b> — על מניות אמריקאיות באותו
            רבעון: בלאקרוק 8.97%, ג׳יי־פי מורגן 7.50%, ואנגארד 5.8%.
            <b> אין קונצנזוס</b>, ולכן ״ריאלי״ כאן הוא האמצע
            ו״אופטימי״ מוסיף שתי נקודות.{' '}
            <b>אלה הנחות של בתי השקעות, לא תחזיות שלנו.</b>
          </p>
          <p className="note">
            <b>והתנודתיות כן נלקחת מהמדידה</b> — היא יציבה הרבה יותר
            מהתשואה, ומתארת את צורת הדרך ולא את היעד.
          </p>
        </div>
      </details>

      <div className="cm-head">
        <span className="cm-head-k">האופק שלכם</span>
        <b className="cm-head-v">{depYears} שנות הפקדה</b>
        <span className="cm-head-s">
          ואז {drawYears} שנות משיכה · סך הכל {depYears + drawYears} שנה
        </span>
      </div>

      <p className="cm-horizon">
        <b>קבוצה {cohort}: מפקידים {depYears} שנים ואז עוצרים לגמרי</b> —
        ההפקדה <b>עולה {growth}% בשנה בשנים 1–5</b>, ומשנה 6{' '}
        <b>יורדת לינארית עד אפס</b> בסוף תקופת ההפקדות — כי שקל
        שנכנס מוקדם עובד את כל התקופה ושקל שנכנס בסוף כמעט לא. <b>ומאותה נקודה ההתנהגות שונה בכל
        מסלול</b>: <b>כל שלושת המסלולים מושכים <b>4% בשנה</b></b> למשך{' '}
        {drawYears} שנה. <b>ההבדל הוא מתי זה מתחיל</b> &mdash;
        הכסף ממשיך לעבוד את כל {drawYears} השנים, והמשיכות מתחילות רק
        בתום התקופה. <b>סך האופק: {depYears + drawYears} שנה.</b>
      </p>

      {isDemo && (
        <p className="lab-access warn">
          <b>לא הוזנה הפקדה חודשית, ולכן ההרצה היא על 2,000₪ להדגמה.</b>{' '}
          הזינו את ההפקדה שלכם בראש הדף והמספרים יתעדכנו למצב האמיתי.
        </p>
      )}

      {proj && (
        <>
          <div className="cm-shared">
            <div>
              <span className="k">הצבירה בתום {depYears} שנות ההפקדה</span>
              <b dir="ltr">{n0(proj.growth.atStop)}₪</b>
              <small>
                זהה בשלושת המסלולים — עד העצירה ההפקדות זהות,
                וההבדל מתחיל רק אחריה
              </small>
            </div>
            <div>
              <span className="k">אחוזון 10 באותה נקודה</span>
              <b dir="ltr" className="dim">{n0(proj.growth.atStopP10)}₪</b>
              <small>אחד מעשרה מסלולים הסתיים שם או נמוך מזה</small>
            </div>
            <div>
              <span className="k">התשואה על ההפקדות</span>
              <b dir="ltr" className="gold">{sg(proj.growth.irr)}</b>
              <small>
                {noRule && useRule
                  ? `המנגנון הוסיף ${((proj.growth.irr - noRule.growth.irr) * 100).toFixed(2)} נק׳`
                  : 'IRR עד עצירת ההפקדות'}
              </small>
            </div>
          </div>

          <p className="note">
            <b>ומכאן ואילך המסלולים נפרדים.</b> ההבדל ביניהם אינו
            בצבירה אלא ב<b>מה עושים איתה</b>: כמה מושכים בדרך, וכמה
            נשאר בסוף.
          </p>

          <div className="cm-grid">
            {TRACKS.map(t => {
              const p = proj[t];
              const win = t === bestDrawing;
              const noDraw = WITHDRAW_AFTER_STOP[t] === 0;
              return (
                <article key={t} className={`cm-card ${win ? 'win' : ''}`}>
                  <header>
                    <b>{TRACK_HE[t as TrackKey]}</b>
                    {noDraw
                      ? <span className="cb-mine cm-purpose">בלי משיכות</span>
                      : win && <span className="cb-mine">הגבוה מבין מסלולי המשיכה</span>}
                  </header>
                  <p className="cm-why">{TRACK_WHY[t as TrackKey]}</p>

                  {/* **התווית מעל המספר, לא מתחתיו.** קודם היה הפוך,
                      ובקריאה רצופה כל מספר נקרא עם התווית של הבא
                      אחריו — ואי אפשר היה להבין מה כל אחד אומר. */}
                  {/* **בצמיחה המשיכות מתחילות רק בשנת המעבר של
                      קבוצת הגיל**, ולכן טורי המשיכה שלה מתמלאים
                      מאוחר. אין בה ״אפס משיכות״ מאז תקרת ה-4%. */}
                  <div className="cm-nums">
                    {WITHDRAW_AFTER_STOP[t] === 0 ? (
                      <>
                        <div>
                          <span className="cm-k">שווי התיק בסוף האופק</span>
                          <b dir="ltr" className="gold">{n0(p.value)}₪</b>
                          <em>אחרי {depYears} שנות הפקדה ועוד{' '}
                            {drawYears} שנות צמיחה בלי לגעת</em>
                        </div>
                        <div>
                          <span className="cm-k">מזה הפקדתם</span>
                          <b dir="ltr" className="dim">{n0(p.paid)}₪</b>
                          <em>{pc(p.paid / Math.max(1, p.value), 0)} מהסכום</em>
                        </div>
                        {/* **המשיכות בצמיחה מתחילות בתום התקופה.**
                            לאורך הדרך לא נמשך כלום — ולכן מה שרלוונטי
                            כאן הוא מה הסכום הזה יוכל לתת מכאן והלאה. */}
                        <div>
                          <span className="cm-k">ומכאן — כמה בחודש</span>
                          <b dir="ltr" className="up">
                            {n0(p.value * END_DRAW / 12)}₪
                          </b>
                          <em>אם מתחילים למשוך רק בתום התקופה,{' '}
                            {pc(END_DRAW, 0)} בשנה</em>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="cm-k">כמה כסף הוציא מעצמו, סך הכל</span>
                          <b dir="ltr" className="gold">{n0(p.delivered)}₪</b>
                          <em>המשיכות ועוד מה שנשאר</em>
                        </div>
                        <div>
                          <span className="cm-k">מזה — נמשך לכיס</span>
                          <b dir="ltr" className="up">{n0(p.taken)}₪</b>
                          <em>לאורך {drawYears} שנות המשיכה</em>
                        </div>
                        <div>
                          <span className="cm-k">ומזה — נשאר בתיק</span>
                          <b dir="ltr">{n0(p.value)}₪</b>
                          <em>אחרי כל המשיכות</em>
                        </div>
                        <div>
                          <span className="cm-k">כמה בחודש ביד</span>
                          <b dir="ltr">{n0(p.income)}₪</b>
                          <em>בשנה האחרונה</em>
                        </div>
                      </>
                    )}
                  </div>

                  <footer>
                    <span>
                      {WITHDRAW_AFTER_STOP[t] === 0
                        ? 'בלי משיכות — הכסף עובד עד הסוף'
                        : `משיכה של ${pc(WITHDRAW_AFTER_STOP[t], 1)} בשנה, מהשנה ה-${depYears + 1}`}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>

          {/* **מה שהמספרים אומרים, במילים.** השילוב ״נמשכו מיליונים
              ועדיין נשארו מיליונים״ נראה כמו טעות, והוא לא. */}
          <p className="note">
            <b>מה באמת מבדיל בין שלושת המסלולים.</b> לא רק כמה התיק
            מתנדנד — אלא <b>מה עושים עם הכסף אחרי שמפסיקים להפקיד</b>.{' '}
            <b>כל שלושת המסלולים מושכים 4% בשנה</b> &mdash; וזו תקרה
            שלא עולים מעליה. <b>ההבדל הוא מתי המשיכה נפתחת</b>:{' '}
            <b>תזרים</b> מהשנה הראשונה, <b>תזרים וצמיחה</b> מהשנה
            הראשונה בקצב נמוך, ו<b>צמיחה</b> רק <b>משנת המעבר של
            קבוצת הגיל</b> &mdash; ועד אז הכסף כולו ממשיך לעבוד.
          </p>
          <p className="note">
            <b>ואיך אפשר למשוך מיליונים ושעדיין יישארו מיליונים.</b> כי
            מושכים <b>אחוז מהיתרה</b>, <b>והתיק מרוויח יותר מהאחוז
            הזה</b>. כל עוד המשיכה קטנה מהתשואה, היתרה ממשיכה לגדול
            תוך כדי שמושכים ממנה — <b>ולכן ״כמה בחודש ביד״ עולה עם
            השנים</b> ולא יורד: אותו אחוז, מיתרה שגדלה.
          </p>
          <p className="note">
            <b>ולכן ההשוואה היא לפי השורה הראשונה בכל כרטיס</b> — מה
            שהתיק הוציא מעצמו בסך הכל. מסלול שמושך יותר משאיר פחות,
            ולהסתכל רק על היתרה מציג אותו כגרוע בטעות.{' '}
            <b>ובצמיחה המשיכות מתחילות מאוחר</b>, ולכן שם רוב
            התקופה היא צבירה בלבד.
          </p>

          <p className="note">
            <b>סך ההפקדות בכל המסלולים: {n0(proj.growth.paid)}₪</b>.
            ההפרש בין זה לבין הצבירה הוא מה שהזמן עשה — ולא מה
            שהפקדתם. <b>ושימו לב שהמסלול שמסיים בצבירה הגבוהה אינו
            בהכרח הנכון לכם</b>: מי שמושך
            {proj.flow.taken > 0 ? ` ${n0(proj.flow.taken)}₪ ` : ' '}
            בדרך מקבל פחות בסוף, וזו בדיוק המטרה.
          </p>
          <p className="note">
            <b>למה שני מספרים ולא אחד.</b> התשואה שנמדדה היא ממוצע,
            ו<b>סדר השנים משנה</b> כשיש משיכות — מי שסופג נפילה בשנים
            הראשונות של המשיכה מושך מקרן קטנה יותר, והיא לא מתאוששת.
            <b> אחוזון 10 הוא התרחיש שצריך לשאול אם אפשר לחיות איתו</b>,
            לא החציון.
          </p>
          <p className="note">
            <b>ומה שאינו כלול בהרצה הזאת:</b> מנגנון הקנייה שמנתב את
            השארית לרכיב שנפל הכי עמוק. הוא דורש מחירי שיא של כל רכיב
            בנפרד; כאן התיק רץ כיחידה אחת עם התשואה והתנודתיות
            המשוקללות שלו. <b>אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
          </p>
        </>
      )}
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
