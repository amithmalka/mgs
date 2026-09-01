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
 * Hebrew (and loose English) query rewriting.
 *
 * Twelve Data indexes instrument names in English only, so "טסלה" returns
 * nothing. The query is rewritten before being sent upstream.
 */
const TRANSLATE = [
  [/טסלה/i, 'Tesla'], [/אפל/i, 'Apple'], [/גוגל|אלפאבית/i, 'Alphabet'],
  [/אמזון/i, 'Amazon'], [/מיקרוסופט/i, 'Microsoft'], [/אנבידיה|נבידיה/i, 'NVIDIA'],
  [/מטא|פייסבוק/i, 'Meta Platforms'], [/נטפליקס/i, 'Netflix'], [/אינטל/i, 'Intel'],
  [/קוקה.?קולה/i, 'Coca-Cola'], [/מקדונלדס/i, 'McDonald'], [/דיסני/i, 'Disney'],
  [/ביטקוין|ביטקויין/i, 'Bitcoin'], [/את'?ריום|אתריום/i, 'Ethereum'],
  [/זהב/i, 'Gold'], [/כסף \(מתכת\)|סילבר/i, 'Silver'], [/נפט/i, 'Oil'],
  [/נאסד.?ק/i, 'Nasdaq'], [/מדד עולמי|עולמי/i, 'MSCI World'],
  [/דיבידנד/i, 'Dividend'], [/אג.?ח/i, 'Bond'],
];

function rewrite(q) {
  for (const [re, en] of TRANSLATE) if (re.test(q)) return en;
  return q;
}

/**
 * Curated crypto and forex lines.
 *
 * Twelve Data's crypto/forex reference endpoints only match on the SYMBOL, so
 * a name search like "bitcoin" never reaches BTC/USD, and filtering the full
 * list would mean pulling thousands of rows on every keystroke. These are the
 * pairs a student would realistically hold, injected when the query matches.
 */
const DIRECT = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', type: 'Crypto', match: /^(btc|bitcoin|ביטקוין|ביטקויין)/i },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', type: 'Crypto', match: /^(eth|ethereum|את.?ריום)/i },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', type: 'Crypto', match: /^(sol|solana|סולנה)/i },
  { symbol: 'XRP/USD', name: 'XRP / US Dollar', type: 'Crypto', match: /^(xrp|ripple)/i },
  { symbol: 'USD/ILS', name: 'US Dollar / Israeli Shekel', type: 'Forex', match: /(usd\/?ils|dollar.*shekel|דולר|שקל)/i },
  { symbol: 'EUR/ILS', name: 'Euro / Israeli Shekel', type: 'Forex', match: /(eur\/?ils|euro.*shekel|אירו)/i },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'Forex', match: /^(eur\/?usd|euro)/i },
];

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
  // Search upstream in English; the user may well have typed Hebrew.
  const enc = encodeURIComponent(rewrite(q));

  const [sym, crypto, forex] = await Promise.all([
    getJson(`https://api.twelvedata.com/symbol_search?symbol=${enc}&outputsize=${LIMIT}${auth}`),
    getJson(`https://api.twelvedata.com/cryptocurrencies?symbol=${enc}${auth}`),
    getJson(`https://api.twelvedata.com/forex_pairs?symbol=${enc}${auth}`),
  ]);

  const results = [];

  // Curated pairs first — these are exact intent matches, so rank -1.
  for (const d of DIRECT) {
    if (!d.match.test(q)) continue;
    results.push({
      symbol: d.symbol, name: d.name,
      exchange: d.type, country: '', currency: d.symbol.split('/')[1] || '',
      type: d.type, _rank: -1,
    });
  }

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
