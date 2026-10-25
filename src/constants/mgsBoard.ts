/**
 * The instruments the method actually holds, which is what the board shows.
 *
 * It used to list the old leveraged S&P, gold and the dividend ETF — none of
 * which the tracks or MGS Kids touch any more. The shekel rate is kept because
 * every figure in the app is in shekels and the holdings are not.
 */
export interface BoardAsset {
  symbol: string;
  he: string;
  en: string;
  sub: string;
  color: string;
  /** where it appears in the method, for the board's own caption */
  roleHe: string;
}

export const BOARD: BoardAsset[] = [
  // `symbol` is the price feed's — the index the sleeve follows. `sub` is the
  // security actually bought in shekels on the Tel Aviv exchange, with its
  // security number; both numbers verified against the exchange's own
  // security feed, October 2026.
  { symbol: 'BTC/USD', he: 'ביטקוין',      en: 'Bitcoin',        sub: 'תכלית סל · 1217835',  color: '#F59E0B', roleHe: 'הרכיב התנודתי' },
  { symbol: 'SMH',     he: 'שבבים',        en: 'Semiconductors', sub: 'קסם ETF · 1174119',   color: '#F87171', roleHe: 'הרכיב התנודתי' },
  { symbol: 'XLK',     he: 'טכנולוגיה',    en: 'Technology',     sub: 'IUIT · 1159193',      color: '#7DD3FC', roleHe: 'ליבה' },
  { symbol: 'SPY',     he: 'S&P 500',      en: 'S&P 500',        sub: 'ייחוס',               color: '#34D399', roleHe: 'ייחוס' },
  { symbol: 'QQQ',     he: 'נאסד״ק 100',   en: 'Nasdaq 100',     sub: 'ייחוס',               color: '#C4B5FD', roleHe: 'ייחוס' },
  { symbol: 'URTH',    he: 'מדד עולמי',    en: 'MSCI World',     sub: 'MSCI ACWI · 1159235', color: '#10B981', roleHe: 'הנחיתה' },
];

/** Not a holding — the rate every shekel figure here is quoted against. */
export const FX = { symbol: 'USD/ILS', he: 'דולר / שקל', en: 'USD / ILS', sub: 'FX', color: '#D4AF37' };

export const BOARD_SYMBOLS = [FX.symbol, ...BOARD.map(a => a.symbol)];
