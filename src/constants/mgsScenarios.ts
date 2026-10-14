/**
 * The two sets of assumptions behind every number on the tracks and children
 * pages, and the horizons each starting age gets.
 *
 * Bitcoin is the one sleeve that does not get a flat rate in the realistic set:
 * a flat rate either understates the coming decade or implies a coin worth more
 * than the world, so it decelerates as the asset matures.
 */
export type ScenarioId = 'pess' | 'real';
export type SleeveId = 'BTC' | 'SMH' | 'SPMO' | 'XLK' | 'WORLD' | 'SYN';

export const TAX = 0.25;
export const WITHDRAW = 0.04;
export const JEPQ_YIELD = 0.09;

interface Scenario {
  label: string;
  /** annual total return per sleeve */
  rate: Record<SleeveId, number>;
  /** bitcoin only: [rate, how many years it lasts] — empty means the flat rate */
  btcStages: Array<[number, number]>;
  jepqTotal: number;
  /** what each sleeve returned over the measured decade, for the table */
  decade: Record<SleeveId, string>;
  why: Record<SleeveId, string>;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  pess: {
    label: 'פסימית',
    rate: { BTC: 0.15, SMH: 0.09, SPMO: 0.085, XLK: 0.09, WORLD: 0.07, SYN: 0.088 },
    btcStages: [],
    jepqTotal: 0.075,
    decade: { BTC: '63.4%', SMH: '34.3%', SPMO: '20.3%', XLK: '24.8%',
              WORLD: '13.2%', SYN: '15.4% / 21.0%' },
    why: {
      BTC: 'רבע ממה שעשה — ועדיין פי 66 בשלושים שנה',
      SMH: 'מתחת ל-10.7% שעשה מאז 2000',
      SPMO: 'מתחת ל-S&P, כי אין לו היסטוריה ארוכה',
      XLK: 'מתחת ל-10.7% שעשה מאז 1998',
      WORLD: 'הרבה מתחת ל-10% ההיסטוריים',
      SYN: 'הממוצע ההיסטורי של S&P',
    },
  },
  real: {
    label: 'ריאלית',
    rate: { BTC: 0.20, SMH: 0.12, SPMO: 0.10, XLK: 0.11, WORLD: 0.08, SYN: 0.095 },
    btcStages: [[0.20, 10], [0.12, 10], [0.07, 99]],
    jepqTotal: 0.080,
    decade: { BTC: '63.4%', SMH: '34.3%', SPMO: '20.3%', XLK: '24.8%',
              WORLD: '13.2%', SYN: '15.4% / 21.0%' },
    why: {
      BTC: 'מתבגר: עשור של אימוץ, עשור של התמתנות, ואז כמו השוק',
      SMH: 'ההיסטוריה הארוכה מאז 2000, ועוד נקודה',
      SPMO: 'S&P ועוד פרמיית מומנטום צנועה',
      XLK: 'בדיוק ההיסטוריה הארוכה מאז 1998',
      WORLD: 'מתחת לממוצע הארוך',
      SYN: 'מעט מעל הממוצע ההיסטורי של S&P',
    },
  },
};

/** how often a real peak fires, measured from twelve years of daily closes */
export const CYCLE_YEARS: Record<string, number> =
  { BTC: 4.0, SMH: 4.0, SPMO: 11.0, XLK: 6.0, SYN: 6.0 };

export const SLEEVE_HE: Record<SleeveId, string> = {
  BTC: 'ביטקוין', SMH: 'שבבים · SMH', SPMO: 'מומנטום · SPMO',
  XLK: 'טכנולוגיה · XLK', WORLD: 'מדד עולמי', SYN: 'סינתטיות',
};

/** investing years, then the years that glide into the world index */
export function horizonFor(age: number): [number, number] {
  if (age < 30) return [25, 5];
  if (age < 40) return [20, 5];
  if (age < 50) return [15, 5];
  if (age < 60) return [10, 5];
  return [7, 3];
}

export function btcRate(sc: ScenarioId, yearsIn: number): number {
  const st = SCENARIOS[sc].btcStages;
  if (!st.length) return SCENARIOS[sc].rate.BTC;
  let acc = 0;
  for (const [r, n] of st) { acc += n; if (yearsIn < acc) return r; }
  return st[st.length - 1][0];
}

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
