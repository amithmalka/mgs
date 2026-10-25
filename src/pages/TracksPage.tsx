import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Disclaimer } from '../components/shared/Disclaimer';
import {
  simulate, withdrawRate, medianNoise,
  SLEEVES, SLEEVE_HE, VOL, ASSUMPTION, COHORT_YEAR, TER,
  type Scenario, type Market, type Track, type Cohort,
} from '../utils/mgsSim';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

const TRACKS: Record<Track, { name: string; rule: string; tag: string }> = {
  flow: {
    name: 'תזרים בלבד',
    rule: 'ההפקדה יורדת 10% מסכום הבסיס בכל שנה מ-שנה 5. המשיכה מתחילה בשנה 2 באחוז אחד שנתי חלקי 12, ומגיעה ל-4% בשנה 8.',
    tag: 'מושך מ-שנה 2',
  },
  both: {
    name: 'תזרים וצמיחה',
    rule: 'ההפקדה יורדת 5% מסכום הבסיס בכל שנה מ-שנה 5. המשיכה מתחילה בשנה 5 באחוז אחד שנתי חלקי 12, ועוברת ל-4% בשנה 11.',
    tag: 'מושך מ-שנה 5',
  },
  growth: {
    name: 'צמיחה בלבד',
    rule: 'ההפקדה נשארת בשיאה עד שנת המעבר ואז יורדת 10% מהבסיס בכל שנה. המשיכה מתחילה בשנת המעבר, ישר ב-4%.',
    tag: 'מושך משנת המעבר',
  },
};
const COHORTS: Cohort[] = ['20-30', '30-40', '40-50', '50-60', '60-70'];
const SCN: Record<Scenario, string> = { pess: 'פסימי', real: 'ריאלי' };
const TARGETS = [5000, 10000, 20000, 30000, 50000];

/** every assumption, the body that published it and the date — nothing invented */
const SOURCE: Record<Scenario, Array<[string, string, string]>> = {
  real: [
    ['ביטקוין', '16.60%', 'JPMorgan · התרחיש השורי שלהם עצמם · LTCMA 2027'],
    ['שבבים', '10.72%', 'Damodaran · NYU Stern · 66 פירמות · 5.1.2026'],
    ['טכנולוגיה', '9.64%', 'Damodaran · סקטור התוכנה · 309 פירמות'],
  ],
  pess: [
    ['ביטקוין', '10.00%', 'JPMorgan AM · LTCMA 2027 · הבסיס, לא השורי'],
    ['שבבים', '10.72%', 'Damodaran · NYU Stern · 66 פירמות · 5.1.2026'],
    ['טכנולוגיה', '9.64%', 'Damodaran · סקטור התוכנה · 309 פירמות'],
  ],
};
const WHY: Record<Scenario, Array<[string, string]>> = {
  real: [
    ['כי זה לא מספר של מישהו שמוכר קריפטו',
     '16.6% הוא התרחיש השורי של JPMorgan עצמם. אותו בנק מפרסם 10.0% כבסיס ו-11.2% מינוס כתרחיש תחתון — זה הקצה העליון של טווח שבנק פרסם.'],
    ['וכי הוא נמוך בהרבה ממה שמנהלי הקריפטו מפרסמים',
     'ואן אק 15%, פידליטי דיגיטל 25%, ביטוויז 28.3% — חציון 25%. ‏16.6% הם שני שלישים מזה.'],
    ['וכי בשני רכיבים מתוך שלושה הוא לא מניח שום דבר טוב יותר',
     'השבבים והטכנולוגיה זהים לפסימי. לא מתוך שמרנות — אין בעולם מקור גבוה יותר מדאמודראן. התרחיש הזה הוא בפועל ״ביטקוין ריאלי, השאר אותו דבר״.'],
    ['וכי כל השלושה מתחת למה שבאמת קרה',
     'בחלון 9.2014–10.2026 הביטקוין עשה כ-54% בשנה, והשבבים והטכנולוגיה הרבה מעל 10.72% ו-9.64%.'],
    ['ומה שמאזן את זה',
     'גם כאן הירידה המקסימלית החציונית מעל 80%, ואחוזון 10 נמוך פי 19 מהחציון — יותר מהפסימי. הנחה גבוהה לא מקטינה את התנודתיות, היא מזיזה את המרכז.'],
  ],
  pess: [
    ['כל ההפרש בין שני התרחישים הוא הביטקוין',
     'השבבים והטכנולוגיה זהים בשניהם. הפסימי לוקח את הבסיס של JPMorgan במקום התרחיש השורי: 10.0% במקום 16.6%. זה כל השינוי.'],
    ['אבל מול הקונצנזוס המוסדי זה לא פסימי אלא הגבוה שקיים',
     'מי שאינו מוכר קריפטו מפרסם: Meketa 2.9%, מורגן סטנלי 6.0%, JPMorgan 10.0% — חציון 6.0%. ‏10.0% הוא המספר הגבוה ביותר שגוף שאינו מוכר קריפטו פרסם מעולם.'],
    ['ומה שקיים ונמוך מזה — ולא נלקח',
     'Meketa 2.9%. ‏GMO מינוס 5.0% למניות ארה״ב. ‏Schilling ו-Uhlig ב-Journal of Monetary Economics 106 (2019): בשיווי משקל התשואה הדולרית הצפויה אפס. וחציון 19 התחזיות למניות ארה״ב הוא 6.24%.'],
    ['והחולשה המשותפת לשני התרחישים',
     'שתי הנחות מתוך שלוש תלויות באדם אחד — דאמודראן, המקור הסקטוריאלי היחיד בעולם. אין אף בית השקעות שמפרסם תשואה צפויה לסקטור.'],
  ],
};

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

/**
 * The three tracks, each with its own deposit schedule and its own withdrawal
 * schedule, run forward on assumptions that external bodies published. The
 * weights, the return and the drawdown are output: the buying rule routes the
 * deposit by how far each holding sits below its own peak, and nothing here
 * assumes a target allocation.
 */
export function TracksPage() {
  const [track, setTrack] = useState<Track>('both');
  const [cohort, setCohort] = useState<Cohort>('30-40');
  const [scenario, setScenario] = useState<Scenario>('real');
  const [market, setMarket] = useState<Market>('fx');
  const [growth, setGrowth] = useState(7);
  const [years, setYears] = useState(40);
  const [lump, setLump] = useState(0);
  const { simulationParams, setSimulationParams } = useStore();
  const base = simulationParams.monthlyDeposit;
  const setBase = (v: number) => setSimulationParams({ monthlyDeposit: v });

  const paths = 1200;
  const r = useMemo(() => simulate({
    scenario, market, track, cohort, base, growth: growth / 100, years,
    lump, floor: 0, paths, targets: TARGETS,
  }), [scenario, market, track, cohort, base, growth, years, lump]);
  const noLump = useMemo(() => lump > 0 ? simulate({
    scenario, market, track, cohort, base, growth: growth / 100, years,
    lump: 0, floor: 0, paths, targets: TARGETS,
  }) : r, [scenario, market, track, cohort, base, growth, years, lump, r]);

  const noise = medianNoise(paths);
  const last = r.rows[r.rows.length - 1];
  const firstW = useMemo(() => {
    for (let y = 1; y <= 60; y++) if (withdrawRate(track, cohort, y) > 0) return y;
    return null;
  }, [track, cohort]);
  const ym = (m: number | null) => m === null ? '—' : `שנה ${Math.floor(m / 12) + 1}, חודש ${m % 12 + 1}`;

  return (
    <div className="term">
      <div className="tape">
        {SLEEVES.map(k => (
          <span className="tk" key={k}>
            <span className="sym">{SLEEVE_HE[k]}</span>
            <b>{(ASSUMPTION[scenario][k] * 100).toFixed(2)}%</b>
          </span>
        ))}
        {SLEEVES.map(k => (
          <span className="tk" key={`v${k}`}>
            <span className="sym">תנודתיות {SLEEVE_HE[k]}</span>
            <b className={k === 'BTC' ? 'dn' : undefined}>{(VOL[k] * 100).toFixed(1)}%</b>
          </span>
        ))}
        <span className="tk"><span className="sym">מתאם שבבים·טכנולוגיה</span><b>0.88</b></span>
        <span className="tk"><span className="sym">מס · רווח ריאלי</span><b className="dn">25%</b></span>
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow">MONEY GROWTH SYSTEM</span>
        <h1>שלושת המסלולים, שנה אחר שנה</h1>
        <p className="lede">
          ‏<b>תזרים בלבד</b>, <b>תזרים וצמיחה</b> או <b>צמיחה בלבד</b> — לכל אחד כלל הפקדה
          וכלל משיכה משלו. ההפקדה עולה באחוז שנבחר בחמש השנים הראשונות ואז יורדת מסכום הבסיס
          עד שהיא מתאפסת. <b>אין כאן קרן מחלקת ואין קציר לשיאים</b>: המשיכה היא אחוז מהתיק,
          רק מרכיב שמחירו מעל עלות הקנייה הממוצעת שלו.
        </p>
      </header>

      <section>
        <div className="panel">
          <div className="grp">
            <span className="glab">המסלול</span>
            {(Object.keys(TRACKS) as Track[]).map(t => (
              <Opt key={t} on={track === t} onClick={() => setTrack(t)}>{TRACKS[t].name}</Opt>
            ))}
          </div>
          {track === 'growth' && (
            <div className="grp">
              <span className="glab">קבוצת גיל · שנת המעבר</span>
              {COHORTS.map(c => (
                <Opt key={c} on={cohort === c} onClick={() => setCohort(c)}>
                  {c} · שנה {COHORT_YEAR[c]}
                </Opt>
              ))}
            </div>
          )}
          <div className="grp">
            <span className="glab">התרחיש</span>
            {(['pess', 'real'] as Scenario[]).map(s => (
              <Opt key={s} on={scenario === s} onClick={() => setScenario(s)}>{SCN[s]}</Opt>
            ))}
            <span className="glab">איפה קונים</span>
            <Opt on={market === 'fx'} onClick={() => setMarket('fx')}>חו״ל</Opt>
            <Opt on={market === 'il'} onClick={() => setMarket('il')}>ת״א בשקלים</Opt>
          </div>
          <div className="grp">
            <span className="glab">הפקדה חודשית</span>
            <label className="own">
              <input className="amt" type="number" min={0} step={500} value={base}
                onChange={e => setBase(Math.max(0, +e.target.value || 0))} />
              <span>₪</span>
            </label>
            <span className="glab">עליה שנתית</span>
            <label className="own">
              <input className="amt" type="number" min={5} max={10} step={0.5} value={growth}
                onChange={e => setGrowth(Math.min(10, Math.max(5, +e.target.value || 5)))} />
              <span>%</span>
            </label>
            <span className="glab">השקעה ראשונית</span>
            <label className="own">
              <input className="amt" type="number" min={0} step={10000} value={lump}
                onChange={e => setLump(Math.max(0, +e.target.value || 0))} />
              <span>₪</span>
            </label>
            <span className="glab">אופק</span>
            <label className="own">
              <input className="amt" type="number" min={6} max={60} step={1} value={years}
                onChange={e => setYears(Math.min(60, Math.max(6, +e.target.value || 40)))} />
              <span>שנים</span>
            </label>
          </div>
          <p className="note">{TRACKS[track].rule}</p>
        </div>
      </section>

      <section>
        <div className="stats">
          <Stat label="הוכנס בסך הכל" value={n0(r.paid)}
            sub={lump > 0 ? `${n0(lump)}₪ ראשוני + הפקדות` : 'הפקדות בלבד'} />
          <Stat label={`ההכנסה בשנה ${years}`} value={`${n0(last.income)}₪`} tone="gold"
            sub={`לחודש · ±${noise.toFixed(1)}% רעש חציון`} />
          <Stat label="אחוזון 10" value={`${n0(last.incomeP10)}₪`}
            sub="לחודש · אחד מכל עשרה" />
          <Stat label="שווי התיק" value={n0(r.value)} sub={`בשנה ${years}`} />
          <Stat label="לכל שקל שהוכנס" value={`×${((r.cash + r.value) / Math.max(r.paid, 1)).toFixed(1)}`}
            tone="up" sub="תיק + מזומן, חלקי הכל" />
          <Stat label="ההפקדות נגמרות" value={r.depositsEnd ? `שנה ${r.depositsEnd}` : '—'}
            sub={firstW ? `המשיכה מ-שנה ${firstW}` : undefined} />
        </div>
      </section>

      <section>
        <h2>על מה זה נשען</h2>
        <details className="why">
          <summary>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <b style={{ fontSize: 15 }}>התרחיש ה{SCN[scenario]}</b>
              <span className="more" />
            </span>
            {SOURCE[scenario].map(([nm, v, src]) => (
              <span key={nm} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                <span style={{ color: 'var(--mid)' }}>{nm} · {src}</span>
                <b style={{ fontFamily: 'var(--mono)' }}>{v}</b>
              </span>
            ))}
          </summary>
          <div className="bd">
            {WHY[scenario].map(([h, p]) => (
              <div key={h}><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </details>
        <p className="note">
          כל ההפרש בין שני התרחישים הוא <b>הביטקוין</b> — השבבים והטכנולוגיה זהים בשניהם,
          כי אין בעולם מקור גבוה יותר מדאמודראן. דמי הניהול כלולים
          ({market === 'fx' ? 'חו״ל' : 'ת״א'}: {(TER[market].BTC * 100).toFixed(2)}% ·{' '}
          {(TER[market].SEM * 100).toFixed(2)}% · {(TER[market].TEC * 100).toFixed(2)}%),
          ועוד 0.4% בשנה הפרשי מט״ח כרוח נגדית.
        </p>
      </section>

      <section>
        <h2>היעדים</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>היעד · הכנסה לחודש</th>
                <th className="lead">מתי מגיעים</th>
                <th>בלי השקעה ראשונית</th>
                <th>הקיצור</th>
              </tr>
            </thead>
            <tbody>
              {TARGETS.map(T => {
                const a = r.goals[T], b = noLump.goals[T];
                let shorter = '—';
                if (lump > 0 && a !== null && b !== null) {
                  const d = b - a;
                  shorter = d <= 0 ? 'אין קיצור'
                    : d >= 12 ? `${Math.floor(d / 12)} שנים ו-${d % 12} חודשים` : `${d} חודשים`;
                }
                return (
                  <tr key={T}>
                    <td style={{ fontWeight: 600 }}>{n0(T)}₪</td>
                    <td className="lead">{ym(a)}</td>
                    <td className="n dim">{lump > 0 ? ym(b) : '—'}</td>
                    <td className="n">{shorter}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="note">
          לכל מסלול מחיר נמדד החודש הראשון שבו ההכנסה מגיעה ליעד, ואז נלקח <b>חציון זמני ההגעה</b>.
          ‏״—״ פירושו שהיעד לא הושג ברוב המסלולים באופק שנבחר.
        </p>
      </section>

      <section>
        <h2>שנה אחר שנה</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>שנה</th>
                <th className="lead">ההכנסה החודשית</th>
                <th>אחוזון 10</th>
                <th>שיעור המשיכה</th>
                <th>ההפקדה החודשית</th>
                <th>שווי התיק</th>
                <th>נמשך מצטבר</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row, i) => {
                const y = i + 1;
                const rate = withdrawRate(track, cohort, y);
                const cls = r.crossover && r.crossover[0] === y ? 'cross'
                  : r.depositsEnd === y ? 'zero'
                  : y === firstW ? 'mark' : '';
                return (
                  <tr key={y} className={cls}>
                    <td className="n" style={{ fontWeight: 600 }}>{y}</td>
                    <td className="lead">{row.income < 1 ? '—' : `${n0(row.income)}₪`}</td>
                    <td className="n dim">{row.income < 1 ? '—' : `${n0(row.incomeP10)}₪`}</td>
                    <td className="n dim">{rate > 0 ? `${(rate * 100).toFixed(0)}%` : '—'}</td>
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
          <b>צהוב</b> — השנה שבה המשיכה נפתחת. <b>כחול</b> — החודש שבו המשיכה עוברת את ההפקדה
          {r.crossover ? ` (שנה ${r.crossover[0]}, חודש ${r.crossover[1]}: מפקידים ${n0(r.crossover[3])}₪ ומקבלים ${n0(r.crossover[2])}₪)` : ''}.
          <b> ירוק</b> — השנה שבה ההפקדות נגמרות. כלל ״רק מעל העלות הממוצעת״ חסם משיכה
          ב-<b>{r.skipped}</b> חודשים מתוך {Math.max(0, (years - (firstW ?? years) + 1) * 12)}.
        </p>
      </section>

      <Disclaimer />
    </div>
  );
}
