import type { ETFMap } from '../types';

/** Primary (synthetic) ETF per asset bucket; fallback is on ASSET_META. */
export const ETF_RECOMMENDATIONS: ETFMap = {
  dbxb: [{ ticker: 'DBXB', name: 'Xtrackers S&P 500 2× Leveraged Daily Swap (Acc)', expenseRatio: 0.60 }],
  eqqs: [{ ticker: 'EQQS', name: 'Invesco EQQQ NASDAQ-100 Swap UCITS (Acc)', expenseRatio: 0.30 }],
  p500: [{ ticker: 'XSPX', name: 'Xtrackers S&P 500 Swap UCITS (Acc)', expenseRatio: 0.05 }],
  xmwo: [{ ticker: 'XMWO', name: 'Xtrackers MSCI World Swap UCITS (Acc)', expenseRatio: 0.12 }],
};
