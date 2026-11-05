/** MGS · תזכורת ההפקדה החודשית.
 *
 *  **הכלי הזה היה בנוי ולא נגיש.** ה-service worker, ה-cron היומי של
 *  Vercel והטבלה ב-Supabase קיימים מזמן — אבל המסך היחיד שהפעיל
 *  אותם ישב בטאב שירד מהתפריט. כאן הוא חוזר למקום שבו הוא שייך:
 *  לצד התיק.
 *
 *  **איך זה עובד בפועל.** הדפדפן נותן למכשיר הזה מנוי דחיפה, המנוי
 *  נשמר עם יום בחודש, ו-cron שרץ כל בוקר ב-06:00 שולח למי שהיום
 *  הוא יומו — לפי שעון ישראל, לא לפי שעון השרת.
 *
 *  **ולמה עד 28.** ל-29, 30 ו-31 אין קיום בכל חודש, ותזכורת שלא
 *  מגיעה בפברואר גרועה מתזכורת ביום אחר.
 */
import { useCallback, useEffect, useState } from 'react';
import { Stat } from '../shared/Stat';
import { supabase } from '../../lib/supabase';
import {
  pushSupported, pushStatus, subscribeToPush, unsubscribeFromPush,
} from '../../lib/push';
import { useMyPortfolio } from '../../store/myPortfolio';
import { NumField } from './NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

export function DepositReminder({ toBroker }: { toBroker: number }) {
  const { deposit, setDeposit } = useMyPortfolio();
  const [day, setDay] = useState(() => {
    const v = Number(localStorage.getItem('mgs-deposit-day'));
    return v >= 1 && v <= 28 ? v : 1;
  });
  const [on, setOn] = useState(false);
  const [perm, setPerm] = useState<'unsupported' | 'denied' | 'granted' | 'default'>('default');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setPerm(await pushStatus());
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      if (pushSupported()) {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        setOn(!!sub);
      }
    })();
  }, []);

  const toggle = useCallback(async () => {
    if (!userId) { setMsg('צריך להתחבר לחשבון כדי להפעיל תזכורות.'); return; }
    setBusy(true); setMsg(null);
    const r = on
      ? await unsubscribeFromPush(userId)
      : await subscribeToPush(userId, day);
    if (r.ok) {
      setOn(!on);
      localStorage.setItem('mgs-deposit-day', String(day));
      setMsg(on ? 'התזכורת כובתה.' : `מעכשיו תקבלו תזכורת ב-${day} לכל חודש.`);
    } else {
      setMsg(r.reason);
    }
    setPerm(await pushStatus());
    setBusy(false);
  }, [on, day, userId]);

  /** שינוי היום כשהתזכורת כבר פעילה — נרשמים מחדש כדי לעדכן את השורה */
  const changeDay = useCallback(async (d: number) => {
    setDay(d);
    localStorage.setItem('mgs-deposit-day', String(d));
    if (on && userId) {
      setBusy(true);
      const r = await subscribeToPush(userId, d);
      setMsg(r.ok ? `התזכורת עודכנה ל-${d} לכל חודש.` : r.reason);
      setBusy(false);
    }
  }, [on, userId]);

  return (
    <section className="dr">
      <span className="eyebrow">תזכורת</span>
      <h2>שלא תשכחו להפקיד</h2>
      <p className="lede">
        <b>ההפקדה החודשית היא כל המנגנון.</b> בוחרים יום בחודש,
        והמערכת שולחת התראה למכשיר הזה — גם כשהאתר סגור.
      </p>

      <div className="grp">
        <span className="glab">יום בחודש</span>
        <NumField value={day} min={1} max={28} label="יום בחודש"
          unit="בחודש" onCommit={changeDay} />
        <span className="glab">סכום ההפקדה</span>
        <NumField value={deposit} min={0} max={200000} label="הפקדה חודשית"
          unit="₪" onCommit={setDeposit} width={100} />
        <button className={`opt ${on ? '' : 'mp-go'}`} type="button"
          disabled={busy || perm === 'unsupported'} onClick={() => void toggle()}>
          {busy ? 'רגע…' : on ? 'לכבות את התזכורת' : 'להפעיל תזכורת'}
        </button>
      </div>

      <div className="stats">
        <Stat label="מצב" value={on ? 'פעילה' : 'כבויה'}
          sub={on ? `ב-${day} לכל חודש, 06:00` : 'לא תישלח התראה'}
          tone={on ? 'up' : undefined} />
        <Stat label="לברוקר כל חודש" value={`${n0(toBroker)}₪`}
          sub="אחרי תקרת קרן ההשתלמות" tone="gold" />
      </div>

      {msg && <p className={`lab-access ${on ? '' : 'warn'}`}>{msg}</p>}

      {perm === 'unsupported' && (
        <p className="lab-access warn">
          <b>הדפדפן הזה אינו תומך בהתראות דחיפה.</b> באייפון זה עובד רק
          אחרי <b>הוספה למסך הבית</b> — שיתוף ← הוספה למסך הבית, ואז
          לפתוח את MGS משם.
        </p>
      )}
      {perm === 'denied' && (
        <p className="lab-access warn">
          <b>ההתראות חסומות לאתר הזה בדפדפן.</b> צריך לאשר אותן
          בהגדרות האתר בדפדפן ואז לנסות שוב — אנחנו לא יכולים לבקש
          שוב אחרי סירוב.
        </p>
      )}
      {!userId && (
        <p className="lab-access warn">
          <b>צריך להיות מחוברים לחשבון</b> כדי שהתזכורת תישמר למכשיר.
        </p>
      )}

      <p className="note">
        <b>התזכורת נשמרת למכשיר הזה בלבד.</b> מי שרוצה גם בטלפון וגם
        במחשב — מפעיל בשניהם. <b>היום מוגבל ל-28</b> כי ל-29–31 אין
        קיום בכל חודש, ותזכורת שלא מגיעה בפברואר גרועה מתזכורת ביום אחר.
      </p>
    </section>
  );
}

