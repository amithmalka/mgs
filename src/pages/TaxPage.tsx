import { useEffect, useMemo, useState } from 'react';
import { listDeposits, listMarks, listWithdrawals, positionsNet } from '../lib/deposits';
import type { Position } from '../lib/deposits';
import { withdrawTax, monthlyDraw, CGT } from '../lib/withdrawTax';
import { useMyPortfolio } from '../store/myPortfolio';
import { useMgsStore, currentPlanMonth } from '../store/mgsStore';
import { mix } from '../constants/irish';
import { Card } from '../components/layout/Card';
import { Rows } from '../components/shared/Rows';
import { Disclaimer } from '../components/shared/Disclaimer';
import { NumField } from '../components/build/NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * **מחשבון מס משיכה.**
 *
 * עונה על שאלה אחת: *אם אמשוך את המשיכה של החודש הזה, כמה מס
 * אשלם ומה יגיע לחשבון.*
 *
 * **והדבר שהמסך הזה קיים בשבילו הוא סעיף 88 לפקודה.** מס רווחי
 * הון הוא 25% על הרווח **הריאלי**, ובנייר הנקוב במטבע חוץ ה״מדד״
 * הוא **שער החליפין** ולא מדד המחירים. כלומר הרווח נמדד במטבע
 * הנייר, **ועליית הדולר אינה רווח לצורכי מס.** זה יכול להוריד את
 * המס בעשרות אחוזים, והמשקיע לא יודע את זה אם אף אחד לא מראה לו.
 */
export function TaxPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [pos, setPos] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetup] = useState(false);
  const [usd, setUsd] = useState(3.70);
  const [eur, setEur] = useState(4.00);
  const [gbp, setGbp] = useState(4.65);

  const { holdings } = useMyPortfolio();
  const { startMonth } = useMgsStore();
  const planYear = Math.floor((currentPlanMonth(startMonth) - 1) / 12) + 1;

  // **המסלול נגזר מהתיק עצמו** — אותה חלוקה שהקטלוג משתמש בה
  const track = useMemo<'flow' | 'both' | 'growth'>(() => {
    const v = mix(holdings).vol;
    return v < 0.145 ? 'flow' : v < 0.225 ? 'both' : 'growth';
  }, [holdings]);

  useEffect(() => {
    void (async () => {
      const [d, m, w] = await Promise.all([listDeposits(), listMarks(), listWithdrawals()]);
      if (!d.ok || !m.ok || !w.ok) { setSetup(true); setLoading(false); return; }
      setPos(positionsNet(d.data, m.data, w.data));
      setLoading(false);
    })();
  }, []);

  const rates = useMemo(() => ({ USD: usd, EUR: eur, GBP: gbp, GBp: gbp / 100, ILS: 1 }),
    [usd, eur, gbp]);
  const prices = useMemo(() => {
    const o: Record<string, number> = {};
    for (const p of pos) if (p.mark) o[p.k] = p.mark;
    return o;
  }, [pos]);

  const value = useMemo(() => pos.reduce((t, p) =>
    t + (p.mark ?? p.avgPrice) * p.units * (rates[p.currency as keyof typeof rates] ?? 1), 0), [pos, rates]);
  const draw = monthlyDraw(track, planYear, value);
  const [gross, setGross] = useState(0);
  useEffect(() => { setGross(Math.round(draw.amount)); }, [draw.amount]);

  const t = useMemo(() => withdrawTax(pos, prices, rates, gross), [pos, prices, rates, gross]);
  const marked = pos.filter(p => p.mark).length;

  if (loading) return <div className="term"><p className="note">טוען…</p></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <Card glow>
        <h2 className={embedded
          ? 'text-[15px] font-bold text-gold-light'
          : 'text-xl font-bold text-gold-gradient'}>
          {embedded ? 'הפירוק לפי סעיף 88' : 'מחשבון מס משיכה'}
        </h2>
        <p className="text-[12px] text-text-muted mt-1.5 leading-relaxed">
          כמה מס תשלמו על המשיכה של החודש, ומה יגיע לחשבון. <b className="text-gold">25%
          על הרווח הריאלי</b> — ובנייר במטבע חוץ, לפי סעיף 88, ה״מדד״ הוא
          <b className="text-text"> שער החליפין</b> ולא מדד המחירים.
        </p>
      </Card>

      {setupNeeded && (
        <div className="term">
          <p className="note">
            <b>יומן ההפקדות אינו זמין כרגע, ולכן אין על מה לחשב.</b>{' '}
            המחשבון עובד על ההפקדות שרשמתם — <b>טיפלנו בזה</b>, ואפשר
            לנסות שוב בהמשך.
          </p>
        </div>
      )}

      {!setupNeeded && pos.length === 0 && (
        <div className="term">
          <p className="note">
            <b>אין עוד הפקדות רשומות.</b> רשמו הפקדה אחת בטאב ״התיק שלי״
            והמחשבון יתחיל לעבוד.
          </p>
        </div>
      )}

      {pos.length > 0 && (
        <>
          <div className="term cx-edit">
            <div className="grp">
              <span className="glab">דולר</span>
              <NumField value={usd} min={1} max={10} step={0.01} label="USD/ILS" unit="₪" onCommit={setUsd} />
              <span className="glab">אירו</span>
              <NumField value={eur} min={1} max={10} step={0.01} label="EUR/ILS" unit="₪" onCommit={setEur} />
              <span className="glab">לירה</span>
              <NumField value={gbp} min={1} max={10} step={0.01} label="GBP/ILS" unit="₪" onCommit={setGbp} />
            </div>
            <p className="note">
              השערים נדרשים לחישוב הסכום האינפלציוני. <b>הכניסו את השער
              של יום המשיכה</b> — הוא זה שקובע לפי סעיף 88.
              {marked < pos.length && (
                <> <b>ושימו לב:</b> ל-{pos.length - marked} מהרכיבים אין מחיר
                עדכני, והחישוב משתמש במחיר הממוצע שלהם — כלומר הוא
                מניח שאין בהם רווח.</>
              )}
            </p>
          </div>

          {!embedded && (
          <Card>
            <h3 className="text-[15px] font-bold text-gold-light mb-3">
              {embedded ? 'הנתונים שהחישוב רץ עליהם' : 'המשיכה של החודש'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                ['המסלול', track === 'flow' ? 'תזרים' : track === 'both' ? 'תזרים וצמיחה' : 'צמיחה'],
                ['שנה בתוכנית', String(planYear)],
                ['שיעור המשיכה', draw.rate ? `${(draw.rate * 100).toFixed(0)}% לשנה` : 'אין משיכה'],
                ['שווי התיק', `${n0(t.value)} ₪`],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5">
                  <p className="text-[9.5px] text-text-dim tracking-wide">{k}</p>
                  <p className="text-[14px] font-semibold text-text tabular-nums" dir="ltr">{v}</p>
                </div>
              ))}
            </div>
            {track === 'growth' && (
              <p className="note mt-3">
                <b>במסלול צמיחה אין משיכה לאורך התקופה.</b> המחשבון כאן
                מראה מה המס יהיה כשתמשכו — אפשר להזין סכום ידנית למטה.
              </p>
            )}
            {draw.nextStep !== null && (
              <p className="note mt-3">
                <b>עוד {draw.nextStep} שנים</b> שיעור המשיכה עולה מ-1% ל-4% לשנה.
              </p>
            )}
          </Card>
          )}

          {!embedded && (
            <>
          <div className="term cx-edit">
            <div className="grp">
              <span className="glab">למשוך החודש</span>
              <NumField value={gross} min={0} max={Math.max(1, Math.round(t.value))} step={1}
                label="סכום המשיכה" unit="₪" onCommit={setGross} />
            </div>
          </div>

          <Card glow>
            <h3 className="text-[15px] font-bold text-gold-light mb-3">מה תשלמו, ומה יגיע</h3>
            <div className="ptable">
              <table>
                <tbody>
                  <tr><td>המשיכה המבוקשת</td><td dir="ltr">{n0(t.gross)} ₪</td></tr>
                  <tr><td>מתוכה רווח ריאלי — <b>בסיס המס</b></td><td dir="ltr">{n0(t.taxableShare)} ₪</td></tr>
                  <tr><td><b>מס רווחי הון {pc(CGT)}</b></td>
                      <td dir="ltr" style={{ color: '#F87171' }}>−{n0(t.tax)} ₪</td></tr>
                  <tr><td><b>מגיע לחשבון</b></td>
                      <td dir="ltr" style={{ color: '#4ADE80', fontWeight: 700 }}>{n0(t.net)} ₪</td></tr>
                  <tr><td>שיעור המס מהמשיכה</td><td dir="ltr">{pc(t.effectiveRate)}</td></tr>
                </tbody>
              </table>
            </div>
            {t.saved > 0 && (
              <p className="note mt-3">
                <b>סעיף 88 חוסך לכם כאן {n0(t.saved)}₪.</b> לולא הכלל שקובע
                ששער החליפין הוא ה״מדד״, המס היה {n0(t.taxIfNominal)}₪ ולא{' '}
                {n0(t.tax)}₪ — כלומר <b>{pc(t.saved / Math.max(1, t.taxIfNominal))} מהמס</b>.
                ההפרש הוא עליית המטבע, <b>והיא אינה רווח לצורכי מס.</b>
              </p>
            )}
            {t.belowCost.length > 0 && (
              <p className="note mt-3">
                <b>{t.belowCost.join(', ')} מתחת למחיר העלות שלהם, ולכן לא נמכרים.</b>{' '}
                המשיכה נלקחת רק מהרכיבים שמעל העלות — זה מה שמונע ממשיכה
                לנעול הפסד. אם כל הרכיבים מתחת לעלות, <b>לא נמשך כלום.</b>
              </p>
            )}
          </Card>

            </>
          )}

          <Card>
            <h3 className="text-[15px] font-bold text-gold-light mb-3">
              הפירוק לפי רכיבי התיק
            </h3>
            <Rows
              cols={[
                { k: 'k', label: 'רכיב', lead: true },
                { k: 'value', label: 'שווי ₪', ltr: true, big: true },
                { k: 'invested', label: 'הופקד ₪', ltr: true },
                { k: 'nominal', label: 'רווח נומינלי', ltr: true },
                { k: 'infl', label: 'אינפלציוני', ltr: true, dim: true },
                { k: 'real', label: 'רווח ריאלי', ltr: true },
                { k: 'ccy', label: 'מטבע', ltr: true, dim: true },
              ]}
              rows={t.lines.map(l => ({
                id: l.k,
                cells: {
                  k: <b>{l.k}</b>,
                  ccy: l.ccy,
                  value: <>{n0(l.valueIls)}</>,
                  invested: n0(l.investedIls),
                  nominal: n0(l.gainNominal),
                  infl: n0(l.inflation),
                  real: <b>{n0(l.gainReal)}</b>,
                },
              }))}
              total={{ label: 'סך הכל, שווי התיק', value: `${n0(t.value)}₪` }}
            />

            <p className="note mt-3">
              <b>העמודה ״אינפלציוני״ היא מה שנובע משער החליפין בלבד</b> —
              והיא <b>אינה ממוסה</b>. הרווח הריאלי הוא ההפרש, והוא בסיס
              המס. מספר שלילי בעמודה הזאת פירושו שהמטבע נחלש, ואז הרווח
              הריאלי גדול מהנומינלי.
            </p>
          </Card>
        </>
      )}

      <div className="term">
        <p className="note">
          <b>מה לא נכלל בחישוב, במכוון.</b> <b>קיזוז הפסדים</b> לפי סעיף
          92 — המחשבון אינו יודע על הפסדים מניירות אחרים, ולכן הוא מציג
          את החבות לפני קיזוז. <b>מס יסף</b> של 3% לפי סעיף 121ב, שתלוי
          בכלל ההכנסות שלכם ולא בתיק הזה. <b>וניכוי במקור על דיבידנדים</b>{' '}
          אינו רלוונטי — כל הקרנות בקטלוג צוברות ואינן מחלקות.
        </p>
      </div>

      {!embedded && <Disclaimer />}
    </div>
  );
}
