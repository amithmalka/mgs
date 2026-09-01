/**
 * Typical trailing dividend yields (%) used only as a STARTING POINT for the
 * dividend simulation — every one is editable in the UI. Yields move with price
 * and with payout policy, so these are rough anchors, not live data.
 */
const YIELDS: Record<string, number> = {
  // Broad market
  SPY: 1.2, VOO: 1.2, IVV: 1.2, CSPX: 1.3, URTH: 1.6, IWDA: 1.5, VT: 1.9, VTI: 1.2,
  // Growth / tech — low or no payout
  QQQ: 0.5, CNDX: 0.5, EQQS: 0.5, XSPX: 1.2, XMWO: 1.5,
  // Leveraged products pay little
  SSO: 0.5, DBXB: 0.4, UPRO: 0.3, TQQQ: 0.0,
  // Dividend-focused
  SCHD: 3.5, VYM: 2.8, DGRO: 2.2, HDV: 3.3, DVY: 3.4, NOBL: 2.0, JEPI: 7.5, JEPQ: 9.0,
  // Bonds
  BND: 3.8, AGG: 3.7, TLT: 4.0,
  // Common single names
  KO: 3.0, JNJ: 3.0, PG: 2.4, PEP: 3.2, XOM: 3.3, CVX: 4.2, T: 6.0, VZ: 6.5,
  O: 5.5, MAIN: 5.8, ABBV: 3.4, PFE: 6.0, IBM: 3.0, MCD: 2.3,
  MSFT: 0.7, AAPL: 0.4, GOOGL: 0.5, META: 0.3, NVDA: 0.03, AMZN: 0.0, TSLA: 0.0,
  // Non-paying assets
  GLD: 0.0, IAU: 0.0, SLV: 0.0, 'BTC/USD': 0.0, 'ETH/USD': 0.0,
};

/** Fallback for an unrecognised ticker — deliberately modest. */
export const DEFAULT_YIELD = 1.5;

export function defaultYieldFor(ticker: string): number {
  return YIELDS[ticker.trim().toUpperCase()] ?? DEFAULT_YIELD;
}
