export interface PriceInfo { price?: number; perf30?: number; currency?: string | null; error?: string; }

/** Fetch live price + 30-day performance for the given tickers (via /api/prices). */
export async function fetchPrices(symbols: string[]): Promise<Record<string, PriceInfo>> {
  const res = await fetch('/api/prices?symbols=' + encodeURIComponent(symbols.join(',')));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json.prices || {};
}
