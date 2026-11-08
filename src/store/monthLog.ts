/** **מה קרה בכל חודש — כולל החודשים שבהם לא קרה כלום.**
 *
 *  **וזו כל הסיבה שהחנות הזאת קיימת.** יומן ההפקדות ב-Supabase הוא
 *  טבלת שורות: הפקדתם — יש שורה, לא הפקדתם — אין. ולכן **״אין שורה״
 *  דו־משמעי**: אפשר שהחודש עוד לא הגיע, ואפשר שהחודש הגיע והוחלט
 *  במפורש לא להפקיד. התזכורת צריכה להבדיל בין השניים, אחרת היא
 *  תנדנד למי שכבר ענה.
 *
 *  לכן כאן נשמרת **הכרעה** לכל חודש, לא סכום: הופקד / לא הופקד /
 *  נמשך / לא נמשך / נדחה לתאריך. הסכומים עצמם ממשיכים להיכתב
 *  ל-`mgs_deposits` ול-`mgs_withdrawals` — הם מקור האמת ליחידות
 *  ולעלות, והיומן הזה לא מחליף אותם אלא אומר **מה הוחלט**.
 *
 *  **נשמר בדפדפן בלבד, בכוונה לעת עתה.** החלופה היא טבלה חדשה
 *  ב-Supabase, ושם צריכה להיות גם הרשאה וגם הרצת SQL — ועד שהיא
 *  קיימת, מסך שתלוי בה פשוט לא יעבוד. localStorage עובד מיד, ומה
 *  שנשמר בו הוא הכרעה ולא כסף: אם הוא נמחק, הנתונים הכספיים
 *  שלמים ורק התזכורת תשאל שוב.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Decision = 'done' | 'skipped';

export interface MonthEntry {
  /** 'YYYY-MM' */
  month: string;
  /** ההפקדה: בוצעה, או נדחתה במפורש */
  deposit?: {
    decision: Decision;
    at: string;
    /** הסכום שהופקד בפועל — 0 כשדווח שלא הופקד */
    amount: number;
    /** החלוקה כפי שאושרה, כדי שאפשר יהיה להראות מה נקנה */
    lines?: Array<{ k: string; ils: number; units: number | null; px: number | null }>;
    note?: string;
  };
  /** והמשיכה, באותו מבנה */
  withdraw?: {
    decision: Decision;
    at: string;
    gross: number; tax: number; net: number;
    lines?: Array<{ k: string; ils: number; units: number | null; px: number | null }>;
    note?: string;
  };
  /** עד מתי התזכורת שותקת — תאריך 'YYYY-MM-DD' */
  snoozeUntil?: string;
  /** **מתי הפופאפ כבר נשאל החודש.** בלי זה הוא נפתח בכל טעינה
   *  מחדש של הדף, וזה נדנוד: מי שפתח את המערכת חמש פעמים בלי
   *  להכריע ראה אותו חמש פעמים. עם זה הוא נפתח **פעם אחת בחודש**,
   *  ושוב רק כשהמשתמשים ביקשו — דחייה שהגיע תאריכה, או לחיצה על
   *  התזכורת עצמה. */
  askedAt?: string;
}

interface MonthLogState {
  entries: Record<string, MonthEntry>;
  confirmDeposit: (month: string, amount: number,
    lines: NonNullable<MonthEntry['deposit']>['lines']) => void;
  skipDeposit: (month: string, note?: string) => void;
  confirmWithdraw: (month: string, gross: number, tax: number, net: number,
    lines: NonNullable<MonthEntry['withdraw']>['lines']) => void;
  skipWithdraw: (month: string, note?: string) => void;
  snooze: (month: string, days: number) => void;
  markAsked: (month: string) => void;
  clearMonth: (month: string) => void;
}

const patch = (s: MonthLogState, month: string, p: Partial<MonthEntry>) => ({
  entries: { ...s.entries, [month]: { ...s.entries[month], ...p, month } },
});

export const useMonthLog = create<MonthLogState>()(
  persist(
    (set) => ({
      entries: {},
      confirmDeposit: (month, amount, lines) => set(s => patch(s, month, {
        deposit: { decision: 'done', at: new Date().toISOString(), amount, lines },
        snoozeUntil: undefined,
      })),
      skipDeposit: (month, note) => set(s => patch(s, month, {
        deposit: { decision: 'skipped', at: new Date().toISOString(), amount: 0, note },
        snoozeUntil: undefined,
      })),
      confirmWithdraw: (month, gross, tax, net, lines) => set(s => patch(s, month, {
        withdraw: { decision: 'done', at: new Date().toISOString(), gross, tax, net, lines },
      })),
      skipWithdraw: (month, note) => set(s => patch(s, month, {
        withdraw: { decision: 'skipped', at: new Date().toISOString(), gross: 0, tax: 0, net: 0, note },
      })),
      snooze: (month, days) => set(s => patch(s, month, {
        snoozeUntil: isoDay(addDays(new Date(), days)),
        // הדחייה מאפסת את ״כבר נשאל״, כי זו בדיוק הבקשה לשאול שוב
        askedAt: undefined,
      })),
      markAsked: (month) => set(s => patch(s, month, { askedAt: new Date().toISOString() })),
      clearMonth: (month) => set(s => {
        const next = { ...s.entries };
        delete next[month];
        return { entries: next };
      }),
    }),
    { name: 'mgs-month-log' },
  ),
);

export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** **האם לשאול על ההפקדה עכשיו — וכמה פעמים.**
 *
 *  **הוכרע ⇒ לא שואלים, נקודה.** מי שאמר ״הפקדתי״ או ״לא אפקיד
 *  החודש״ ענה, והשאלה סגורה עד החודש הבא.
 *
 *  **ואם לא הוכרע — פעם אחת בחודש.** ‏`askedAt` חוסם את הפתיחות
 *  הבאות, כי פופאפ שחוזר בכל טעינה נסגר אוטומטית בעין ולא נקרא.
 *
 *  **ושוב רק כשביקשו:** לחיצה על התזכורת (`fromPush`) או דחייה
 *  שהגיע תאריכה — שתיהן **בקשה מפורשת** לשאול שוב, ולכן הן עוקפות
 *  את `askedAt`. ‏`fromPush` גם עוקף את תאריך ההפקדה, כי התזכורת
 *  עשויה להיפתח למחרת. */
export function shouldAsk(
  entry: MonthEntry | undefined, depositDay: number,
  fromPush: boolean, ref = new Date(),
): boolean {
  if (entry?.deposit) return false;

  const today = isoDay(ref);
  // דחייה שעוד בתוקף משתיקה הכל; דחייה שתאריכה הגיע היא הבקשה עצמה
  if (entry?.snoozeUntil) {
    if (today < entry.snoozeUntil) return false;
    return true;
  }
  if (fromPush) return true;
  if (entry?.askedAt) return false;
  return ref.getDate() >= Math.min(28, Math.max(1, depositDay));
}
