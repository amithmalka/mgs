// Monthly closes on a TOTAL-RETURN basis, for testing rules against the path.
//
// Why this is separate from /api/history: that endpoint returns price-only
// monthly closes. Comparing a 3-5% dividend payer against a non-payer on
// price alone is not a comparison at all -- over twelve years a 4% yield
// reinvested is most of the answer. FMP's EOD rows carry adjClose, which
// folds dividends and splits back in, so `a` is the series to measure on and
// `c` is kept beside it so the difference stays visible.

const MAX_SYMBOLS = 20;
const MAX_YEARS = 25;

/** Last row of each calendar month, oldest first. */
function monthly(rows) {
  const byMonth = new Map();
  for (const r of rows) {
    const d = String(r.date || '').slice(0, 10);
    if (d.length !== 10) continue;
    const c = Number(r.close);
    const a = Number(r.adjClose ?? r.adjclose ?? r.close);
    if (!Number.isFinite(c) || c <= 0) continue;
    const k = d.slice(0, 7);
    // rows arrive newest-first, so the first one seen in a month is its last day
    if (!byMonth.has(k)) byMonth.set(k, { t: d, c, a: Number.isFinite(a) && a > 0 ? a : c });
  }
  return [...byMonth.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(e => e[1]);
}

export default async function handler(req, res) {
  const key = process.env.FMP_API_KEY;
  if (!key) return res.status(500).json({ error: 'FMP_API_KEY is not configured' });

  const symbols = String(req.query.symbols || '')
    .split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_SYMBOLS);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  const years = Math.min(MAX_YEARS, Math.max(1, Number(req.query.years) || 13));
  const from = new Date(Date.now() - (years * 366 + 40) * 86400000)
    .toISOString().slice(0, 10);

  const out = {};
  await Promise.all([...new Set(symbols)].map(async (sym) => {
    try {
      const s = String(sym).trim().toUpperCase().replace('/', '');
      const url = 'https://financialmodelingprep.com/stable/historical-price-eod/full'
        + `?symbol=${encodeURIComponent(s)}&from=${from}&apikey=${key}`;
      const r = await fetch(url);
      if (!r.ok) { out[sym] = { error: 'HTTP ' + r.status }; return; }
      const j = await r.json();
      const rows = Array.isArray(j) ? j : Array.isArray(j?.historical) ? j.historical : null;
      if (!rows || rows.length < 20) { out[sym] = { error: 'no history' }; return; }
      const m = monthly(rows);
      if (m.length < 13) { out[sym] = { error: 'not enough months' }; return; }
      // adjClose equal to close all the way back means the feed is not
      // adjusting -- the caller must know that rather than assume it did.
      const adjusted = m.some(p => Math.abs(p.a - p.c) > 0.005);
      out[sym] = { months: m.length, adjusted, first: m[0].t, last: m[m.length - 1].t, series: m };
    } catch (e) {
      out[sym] = { error: e?.message || 'fetch error' };
    }
  }));

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ series: out });
}
