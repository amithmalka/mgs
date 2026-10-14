import { useMemo, useState } from 'react';
import { Card } from '../layout/Card';
import { Collapsible } from '../layout/Collapsible';
import { Explain } from '../shared/Explain';
import { TRACKS, milestonesFor, type TrackId, type AssetId } from '../../constants/mgsV4';
import { RETURNS, SCENARIO_LABEL, type Scenario } from '../../constants/mgsReturns';
import { project, compareTracks, mixAt } from '../../utils/mgsV4Engine';
import { formatCurrency } from '../../utils/format';

const ASSET_HE: Record<AssetId, string> = {
  BTC: 'ביטקוין', SMH: 'מוליכים למחצה', SPMO: 'מומנטום S&P', QQQA: 'מומנטום נאסד״ק',
  I500: 'S&P 500 סינתטי', EQQS: 'נאסד״ק סינתטי', JEPQ: 'JEPQ הכנסה', WORLD: 'מדד עולמי',
};

const ASSET_COLOR: Record<AssetId, string> = {
  BTC: '#FBBF24', SMH: '#F87171', SPMO: '#A78BFA', QQQA: '#7DD3FC',
  I500: '#34D399', EQQS: '#F472B6', JEPQ: '#D4AF37', WORLD: '#10B981',
};

/** Which track the age points at, before the client overrides it. */
function suggestedTrack(age: number): TrackId {
  if (age < 40) return 'compound';   // decades left: never interrupt the compounding
  if (age < 55) return 'shield';     // still long, but worth trimming after a peak
  return 'alpha';                    // income starts to matter more than growth
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/**
 * Everything a client sees from the moment they arrive until the day they draw.
 *
 * Age and deposit come in; the track is suggested and then theirs to change;
 * and the tables run to whatever horizon they pick rather than to one the
 * system chose for them.
 */
export function TrackTables({ age, monthlyDeposit = 4000 }: { age: number; monthlyDeposit?: number }) {
  const suggested = suggestedTrack(age);
  const [track, setTrack] = useState<TrackId>(suggested);
  const [scenario, setScenario] = useState<Scenario>('moderate');
  const defaults = milestonesFor(age);
  const defaultHorizon = defaults.depositYears + defaults.shiftYears;
  const [horizon, setHorizon] = useState(defaultHorizon);

  const p = useMemo(
    () => project(track, age, monthlyDeposit, scenario, horizon),
    [track, age, monthlyDeposit, scenario, horizon],
  );
  const all = useMemo(
    () => compareTracks(age, monthlyDeposit, scenario, horizon),
    [age, monthlyDeposit, scenario, horizon],
  );

  const milestoneYears = useMemo(() => {
    const ys = new Set<number>([1, 3, 5, defaults.depositYears, horizon]);
    for (let y = 10; y < horizon; y += 5) ys.add(y);
    return [...ys].filter(y => y >= 1 && y <= horizon).sort((a, b) => a - b);
  }, [defaults.depositYears, horizon]);

  return (
    <div dir="rtl" className="flex flex-col gap-5">
      {/* ── the choice ───────────────────────────────────────────────────── */}
      <Card glow explain="track" title={`בן ${age}, מפקיד ${formatCurrency(monthlyDeposit)} בחודש`}
            subtitle={`המערכת ממליצה על ״${TRACKS[suggested].nameHe}״ — אפשר לשנות`}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {(['alpha', 'shield', 'compound'] as TrackId[]).map(t => (
              <button key={t} onClick={() => setTrack(t)}
                className={`rounded-xl border px-3 py-2.5 text-center transition-colors ${
                  track === t ? 'border-gold bg-gold-muted' : 'border-surface-4 hover:bg-surface-3/50'}`}>
                <p className={`text-[12px] font-semibold ${track === t ? 'text-gold' : 'text-text'}`}>
                  {TRACKS[t].nameHe}
                </p>
                <p className="text-[9.5px] text-text-dim mt-0.5">
                  {t === suggested ? 'מומלץ לגיל שלך' : TRACKS[t].sellsToRebalance ? 'מוכר כדי לאזן' : 'בלי מכירות'}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-[11px] text-text-muted">
              עד גיל
              <input type="number" min={age + 1} max={age + 45} value={age + horizon}
                onChange={e => setHorizon(Math.max(1, (Number(e.target.value) || age + 1) - age))}
                className="w-16 bg-surface-3 border border-surface-4 rounded-lg px-2 py-1
                           text-[12px] text-text text-center" />
              <span className="text-text-dim">({horizon} שנים)</span>
            </label>
            <span className="flex items-center gap-1.5">
              {(['conservative', 'moderate', 'optimistic'] as Scenario[]).map(s => (
                <button key={s} onClick={() => setScenario(s)}
                  className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-colors ${
                    scenario === s ? 'border-gold text-gold bg-gold-muted'
                                   : 'border-surface-4 text-text-dim hover:bg-surface-3/50'}`}>
                  {SCENARIO_LABEL[s]}
                </button>
              ))}
              <Explain topic="returns" />
            </span>
          </div>
        </div>
      </Card>

      {/* ── the headline ─────────────────────────────────────────────────── */}
      <Card title="מה זה אומר בסוף" subtitle={`בגיל ${p.withdrawAge}, אחרי ${horizon} שנים`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="סך ההפקדות" value={formatCurrency(p.totalDeposited)} />
          <Stat label="שווי התיק" value={formatCurrency(p.finalValue)} tone="gold" />
          <Stat label="הרווח" value={formatCurrency(p.finalValue - p.totalDeposited)} tone="green" />
          <Stat label="קצבה חודשית, נטו" value={formatCurrency(p.monthlyIncomeNet)} tone="green" />
        </div>
        <p className="text-[10.5px] text-text-dim mt-3 font-light leading-relaxed">
          הקצבה היא 4% מהתיק בשנה, אחרי 25% מס על חלק הרווח שבכל משיכה.
          התחזית רצה על תרחיש ״{SCENARIO_LABEL[scenario]}״ — לא על תשואות העשור האחרון.
        </p>
      </Card>

      {/* ── the year by year ─────────────────────────────────────────────── */}
      <Card title="שנה אחר שנה, מהיום ועד המשיכה">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-gold-light">
                {['שנה', 'גיל', 'הופקד', 'שווי', 'רווח', 'תנודתי', ''].map(h => (
                  <th key={h} className="text-start font-semibold py-2 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.rows.filter(r => milestoneYears.includes(r.year)).map(r => (
                <tr key={r.year} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="py-2 px-2 text-text-muted">{r.year}</td>
                  <td className="py-2 px-2 text-text-muted">{r.age}</td>
                  <td className="py-2 px-2 text-text-dim whitespace-nowrap">{formatCurrency(r.deposited)}</td>
                  <td className="py-2 px-2 text-text font-semibold whitespace-nowrap">{formatCurrency(r.value)}</td>
                  <td className="py-2 px-2 text-success whitespace-nowrap">{formatCurrency(r.gain)}</td>
                  <td className="py-2 px-2 text-text-dim">{pct(r.volatile)}</td>
                  <td className="py-2 px-2 text-[10px] text-gold whitespace-nowrap">
                    {r.year === defaults.depositYears ? 'מעבר למדד עולמי' : r.year === horizon ? 'תחילת משיכה' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── the mix over time ────────────────────────────────────────────── */}
      <Collapsible explain="ageMatrix" title="התמהיל לאורך הדרך" defaultOpen
                   subtitle="לאן הולכת ההפקדה בכל שלב">
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {[0, 5, 10, 15, 20, 25].filter(y => y < defaults.depositYears).concat([defaults.depositYears]).map(y => {
            const mix = y >= defaults.depositYears ? [['WORLD', 1] as [AssetId, number]] : mixAt(track, age, y);
            return (
              <div key={y} className="flex items-center gap-3">
                <span className="text-[10.5px] text-text-dim w-20 flex-shrink-0">
                  {y === 0 ? 'היום' : `שנה ${y}`} · גיל {age + y}
                </span>
                <div className="flex-1 flex rounded-lg overflow-hidden h-6">
                  {mix.map(([a, v]) => (
                    <div key={a} style={{ width: `${v * 100}%`, background: ASSET_COLOR[a] }}
                         title={`${ASSET_HE[a]} ${pct(v)}`}
                         className="flex items-center justify-center">
                      {v > 0.12 && (
                        <span className="text-[9px] font-semibold" style={{ color: '#0C0C0E' }}>{pct(v)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {(Object.keys(ASSET_HE) as AssetId[]).map(a => (
              <span key={a} className="flex items-center gap-1 text-[9.5px] text-text-dim">
                <span className="w-2 h-2 rounded-sm" style={{ background: ASSET_COLOR[a] }} />
                {ASSET_HE[a]}
              </span>
            ))}
          </div>
        </div>
      </Collapsible>

      {/* ── the three tracks side by side ────────────────────────────────── */}
      <Collapsible title="שלושת המסלולים זה מול זה" subtitle="אותו גיל, אותה הפקדה, אותו אופק">
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-gold-light">
                {['המסלול', 'שווי בסוף', 'קצבה נטו', 'מוכר כדי לאזן', 'קוצר אחרי שיא'].map(h => (
                  <th key={h} className="text-start font-semibold py-2 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all.map(({ track: t, projection }) => (
                <tr key={t} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className={`py-2 px-2 ${t === track ? 'text-gold font-semibold' : 'text-text'}`}>
                    {TRACKS[t].nameHe}
                  </td>
                  <td className="py-2 px-2 text-text whitespace-nowrap">{formatCurrency(projection.finalValue)}</td>
                  <td className="py-2 px-2 text-success whitespace-nowrap">
                    {formatCurrency(projection.monthlyIncomeNet)}
                  </td>
                  <td className="py-2 px-2 text-text-dim">{TRACKS[t].sellsToRebalance ? 'כן' : 'לא'}</td>
                  <td className="py-2 px-2 text-text-dim">{TRACKS[t].harvestsAtAth ? 'כן' : 'לא'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-text-dim mt-3 font-light leading-relaxed">
            ההפרש בין המסלולים כאן הוא רק הרכב הנכסים. הוא לא כולל את המס שמסלול
            ״אלפא דינמי״ משלם על כל מכירה לאורך הדרך, ולכן הפער האמיתי לטובת
            המסלולים שלא מוכרים גדול מהמוצג.
          </p>
        </div>
      </Collapsible>

      {/* ── what the projection stands on ────────────────────────────────── */}
      <Collapsible explain="returns" title="על מה התחזית עומדת"
                   subtitle="העשור האחרון מול ההיסטוריה הארוכה מול מה שאנחנו מניחים">
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-[11.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="text-gold-light">
                {['הנכס', 'עשור אחרון', 'הטווח הארוך', 'התחזית', 'מקור'].map(h => (
                  <th key={h} className="text-start font-semibold py-2 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(RETURNS) as AssetId[]).map(a => {
                const r = RETURNS[a];
                return (
                  <tr key={a} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="py-2 px-2 text-text whitespace-nowrap">
                      <span className="inline-block w-2 h-2 rounded-sm me-1.5"
                            style={{ background: ASSET_COLOR[a] }} />
                      {ASSET_HE[a]}
                    </td>
                    <td className="py-2 px-2 text-text-dim">{r.last10.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-text-muted">
                      {r.longRun.toFixed(1)}% <span className="text-text-dim">({r.longRunYears}ש׳)</span>
                    </td>
                    <td className="py-2 px-2 text-gold font-semibold">{r.pct[scenario]}%</td>
                    <td className="py-2 px-2 text-[10px] text-text-dim font-light">
                      {r.source}{r.assumed ? ' · הנחה' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-text-dim mt-3 font-light leading-relaxed">
            העשור האחרון היה מהחזקים בהיסטוריה — מוליכים למחצה עשו בו 34.3% בשנה,
            ומאז 2000 הם עשו 10.7%. התחזית לא מניחה שהעשור הזה יחזור על עצמו.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}

function Stat({ label, value, tone = 'text' }: { label: string; value: string; tone?: 'text' | 'gold' | 'green' }) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'green' ? 'text-success' : 'text-text';
  return (
    <div className="rounded-xl border border-surface-4 bg-surface-2/40 px-3 py-2.5">
      <p className="text-[9.5px] text-text-dim mb-1">{label}</p>
      <p className={`text-[15px] font-bold leading-tight ${color}`}>{value}</p>
    </div>
  );
}
