import type { ETFMap } from '../types';

export const ETF_RECOMMENDATIONS: ETFMap = {
  sp500: [
    { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', expenseRatio: 0.03 },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF', expenseRatio: 0.09 },
    { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', expenseRatio: 0.03 },
  ],
  nasdaq: [
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', expenseRatio: 0.20 },
    { ticker: 'QQQM', name: 'Invesco Nasdaq 100 ETF', expenseRatio: 0.15 },
  ],
  bitcoin: [
    { ticker: 'IBIT', name: 'iShares Bitcoin Trust', expenseRatio: 0.25 },
    { ticker: 'FBTC', name: 'Fidelity Wise Origin Bitcoin', expenseRatio: 0.25 },
  ],
  dividend: [
    { ticker: 'SCHD', name: 'Schwab US Dividend Equity', expenseRatio: 0.06, dividendYield: 3.5 },
    { ticker: 'VYM', name: 'Vanguard High Dividend Yield', expenseRatio: 0.06, dividendYield: 3.0 },
    { ticker: 'DGRO', name: 'iShares Core Dividend Growth', expenseRatio: 0.08, dividendYield: 2.3 },
    { ticker: 'HDV', name: 'iShares Core High Dividend', expenseRatio: 0.08, dividendYield: 3.8 },
  ],
};
