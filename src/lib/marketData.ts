/** One daily OHLC bar, oldest first. */
export interface Candle { t: string; o: number; h: number; l: number; c: number }

export interface PriceInfo {
  price?: number;
  /** previous session's close — the basis for the daily change */
  prevClose?: number;
  /** absolute daily move */
  change?: number;
  /** daily move, % */
  changePct?: number;
  /** move across the fetched window (~30 trading days), % */
  perf30?: number;
  open?: number;
  high?: number;
  low?: number;
  currency?: string | null;
  exchange?: string | null;
  candles?: Candle[];
  error?: string;
}

/** Historical compound annual growth rates, from real monthly closes. */
export interface HistoryInfo {
  /** CAGR over the trailing N years, % — null when history is too short */
  y1?: number | null;
  y3?: number | null;
  y5?: number | null;
  y10?: number | null;
  /** CAGR across everything we have */
  full?: number | null;
  yearsAvailable?: number;
  firstDate?: string;
  lastDate?: string;
  /** worst and best rolling 12-month stretch in the window, % */
  worstYear?: number | null;
  bestYear?: number | null;
  error?: string;
}

/** Real historical returns for the given symbols (via /api/history). */
export async function fetchHistory(symbols: string[], years = 10): Promise<Record<string, HistoryInfo>> {
  const qs = new URLSearchParams({ symbols: symbols.join(','), years: String(years) });
  const res = await fetch('/api/history?' + qs.toString());
  const text = await res.text();
  let json: { history?: Record<string, HistoryInfo>; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(
      /<!doctype html|<html/i.test(text)
        ? 'נתוני היסטוריה זמינים רק באתר הפרוס (mgs-system.vercel.app), לא בשרת הפיתוח המקומי.'
        : `תגובה לא צפויה מהשרת (HTTP ${res.status})`
    );
  }
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.history || {};
}

/**
 * Live price, daily change and daily OHLC bars for the given symbols
 * (via /api/prices). Equities use plain tickers; forex uses "USD/ILS".
 */
export async function fetchPrices(symbols: string[], bars?: number): Promise<Record<string, PriceInfo>> {
  const qs = new URLSearchParams({ symbols: symbols.join(',') });
  if (bars) qs.set('bars', String(bars));
  const res = await fetch('/api/prices?' + qs.toString());
  const text = await res.text();
  let json: { prices?: Record<string, PriceInfo>; error?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    // /api/* only exists on Vercel — under `npm run dev` Vite serves index.html.
    throw new Error(
      /<!doctype html|<html/i.test(text)
        ? 'נתוני שוק חיים זמינים רק באתר הפרוס (mgs-system.vercel.app), לא בשרת הפיתוח המקומי.'
        : `תגובה לא צפויה מהשרת (HTTP ${res.status})`
    );
  }
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.prices || {};
}
