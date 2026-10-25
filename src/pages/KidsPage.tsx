import { useEffect, useMemo, useRef, useState } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import { KidsIntro } from '../components/onboarding/KidsIntro';
import { Disclaimer } from '../components/shared/Disclaimer';
import {
  simulate, medianNoise,
  SLEEVES, SLEEVE_HE, VOL, ASSUMPTION,
  type Scenario, type Market,
} from '../utils/mgsSim';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
/** the ages a child's income can open at */
const SALARY_AGES = [20, 25] as const;
const QUICK_DEPOSITS = [250, 500, 1000, 1500, 2000];
const TARGETS = [3000, 5000, 10000, 20000];
const SCN: Record<Scenario, string> = { pess: 'פסימי', real: 'ריאלי' };

function Opt({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className="opt" type="button" aria-pressed={on} onClick={onClick}>{children}</button>;
}
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'gold' | 'up' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="k">{label}</span>
      <span className="n" dir="ltr">{value}</span>
      <span className="s">{sub ?? ' '}</span>
    </div>
  );
}
/** lets a number be typed out before it is clamped */
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
          const t = e.target.value;
          setDraft(t);
          const n = Number(t);
          if (t !== '' && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
        }}
        onBlur={() => {
          const t = (draft ?? '').trim();
          if (t !== '') {
            const n = Number(t);
            if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
          }
          setDraft(null);
        }} />
      <span>{unit}</span>
    </label>
  );
}

/**
 * A child's plan on the growth track: deposits run until the income opens, and
 * from that birthday it pays 4% a year a twelfth at a time — a salary, not a
 * lump handed over. Nothing is sold on the way, so the first tax event is the
 * first withdrawal.
 */
export function KidsPage() {
  const { kidsDone, childAge: savedAge, childDeposit } = useOnboardingStore();
  const [scenario, setScenario] = useState<Scenario>('real');
  const [market, setMarket] = useState<Market>('il');
  const [childAge, setChildAge] = useState(savedAge);
  const [deposit, setDeposit] = useState(childDeposit);
  const [salaryAge, setSalaryAge] = useState<number>(20);
  const [growth, setGrowth] = useState(7);
  /** how long the plan is watched past the day the income opens */
  const [after, setAfter] = useState(30);

  // the transition year is the child's own: deposits until the salary starts
  const startYear = Math.max(1, salaryAge - childAge);
  const years = Math.min(60, startYear + after);

  const live = { scenario, market, childAge, deposit, salaryAge, growth, years, startYear };
  const [settled, setSettled] = useState(live);
  const pending = JSON.stringify(settled) !== JSON.stringify(live);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSettled(live), 320);
    return () => window.clearTimeout(timer.current);
  }, [scenario, market, childAge, deposit, salaryAge, growth, years, startYear]);
  const runNow = () => { window.clearTimeout(timer.current); setSettled(live); };

  const paths = 1200;
  const q = settled;
  const r = useMemo(() => simulate({
    scenario: q.scenario, market: q.market, track: 'growth', cohort: '20-30',
    base: q.deposit, growth: q.growth / 100, years: q.years,
    startYear: q.startYear, floor: 0, paths, targets: TARGETS,
  }), [q]);

  if (!kidsDone) return <KidsIntro />;

  const noise = medianNoise(paths);
  const atOpen = r.rows[q.startYear - 1];
  const last = r.rows[r.rows.length - 1];
  const ageAt = (year: number) => q.childAge + year;
  const ym = (m: number | null) => m === null ? '—' : `גיל ${ageAt(Math.floor(m / 12))}`;

  return (
    <div className="term">
      <div className="tape">
        {SLEEVES.map(k => (
          <span className="tk" key={k}>
            <span className="sym">{SLEEVE_HE[k]}</span>
            <b>{(ASSUMPTION[q.scenario][k] * 100).toFixed(2)}%</b>
          </span>
        ))}
        <span className="tk"><span className="sym">תנודתיות ביטקוין</span>
          <b className="dn">{(VOL.BTC * 100).toFixed(1)}%</b></span>
        <span className="tk"><span className="sym">המשכורת נפתחת</span>
          <b className="gold">גיל {q.salaryAge}</b></span>
        <span className="tk"><span className="sym">מס · רווח ריאלי</span><b className="dn">25%</b></span>
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="eyebrow">MGS KIDS</span>
        <h1>משכורת לילד, לא סכום ביד</h1>
        <p className="lede">
          אותו <b>מסלול הצמיחה</b> של המערכת, בגרסה של ילד: מפקידים עד הגיל שבו ההכנסה נפתחת,
          ומאותו יום התיק משלם <b>4% בשנה, חלקי 12, בכל חודש</b> — ורק מרכיב שמחירו מעל
          עלות הקנייה הממוצעת שלו. <b>לא מוכרים כלום בדרך</b>, ולכן אירוע המס הראשון הוא
          המשיכה הראשונה.
        </p>
      </header>

      <section>
        <div className="panel">
          <div className="grp">
            <span className="glab">המשכורת נפתחת בגיל</span>
            {SALARY_AGES.map(a => (
              <Opt key={a} on={q.salaryAge === a} onClick={() => setSalaryAge(a)}>{a}</Opt>
            ))}
            <span className="glab">גיל הילד היום</span>
            <Num value={childAge} min={0} max={17} step={1} unit="שנים" onCommit={setChildAge} />
          </div>
          <div className="grp">
            <span className="glab">הפקדה חודשית</span>
            {QUICK_DEPOSITS.map(d => (
              <Opt key={d} on={deposit === d} onClick={() => setDeposit(d)}>{n0(d)}</Opt>
            ))}
            <Num value={deposit} min={0} max={100000} step={100} unit="₪" onCommit={setDeposit} />
          </div>
          <div className="grp">
            <span className="glab">עליה שנתית</span>
            <Num value={growth} min={0} max={25} step={0.5} unit="%" onCommit={setGrowth} />
            <span className="glab">לראות עד</span>
            <Num value={after} min={5} max={50} step={5} unit="שנים אחרי" onCommit={setAfter} />
            <span className="glab">התרחיש</span>
            {(['pess', 'real'] as Scenario[]).map(s => (
              <Opt key={s} on={q.scenario === s} onClick={() => setScenario(s)}>{SCN[s]}</Opt>
            ))}
            <span className="glab">איפה קונים</span>
            <Opt on={q.market === 'il'} onClick={() => setMarket('il')}>ת״א בשקלים</Opt>
            <Opt on={q.market === 'fx'} onClick={() => setMarket('fx')}>חו״ל</Opt>
          </div>
          <p className="note">
            מפקידים <b>{startYear} שנים</b>, מגיל {childAge} עד גיל {q.salaryAge}, והעליה
            פועלת בחמש הראשונות. מגיל {q.salaryAge} ההפקדה יורדת 10% מסכום הבסיס בכל שנה
            עד שהיא מתאפסת — <b>והתיק ממשיך לשלם בלי שנכנס אליו עוד שקל</b>.
          </p>
          <div className="grp" style={{ marginTop: 4 }}>
            <button className="opt" type="button" onClick={runNow} disabled={!pending}
              style={{ padding: '9px 22px', fontSize: 13.5, fontWeight: 700 }}>
              {pending ? 'הרץ סימולציה' : 'מעודכן'}
            </button>
            <span className="glab" style={{ paddingInlineStart: 4 }}>
              {pending ? 'הקלט השתנה · ההרצה תצא לדרך לבד, או עכשיו בלחיצה'
                : `${n0(paths)} מסלולי מחיר · החציון רועד ±${noise.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="stats">
          <Stat label="הופקד בסך הכל" value={n0(r.paid)}
            sub={`${n0(q.deposit)}₪ בחודש, ${startYear} שנים ומעלה`} />
          <Stat label={`המשכורת בגיל ${q.salaryAge}`} value={`${n0(atOpen?.income ?? 0)}₪`} tone="gold"
            sub={pending ? 'מחשב…' : 'לחודש · בחודש הראשון'} />
          <Stat label="אחוזון 10 אז" value={`${n0(atOpen?.incomeP10 ?? 0)}₪`}
            sub="לחודש · אחד מכל עשרה" />
          <Stat label={`המשכורת בגיל ${ageAt(q.years)}`} value={`${n0(last.income)}₪`}
            sub="לחודש · היא עולה עם התיק" />
          <Stat label={`התיק בגיל ${q.salaryAge}`} value={n0(atOpen?.value ?? 0)}
            sub={`בגיל ${ageAt(q.years)}: ${n0(r.value)}`} />
          <Stat label="לכל שקל שהוכנס" value={`×${((r.cash + r.value) / Math.max(r.paid, 1)).toFixed(1)}`}
            tone="up" sub="תיק + מזומן, חלקי ההפקדות" />
        </div>
      </section>

      <section>
        <h2>מתי המשכורת מגיעה לכל סכום</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              <th>משכורת חודשית</th><th className="lead">באיזה גיל</th><th>כמה שנים מהיום</th>
            </tr></thead>
            <tbody>
              {TARGETS.map(T => {
                const m = r.goals[T];
                return (
                  <tr key={T}>
                    <td style={{ fontWeight: 600 }}>{n0(T)}₪</td>
                    <td className="lead">{ym(m)}</td>
                    <td className="n dim">
                      {m === null ? '—' : `${Math.floor(m / 12) + 1} שנים`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          לכל מסלול מחיר נמדד החודש הראשון שבו המשכורת מגיעה לסכום, ואז נלקח
          <b> חציון זמני ההגעה</b>. ‏״—״ פירושו שהסכום לא הושג ברוב המסלולים
          עד גיל {ageAt(q.years)}.
        </p>
      </section>

      <section>
        <h2>גיל אחר גיל</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              <th>גיל</th><th className="lead">המשכורת החודשית</th><th>אחוזון 10</th>
              <th>ההפקדה החודשית</th><th>שווי התיק</th><th>נמשך מצטבר</th>
            </tr></thead>
            <tbody>
              {r.rows.map((row, i) => {
                const y = i + 1;
                const open = y === q.startYear;
                const cls = open ? 'mark' : r.depositsEnd === y ? 'zero' : '';
                return (
                  <tr key={y} className={cls}>
                    <td className="n" style={{ fontWeight: 600 }}>{ageAt(y)}</td>
                    <td className="lead">{row.income < 1 ? '—' : `${n0(row.income)}₪`}</td>
                    <td className="n dim">{row.income < 1 ? '—' : `${n0(row.incomeP10)}₪`}</td>
                    <td className="n dim">{row.deposit < 1 ? 'אפס' : `${n0(row.deposit)}₪`}</td>
                    <td className="n">{n0(row.value)}</td>
                    <td className="n dim">{n0(row.cash)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>צהוב</b> — הגיל שבו המשכורת נפתחת. <b>ירוק</b> — הגיל שבו ההפקדות נגמרות
          {r.depositsEnd ? ` (גיל ${ageAt(r.depositsEnd)})` : ''}.
          כלל ״רק מעל העלות הממוצעת״ חסם משיכה ב-<b>{r.skipped}</b> חודשים.
          <b> וזה לא סכום קבוע</b>: אם התיק יורד 30%, המשכורת באותו חודש יורדת 30% איתו.
        </p>
      </section>

      <Disclaimer />
    </div>
  );
}
