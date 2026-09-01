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
