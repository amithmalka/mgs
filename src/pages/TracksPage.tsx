import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useMgsStore } from '../store/mgsStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { GrowthChart } from '../components/mgs/GrowthChart';
import { projectTrack, projectPlain, recommendModel, INCOME_AGE, JEPQ_CAP,
         type TrackModel } from '../utils/trackProject';
import { mixForAge, glideAt } from '../utils/monthPlan';
import {
  SCENARIOS, SLEEVE_HE, WORLD_MODELS, CYCLE_YEARS, CYCLE_SEEN, horizonFor, btcRate,
  type ScenarioId, type SleeveId,
} from '../constants/mgsScenarios';

const AGES = [20, 30, 40, 50, 55, 60];
const DEPOSITS = [2000, 3000, 4000, 5000, 7500, 10000];
const SLEEVE_ORDER: SleeveId[] = ['BTC', 'SMH', 'XLK', 'SPMO', 'SYN', 'WORLD'];

const MODELS: Record<TrackModel, { name: string; sub: string }> = {
  1: {
    name: 'מסלול 1 · תזרים',
    sub: '50% ביטקוין ו-50% שבבים. אחוז מכל אחד בשנה עובר ל-JEPQ כהפקדה, ועוד 25% מהפוזיציה בכל שיא שנשבר אחרי נפילה אמיתית. JEPQ מחלקת מהחודש הראשון.',
  },
  2: {
    name: 'מסלול 2 · תזרים וצמיחה',
    sub: 'מתחיל 50/50, יורד 2 נקודות בשנה ל-SPMO ו-XLK. בכל שיא שנשבר אחרי נפילה נקצרים 25% מהרווח ועוברים ל-JEPQ. חמש השנים האחרונות — מדד עולמי.',
  },
};

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
/** the annual rate that turns a stream of equal deposits into this result */
function cagrOnDeposits(total: number, monthly: number, years: number): number {
  let lo = -0.5, hi = 1.0;
  for (let i = 0; i < 200; i++) {
    const r = (lo + hi) / 2;
    const m = Math.pow(1 + r, 1 / 12) - 1;
    let v = 0;
    for (let k = 0; k < years * 12; k++) v = (v + monthly) * (1 + m);
    if (v > total) hi = r; else lo = r;
  }
  return (lo + hi) / 2;
}

function Opt({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className="opt" type="button" aria-pressed={on} onClick={onClick}>{children}</button>;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'gold' | 'up' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="k">{label}</span>
      <span className="n" dir="ltr">{value}</span>
      <span className="s">{sub ?? '\u00A0'}</span>
    </div>
  );
}

/**
 * The two cash-flow tracks, with the scenario, the deposit and the starting age
 * all live. Every figure is net of capital gains tax — the tax paid along the
 * way, plus the tax still owed on the gain sitting in the portfolio.
 */
export function TracksPage() {
  const [scenario, setScenario] = useState<ScenarioId>('pess');
  const chosen = useOnboardingStore(s => s.track);
  const [model, setModel] = useState<TrackModel>(chosen);
  // age and the deposit stay the app's, so the context bar and the home page
  // never disagree with what this page is showing
  const { age, setAge } = useMgsStore();
  const { simulationParams, setSimulationParams } = useStore();
  const deposit = simulationParams.monthlyDeposit;
  const setDeposit = (v: number) => setSimulationParams({ monthlyDeposit: v });

  const p = useMemo(() => projectTrack(scenario, model, age, deposit), [scenario, model, age, deposit]);
  const years = useMemo(() => horizonFor(age).reduce((a, b) => a + b, 0), [age]);
  const S = SCENARIOS[scenario];

  const chartRows = useMemo(
    () => p.rows.map(r => ({ year: r.year, age: r.age, total: r.total, deposited: r.deposited, received: r.received })),
    [p],
  );

  const last = p.rows.length ? p.rows[p.rows.length - 1].total : 1;

  const stageYears = useMemo(() => {
    const s = new Set<number>([5, 10, 15, 20, 25, 30].filter(y => y < p.years));
    s.add(p.years);
    return [...s].sort((a, b) => a - b);
  }, [p.years]);

  return (
    <div className="term">
      <div className="tape">
        <span className="tk"><span className="sym">הערכה {S.label}</span></span>
        {SLEEVE_ORDER.map(k => (
          <span className="tk" key={k}>
            <span className="sym">{SLEEVE_HE[k].split(' · ')[1] ?? SLEEVE_HE[k]}</span>
            <b>{k === 'BTC' && S.btcStages.length ? '20→12→7' : `${(S.rate[k] * 100).toFixed(1)}%`}</b>
          </span>
        ))}
        <span className="tk"><span className="sym">מס</span><b className="dn">25%</b></span>
        <span className="tk"><span className="sym">הפקדה</span><b>{n0(deposit)} ₪</b></span>
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow">MONEY GROWTH SYSTEM</span>
        <h1>שני מסלולי התזרים, שנה אחר שנה</h1>
        <p className="lede">
          כל מסלול, בכל גיל פתיחה ובכל סכום הפקדה, מהשנה הראשונה ועד יום המשיכה —
          ובשתי מערכות הנחות שאפשר להחליף ביניהן בלחיצה.
        </p>
      </header>

      {recommendModel(age) !== model && age >= INCOME_AGE && (
        <p className="note" style={{ borderInlineStartColor: 'var(--gold)' }}>
          בגיל {age} האופק הוא {years} שנה, ובזמן הזה מסלול 2 מספיק רק לשני מחזורי
          קציר — ה-JEPQ שלו מגיע ל-{n0(projectTrack(scenario, 2, age, deposit).jepq)} ₪
          ומחלק {n0(projectTrack(scenario, 2, age, deposit).monthlyFromJepq)} ₪ בחודש.
          מסלול 1 מנתב הפקדות ישר ל-JEPQ ולכן מחלק
          {' '}{n0(projectTrack(scenario, 1, age, deposit).monthlyFromJepq)} ₪.
          מי שמחפש תזרים בגיל הזה — זה המסלול שמייצר אותו.
        </p>
      )}

      <div className="panel">
        <div className="grp"><span className="glab">ההערכה</span>
          {(['pess', 'real'] as ScenarioId[]).map(sc => (
            <Opt key={sc} on={scenario === sc} onClick={() => setScenario(sc)}>{SCENARIOS[sc].label}</Opt>
          ))}
        </div>
        <div className="grp"><span className="glab">המסלול</span>
          {([1, 2] as TrackModel[]).map(m => (
            <Opt key={m} on={model === m} onClick={() => setModel(m)}>
              {MODELS[m].name}{recommendModel(age) === m ? ' · לתזרים בגיל הזה' : ''}
            </Opt>
          ))}
        </div>
        <div className="grp"><span className="glab">הפקדה</span>
          {DEPOSITS.map(d => (
            <Opt key={d} on={deposit === d} onClick={() => setDeposit(d)}>{n0(d)} ₪</Opt>
          ))}
          <label className="own">סכום אחר
            <input className="amt" type="number" min={100} step={100} value={deposit}
              inputMode="numeric" aria-label="סכום הפקדה אחר"
              onChange={e => setDeposit(Math.max(100, Number(e.target.value) || 100))} />
            <span>₪</span>
          </label>
        </div>
        <div className="grp"><span className="glab">גיל פתיחה</span>
          {AGES.map(a => {
            const [d, sh] = horizonFor(a);
            return <Opt key={a} on={age === a} onClick={() => setAge(a)}>{a} · {d + sh} שנה</Opt>;
          })}
        </div>
      </div>

      <section>
        <h2>{MODELS[model].name}</h2>
        <p className="lede">{MODELS[model].sub}</p>
        <p className="eyebrow">גיל {age} עד {age + years} · {years} שנה · {n0(deposit)} ₪ בחודש</p>
      </section>

      <section className="chart">
        <div className="clg">
          <span><i style={{ background: 'var(--gold)' }} />שווי התיק, נטו</span>
          <span><i style={{ background: 'var(--up)' }} />מזומן שהתקבל, מצטבר</span>
          <span><i style={{ background: 'var(--bar)' }} />סך ההפקדות</span>
        </div>
        <GrowthChart rows={chartRows} series={[
          { key: 'total', color: 'var(--gold)', fill: true },
          { key: 'received', color: 'var(--up)', width: 1.8 },
          { key: 'deposited', color: 'var(--bar)', width: 1.5, dashed: true },
        ]} />
      </section>

      <p className="netflag">
        <b>כל הסכומים בדף מנוכים ממס רווחי הון של 25%</b> — גם מה שכבר שולם בדרך על
        קצירות וחלוקות, וגם המס שעוד רובץ על הרווח שיושב בתיק. המספרים הם מה שנשאר ביד.
      </p>

      <div className="stats">
        <Stat label="סך ההפקדות" value={n0(p.deposited)} />
        <Stat label="שווי התיק, נטו" value={n0(p.equity)} sub="אחרי מס על הרווח" tone="gold" />
        <Stat label="מתוכו JEPQ, נטו" value={n0(p.jepq)} />
        <Stat label="התקבל במזומן בדרך" value={n0(p.received)} sub="חלוקות JEPQ, נטו" tone="up" />
        <Stat label="סה״כ לכל החיים" value={n0(p.total)} sub={`×${p.multiple.toFixed(2)}`} tone="gold" />
        <Stat label="תשואה שנתית אפקטיבית" value={pc(cagrOnDeposits(p.total, deposit, p.years))}
              sub="הריבית שהופכת את ההפקדות לסכום הזה" tone="up" />
        <Stat label="מס, סך הכל" value={n0(p.tax)}
              sub={`בדרך ועל התיק · ${Math.round((p.tax / p.deposited) * 100)}% מההפקדות`} />
        <Stat label="משכורת חודשית" value={n0(p.monthly)}
              sub={`${n0(p.monthlyFromGrowth)} לפי 4% + ${n0(p.monthlyFromJepq)} מ-JEPQ`} tone="gold" />
      </div>

      <section>
        <span className="eyebrow">איך בנויה המשכורת — שני מקורות נפרדים שמתחברים</span>
        <div className="fl">
          <div className="f">
            <span className="fk">לאורך כל הדרך</span>
            <span className="ft">חלוקת JEPQ · 9% בשנה</span>
            <p>יוצאת מהתיק בכל חודש מהרגע ש-JEPQ מחזיקה משהו, אחרי 25% מס. זה הכסף
              שחיים ממנו עוד לפני המשיכה.</p>
          </div>
          <div className="f">
            <span className="fk">רק מיום המשיכה</span>
            <span className="ft">כלל ה-4% · מהצד הצומח בלבד</span>
            <p>4% בשנה, משולם חודשי. <b>JEPQ לא נכללת בבסיס הזה</b>, כי היא כבר משלמת
              9% משלה.</p>
          </div>
          <div className="f tot">
            <span className="fk">מיום המשיכה והלאה</span>
            <span className="ft">המשכורת החודשית</span>
            <p>שני הזרמים <b>ביחד</b>. חלוקת JEPQ לא נפסקת ביום המשיכה — מצטרף אליה
              הזרם השני. <b>אף שקל לא נספר פעמיים.</b></p>
          </div>
        </div>
      </section>

      <section>
        <h2>לאן הולכת ההפקדה, שנה אחר שנה — לפני המדרגות</h2>
        <p className="lede">
          התמהיל נקבע מהגיל, לא מהוותק — ויורד נקודה בשנה עד גיל 35 ושתיים משם.
          {model === 1 && ' ובמסלול התזרים, חלק מההפקדה נכנס ישר ל-JEPQ.'}
        </p>
        <div className="scroll">
          <table>
            <thead><tr>
              {['שנה', 'גיל', ...SLEEVE_ORDER.filter(k => k !== 'SYN')
                  .map(k => SLEEVE_HE[k].split(' · ')[0]),
                ...(model === 1 ? ['JEPQ'] : []), 'ובשקלים'].map((h, i) => <th key={i}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stageYears.map(y => {
                const at = age + y - 1;
                const landing = y > p.depositYears;
                const toJepq = model === 1 ? Math.min(JEPQ_CAP, glideAt(at)) : 0;
                const mix = mixForAge(at);
                const keys = SLEEVE_ORDER.filter(k => k !== 'SYN') as SleeveId[];
                const shares = keys.map(k =>
                  landing ? (k === 'WORLD' ? 1 - toJepq : 0) : (mix[k] ?? 0) * (1 - toJepq));
                return (
                  <tr key={y}>
                    <td className="v dim">{y}{landing ? ' · נחיתה' : ''}</td>
                    <td className="v dim">{at}</td>
                    {keys.map((k, i) => (
                      <td key={k} className={`v ${shares[i] > 0.2 ? 'gold' : 'dim'}`}>
                        {shares[i] > 0 ? pc(shares[i], 0) : '—'}
                      </td>
                    ))}
                    {model === 1 && <td className="v up">{pc(toJepq, 0)}</td>}
                    <td className="v dim">
                      {shares.map(v => n0(deposit * v)).join(' / ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>האחוזים כאן הם מה שהגיל קובע, לפני המדרגות.</b> בפועל, בכל חודש, המנה של
          כל רכיב מוכפלת לפי מה שהוא עשה: רכיב על השיא שלו ×0.25, רכיב שירד ממנו ×0.50,
          ורכיב שנפל מעל 50% ×0.70 — כלומר מי שירד מקבל פי שתיים ממי שעלה. המנוע כאן
          עובד בתשואות קבועות ואין בו אף חודש שבו רכיב נמצא מתחת לשיא, ולכן המדרגות לא
          יכולות להופיע בטבלה הזאת. על נתוני המסחר האמיתיים הן שוות 250,797 ₪ עד
          292,761 ₪ — כלומר <b>המספרים בדף הזה שמרניים ב-3% עד 4.4%</b> ביחס למה שהמערכת
          באמת עושה.
        </p>
        <p className="note">
          המדד העולמי אינו חלק מהתמהיל הצובר באף גיל. הוא הנכס שהתוכנית נוחתת בו:
          ב-{p.years - p.depositYears} השנים האחרונות לפני המשיכה כל ההפקדה עוברת אליו
          ואליו בלבד — הסטה של כסף חדש, בלי למכור כלום ובלי אירוע מס.
        </p>
      </section>

      <section>
        <h2>הרכב התיק ביום המשיכה</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['הרכיב', 'שווי', 'חלק בתיק', 'ההנחה השנתית', 'שובר שיא כל', 'קצירות באופק']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(() => {
                const gross = SLEEVE_ORDER.reduce((t, k) => t + (p.final[k] ?? 0), 0) + p.finalJepq;
                const rows = [...SLEEVE_ORDER.map(k => ({
                  k, label: SLEEVE_HE[k], v: p.final[k] ?? 0,
                  rate: k === 'BTC' && S.btcStages.length
                    ? `${pc(btcRate(scenario, 1))} → ${pc(btcRate(scenario, 15))} → ${pc(btcRate(scenario, 25))}`
                    : pc(S.rate[k]),
                  cyc: CYCLE_YEARS[k],
                })), {
                  k: 'JEPQ' as string, label: 'JEPQ · מנוע ההכנסה', v: p.finalJepq,
                  rate: pc(SCENARIOS[scenario].jepqTotal), cyc: undefined as number | undefined,
                }];
                return rows.filter(r => r.v > 0.5).map(r => (
                  <tr key={r.k} className={r.k === 'JEPQ' ? 'fin' : ''}>
                    <td>{r.label}</td>
                    <td className="v">{n0(r.v)}</td>
                    <td className="v gold">{pc(gross ? r.v / gross : 0)}</td>
                    <td className="v dim" dir="ltr">{r.rate}</td>
                    <td className="v dim">{r.cyc ? `${r.cyc.toFixed(1)} שנים` : '—'}</td>
                    <td className="v dim">
                      {r.cyc ? Math.floor(p.years / r.cyc) : '—'}
                      {r.cyc && CYCLE_SEEN[r.k]
                        ? ` (נמדדו ${CYCLE_SEEN[r.k][0]} ב-${CYCLE_SEEN[r.k][1]} שנים)` : ''}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        <p className="note">
          השווי כאן ברוטו, לפני המס שעוד רובץ עליו — הוא מוצג כך כדי שהאחוזים יסתכמו
          ל-100%. תדירות שבירת השיא נמדדה על סגירות יומיות של כל רכיב בנפרד.
        </p>
      </section>

      <section>
        <h2>התזרים לפי שלבים</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['שלב', 'גיל', 'שווי התיק, נטו', 'JEPQ, נטו', 'דיבידנד חודשי', 'התקבל עד כאן']
                .map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stageYears.map(y => {
                const r = p.rows[y - 1];
                if (!r) return null;
                const last = y === p.years;
                return (
                  <tr key={y} className={last ? 'fin' : ''}>
                    <td className="dim">שנה {r.year}{last ? ' · משיכה' : ''}</td>
                    <td className="v dim">{r.age}</td>
                    <td className="v">{n0(r.grow + r.jepq)}</td>
                    <td className="v gold">{n0(r.jepq)}</td>
                    <td className="v up">{n0(r.monthlyJepq)}</td>
                    <td className="v dim">{n0(r.received)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="final">
        <span className="fl2">ההכנסה החודשית הכוללת מיום המשיכה</span>
        <span className="big">{n0(p.monthly)} ₪</span>
        <span className="eqn">= {n0(p.monthlyFromGrowth)} (4% מהצד הצומח) + {n0(p.monthlyFromJepq)} (9% מ-JEPQ)</span>
        <span className="fl2">ועוד {n0(p.received)} ₪ שכבר התקבלו במזומן לאורך הדרך.</span>
      </div>

      <section>
        <h2>שנה אחר שנה</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['שנה', 'גיל', 'הופקד', 'צומח, נטו', 'JEPQ, נטו', 'חלוקה החודש',
                'התקבל מצטבר', 'נקצר השנה', 'מס השנה', 'סה״כ', 'מול ההפקדות',
                'צמיחה השנה', ''].map((h, i) => <th key={i}>{h}</th>)}
            </tr></thead>
            <tbody>
              {p.rows.map(r => (
                <tr key={r.year}>
                  <td className="v dim">{r.year}</td>
                  <td className="v dim">{r.age}</td>
                  <td className="v dim">{n0(r.deposited)}</td>
                  <td className="v">{n0(r.grow)}</td>
                  <td className="v gold">{n0(r.jepq)}</td>
                  <td className="v up">{n0(r.monthlyJepq)}</td>
                  <td className="v dim">{n0(r.received)}</td>
                  <td className="v dim">{n0(r.harvested)}</td>
                  <td className="v dim">{n0(r.taxThisYear)}</td>
                  <td className="v">{n0(r.total)}</td>
                  <td className={`v ${r.total >= r.deposited ? 'up' : 'dn'}`}>
                    {pc(r.total / r.deposited - 1, 0)}
                  </td>
                  <td className="v dim">
                    {r.year === 1 ? '—'
                      : pc(r.total / p.rows[r.year - 2].total - 1, 0)}
                  </td>
                  <td className="meterwrap">
                    <span className="meter" style={{ width: `${Math.max(2, (r.total / last) * 100)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>ומול העולם, באותו אופק</h2>
        <div className="cmp">
          <div className="c you">
            <span className="nm">{MODELS[model].name}</span>
            <span className="vv">{n0(p.total)}</span>
            <span className="mm">{n0(p.monthly)} ₪ בחודש · ×{p.multiple.toFixed(2)}
              {' · '}{pc(cagrOnDeposits(p.total, deposit, p.years))} בשנה</span>
          </div>
          {WORLD_MODELS.map(([name, rate]) => {
            const w = projectPlain(rate, years, deposit);
            return (
              <div className="c" key={name}>
                <span className="nm">{name}</span>
                <span className="vv">{n0(w.total)}</span>
                <span className="mm">{n0(w.monthly)} ₪ בחודש · ×{(w.total / p.deposited).toFixed(2)}
                  {' · '}MGS ×{(p.total / w.total).toFixed(2)} מזה</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <span className="eyebrow">ההנחות שמאחורי כל מספר · הערכה {S.label}</span>
        <div className="scroll">
          <table>
            <thead><tr>{['הרכיב', 'ההנחה', 'עשה בעשור', 'ולמה דווקא ככה'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {SLEEVE_ORDER.map(k => (
                <tr key={k}>
                  <td>{SLEEVE_HE[k]}</td>
                  <td className="v gold" dir="ltr">
                    {k === 'BTC' && S.btcStages.length ? '20% → 12% → 7%' : `${(S.rate[k] * 100).toFixed(1)}%`}
                  </td>
                  <td className="v dim">{S.decade[k]}</td>
                  <td className="dim" style={{ whiteSpace: 'normal' }}>{S.why[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="note">
        שלוש מדרגות הקנייה: על השיא ×0.25, ירד ממנו ×0.50, נפל מעל 50% ×0.70 — על החלק
        שהגיל קובע, ואז מנרמלים. הקצירה נדלקת רק אחרי נפילה אמיתית — ביטקוין 50%,
        מניות 30% — וכשהמחיר חוזר ועובר את השיא הישן ב-10%, בתדירות שנמדדה מנתוני
        מסחר. מס רווחי הון 25% על כל מימוש וכל חלוקה. בלי אופציות. אין כאן המלצה
        להשקעה.
      </p>
    </div>
  );
}
