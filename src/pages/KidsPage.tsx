import { useMemo, useState } from 'react';
import { GrowthChart } from '../components/mgs/GrowthChart';
import { projectKid, depositFor, HANDOVER_AGE } from '../utils/kidsProject';
import { SCENARIOS, type ScenarioId } from '../constants/mgsScenarios';
import { useOnboardingStore } from '../store/onboardingStore';
import { KidsIntro } from '../components/onboarding/KidsIntro';

const TARGETS = [250000, 500000, 1000000, 2000000];
const QUICK_DEPOSITS = [250, 500, 1000, 1500, 2000];
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

function Opt({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button className="opt" type="button" aria-pressed={on} onClick={onClick}>{children}</button>;
}

/**
 * Investing for a child, solved in both directions: a monthly amount into what
 * the child receives at twenty, or a target into the amount it needs. Nothing
 * is sold on the way, so there is no tax event until the handover.
 */
export function KidsPage() {
  const { kidsDone, childAge: savedAge, childDeposit } = useOnboardingStore();
  const [scenario, setScenario] = useState<ScenarioId>('real');
  const [childAge, setChildAge] = useState(savedAge);
  const [deposit, setDeposit] = useState(childDeposit);

  const p = useMemo(() => projectKid(scenario, childAge, deposit), [scenario, childAge, deposit]);
  const S = SCENARIOS[scenario];

  /** typing a target resolves back to the monthly amount that reaches it */
  const setTarget = (target: number) => {
    if (target > 0) setDeposit(Math.max(1, depositFor(scenario, childAge, target)));
  };

  const chartRows = useMemo(
    () => p.rows.map(r => ({ year: r.year, age: r.age, net: r.net, deposited: r.deposited })),
    [p],
  );

  if (!kidsDone) return <KidsIntro />;

  const lastNet = p.rows.length ? p.rows[p.rows.length - 1].net : 1;

  return (
    <div className="term">
      <div className="tape">
        <span className="tk"><span className="sym">הערכה {S.label}</span></span>
        <span className="tk"><span className="sym">BTC</span>
          <b>{S.btcStages.length ? '20→12→7' : `${(S.rate.BTC * 100).toFixed(0)}%`}</b></span>
        <span className="tk"><span className="sym">SYNTH</span>
          <b>{(S.rate.SYN * 100).toFixed(1)}%</b></span>
        <span className="tk"><span className="sym">מס</span><b className="dn">25%</b></span>
        <span className="tk"><span className="sym">עד גיל</span><b>{HANDOVER_AGE}</b></span>
        <span className="tk"><span className="sym">אופק</span><b>{p.years} שנה</b></span>
      </div>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow">MONEY GROWTH SYSTEM</span>
        <h1>MGS Kids</h1>
        <p className="lede">
          השקעה לילד: מנוע הצמיחה, מגיל הילד היום ועד גיל 20. בלי למכור כלום
          בדרך, ולכן בלי אירוע מס אחד עד הסוף. בגיל 20 הילד מתחיל למשוך 4% בשנה, חודשי, והקרן
          נשארת שלו.
        </p>
      </header>

      <div className="panel">
        <div className="grp"><span className="glab">ההערכה</span>
          {(['pess', 'real'] as ScenarioId[]).map(sc => (
            <Opt key={sc} on={scenario === sc} onClick={() => setScenario(sc)}>{SCENARIOS[sc].label}</Opt>
          ))}
        </div>
        <div className="agebar">
          <span className="glab">גיל הילד</span>
          <span className="agebig">{childAge}</span>
          <input type="range" min={0} max={20} step={1} value={childAge}
            aria-label="גיל הילד היום"
            onChange={e => setChildAge(Number(e.target.value))} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            נשארו <b style={{ color: 'var(--ink)' }}>{p.years}</b> שנות הפקדה עד גיל 20
          </span>
        </div>
        <div className="two">
          <div className="side">
            <span className="q">כמה אנחנו מפקידים כל חודש?</span>
            <div className="field">
              <input type="number" min={1} step={50} value={Math.round(deposit)}
                inputMode="numeric" aria-label="הפקדה חודשית"
                onChange={e => setDeposit(Math.max(1, Number(e.target.value) || 1))} />
              <span className="cur">₪ בחודש</span>
            </div>
            <div className="chips">
              {QUICK_DEPOSITS.map(d => (
                <button className="chip" type="button" key={d} onClick={() => setDeposit(d)}>{n0(d)}</button>
              ))}
            </div>
          </div>
          <div className="side">
            <span className="q">או — כמה שהילד יקבל בגיל 20?</span>
            <div className="field">
              <input type="number" min={1000} step={1000} value={Math.round(p.net)}
                inputMode="numeric" aria-label="סכום יעד"
                onChange={e => setTarget(Number(e.target.value))} />
              <span className="cur">₪ נטו</span>
            </div>
            <div className="chips">
              {TARGETS.map(t => (
                <button className="chip" type="button" key={t} onClick={() => setTarget(t)}>
                  {t >= 1e6 ? `${t / 1e6} מיליון` : n0(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><span className="k">סך ההפקדות</span>
          <span className="n" dir="ltr">{n0(p.deposited)}</span>
          <span className="s">{n0(deposit)} ₪ × {p.years * 12} חודשים</span></div>
        <div className="stat gold"><span className="k">מה שהילד יקבל בגיל 20</span>
          <span className="n" dir="ltr">{n0(p.net)}</span>
          <span className="s">נטו אחרי מס</span></div>
        <div className="stat up"><span className="k">הרווח</span>
          <span className="n" dir="ltr">{n0(p.net - p.deposited)}</span>
          <span className="s">פי {p.multiple.toFixed(2)} על הכסף</span></div>
        <div className="stat gold"><span className="k">משכורת חודשית מגיל 20</span>
          <span className="n" dir="ltr">{n0(p.monthly)}</span>
          <span className="s">לפי כלל ה-4%</span></div>
      </div>

      <section className="chart">
        <div className="clg">
          <span><i style={{ background: 'var(--gold)' }} />שווי נטו</span>
          <span><i style={{ background: 'var(--bar)' }} />סך ההפקדות</span>
        </div>
        <GrowthChart rows={chartRows} series={[
          { key: 'net', color: 'var(--gold)', fill: true },
          { key: 'deposited', color: 'var(--bar)', width: 1.5, dashed: true },
        ]} />
      </section>

      <div className="final">
        <span className="fl2">מגיל 20, הילד מושך כל חודש לפי כלל ה-4% מרכיב הרווח</span>
        <span className="big">{n0(p.monthly)} ₪</span>
        <span className="eqn">בחודש · מתוך תיק של {n0(p.net)} ₪</span>
        <span className="fl2">והקרן נשארת שלו וממשיכה לעבוד.</span>
      </div>

      <section>
        <h2>כמה להפקיד כל חודש — לפי גיל הילד</h2>
        <p className="lede">
          הסכום החודשי שצריך, כדי שהילד יקבל את הסכום הזה נטו בגיל 20. ככל
          שמתחילים מאוחר יותר, החודשי קופץ.
        </p>
        <div className="scroll">
          <table>
            <thead><tr>
              <th>גיל הילד</th><th>שנות הפקדה</th>
              {TARGETS.map(t => (
                <th key={t}>כדי שיקבל {t >= 1e6 ? `${t / 1e6}M` : `${t / 1000}K`}</th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({ length: 21 }, (_, a) => a).map(a => (
                <tr key={a} className={a === childAge ? 'fin' : ''}>
                  <td className="v dim">{a}</td>
                  <td className="v dim">{Math.max(1, HANDOVER_AGE - a)}</td>
                  {TARGETS.map(t => (
                    <td className="v" key={t}>{n0(depositFor(scenario, a, t))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>שנה אחר שנה</h2>
        <div className="scroll">
          <table>
            <thead><tr>
              {['שנה', 'גיל הילד', 'הופקד', 'ביטקוין', 'סינתטיות', 'שווי נטו', '']
                .map((h, i) => <th key={i}>{h}</th>)}
            </tr></thead>
            <tbody>
              {p.rows.map(r => (
                <tr key={r.year}>
                  <td className="v dim">{r.year}</td>
                  <td className="v dim">{r.age}</td>
                  <td className="v dim">{n0(r.deposited)}</td>
                  <td className="v">{n0(r.btc)}</td>
                  <td className="v">{n0(r.synthetic)}</td>
                  <td className="v gold">{n0(r.net)}</td>
                  <td className="meterwrap">
                    <span className="meter" style={{ width: `${Math.max(2, (r.net / lastNet) * 100)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="note">
        המנוע: 50% ביטקוין בתחילת הדרך, יורד שתי נקודות בשנה אל התעודות הסינתטיות,
        והכל דרך ההפקדה החודשית בלבד — לא נמכר שום נכס, ולכן אין אירוע מס לאורך כל
        הדרך. <b>כל הסכומים נטו אחרי מס רווחי הון של 25%</b> על הרווח שהצטבר. בגיל 20
        מתחילה משיכה של 4% בשנה, משולמת חודשית מרכיב הרווח, נטו. אין כאן המלצה להשקעה.
      </p>
    </div>
  );
}
