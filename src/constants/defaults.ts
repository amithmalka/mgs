import type { AllocationTarget, SimulationParams, Goal, AssetClass, ColorRole } from '../types';

/**
 * Asset master table — Irish-domiciled, accumulating ETFs (tax-efficient).
 * `ticker` is the LSE/Euronext-traded symbol used for the live price feed.
 * `role` (green/yellow/red) drives the traffic-light de-risk routing.
 */
export interface AssetMeta {
  /** synthetic Irish ETF (0% withholding) shown while status = Active_Primary */
  primaryTicker: string;
  /** physical Irish ETF (15% withholding) used after a regulatory switch */
  fallbackTicker: string;
  /** free-tier US-listed proxy tracking the same index — used for live prices */
  proxyTicker: string;
  label: string;
  index: string;
  color: string;
  role: ColorRole;
  leveraged: boolean;
}

/** **שונה ב-4.11.2026 — ירדו מכאן המינוף והנאסד״ק.**
 *
 *  **המינוף.** `dbxb` החזיקה את `DBXB`, קרן S&P 500 **ממונפת פי שתיים**,
 *  והיא הייתה 15% מהתמהיל שהחנות נפתחת עליו. אין מינוף במערכת, ולכן
 *  המפתח מצביע עכשיו על **SMH** — שרוול השבבים. זו אותה העברה שנעשתה
 *  ב-`mgsStore` כשהוסרה `QQQ3`: המנוע שהמינוף נתן נמצא היום בשבבים,
 *  בלי הריבית על ההלוואה ובלי שחיקת האיפוס היומי.
 *
 *  **הנאסד״ק.** `eqqs` החזיקה את `EQQS`, נאסד״ק 100 סינתטית. הנאסד״ק
 *  הוצא מכל המסלולים, ולכן המפתח מצביע עכשיו על **XLKS** — טכנולוגיה.
 *
 *  **ושלושת המפתחות האחרים כוונו לקטלוג בן שמונה הקרנות:** `p500`
 *  ל-SPXS ו-`xmwo` ל-IWDA. שמות המפתחות נשארו כדי לא לשבור מצב שמור
 *  אצל משתמשים קיימים — הם מזהים מקום בתמהיל, לא נייר.
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
export const ASSET_META: Record<AssetClass, AssetMeta> = {
  dbxb: { primaryTicker: 'SMH',  fallbackTicker: 'SMH',  proxyTicker: 'SMH',  label: 'שבבים · SMH',      index: 'MarketVector US Listed Semiconductor 10% Capped', color: '#F87171', role: 'red',   leveraged: false },
  eqqs: { primaryTicker: 'XLKS', fallbackTicker: 'WTEC', proxyTicker: 'XLK',  label: 'טכנולוגיה · XLKS', index: 'S&P Select Sector Capped 20% Technology',        color: '#F87171', role: 'red',   leveraged: false },
  p500: { primaryTicker: 'SPXS', fallbackTicker: 'CSPX', proxyTicker: 'SPY',  label: 'S&P 500',          index: 'S&P 500',             color: '#4ADE80', role: 'green', leveraged: false },
  xmwo: { primaryTicker: 'IWDA', fallbackTicker: 'VWRA', proxyTicker: 'URTH', label: 'MSCI World',       index: 'MSCI World',          color: '#4ADE80', role: 'green', leveraged: false },
};

/** Vanilla "green" anchors (S&P 500 + MSCI World — the Phase-B targets). */
export const GREEN_ASSETS: AssetClass[] = (Object.keys(ASSET_META) as AssetClass[]).filter(a => ASSET_META[a].role === 'green');

export const DEFAULT_ALLOCATIONS: AllocationTarget[] = (
  [['p500', 50], ['eqqs', 30], ['dbxb', 20]] as [AssetClass, number][]
).map(([assetClass, targetPercent]) => ({
  assetClass, targetPercent, currentValue: 0,
  label: ASSET_META[assetClass].label, color: ASSET_META[assetClass].color,
}));

/** Default lifecycle boundaries (most tracks). Track 5 overrides via its durations. */
export const TURBO_END = 25;       // Phase A yr 1-25 : smart-DCA accumulation
export const GROUNDING_END = 30;   // Phase B yr 26-30 : consolidate + deposit -> MSCI World
export const INCUBATION_END = 30;  // (no separate incubation phase in MJS)
/**
 * Years every long-range projection covers. Must stay above the green-phase
 * start (TURBO_END + 5 + 1 = year 31 on the standard timing), or the income
 * years never appear on screen.
 */
export const PROJECTION_HORIZON = 40;

export const WITHDRAW_RATE = 0.04; // Phase C yr 31+   : 4% rule smart harvesting

// kept for back-compat with older references
export const PHASE_RED_END = TURBO_END;
export const PHASE_YELLOW_END = GROUNDING_END;

export const DEFAULT_SIMULATION: SimulationParams = {
  initialDeposit: 10000,
  monthlyDeposit: 3000,
  years: 10,
  expectedReturn: 8,
  yearlyDepositIncrease: 0,
  inflationRate: 2.5,
  targetAmount: 1500000,
};

export const DEFAULT_GOAL: Goal = {
  id: 'main',
  name: 'Financial Freedom',
  targetAmount: 1500000,
  targetMonthlyIncome: 5000,
  yearsToInvest: 10,
};

/** **הנחות התשואה — נכתבו מחדש ב-4.11.2026, ושלוש שורות ירדו.**
 *
 *  **מה שהיה כאן.** הערות שמסבירות ריביות של ביטקוין — למה 70% בשנה
 *  לא מוקרנים קדימה, ואיך הוא ממודל כנכס מתבגר. **ביטקוין אינו
 *  במערכת:** UCITS אוסרת קריפטו בקרן אירית, ולכן אין לו גרסה שאפשר
 *  לקנות דרך אינטראקטיב ישראל בלונדון. גם `SCHD`, `VXUS` וזהב הוזכרו
 *  שם, ואף אחד מהם אינו בקטלוג.
 *
 *  **ומה שחשוב מזה: המספרים עצמם ירדו.** `dbxb` הניחה **18% בשנה**
 *  בתרחיש הבסיס ו-28% באגרסיבי — הנחות של נייר ממונף פי שתיים. אין
 *  מינוף במערכת, והשורה מכוונת עכשיו לשבבים.
 *
 *  **המספרים כאן זהים לאלה שב-`mgsTracks.ts`,** שהוא מקור האמת
 *  להנחות התשואה, כדי שלא יהיה פער בין שני המסלולים:
 *
 *    I500 / p500  — S&P 500
 *    TECH / eqqs  — טכנולוגיה · Damodaran NYU ינואר 2026, 9.64% גיאומטרי
 *    SEMI / dbxb  — שבבים · Damodaran NYU ינואר 2026, 10.72%, בטא 1.52
 *    MWRD / xmwo  — מדד עולמי
 *
 *  **התרחיש האגרסיבי אינו תחזית.** הוא מה שקורה אם העשור הבא דומה
 *  לעשור שעבר, והעשור שעבר היה מהחזקים בהיסטוריה.
 *
 *  אין בזה המלצה ואין בזה ייעוץ פיננסי.
 */
export const ASSET_RETURNS: Record<string, Record<AssetClass, number>> = {
  conservative: { dbxb: 7,  eqqs: 7,  p500: 7,  xmwo: 5  },
  moderate:     { dbxb: 11, eqqs: 10, p500: 10, xmwo: 8  },
  aggressive:   { dbxb: 15, eqqs: 13, p500: 14, xmwo: 11 },
};

export const SCENARIOS = {
  conservative: { label: 'Conservative', color: '#888' },
  moderate: { label: 'Moderate', color: '#5EE6D0' },
  aggressive: { label: 'Aggressive', color: '#4ADE80' },
};

export const TRANSITION_THRESHOLD = 1500000;

// Helper: calculate the weighted return for a given allocation + scenario
export function calcWeightedReturn(
  allocations: AllocationTarget[],
  scenario: 'conservative' | 'moderate' | 'aggressive'
): number {
  const returns = ASSET_RETURNS[scenario];
  let weightedReturn = 0;
  let totalPct = 0;
  for (const a of allocations) {
    if (a.targetPercent > 0) {
      weightedReturn += (a.targetPercent / 100) * returns[a.assetClass];
      totalPct += a.targetPercent;
    }
  }
  // Normalize if allocations don't sum to 100
  if (totalPct > 0 && totalPct !== 100) {
    weightedReturn = weightedReturn * (100 / totalPct);
  }
  return Math.round(weightedReturn * 100) / 100;
}
