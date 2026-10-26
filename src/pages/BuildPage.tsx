import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MEASURED, ASSUME, FUND, ALT, BY_RETURN, corr, type SleeveKey,
} from '../constants/sleeveCatalog';
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
export function BuildPage() {
  const [picked, setPicked] = useState<SleeveKey[]>(['BTC', 'SEM', 'TEC']);
  const [scenario, setScenario] = useState<Scenario>('real');
  const [track, setTrack] = useState<Track>('growth');
  const [cohort, setCohort] = useState<Cohort>('30-40');
  const [base, setBase] = useState(4000);
  const [growth, setGrowth] = useState(7);
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

  const sub = substituted(picked);
  const depEnd = depositsEndYear(track, cohort, base, growth / 100);
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
        <div className="scroll">
          <table>
            <thead><tr>
              {['', 'הרכיב', 'תשואה שנמדדה', 'תנודתיות', 'נפילה מהשיא', 'נמדד מאז',
                'מתאם לביטקוין', 'מתאם לשבבים', 'הקרן האירית', 'דמי ניהול', 'איפה נקנה', 'הנחה קדימה']
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
                    <td className="v dim">{corr(k, 'BTC').toFixed(2)}</td>
                    <td className="v" style={{ color: k !== 'SEM' && corr(k, 'SEM') > 0.85 ? 'var(--gold)' : 'var(--muted)' }}>
                      {corr(k, 'SEM').toFixed(2)}</td>
                    <td dir="ltr" style={{ whiteSpace: 'normal' }}>
                      {f ? `${f.tick} · ${f.isin}` : <span className="dim">טרם אומתה</span>}
                      {f?.aum && <span className="dim" style={{ display: 'block', fontSize: 12 }}>
                        נכסים {f.aum}</span>}</td>
                    <td className="v dim">{f?.ter != null ? pc(f.ter, 2) : '—'}</td>
                    <td className="v" style={{ color: f?.tase ? 'var(--up)' : 'var(--muted)' }}>
                      {f?.tase ? `ת״א ${f.tase}` : 'ברוקר זר'}</td>
                    <td className="v" style={{ color: a ? 'var(--up)' : 'var(--gold)' }}>
                      {a ? 'מקור' : 'הצבה'}</td>
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
            <div className="scroll">
              <table>
                <thead><tr>{['הרכיב', 'הקרן', 'ISIN', 'דמי ניהול', 'נכסים', 'שכפול']
                  .map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {picked.flatMap(k => (ALT[k] ?? []).map(a => (
                    <tr key={k + a.isin}>
                      <td>{MEASURED[k].he}</td>
                      <td dir="ltr">{a.tick} · {a.name}</td>
                      <td className="v dim" dir="ltr" style={{ fontSize: 12 }}>{a.isin}</td>
                      <td className="v">{pc(a.ter, 2)}</td>
                      <td className="v dim" dir="ltr">{a.aum}</td>
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
              שלקרן פיזית אין. היא לרוב זולה יותר — וזה המחיר.
            </p>
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
          <span className="glab">התרחיש</span>
          <Opt on={scenario === 'pess'} onClick={() => setScenario('pess')}>פסימי</Opt>
          <Opt on={scenario === 'real'} onClick={() => setScenario('real')}>ריאלי</Opt>
        </div>
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
          <span className="glab">הפקדה חודשית</span>
          <Num value={base} min={100} max={200000} step={100} unit="שקלים" onCommit={setBase} />
          <span className="glab">עליה שנתית</span>
          <Num value={growth} min={0} max={25} step={0.5} unit="אחוזים" onCommit={setGrowth} />
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
            לאף נושא צר אין הנחת תשואה מפורסמת, ולכן הם מקבלים את{' '}
            <b>הנחת המניות הרחבה</b> ({pc(EQUITY.real)}) עם <b>התנודתיות המדודה שלהם</b>.
            כלומר <b>לא הנחתי שהנושא מרוויח יותר מהשוק</b> — רק שהוא מיטלטל יותר.
            ההצבה עצמה: {EQUITY.src}.
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

          <section>
            <h2>היעדים</h2>
            <div className="scroll">
              <table>
                <thead><tr><th>הכנסה לחודש</th><th>מתי מושגת</th></tr></thead>
                <tbody>
                  {GOALS.map(g => {
                    const m = res.goals[g];
                    return (
                      <tr key={g} className={m === null ? 'zero' : ''}>
                        <td className="lead">{n0(g)} ₪</td>
                        <td className="v">{m === null ? 'לא מושגת בחלון'
                          : `שנה ${Math.floor(m / 12) + 1}`}</td>
                      </tr>
                    );
                  })}
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
        <h2>מה כאן מדוד, מה מונח, ומה אין</h2>
        <p>
          <b>מדוד מנתונים אמיתיים:</b> התנודתיות, מטריצת המתאמים, התשואה
          ההיסטורית והנפילה המקסימלית — מתשואות חודשיות כולל דיבידנדים. כל זוג
          רכיבים נמדד על החלון המשותף הארוך שלו, והמטריצה כוּוצה ב-2% כדי להיות
          פריקה מתמטית.
        </p>
        <p>
          <b>מונח קדימה:</b> ההנחה המפורסמת לביטקוין, לשבבים ולטכנולוגיה. לכל
          רכיב אחר <b>אין בעולם הנחת תשואה מפורסמת</b>, ולכן הוצבה לו הנחת
          המניות הרחבה. התנודתיות שלו נשארת שלו.
        </p>
        <p>
          <b>ומה שלא עשיתי בכוונה:</b> לא הקרנתי את ההיסטוריה קדימה. ניסיתי —
          לביטקוין נמדדו <b>61.8% לשנה</b>, והקרנה של זה ל-30 שנה הפיקה מספר
          שגדול מהתמ״ג העולמי. היסטוריה מוצגת כאן, ולעולם לא מוקרנת.
        </p>
        <p>
          <b>וסייג על הקטלוג:</b> הקרנות המסומנות ״טרם אומתה״ — לא אימתתי להן
          מספר נייר, דמי ניהול או שהן אכן צוברות, ולכן הוצבו להן דמי ניהול
          שמרניים. <b>על שבבים ועל קוונטים קיימת קרן אירית צוברת, אבל היא
          אינה רשומה למסחר בתל אביב</b> — לשתיהן נדרש ברוקר עם גישה לבורסות
          אירופה. בתל אביב אומתו עד כה חמש: S&P 500, טכנולוגיה, עולמי,
          רובוטיקה ובלוקצ׳יין. אין בזה המלצה.
        </p>
      </section>
    </div>
  );
}
