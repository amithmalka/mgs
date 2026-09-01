import type { HistoryInfo } from '../../lib/marketData';

/**
 * Pick the expected return to seed a holding with, from real history.
 *
 * Prefers the 10-year CAGR, then 5, then 3, then whatever span exists. Longer
 * windows are steadier: a 1-year number is mostly noise. Falls back to 8% when
 * there is no usable history at all.
 */
export function seedReturn(h?: HistoryInfo): { value: number; basis: string } {
  if (h && !h.error) {
    if (typeof h.y10 === 'number') return { value: h.y10, basis: '10Y' };
    if (typeof h.y5 === 'number') return { value: h.y5, basis: '5Y' };
    if (typeof h.y3 === 'number') return { value: h.y3, basis: '3Y' };
    if (typeof h.full === 'number' && (h.yearsAvailable ?? 0) >= 1) {
      return { value: h.full, basis: `${h.yearsAvailable}Y` };
    }
  }
  return { value: 8, basis: 'default' };
}

/** Clamp a modelled return to a band a long projection can survive. */
export const clampReturn = (n: number) => Math.max(-20, Math.min(30, Math.round(n * 10) / 10));
