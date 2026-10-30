// Universe and float, for picking the day-stock pairs an intraday test needs.
//
// Two jobs behind one endpoint, both on FMP (daily/fundamental data is in the
// plan; intraday is not):
//   kind=screen  → company screener, to get the price/float universe
//   kind=float   → shares float and free float for specific symbols
//   kind=movers  → biggest daily gainers for a date, from the daily bars
//
// The intraday test only needs 1-minute bars for the days a stock actually
// spiked, so narrowing here is what makes the whole run affordable.

const OKSYM = /^[A-Z.\-]{1,12}$/;

export default async function handler(req, res) {
  const key = process.env.FMP_API_KEY;
  if (!key) return res.status(500).json({ error: 'FMP_API_KEY is not configured' });
  const base = 'https://financialmodelingprep.com/stable/';
  const kind = String(req.query.kind || 'screen');

  const get = async (path) => {
    const r = await fetch(base + path + (path.includes('?') ? '&' : '?') + 'apikey=' + key);
    if (!r.ok) return { httpError: r.status };
    return r.json();
  };

  try {
    if (kind === 'float') {
      const syms = String(req.query.symbols || '').split(',')
        .map(s => s.trim().toUpperCase()).filter(s => OKSYM.test(s)).slice(0, 25);
      if (!syms.length) return res.status(400).json({ error: 'no symbols' });
      const out = {};
      await Promise.all(syms.map(async s => {
        out[s] = await get('shares-float?symbol=' + encodeURIComponent(s));
      }));
      return res.status(200).json({ kind, float: out });
    }

    if (kind === 'screen') {
      const q = new URLSearchParams();
      const num = (k, d) => {
        const v = Number(req.query[k]);
        if (Number.isFinite(v)) q.set(d, String(v));
      };
      num('priceMin', 'priceMoreThan'); num('priceMax', 'priceLowerThan');
      num('volMin', 'volumeMoreThan');
      num('capMax', 'marketCapLowerThan'); num('capMin', 'marketCapMoreThan');
      q.set('exchange', String(req.query.exchange || 'NASDAQ,NYSE,AMEX'));
      q.set('isActivelyTrading', 'true');
      q.set('limit', String(Math.min(1000, Number(req.query.limit) || 500)));
      return res.status(200).json({ kind, rows: await get('company-screener?' + q) });
    }

    if (kind === 'movers') {
      // daily bars for one symbol, used to locate the spike days
      const s = String(req.query.symbol || '').toUpperCase();
      if (!OKSYM.test(s)) return res.status(400).json({ error: 'bad symbol' });
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      let p = 'historical-price-eod/full?symbol=' + encodeURIComponent(s);
      if (/^\d{4}-\d{2}-\d{2}$/.test(from)) p += '&from=' + from;
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) p += '&to=' + to;
      return res.status(200).json({ kind, symbol: s, rows: await get(p) });
    }

    return res.status(400).json({ error: 'unknown kind' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'error' });
  }
}
