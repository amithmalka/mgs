// One-minute bars, for testing intraday rules against what actually happened.
//
// Daily bars cannot answer a question about a 1-minute candle closing red, so
// this is a separate endpoint rather than a parameter on /api/prices. FMP's
// intraday history depth varies by plan; `meta` reports what actually came
// back so a caller can tell a short window from a long one.

const MAX_SYMBOLS = 5;
const OK = /^[A-Z.\-]{1,12}$/;

export default async function handler(req, res) {
  const key = process.env.FMP_API_KEY;
  if (!key) return res.status(500).json({ error: 'FMP_API_KEY is not configured' });

  const symbols = String(req.query.symbols || '')
    .split(',').map(s => s.trim().toUpperCase()).filter(s => OK.test(s)).slice(0, MAX_SYMBOLS);
  if (!symbols.length) return res.status(400).json({ error: 'no valid symbols' });

  const from = String(req.query.from || '').slice(0, 10);
  const to = String(req.query.to || '').slice(0, 10);
  const iv = ['1min', '5min', '15min', '1hour'].includes(String(req.query.interval))
    ? String(req.query.interval) : '1min';
  const bars = Math.min(5000, Math.max(1, Number(req.query.bars) || 2000));

  const out = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      let url = `https://financialmodelingprep.com/stable/historical-chart/${iv}`
        + `?symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(from)) url += `&from=${from}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) url += `&to=${to}`;
      const r = await fetch(url);
      if (!r.ok) { out[sym] = { error: 'HTTP ' + r.status }; return; }
      const j = await r.json();
      const rows = Array.isArray(j) ? j : null;
      if (!rows || !rows.length) { out[sym] = { error: 'no data' }; return; }
      // FMP returns newest first
      const asc = rows.slice(0, bars).reverse().map(v => ({
        t: String(v.date), o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: +v.volume,
      })).filter(b => Number.isFinite(b.c));
      out[sym] = {
        n: asc.length, first: asc[0]?.t, last: asc[asc.length - 1]?.t,
        bars: asc,
      };
    } catch (e) {
      out[sym] = { error: e?.message || 'fetch error' };
    }
  }));

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ interval: iv, series: out });
}
