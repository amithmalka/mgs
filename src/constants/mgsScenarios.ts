/**
 * The two sets of assumptions behind every number on the tracks and children
 * pages, and the horizons each starting age gets.
 *
 * Bitcoin is the one sleeve that does not get a flat rate in the realistic set:
 * a flat rate either understates the coming decade or implies a coin worth more
 * than the world, so it decelerates as the asset matures.
 */
export type ScenarioId = 'pess' | 'real';
export type SleeveId = 'BTC' | 'SMH' | 'XLK' | 'WORLD' | 'SYN';

export const TAX = 0.25;
export const WITHDRAW = 0.04;

interface Scenario {
  label: string;
  /** annual total return per sleeve */
  rate: Record<SleeveId, number>;
  /** bitcoin only: [rate, how many years it lasts] — empty means the flat rate */
  btcStages: Array<[number, number]>;
  /** what each sleeve returned over the measured decade, for the table */
  decade: Record<SleeveId, string>;
  why: Record<SleeveId, string>;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  pess: {
    label: 'פסימית',
    rate: { BTC: 0.15, SMH: 0.09, XLK: 0.09, WORLD: 0.07, SYN: 0.088 },
    btcStages: [],
    decade: { BTC: '63.4%', SMH: '34.3%', XLK: '24.8%',
              WORLD: '13.2%', SYN: '15.4% / 21.0%' },
    why: {
      BTC: 'רבע ממה שעשה — ועדיין פי 66 בשלושים שנה',
      SMH: 'מתחת ל-10.7% שעשה מאז 2000',
      XLK: 'מתחת ל-10.7% שעשה מאז 1998',
      WORLD: 'הרבה מתחת ל-10% ההיסטוריים',
      SYN: 'הממוצע ההיסטורי של S&P',
    },
  },
  real: {
    label: 'ריאלית',
    rate: { BTC: 0.20, SMH: 0.12, XLK: 0.11, WORLD: 0.08, SYN: 0.095 },
    btcStages: [[0.20, 10], [0.12, 10], [0.07, 99]],
    decade: { BTC: '63.4%', SMH: '34.3%', XLK: '24.8%',
              WORLD: '13.2%', SYN: '15.4% / 21.0%' },
    why: {
      BTC: 'מתבגר: עשור של אימוץ, עשור של התמתנות, ואז כמו השוק',
      SMH: 'ההיסטוריה הארוכה מאז 2000, ועוד נקודה',
      XLK: 'בדיוק ההיסטוריה הארוכה מאז 1998',
      WORLD: 'מתחת לממוצע הארוך',
      SYN: 'מעט מעל הממוצע ההיסטורי של S&P',
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
  { BTC: 4.0, SMH: 6.6, XLK: 9.3, SYN: 9.3 };

/** how many times each sleeve broke out over the measured history */
export const CYCLE_SEEN: Record<string, [number, number]> =
  { BTC: [3, 12.1], SMH: [4, 26.3], XLK: [3, 27.8] };

export const SLEEVE_HE: Record<SleeveId, string> = {
  BTC: 'ביטקוין', SMH: 'שבבים',
  XLK: 'טכנולוגיה', WORLD: 'מדד עולמי', SYN: 'סינתטיות',
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
