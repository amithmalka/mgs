/** MGS · דף הכניסה — התיק שבחרת, וכמה להפקיד לאן החודש.
 *
 *  **אין כאן ברירת מחדל ואין הצעה.** מי שעוד לא בחר רואה הזמנה לבחור,
 *  ולא תיק מומצא. מי שבחר רואה בדיוק את שלו: כמה לקרן ההשתלמות, כמה
 *  לברוקר, וכמה לכל רכיב — בשקלים, עם הטיקר והבורסה.
 *
 *  מנגנון הקנייה עצמו (בשיא 10%, מתחת לשיא אחוז הירידה, והשארית
 *  לנופל העמוק ביותר) דורש מחירי שיא חיים, ולכן כאן מוצגת **חלוקה
 *  לפי המשקלות שנבחרו**. ההפעלה החודשית של המנגנון היא שלב נפרד.
 */
import { useMemo } from 'react';
import { useMgsStore } from '../../store/mgsStore';
import { IRISH, BUY, TIER_HE, mix, type Tier } from '../../constants/irish';
import { useMyPortfolio, totalWeight, cohortForAge } from '../../store/myPortfolio';
import { depositYearsFor, cohortLabel } from '../../utils/comboProject';
import { ceilingFor } from '../../constants/studyFunds';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

const TIER_DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };

export function MyPlanCard({ onBuild }: { onBuild?: () => void }) {
  const { holdings, deposit, extra, fundStatus, annualSalary, selfIncome } = useMyPortfolio();
  const age = useMgsStore(st => st.age);

  const tot = totalWeight(holdings);
  const m = useMemo(() => mix(holdings.map(h => ({ k: h.k, w: h.w }))), [holdings]);

  const ceilMo = fundStatus === 'none'
    ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
  const toFund = Math.min(deposit, ceilMo);
  const toBroker = Math.max(0, deposit - toFund) + extra;

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">התיק שלך</span>
        <h2>עוד לא בחרת רכיבים</h2>
        <p className="lede">
          <b>המערכת לא מציעה לך תיק, בכוונה.</b> כל רכיב בקטלוג נמדד —
          תשואה, תנודתיות, ומה הוא עושה לתיק שלם. <b>קודם מבינים, ואז בוחרים.</b>
        </p>
        <p>
          בדף ההרכבה הקרנות מחולקות לשלוש רמות יציבות, עם התפקיד של כל
          רמה. <b>הקו המנחה שנמדד: 2 עד 4 רכיבים</b>, אחד מכל רמה.
        </p>
        {onBuild && (
          <div className="cta">
            <button className="opt mp-go" type="button" onClick={onBuild}>
              לבחור את התיק שלי
            </button>
          </div>
        )}
      </section>
    );
  }

  const rows = holdings
    .map(h => ({ h, f: IRISH.find(x => x.k === h.k) }))
    .filter((r): r is { h: typeof holdings[0]; f: NonNullable<typeof r.f> } => !!r.f)
    .sort((a, b) => b.h.w - a.h.w);

  return (
    <>
      <section>
        <span className="eyebrow">התיק שלך</span>
        <h2>מה שבחרת, וכמה להפקיד החודש</h2>

        {(
          <p className="cm-horizon">
            <b>גיל {age} · קבוצה {cohortLabel(age, cohortForAge(age))}</b>
            {depositYearsFor(age, cohortForAge(age)).years > 0 ? (
              <> — מפקידים{' '}
                <b>{depositYearsFor(age, cohortForAge(age)).years} שנים</b>,
                עוצרים לגמרי בגיל{' '}
                <b>{depositYearsFor(age, cohortForAge(age)).stopAge}</b>,
                ומשם <b>משיכות בלבד</b>.
              </>
            ) : (
              <> — <b>שלב ההפקדות הסתיים</b>. מכאן התיק מיועד
                ל<b>משיכות בלבד</b>, ולא לצבירה.
              </>
            )}
          </p>
        )}

        <div className="stats">
          <Stat label="רכיבים" value={String(rows.length)}
            sub={rows.length >= 2 && rows.length <= 4 ? 'בטווח שנמדד' : rows.length < 2 ? 'מתחת לטווח — אין פיזור' : 'מעל הטווח שנמדד'}
            tone={rows.length >= 2 && rows.length <= 4 ? 'up' : undefined} />
          <Stat label="תשואה שנמדדה" value={sg(m.cagr)} sub="60 חודשים, בדולר" tone="gold" />
          <Stat label="תנודתיות" value={pc(m.vol, 0)}
            sub={`בלי פיזור היתה ${pc(m.naive, 0)}`} />
        </div>

        {deposit + extra > 0 && (
          <div className="bh-split">
            {toFund > 0 && (
              <div className="bh-part bh-fund" style={{ flexGrow: toFund }}>
                <b>קרן השתלמות</b>
                <span dir="ltr">{n0(toFund)}₪</span>
                <small>פטור מלא · החברה המנהלת בוחרת</small>
              </div>
            )}
            <div className="bh-part bh-broker" style={{ flexGrow: Math.max(toBroker, 1) }}>
              <b>לברוקר — לפי התיק שלך</b>
              <span dir="ltr">{n0(toBroker)}₪</span>
              <small>{rows.length} רכיבים</small>
            </div>
          </div>
        )}

        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הרכיב</th>
                <th>רמה</th>
                <th>משקל</th>
                {toBroker > 0 && <th>כמה החודש</th>}
                <th>טיקר</th>
                <th>בורסה</th>
                <th>מטבע</th>
                <th>תשואה</th>
                <th>תנודתיות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ h, f }) => {
                const b = BUY[f.k];
                const share = tot > 0 ? h.w / tot : 0;
                return (
                  <tr key={f.k}>
                    <td className="lead">{f.he}</td>
                    <td>
                      <span className={`lab-dot ${TIER_DOT[f.tier]}`} aria-hidden="true" />
                      {TIER_HE[f.tier]}
                    </td>
                    <td dir="ltr">{pc(share, 0)}</td>
                    {toBroker > 0 && (
                      <td dir="ltr" className="gold"><b>{n0(toBroker * share)}₪</b></td>
                    )}
                    <td dir="ltr" className="tk">{b ? b.sym : '—'}</td>
                    <td dir="ltr" className="dim">
                      {b ? (b.ex === 'LSE' ? 'LSEETF' : b.ex) : '—'}
                    </td>
                    <td dir="ltr">{b ? b.cur : '—'}</td>
                    <td dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</td>
                    <td dir="ltr">{pc(f.vol, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {deposit + extra === 0 && (
          <p className="lab-access warn">
            <b>עוד לא הזנת הפקדה חודשית</b>, ולכן אין סכומים לכל רכיב.
            הזינו אותה בדף ההרכבה והיא תופיע כאן.
          </p>
        )}
        {fundStatus === 'none' && deposit > 0 && (
          <p className="lab-access warn">
            <b>סימנת שאין לך קרן השתלמות.</b> כל ההפקדה חייבת 25% על
            הרווח הריאלי. אם יש אפשרות לפתוח — <b>זה שווה יותר מכל
            שיפור תמהיל שנמדד כאן</b>.
          </p>
        )}
        <p className="note">
          <b>הסכומים הם לפי המשקלות שבחרת.</b> מנגנון הקנייה — שמנתב
          את השארית לרכיב שנפל הכי עמוק — דורש מחירי שיא חיים,
          והפעלתו החודשית היא שלב נפרד. <b>אין באמור המלצה ואין בו
          ייעוץ פיננסי.</b>
        </p>
      </section>
    </>
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
