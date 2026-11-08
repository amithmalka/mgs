/** MGS · התיק שהמשקיע בחר לעצמו.
 *
 *  **אין ברירת מחדל, בכוונה.** המערכת אינה מציעה שבבים, טכנולוגיה או
 *  כל רכיב אחר כנקודת פתיחה. המשקיע עובר על הקטלוג, מבין מה כל רכיב
 *  עושה — תשואה, תנודתיות, נפילה, ומה הוא עושה לתיק — **ואז בוחר**.
 *
 *  מה שנשמר כאן הוא מה שהוא בחר, וממנו נגזר דף הכניסה: כמה להפקיד,
 *  לאן, וכמה לכל רכיב החודש.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IRISH, BUY } from '../constants/irish';

/** **הרכיבים שאפשר להחזיק בפועל** — יש להם גם מקום בקטלוג וגם שורת
 *  קנייה. מי שאין לו את שניהם אינו ניתן לקנייה, ולכן אין משמעות
 *  להחזיק אותו. */
const BUYABLE = new Set(IRISH.filter(f => BUY[f.k]).map(f => f.k));

/** **מנקה מהתיק הנשמר רכיבים שהקטלוג כבר לא מכיר.**
 *
 *  התיק נשמר ב-localStorage, והקטלוג מצטמצם עם הזמן: קרנות שהוסרו
 *  (למשל GDX, שירדה כשהקטלוג ירד לשמונה קרנות) **נשארו בתיק של מי
 *  שבחר אותן פעם.** מה שראינו על המסך היה שורה עם מפתח עירום, בלי
 *  שם בעברית, בלי סימול ובלי מטבע — ושום מחיר, כי אין לה שורת קנייה.
 *
 *  הניקוי כאן ולא במסך: המשקלות מנורמלות בשימוש (`totalWeight`),
 *  ולכן הסרת רכיב **מחלקת מחדש את המשקל שלו בין השאר באופן יחסי**
 *  מעצמה — תיק של 60/20/20 שאיבד את ה-20 הופך ל-60/20 ומחולק
 *  75/25. לא נדרשת שום פעולה מהמשתמשים. */
const prune = (h: Holding[]): Holding[] => h.filter(x => BUYABLE.has(x.k));

/** מעמד לעניין קרן השתלמות. 'none' = אין קרן, הכל לברוקר. */
export type FundStatus = 'none' | 'employee' | 'self' | 'both';

export interface Holding {
  /** מפתח בקטלוג האירי */
  k: string;
  /** משקל יחסי. הסכום אינו חייב להיות 100 — הוא מנורמל בשימוש. */
  w: number;
}

interface MyPortfolioState {
  /** הרכיבים שנבחרו. ריק = עדיין לא נבחר דבר. */
  holdings: Holding[];
  /** האם המשקיע סיים לבחור, או עדיין מתנסה */
  chosen: boolean;
  /** הפקדה חודשית שוטפת */
  deposit: number;
  /** סכום חודשי נוסף מעבר להפקדה */
  extra: number;
  fundStatus: FundStatus;
  /** שכר שנתי כשכיר — משפיע רק על גובה הניכוי כשיש שתי קרנות */
  annualSalary: number;
  /** ההכנסה הקובעת כעצמאי, לשנה — קובעת את תקרת ההפקדה */
  selfIncome: number;
  /** **הגיל אינו נשמר כאן.** הוא יושב ב-mgsStore, שהוא המקור היחיד
   *  למערכת כולה — הפס העליון, האונבורדינג והתחזיות קוראים ממנו.
   *  שתי חנויות גיל נפרדות ייצרו סתירה על המסך. */
  /** הגוף שבו נפתחה קרן ההשתלמות, לאישורי ההפקדה */
  fundProvider: string | null;

  setHoldings: (h: Holding[]) => void;
  setWeight: (k: string, w: number) => void;
  toggle: (k: string) => void;
  clear: () => void;
  confirm: () => void;
  setDeposit: (v: number) => void;
  setExtra: (v: number) => void;
  setFundStatus: (s: FundStatus) => void;
  setAnnualSalary: (v: number) => void;
  setSelfIncome: (v: number) => void;
  setFundProvider: (v: string | null) => void;
}

export const useMyPortfolio = create<MyPortfolioState>()(
  persist(
    (set) => ({
      holdings: [],
      chosen: false,
      deposit: 0,
      extra: 0,
      fundStatus: 'none',
      annualSalary: 0,
      selfIncome: 0,
      fundProvider: null,

      setHoldings: (holdings) => set({ holdings }),
      setWeight: (k, w) => set(s => ({
        holdings: w <= 0
          ? s.holdings.filter(h => h.k !== k)
          : s.holdings.some(h => h.k === k)
            ? s.holdings.map(h => (h.k === k ? { ...h, w } : h))
            : [...s.holdings, { k, w }],
      })),
      toggle: (k) => set(s => ({
        holdings: s.holdings.some(h => h.k === k)
          ? s.holdings.filter(h => h.k !== k)
          : [...s.holdings, { k, w: 10 }],
      })),
      clear: () => set({ holdings: [], chosen: false }),
      confirm: () => set({ chosen: true }),
      setDeposit: (deposit) => set({ deposit: Math.max(0, deposit) }),
      setExtra: (extra) => set({ extra: Math.max(0, extra) }),
      setFundStatus: (fundStatus) => set({ fundStatus }),
      setAnnualSalary: (annualSalary) => set({ annualSalary: Math.max(0, annualSalary) }),
      setSelfIncome: (selfIncome) => set({ selfIncome: Math.max(0, selfIncome) }),
      setFundProvider: (fundProvider) => set({ fundProvider }),
    }),
    {
      name: 'mgs-my-portfolio',
      version: 2,
      // גרסה 2: ניקוי רכיבים שאינם בקטלוג
      migrate: (state) => {
        const s = state as Partial<MyPortfolioState> | undefined;
        if (!s?.holdings?.length) return s as MyPortfolioState;
        const kept = prune(s.holdings);
        if (kept.length !== s.holdings.length) {
          const gone = s.holdings.filter(x => !BUYABLE.has(x.k)).map(x => x.k);
          console.info('[mgs] dropped holdings no longer in the catalogue:', gone.join(', '));
        }
        // **ואם לא נשאר כלום — התיק חוזר להיות ״לא נבחר״.** להשאיר
        // `chosen: true` עם רשימה ריקה היה מציג ״התיק שלכם״ ריק
        // במקום ההזמנה לבחור.
        return { ...s, holdings: kept, chosen: kept.length > 0 && s.chosen } as MyPortfolioState;
      },
      // ומי שכבר עבר את המיגרציה ובינתיים הקטלוג השתנה שוב
      onRehydrateStorage: () => (st) => {
        if (!st?.holdings?.length) return;
        const kept = prune(st.holdings);
        if (kept.length !== st.holdings.length) {
          st.setHoldings(kept);
          if (!kept.length) st.clear?.();
        }
      },
    },
  ),
);

/** איזה מסלול מתאים לגיל — ולמה.
 *
 *  **ההיגיון אינו ״צעיר = מסוכן״** אלא כמה זמן יש להתאושש מנפילה.
 *  בחלון שנמדד, תמהיל ברמת ״צמיחה״ ספג נפילה של 27%–35%. מי שיש לו
 *  עשרים שנה קדימה יכול לשבת על נפילה כזאת; מי שמתחיל למשוך בעוד
 *  חמש — ימשוך מתוך הנפילה וינעל אותה.
 *
 *  **וזו הצעה, לא קביעה.** אדם בן 30 שיצטרך את הכסף בעוד שלוש שנים
 *  שייך ל״תזרים״, ובן 60 שלא ייגע בכסף שייך ל״צמיחה״. **האופק קובע,
 *  לא הגיל** — הגיל הוא רק הקירוב הנפוץ שלו.
 */
export function trackForAge(age: number): { track: 'flow' | 'both' | 'growth'; why: string } {
  if (age < 40) return {
    track: 'growth',
    why: 'יש לכם אופק של עשרים שנה ומעלה. נפילה של 30% היא שנתיים־שלוש '
       + 'של אי־נוחות, לא אובדן — בתנאי שלא מושכים באמצע.',
  };
  if (age < 55) return {
    track: 'both',
    why: 'האופק עדיין ארוך, אבל כבר לא בלתי מוגבל. רמה זו נותנת חלק '
       + 'ניכר מהצמיחה בלי הנפילות העמוקות של המסלול התנודתי.',
  };
  return {
    track: 'flow',
    why: 'אם המשיכה קרובה, התנודתיות היא האויב ולא התשואה. מי שמושך '
       + 'מתוך נפילה נועל אותה, והקרן לא מתאוששת.',
  };
}

/** הגיל → קבוצת הגיל, ומשם אופק ההפקדות.
 *  20-30 מפקידים 25 שנה · 30-40 עשרים · 40-50 חמש-עשרה ·
 *  50-60 ו-60-70 עשר. */
export function cohortForAge(age: number): '20-30' | '30-40' | '40-50' | '50-60' | '60-70' {
  if (age < 30) return '20-30';
  if (age < 40) return '30-40';
  if (age < 50) return '40-50';
  if (age < 60) return '50-60';
  return '60-70';
}

/** סכום המשקלות, לנרמול */
export function totalWeight(h: Holding[]): number {
  return h.reduce((s, x) => s + x.w, 0);
}
