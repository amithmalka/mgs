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
import { useMemo, useState } from 'react';
import { Rows } from '../shared/Rows';
import { NumField } from './NumField';
import { Icon } from '../shared/Icon';
import { Stat } from '../shared/Stat';
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
  const { holdings, deposit, extra, fundStatus, annualSalary, selfIncome,
    setDeposit, setExtra } = useMyPortfolio();
  const age = useMgsStore(st => st.age);
  const setAge = useMgsStore(st => st.setAge);
  /** **ההנחות נערכות כאן, ולא בפס שרחף מעל כל מסך.**
   *
   *  ‏`ContextBar` הציג גיל / קבוצה / שלב / שנות הפקדה בראש **כל**
   *  מסך, כולל מסכים שאין להם קשר אליהם, והעריכה שלו פתחה פאנל
   *  נוסף מעל הדף. ההנחות האלה הן של ״התיק שלי״ — זה המסך שמציג
   *  אותן ממילא, ולכן זה המסך שמשנה אותן. */
  const [edit, setEdit] = useState(false);

  const tot = totalWeight(holdings);
  const m = useMemo(() => mix(holdings.map(h => ({ k: h.k, w: h.w }))), [holdings]);

  const ceilMo = fundStatus === 'none'
    ? 0 : ceilingFor(fundStatus, annualSalary, selfIncome).year / 12;
  const toFund = Math.min(deposit, ceilMo);
  const toBroker = Math.max(0, deposit - toFund) + extra;

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">התיק שלכם</span>
        <h2>עוד לא בחרתם רכיבים</h2>
        <p className="lede">
          <b>המערכת לא מציעה לכם תיק, בכוונה.</b> כל רכיב בקטלוג נמדד —
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
        <span className="eyebrow">התיק שלכם</span>
        <h2>מה שבחרתם, וכמה להפקיד החודש</h2>

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
            {' '}
            <button className="mp-edit" type="button" onClick={() => setEdit(o => !o)}>
              <Icon name="pencil" size={10} /> {edit ? 'סגירה' : 'עריכה'}
            </button>
          </p>
        )}

        {edit && (
          <div className="term cx-edit">
            <div className="grp">
              <span className="glab">גיל</span>
              <NumField value={age} min={18} max={75} label="גיל" unit="שנים" onCommit={setAge} />
              <span className="glab">הפקדה חודשית</span>
              <NumField value={deposit} min={0} max={200000} step={50}
                label="הפקדה חודשית" unit="₪" onCommit={setDeposit} />
              <span className="glab">סכום נוסף</span>
              <NumField value={extra} min={0} max={1000000} step={50}
                label="סכום נוסף" unit="₪" onCommit={setExtra} />
            </div>
            <p className="note">
              <b>הגיל וההפקדה מסתנכרנים מיד בכל המסכים</b> — קבוצת הגיל,
              אופק ההפקדות, החלוקה לקרן ההשתלמות, וכמה לקנות מכל רכיב.
              את <b>הרכיבים עצמם</b> בוחרים בדף ההרכבה.
            </p>
          </div>
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

        {/* **כרטיסים ולא טבלה כשיש עד שלושה רכיבים.** תשע עמודות
            ושני רכיבים נשברו בעברית: הסכום והטיקר נדבקו
            (``2,400₪XLKS``) והכותרות לא התיישרו עם התאים. ‏`Rows`
            מכריע לפי מספר השורות בזמן הריצה, ולכן תיק של חמישה
            רכיבים יחזור להיות טבלה מעצמו. */}
        <Rows
          cols={[
            { k: 'he', label: 'הרכיב', lead: true },
            ...(toBroker > 0
              ? [{ k: 'amt', label: 'כמה החודש', ltr: true, big: true }]
              : [{ k: 'w', label: 'משקל', ltr: true, big: true }]),
            ...(toBroker > 0 ? [{ k: 'w', label: 'משקל', ltr: true }] : []),
            { k: 'tier', label: 'רמה' },
            { k: 'cagr', label: 'תשואה', ltr: true },
            { k: 'vol', label: 'תנודתיות', ltr: true },
            { k: 'tk', label: 'טיקר', ltr: true },
            { k: 'ex', label: 'בורסה', ltr: true, dim: true },
            { k: 'cur', label: 'מטבע', ltr: true },
          ]}
          rows={rows.map(({ h, f }) => {
            const b = BUY[f.k];
            const share = tot > 0 ? h.w / tot : 0;
            return {
              id: f.k,
              cells: {
                he: f.he,
                tier: <>
                  <span className={`lab-dot ${TIER_DOT[f.tier]}`} aria-hidden="true" />
                  {TIER_HE[f.tier]}
                </>,
                w: pc(share, 0),
                amt: <>{n0(toBroker * share)}₪</>,
                tk: b ? <span className="tk">{b.sym}</span> : '—',
                ex: b ? (b.ex === 'LSE' ? 'LSEETF' : b.ex) : '—',
                cur: b ? b.cur : '—',
                cagr: <span className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</span>,
                vol: pc(f.vol, 0),
              },
            };
          })}
          total={toBroker > 0
            ? { label: 'סך הכל לברוקר החודש', value: `${n0(toBroker)}₪` }
            : undefined}
        />

        {deposit + extra === 0 && (
          <p className="lab-access warn">
            <b>עוד לא הזנתם הפקדה חודשית</b>, ולכן אין סכומים לכל רכיב.
            לחצו על ״עריכה״ למעלה והזינו אותה.
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

