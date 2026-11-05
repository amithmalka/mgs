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
  // ביטקוין הוסר: רגולציית UCITS אוסרת קריפטו בקרן אירית, ולכן כל
  // חשיפה אליו יוצאת מהמבנה האירי ונכנסת לבסיס מס העיזבון האמריקאי.
  { symbol: 'SMH',     he: 'שבבים',        en: 'Semiconductors', sub: 'SMH · אירית',         color: '#F87171', roleHe: 'תוספת תנודתיות' },
  { symbol: 'GDX',     he: 'כורות זהב',    en: 'Gold Miners',    sub: 'GDX · אירית',         color: '#E3BE45', roleHe: 'המפזר · מתאם 0.06' },
  { symbol: 'XLK',     he: 'טכנולוגיה',    en: 'Technology',     sub: 'IUIT · אירית',        color: '#5EE6D0', roleHe: 'מנוע הצמיחה' },
  { symbol: 'SPY',     he: 'S&P 500',      en: 'S&P 500',        sub: 'CSPX · אירית',        color: '#4ADE80', roleHe: 'הגרעין' },
  { symbol: 'QQQ',     he: 'נאסד״ק 100',   en: 'Nasdaq 100',     sub: 'CNDX · אירית',        color: '#8193FA', roleHe: 'מנוע הצמיחה' },
  { symbol: 'URTH',    he: 'מדד עולמי',    en: 'MSCI World',     sub: 'IWDA · אירית',        color: '#4ADE80', roleHe: 'הגרעין' },
];

/** Not a holding — the rate every shekel figure here is quoted against. */
export const FX = { symbol: 'USD/ILS', he: 'דולר / שקל', en: 'USD / ILS', sub: 'FX', color: '#5EE6D0' };

export const BOARD_SYMBOLS = [FX.symbol, ...BOARD.map(a => a.symbol)];
