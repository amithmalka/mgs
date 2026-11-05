/** MGS · ראש דף ההרכבה והקנייה — כמה כסף בכלל מגיע לברוקר, ומה יש בדף.
 *
 *  **הבעיה שזה פותר.** המעבדה חישבה תמיד על מלוא ההפקדה, כאילו הכל
 *  הולך לברוקר. אבל מי שיש לו קרן השתלמות מפנה אליה את התקרה תחילה —
 *  ורק **העודף** מגיע לקטלוג האירי. בלי זה, כל מספר בדף מתאר תיק
 *  גדול משהוא באמת.
 *
 *  **ושלושה מצבים, לא שניים:**
 *  · קרן השתלמות פעילה — התקרה נכנסת אליה, העודף לברוקר.
 *  · **בלי קרן השתלמות** — הכל לברוקר. זה המצב של מי שאין לו, ושל
 *    שכיר שהמעסיק שלו אינו מפקיד.
 *  · **יש קרן ומעבר לה יש עוד** — התקרה מלאה, והעודף הוא סכום
 *    בלתי מבוטל שצריך להרכיב לו תיק משלו. זה הרוב.
 */
import { CEILINGS, exemptCeiling } from '../../constants/studyFunds';
import { useMyPortfolio, type FundStatus } from '../../store/myPortfolio';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

type Mode = FundStatus;
const MODE_HE: Record<Mode, string> = {
  none: 'בלי קרן השתלמות',
  employee: 'קרן כשכיר',
  self: 'קרן כעצמאי',
  both: 'שכיר וגם עצמאי',
};
const MODE_SUB: Record<Mode, string> = {
  none: 'כל ההפקדה לברוקר',
  employee: `תקרה ${n0(CEILINGS.empExempt / 12)}₪ לחודש`,
  self: `תקרה ${n0(CEILINGS.selfExempt / 12)}₪ לחודש`,
  both: `תקרה ${n0((CEILINGS.empExempt + CEILINGS.selfExempt) / 12)}₪ לחודש`,
};

/** מה יש בדף — כדי שלא צריך לגלול עד הסוף כדי לדעת */
const MAP: Array<{ he: string; what: string }> = [
  { he: 'סדר הגישה', what: 'מה נקנה בשקלים בת״א, מה דורש ברוקר זר, ומה הוצא' },
  { he: 'ניתוב מול בחירה', what: 'מה עדיף — לחלק על הכל לפי המנגנון, או לבחור 2–4' },
  { he: 'סולם התשואות', what: 'לכל רמת תנודתיות, מה הניב הכי הרבה — עם הטיקר' },
  { he: 'המעבדה', what: 'מסמנים קרנות ומשקלות, ורואים מיד מה זה עושה' },
  { he: 'שערים חיים', what: 'לאמת שאתם על הנייר הנכון לפני ששולחים פקודה' },
  { he: 'איך מוצאים באינטראקטיב', what: 'ISIN, בורסה ומטבע לכל קרן' },
  { he: 'ממונפות', what: 'בטאב נפרד ואדום. לא נכללות בשום חישוב' },
];

export function BuyHeader() {
  const {
    fundStatus: mode, setFundStatus: setMode,
    deposit, setDeposit, extra, setExtra,
  } = useMyPortfolio();

  const ceilMo = mode === 'none' ? 0 : exemptCeiling(mode) / 12;
  const toFund = Math.min(deposit, ceilMo);
  const toBroker = Math.max(0, deposit - toFund) + extra;
  const share = deposit + extra > 0 ? toBroker / (deposit + extra) : 0;

  return (
    <>
      <section>
        <span className="eyebrow">הרכבה וקנייה</span>
        <h1>כמה מגיע לברוקר, ומה מרכיבים איתו</h1>
        <p className="lede">
          <b>קרן השתלמות קודמת תמיד</b> — הרווח בה פטור לחלוטין אחרי שש
          שנים, ואין שיקול השקעתי שמתחרה בזה. ולכן הקטלוג האירי שבדף
          הזה חל על <b>העודף בלבד</b>, ולא על מלוא ההפקדה.
        </p>

        <div className="chips">
          {(Object.keys(MODE_HE) as Mode[]).map(m => (
            <button key={m} className="opt bh-mode" type="button"
              aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODE_HE[m]}
              <small>{MODE_SUB[m]}</small>
            </button>
          ))}
        </div>

        <div className="grp">
          <span className="glab">הפקדה חודשית</span>
          <label className="own">
            <input className="amt" type="number" min={0} max={200000} step={100}
              value={deposit} aria-label="הפקדה חודשית"
              onChange={e => setDeposit(Math.max(0, Number(e.target.value) || 0))} />
            <span>₪</span>
          </label>
          <span className="glab">סכום נוסף להשקעה</span>
          <label className="own">
            <input className="amt" type="number" min={0} max={1000000} step={500}
              value={extra} aria-label="סכום חודשי נוסף מעבר להפקדה"
              onChange={e => setExtra(Math.max(0, Number(e.target.value) || 0))} />
            <span>₪</span>
          </label>
        </div>

        <div className="bh-split" role="img"
          aria-label={`${n0(toFund)} שקלים לקרן השתלמות, ${n0(toBroker)} לברוקר`}>
          {toFund > 0 && (
            <div className="bh-part bh-fund" style={{ flexGrow: toFund }}>
              <b>קרן השתלמות</b>
              <span dir="ltr">{n0(toFund)}₪</span>
              <small>פטור מלא</small>
            </div>
          )}
          <div className="bh-part bh-broker" style={{ flexGrow: Math.max(toBroker, 1) }}>
            <b>ברוקר — זה מה שמרכיבים כאן</b>
            <span dir="ltr">{n0(toBroker)}₪</span>
            <small>{toBroker > 0 ? '25% על הרווח הריאלי' : 'הכל נכנס לפטור'}</small>
          </div>
        </div>

        {mode === 'none' && (
          <p className="lab-access warn">
            <b>בלי קרן השתלמות, כל ההפקדה חייבת במס.</b> על 30 שנה
            בהפקדה של {n0(deposit)}₪ זה הפרש של מאות אלפי שקלים מול מי
            שממלא את התקרה. אם יש אפשרות לפתוח — <b>זה לפני כל החלטת
            השקעה בדף הזה</b>. שכיר אינו יכול לפתוח ללא מעסיק מפקיד;
            עצמאי כן, ומהשקל הראשון.
          </p>
        )}
        {mode !== 'none' && toBroker === 0 && (
          <p className="lab-access ok">
            <b>כל ההפקדה נכנסת לתקרה המוטבת.</b> אין עודף לברוקר, ולכן
            הקטלוג בדף הזה אינו רלוונטי כרגע — <b>בקרן השתלמות רגילה
            החברה המנהלת בוחרת את הניירות</b>, לא אתם. הוא יהפוך
            לרלוונטי כשתהיה הפקדה מעל התקרה.
          </p>
        )}
        {toBroker > 0 && (
          <p className="note">
            <b>{Math.round(share * 100)}% מהכסף מגיע לברוקר</b> — וזה
            הסכום שכל מספר בדף הזה מתייחס אליו. התמהילים, הסולם
            והמעבדה כולם חלים עליו בלבד.
          </p>
        )}
      </section>

      <section>
        <h2>מה יש בדף — לפי הסדר</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr><th className="lead">החלק</th><th>על מה הוא עונה</th></tr>
            </thead>
            <tbody>
              {MAP.map((m, i) => (
                <tr key={m.he}>
                  <td className="lead">
                    <span className="bh-num">{i + 1}</span>{m.he}
                  </td>
                  <td>{m.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>והקו המנחה, שנמדד:</b> לבחור <b>2 עד 4 תעודות</b>, אחת מכל
          רמת יציבות. הקפיצה מרכיב אחד לשניים שווה <b>פי שמונה</b>
          מהקפיצה מ-2 ל-3, ומעבר לארבעה הפיזור כבר לא מוסיף —
          התנודתיות נעצרת על 16%–17% בין אם יש ארבע קרנות או עשרים
          ושלוש. <b>ולחלק על הכל לפי המנגנון יצא גרוע</b> מלבחור, בכל
          שלושת המבחנים שנעשו מחוץ למדגם.
        </p>
      </section>
    </>
  );
}
