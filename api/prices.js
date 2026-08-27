// Live EOD prices + 30-day performance via Twelve Data.
// Set TWELVE_DATA_API_KEY in Vercel env. Free tier: ~8 req/min, 800/day.
// NOTE: LSE/Euronext ETF symbols may need an exchange suffix in Twelve Data
// (e.g. "I500:LSE"). Pass the exact symbols from the client and tune as needed.
export default async function handler(req, res) {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured' });

  const symbols = String(req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  const prices = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=31&apikey=${key}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.status === 'error' || !Array.isArray(j.values) || j.values.length < 2) {
        prices[sym] = { error: j.message || 'no data' };
        return;
      }
      const cur = parseFloat(j.values[0].close);
      const old = parseFloat(j.values[j.values.length - 1].close);
      prices[sym] = {
        price: cur,
        perf30: old > 0 ? Math.round((cur / old - 1) * 1000) / 10 : 0,
        currency: j.meta?.currency || null,
      };
    } catch (e) {
      prices[sym] = { error: e?.message || 'fetch error' };
    }
  }));

  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json({ prices });
}
