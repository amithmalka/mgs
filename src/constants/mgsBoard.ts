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
  { symbol: 'BTC/USD', he: 'ביטקוין',      en: 'Bitcoin',     sub: 'Crypto',      color: '#F59E0B', roleHe: 'הרכיב התנודתי' },
  { symbol: 'SMH',     he: 'שבבים',        en: 'Semiconductors', sub: 'VanEck SMH', color: '#F87171', roleHe: 'הרכיב התנודתי' },
  { symbol: 'XLK',     he: 'טכנולוגיה',    en: 'Technology',  sub: 'XLK',         color: '#7DD3FC', roleHe: 'ליבה' },
  { symbol: 'SPMO',    he: 'מומנטום',      en: 'Momentum',    sub: 'Invesco SPMO', color: '#A78BFA', roleHe: 'ליבה' },
  { symbol: 'JEPQ',    he: 'JEPQ',         en: 'JEPQ',        sub: 'JPM Nasdaq Income', color: '#D4AF37', roleHe: 'מנוע ההכנסה' },
  { symbol: 'SPY',     he: 'S&P 500',      en: 'S&P 500',     sub: 'S&P 500',     color: '#34D399', roleHe: 'סינתטי' },
  { symbol: 'QQQ',     he: 'נאסד״ק 100',   en: 'Nasdaq 100',  sub: 'NASDAQ 100',  color: '#C4B5FD', roleHe: 'סינתטי' },
  { symbol: 'URTH',    he: 'מדד עולמי',    en: 'MSCI World',  sub: 'MSCI World',  color: '#10B981', roleHe: 'הנחיתה' },
];

/** Not a holding — the rate every shekel figure here is quoted against. */
export const FX = { symbol: 'USD/ILS', he: 'דולר / שקל', en: 'USD / ILS', sub: 'FX', color: '#D4AF37' };

export const BOARD_SYMBOLS = [FX.symbol, ...BOARD.map(a => a.symbol)];
