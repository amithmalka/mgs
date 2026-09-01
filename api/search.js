// Instrument search, so a stock can be found by NAME rather than by ticker.
//
// Merges three Twelve Data reference endpoints:
//   symbol_search   — stocks, ETFs, ADRs, worldwide
//   cryptocurrencies— crypto pairs (BTC/USD), which symbol_search does not cover
//   forex_pairs     — currency pairs (USD/ILS)
//
// Reference endpoints do not consume API credits, so this is safe to call on
// every keystroke (the client still debounces).

const LIMIT = 40;

/**
 * Exchanges our price/history endpoints handle most reliably, best first.
 * A search for "Tesla" returns a dozen cross-listings; the US line is the one
 * a student actually wants, so it has to sort to the top.
 */
const EXCHANGE_RANK = {
  NASDAQ: 0, NYSE: 0, 'NYSE American': 1, ARCA: 1, BATS: 1, OTC: 6,
  TASE: 2, LSE: 3, XETR: 3, Euronext: 3, SIX: 4, TSX: 4, ASX: 4,
};

const TYPE_RANK = { 'Common Stock': 0, ETF: 0, 'Index Fund': 1, REIT: 1 };

function rank(r) {
  const ex = EXCHANGE_RANK[r.exchange] ?? 5;
  const ty = TYPE_RANK[r.instrument_type] ?? 2;
  // Prefer USD listings — the rest of the app assumes a tradable US line.
  const cur = r.currency === 'USD' ? 0 : r.currency === 'ILS' ? 1 : 2;
  return ex * 10 + cur * 3 + ty;
}

async function getJson(url) {
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(200).json({ results: [] });

  const key = process.env.TWELVE_DATA_API_KEY;
  const auth = key ? `&apikey=${key}` : '';
  const enc = encodeURIComponent(q);

  const [sym, crypto, forex] = await Promise.all([
    getJson(`https://api.twelvedata.com/symbol_search?symbol=${enc}&outputsize=${LIMIT}${auth}`),
    getJson(`https://api.twelvedata.com/cryptocurrencies?symbol=${enc}${auth}`),
    getJson(`https://api.twelvedata.com/forex_pairs?symbol=${enc}${auth}`),
  ]);

  const results = [];

  for (const r of sym?.data ?? []) {
    if (!r.symbol) continue;
    results.push({
      symbol: r.symbol,
      name: r.instrument_name || r.symbol,
      exchange: r.exchange || '',
      country: r.country || '',
      currency: r.currency || '',
      type: r.instrument_type || '',
      _rank: rank(r),
    });
  }

  // Crypto and forex are matched by symbol only, so also match on the plain
  // name — "bitcoin" should find BTC/USD, which symbol_search never returns.
  const lower = q.toLowerCase();
  const nameMatches = (r) =>
    (r.currency_base || '').toLowerCase().includes(lower) ||
    (r.symbol || '').toLowerCase().includes(lower);

  for (const r of crypto?.data ?? []) {
    if (!nameMatches(r)) continue;
    results.push({
      symbol: r.symbol,
      name: `${r.currency_base} / ${r.currency_quote}`,
      exchange: 'Crypto', country: '', currency: r.currency_quote || '',
      type: 'Crypto',
      // Rank USD-quoted pairs first; there are hundreds of quote currencies.
      _rank: (r.symbol || '').endsWith('/USD') ? 2 : 30,
    });
  }

  for (const r of forex?.data ?? []) {
    if (!nameMatches(r)) continue;
    results.push({
      symbol: r.symbol,
      name: `${r.currency_base} / ${r.currency_quote}`,
      exchange: 'Forex', country: '', currency: r.currency_quote || '',
      type: 'Forex',
      _rank: 3,
    });
  }

  // One line per symbol+exchange, best-ranked first.
  const seen = new Set();
  const deduped = results
    .sort((a, b) => a._rank - b._rank)
    .filter(r => {
      const k = `${r.symbol}|${r.exchange}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 25)
    .map(({ _rank, ...rest }) => rest);

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ results: deduped });
}
