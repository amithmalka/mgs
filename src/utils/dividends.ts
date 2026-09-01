import { toMonthlyRate } from './math';

/**
 * Dividend income simulation.
 *
 * The 4% rule elsewhere in the app answers "how much can I safely sell each
 * year". This answers a different question: how much cash the portfolio *pays
 * out* on its own, without selling anything.
 *
 * Model, stepped monthly:
 *   price      → the portfolio compounds at the price return only
 *   dividend   → each month it pays value × (yield / 12)
 *   reinvest   → during accumulation the payout is bought straight back in
 *   yield grows→ payouts can rise faster than price (dividend growth), so the
 *                yield itself is grown each year and capped, see below.
 *
 * Total return is therefore priceReturn + dividendYield, which is why the
 * price return is entered separately rather than reusing the all-in figure
 * from the main simulation — counting both would double-count the dividend.
 */

export interface DividendRow {
  year: number;
  /** portfolio value at year end */
  value: number;
  /** cash paid out during this year */
  annualDividend: number;
  monthlyDividend: number;
  /** every dividend paid so far */
  cumulativeDividends: number;
  /** money put in so far (excluding reinvested dividends) */
  totalDeposited: number;
  /** this year's payout against what you actually deposited, % */
  yieldOnCost: number;
  /** the yield in force this year, % */
  effectiveYield: number;
}

export interface DividendParams {
  initialValue: number;
  monthlyDeposit: number;
  years: number;
  /** annual price appreciation %, excluding dividends */
  priceReturn: number;
  /** starting dividend yield % */
  dividendYield: number;
  /** annual growth of the yield itself %, e.g. SCHD-style payout raises */
  dividendGrowth: number;
  /** reinvest payouts (accumulation) or take them as cash (income) */
  reinvest: boolean;
  /** stop depositing after this year; 0 = keep depositing throughout */
  depositUntilYear?: number;
}

/**
 * A hard ceiling on the modelled yield. Compounding dividend growth without one
 * produces yields of 40%+ over a long horizon, which no real security pays and
 * which would make the projection look absurdly good.
 */
export const MAX_MODELLED_YIELD = 12;

export function simulateDividends(p: DividendParams): DividendRow[] {
  const {
    initialValue, monthlyDeposit, years, priceReturn,
    dividendYield, dividendGrowth, reinvest, depositUntilYear = 0,
  } = p;

  const priceMonthly = toMonthlyRate(priceReturn);

  let value = initialValue;
  let totalDeposited = initialValue;
  let cumulative = 0;

  const rows: DividendRow[] = [{
    year: 0,
    value: Math.round(value),
    annualDividend: 0,
    monthlyDividend: 0,
    cumulativeDividends: 0,
    totalDeposited: Math.round(totalDeposited),
    yieldOnCost: 0,
    effectiveYield: dividendYield,
  }];

  for (let year = 1; year <= years; year++) {
    // Yield in force this year, grown from the starting yield and capped.
    const effectiveYield = Math.min(
      MAX_MODELLED_YIELD,
      dividendYield * Math.pow(1 + dividendGrowth / 100, year - 1)
    );
    const monthlyYield = effectiveYield / 100 / 12;
    const depositing = depositUntilYear === 0 || year <= depositUntilYear;

    let paidThisYear = 0;

    for (let m = 0; m < 12; m++) {
      if (depositing) {
        value += monthlyDeposit;
        totalDeposited += monthlyDeposit;
      }
      // Price moves first, then the dividend is paid on the new value.
      value *= 1 + priceMonthly;

      const payout = value * monthlyYield;
      paidThisYear += payout;
      cumulative += payout;

      // A published price return is already net of dividends being paid out,
      // so total return = priceReturn + dividendYield. Reinvesting therefore
      // ADDS the payout on top of price growth; taking it as cash leaves the
      // portfolio growing at the price return alone.
      if (reinvest) value += payout;
    }

    rows.push({
      year,
      value: Math.round(value),
      annualDividend: Math.round(paidThisYear),
      monthlyDividend: Math.round(paidThisYear / 12),
      cumulativeDividends: Math.round(cumulative),
      totalDeposited: Math.round(totalDeposited),
      yieldOnCost: totalDeposited > 0 ? Math.round((paidThisYear / totalDeposited) * 1000) / 10 : 0,
      effectiveYield: Math.round(effectiveYield * 100) / 100,
    });
  }

  return rows;
}

/** First year in which the annual payout covers a target annual income. */
export function yearIncomeReached(rows: DividendRow[], targetAnnual: number): number | null {
  if (targetAnnual <= 0) return null;
  const hit = rows.find(r => r.annualDividend >= targetAnnual);
  return hit ? hit.year : null;
}
