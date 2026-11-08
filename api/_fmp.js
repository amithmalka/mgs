/**
 * Financial Modeling Prep as the price source.
 *
 * FMP is the paid feed the account actually has, so it is tried first and
 * Twelve Data stays as the fallback for anything FMP will not serve. Two
 * differences matter: FMP wants crypto and forex without the slash (BTCUSD,
 * USDILS), and its historical endpoint returns newest-first like Twelve Data.
 */

/** FMP spells crypto and currency pairs without a separator. */
export function fmpSymbol(sym) {
  const s = String(sym).trim().toUpperCase();
  if (s.includes('/')) return s.replace('/', '');
  return s;
}

const round2 = n => Math.round(n * 100) / 100;
const pct = (a, b) => (b > 0 ? Math.round((a / b - 1) * 1000) / 10 : 0);

/**
 * Daily bars for one symbol, oldest first, in the shape the client already
 * reads. Returns null when FMP has nothing for it, so the caller can fall
 * through to the other provider rather than surfacing an error.
 */
export async function fmpSeries(sym, bars, key) {
  const s = fmpSymbol(sym);
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/full`
    + `?symbol=${encodeURIComponent(s)}&apikey=${key}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const rows = Array.isArray(j) ? j : Array.isArray(j?.historical) ? j.historical : null;
  if (!rows || rows.length < 2) return null;

  // newest first from FMP; take the window we need and flip to chronological
  const asc = rows.slice(0, bars).reverse().map(v => ({
    t: String(v.date).slice(0, 10),
    o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close),
  })).filter(b => Number.isFinite(b.c));
  if (asc.length < 2) return null;

  const last = asc[asc.length - 1], prev = asc[asc.length - 2], first = asc[0];
  return {
    price: last.c,
    prevClose: prev.c,
    change: round2(last.c - prev.c),
    changePct: pct(last.c, prev.c),
    perf30: pct(last.c, first.c),
    high: last.h, low: last.l, open: last.o,
    currency: null, exchange: null,
    candles: asc,
    source: 'fmp',
  };
}
