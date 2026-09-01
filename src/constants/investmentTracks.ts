/**
 * The single unified track for the general investing method (שיטת השקעות כללית).
 *
 * Each asset carries BOTH the instrument the method names and a separate
 * `proxy` used for live price and history, because the two are not the same
 * symbol in our data provider.
 *
 * This is not a detail. The method names SPXS — the Invesco S&P 500 synthetic
 * UCITS ETF. Queried directly, "SPXS" returns the Direxion Daily S&P 500 BEAR
 * 3X, whose 10-year CAGR is −42.5%/yr. Wiring the engine to the raw ticker
 * would have modelled the largest holding as a triple-leveraged short fund.
 * Every proxy below was checked against real history before being used.
 */

export interface EngineAsset {
  key: string;
  /** the instrument the method names */
  ticker: string;
  /** symbol used for live price + history */
  proxy: string;
  /** true when the proxy is not the same instrument, only a stand-in */
  proxyIsApproximate?: boolean;
  labelHe: string;
  labelEn: string;
  color: string;
  /** target share of the portfolio, 0..1 */
  weight: number;
}

export const MGS_UNIFIED_TRACK = {
  id: 'MGS_GLOBAL_MOMENTUM_CORE' as const,
  nameHe: 'ליבת מומנטום עולמי',
  nameEn: 'Global Momentum Core',
  taglineHe: 'מסלול אחד: ליבה רחבה, נאסד״ק, ביטקוין ומדד מומנטום עולמי שמסובב סקטורים לבד.',
  taglineEn: 'One track: a broad core, NASDAQ, Bitcoin and a global momentum index that rotates sectors on its own.',
  /** the method's assumed annual return */
  expectedCagr: 0.155,
  /** harvest profits out of BTC once it exceeds this share */
  btcTakeProfitThreshold: 0.28,
  /** excess BTC is rotated into this asset */
  harvestInto: 'SPX_SYNTH',
  assets: [
    {
      key: 'SPX_SYNTH', ticker: 'SPXS', proxy: 'SPY',
      labelHe: 'S&P 500 סינתטי', labelEn: 'S&P 500 Synthetic',
      color: '#34D399', weight: 0.40,
    },
    {
      key: 'NASDAQ', ticker: 'CNX1', proxy: 'QQQ',
      labelHe: 'נאסד״ק 100', labelEn: 'NASDAQ 100',
      color: '#A78BFA', weight: 0.30,
    },
    {
      key: 'BTC', ticker: 'BTC', proxy: 'BTC/USD',
      labelHe: 'ביטקוין', labelEn: 'Bitcoin',
      color: '#F59E0B', weight: 0.20,
    },
    {
      // The method names IWMO / EOWO (MSCI World Momentum, UCITS). Our provider
      // does not serve those on this plan, so history uses IMTM — a momentum
      // factor fund, but international developed rather than whole-world.
      key: 'MOMENTUM', ticker: 'IWMO', proxy: 'IMTM', proxyIsApproximate: true,
      labelHe: 'מומנטום עולמי', labelEn: 'Global Momentum',
      color: '#60A5FA', weight: 0.10,
    },
  ] as EngineAsset[],
};

/** Months of accumulation before any withdrawal is allowed. */
export const SWR_START_MONTH = 36;
/** Annual safe withdrawal rate. */
export const SWR_ANNUAL = 0.04;
/** Israeli capital gains tax, applied to the profit portion of a withdrawal. */
export const CAPITAL_GAINS_TAX = 0.25;
