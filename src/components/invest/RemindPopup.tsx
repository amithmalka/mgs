/** **הפופאפ שנפתח מהתזכורת — ושואל שאלה אחת.**
 *
 *  **הזרימה, מקצה לקצה.** ב-06:00 שעון ישראל ה-cron שולח דחיפה
 *  למי שהיום הוא יום ההפקדה שלו. הדחיפה פותחת את המערכת על
 *  `#tax?remind=1`, והפרמטר הזה הוא מה שאומר למסך **שהמשתמש הגיע
 *  מהתזכורת** — ולכן מותר לשאול גם אם היום בחודש עוד לא הגיע
 *  (למשל אם הדחיפה נפתחה למחרת). שלוש תשובות:
 *
 *  · **להפקיד עכשיו** — הפופאפ נסגר וגולל לכרטיס ההפקדה.
 *  · **בעוד 5 ימים / בעוד 10 ימים** — התזכורת שותקת עד אז, **וגם
 *    בשרת**: בלי `snoozePush` לא תישלח תזכורת חוזרת וה״בעוד חמישה
 *    ימים״ היה נשאר הבטחה ריקה.
 *
 *  **ולמה הוא לא נפתח כל פעם.** `shouldAsk` דורש שלושה תנאים
 *  יחד — החודש עוד לא הוכרע, התאריך הגיע (או שבאנו מהתזכורת), ואין
 *  דחייה בתוקף. בלעדיהם זה נדנוד, ומסך שמנדנד נסגר ולא נקרא.
 */
import { useEffect, useState } from 'react';
import { useMonthLog, shouldAsk, isoDay, addDays } from '../../store/monthLog';
import { thisMonth } from '../../store/planStore';
import { snoozePush } from '../../lib/push';
import { supabase } from '../../lib/supabase';

const DAY_KEY = 'mgs-deposit-day';

function depositDay(): number {
  try {
    const v = Number(localStorage.getItem(DAY_KEY));
    return Number.isFinite(v) && v >= 1 ? Math.min(28, Math.round(v)) : 1;
  } catch { return 1; }
}

/** האם הגענו מהתזכורת — והפרמטר מנוקה מהכתובת כדי שרענון לא יפתח שוב */
function cameFromPush(): boolean {
  const u = new URL(window.location.href);
  const hit = u.searchParams.get('remind') === '1';
  if (hit) {
    u.searchParams.delete('remind');
    window.history.replaceState({}, '', u.toString());
  }
  return hit;
}

export function RemindPopup({ amount }: { amount: number }) {
  const month = thisMonth();
  const entry = useMonthLog(s => s.entries[month]);
  const snooze = useMonthLog(s => s.snooze);
  const skipDeposit = useMonthLog(s => s.skipDeposit);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const fromPush = cameFromPush();
    // **ואם אין תוכנית, אין מה לשאול.** משתמש שעוד לא בחר תיק, או
    // שההפקדה שלו כולה נכנסת לקרן ההשתלמות, יקבל פופאפ על אפס שקלים
    // — וזה בדיוק הנדנוד שהמסך הזה אמור להימנע ממנו.
    if (amount <= 0) return;
    if (shouldAsk(entry, depositDay(), fromPush)) setOpen(true);
    // פעם אחת בטעינה. שינוי בהכרעה סוגר דרך הענף שלמטה, לא דרך כאן.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open || entry?.deposit) return null;

  const later = async (days: number) => {
    snooze(month, days);
    setOpen(false);
    // והדחייה גם בשרת, אחרת לא תישלח תזכורת חוזרת
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    const res = await snoozePush(id, isoDay(addDays(new Date(), days)));
    if (!res.ok) setNote(res.reason);
  };

  const now = () => {
    setOpen(false);
    document.getElementById('deposit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="rp-wrap" role="dialog" aria-modal="true" aria-labelledby="rp-h" dir="rtl">
      <div className="rp">
        <span className="eyebrow">תזכורת ההפקדה</span>
        <h3 id="rp-h">זה החודש להפקיד</h3>
        <p>
          התוכנית אומרת <b>{Math.round(amount).toLocaleString('en-US')}₪</b> החודש.
          אפשר לאשר עכשיו, או שנזכיר שוב בעוד כמה ימים —{' '}
          <b>והחודש לא ייחשב כמפוספס</b> עד שתכריעו.
        </p>
        <div className="rp-btns">
          <button className="opt rp-go" type="button" onClick={now}>להפקיד עכשיו</button>
          <button className="opt" type="button" onClick={() => void later(5)}>להזכיר בעוד 5 ימים</button>
          <button className="opt" type="button" onClick={() => void later(10)}>בעוד 10 ימים</button>
        </div>
        <button className="rp-skip" type="button"
          onClick={() => { skipDeposit(month); setOpen(false); }}>
          לא אפקיד החודש
        </button>
        {note && <p className="rp-note">{note}</p>}
      </div>
    </div>
  );
}
