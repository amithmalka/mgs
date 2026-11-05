/** **ההנחות מאחורי כל מספר בדפי המסלולים והילדים.**
 *
 *  **שוּנה מהיסוד ב-4.11.2026. ביטקוין הוסר לחלוטין, ואיתו הבורסה
 *  הישראלית.** עד כאן היוניברס היה `BTC · SMH · XLK · WORLD · SYN`,
 *  ומנגנון הקנייה הקצה **48% מההפקדה של בן 25 לביטקוין** — דרך
 *  תעודה ישראלית בתל אביב (תכלית 1217835).
 *
 *  **שלוש סיבות, וכל אחת מספיקה:**
 *
 *  **א · מס עיזבון.** ביטקוין אינו זמין בעטיפת UCITS אירית — אין
 *  ולא יכולה להיות קרן UCITS על קריפטו — ולכן כל דרך להחזיק אותו
 *  מחזירה את המשקיע לנכס שחשוף למס העיזבון האמריקאי. זה הדבר
 *  היחיד שכל המבנה הזה בא למנוע.
 *
 *  **ב · הוא לא היה בשום קומבינציה.** עשרת התמהילים נבנו מתוך
 *  הקרנות שעברו את מסנן ההתאוששות, וביטקוין לא נבדק שם בכלל.
 *  כלומר מנגנון הקנייה קנה נכס שהתמהילים לא מכירים.
 *
 *  **ג · הבורסה הישראלית ירדה כמסלול קנייה.** הקנייה נעשית דרך
 *  אינטראקטיב ישראל ב-LSE בדולר, ולכן תעודה ישראלית אינה אופציה
 *  גם אם היינו רוצים בה.
 *
 *  **מעתה היוניברס הוא בדיוק שמונה הקרנות שבקטלוג** — אותן קרנות
 *  שבקומבינציות, כך שמנגנון הקנייה והתמהילים אינם יכולים להיפרד.
 *
 *  **ההנחות קדימה נלקחות מ-`forward.ts`** — דאמודראן NYU לסקטורים
 *  ו-LTCMA של ג׳יי־פי מורגן למדדים רחבים. **לא מהמדידה**, שהייתה
 *  60 חודשים של עשור הבינה המלאכותית.
 */
export type ScenarioId = 'real';
export type SleeveId = 'SPXS' | 'CSPX' | 'MXWO' | 'IWDA' | 'VWRA' | 'XLKS' | 'WTEC' | 'SMH';

export const TAX = 0.25;
export const WITHDRAW = 0.04;

interface Scenario {
  label: string;
  /** annual total return per sleeve */
  rate: Record<SleeveId, number>;
  /** what each sleeve returned over the measured decade, for the table */
  decade: Record<SleeveId, string>;
  why: Record<SleeveId, string>;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  real: {
    label: 'ריאלית',
    // ההנחה קדימה לכל קרן — מ-`forward.ts`, לא מהמדידה
    rate: { SPXS: 0.0750, CSPX: 0.0750, MXWO: 0.0740, IWDA: 0.0740,
            VWRA: 0.0770, XLKS: 0.0964, WTEC: 0.0964, SMH: 0.1072 },
    // מה הקרן עשתה ב-60 החודשים שנמדדו — לטבלה, לא להקרנה
    decade: { SPXS: '13.7%', CSPX: '13.5%', MXWO: '11.9%', IWDA: '11.8%',
              VWRA: '10.9%', XLKS: '23.1%', WTEC: '19.0%', SMH: '32.3%' },
    why: {
      SPXS: 'ג׳יי־פי מורגן LTCMA 2027 · מניות ארה״ב גדולות',
      CSPX: 'ג׳יי־פי מורגן LTCMA 2027 · מניות ארה״ב גדולות',
      MXWO: 'ג׳יי־פי מורגן LTCMA 2027 · שווקים מפותחים',
      IWDA: 'ג׳יי־פי מורגן LTCMA 2027 · שווקים מפותחים',
      VWRA: 'ג׳יי־פי מורגן LTCMA 2027 · מניות עולמיות',
      XLKS: 'דאמודראן NYU · תוכנה · 309 פירמות · שמרני',
      WTEC: 'דאמודראן NYU · תוכנה · 309 פירמות · שמרני',
      SMH: 'דאמודראן NYU · שבבים · 66 פירמות · בטא 1.52',
    },
  },
};

/**
 * How often a cycle-armed peak actually fires, measured on each sleeve's own
 * daily closes: the price must first fall below its reset depth (bitcoin 50%,
 * equities 30%), and then clear the high that stood before the fall by 10%.
 *
 * Measured over each sleeve's full history — bitcoin 12.1 years, semiconductors
 * 26.3, momentum 11.0, technology 27.8 — and the same counts come out at a 20%
 * breakout, only later. Semiconductors fire every 6.6 years and technology
 * every 9.3, not the 4 and 6 this file used to claim.
 */
export const CYCLE_YEARS: Record<string, number> =
  { SMH: 6.6, XLKS: 9.3, WTEC: 9.3, SPXS: 9.3, CSPX: 9.3,
    MXWO: 9.3, IWDA: 9.3, VWRA: 9.3 };

/** how many times each sleeve broke out over the measured history */
export const CYCLE_SEEN: Record<string, [number, number]> =
  { SMH: [4, 26.3], XLKS: [3, 27.8] };

export const SLEEVE_HE: Record<SleeveId, string> = {
  SPXS: 'S&P 500 · סינתטית', CSPX: 'S&P 500 · פיזית',
  MXWO: 'MSCI World · סינתטית', IWDA: 'MSCI World · פיזית',
  VWRA: 'כל העולם · פיזית',
  XLKS: 'טכנולוגיה · סינתטית', WTEC: 'טכנולוגיה · פיזית',
  SMH: 'מוליכים למחצה · פיזית',
};

/** investing years, then the years that glide into the world index */
export function horizonFor(age: number): [number, number] {
  if (age < 30) return [25, 5];
  if (age < 40) return [20, 5];
  if (age < 50) return [15, 5];
  if (age < 60) return [10, 5];
  return [7, 3];
}

/** **`btcRate` הוסרה ב-4.11.2026.** היא החזירה את שיעור הביטקוין
 *  לפי שלב התבגרות (20% עשור, 12% עשור, ואז 7%). ביטקוין אינו
 *  בקטלוג ואינו ניתן להחזקה בעטיפה אירית, ולכן גם הפונקציה הזאת
 *  איבדה את מושאה. כל קרן מקבלת שיעור קבוע מ-`SCENARIOS.rate`. */
export const rateOf = (sc: ScenarioId, k: SleeveId): number => SCENARIOS[sc].rate[k];

/** The bands `horizonFor` actually draws, named for the context strip. */
export const COHORTS: Array<{ label: string; from: number; to: number }> = [
  { label: '20–29', from: 0,  to: 29 },
  { label: '30–39', from: 30, to: 39 },
  { label: '40–49', from: 40, to: 49 },
  { label: '50–59', from: 50, to: 59 },
  { label: '60+',   from: 60, to: 200 },
];

export function cohortFor(age: number): string {
  return (COHORTS.find(c => age >= c.from && age <= c.to) ?? COHORTS[0]).label;
}

/** The three dates an age implies, in the tracks' own terms. */
export function milestonesFor(age: number) {
  const [depositYears, shiftYears] = horizonFor(age);
  return {
    depositYears,
    shiftYears,
    totalYears: depositYears + shiftYears,
    /** deposits move to the world index at this age */
    shiftAtAge: age + depositYears,
    /** withdrawals begin at this age */
    withdrawAtAge: age + depositYears + shiftYears,
  };
}

/** plain allocations, for the comparison strip */
export const WORLD_MODELS: Array<[string, number]> = [
  ['S&P 500', 0.088], ['מדד עולמי', 0.070], ['60/40', 0.065], ['All Weather', 0.060],
];
