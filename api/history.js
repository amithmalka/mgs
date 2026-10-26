// Long-run historical returns via Twelve Data monthly bars.
//
// /api/prices returns daily bars for the board and candles. This returns
// MONTHLY closes over many years and the compound annual growth rate (CAGR)
// for each standard window, so an expected return can be seeded from what an
// asset actually did rather than from extrapolating a single month.
//
// One credit per symbol, same as /api/prices, so the symbol list is capped and
// the response is cached hard — history barely moves day to day.

const MAX_SYMBOLS = 12;
const MAX_YEARS = 20;
const WINDOWS = [1, 3, 5, 10];

/** Compound annual growth rate between two prices over `years`. */
function cagr(start, end, years) {
  if (!(start > 0) || !(end > 0) || !(years > 0)) return null;
  return Math.round((Math.pow(end / start, 1 / years) - 1) * 1000) / 10;
}

export default async function handler(req, res) {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'TWELVE_DATA_API_KEY is not configured' });

  const symbols = String(req.query.symbols || '')
    .split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_SYMBOLS);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  const years = Math.min(MAX_YEARS, Math.max(1, Number(req.query.years) || 10));
  const bars = years * 12 + 1;
  // With series=1 the monthly closes come back too, not just the rates derived
  // from them. A rule that buys by how far a holding has fallen cannot be
  // tested against a CAGR -- it needs the path.
  const wantSeries = String(req.query.series || '') === '1';

  const history = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}`
        + `&interval=1month&outputsize=${bars}&apikey=${key}`;
      const r = await fetch(url);
      const j = await r.json();

      if (j.status === 'error' || !Array.isArray(j.values) || j.values.length < 13) {
        history[sym] = { error: j.message || 'not enough history' };
        return;
      }

      // Twelve Data returns newest first; flip to chronological.
      const asc = j.values.slice().reverse()
        .map(v => ({ t: v.datetime, c: parseFloat(v.close) }))
        .filter(p => Number.isFinite(p.c) && p.c > 0);

      if (asc.length < 13) { history[sym] = { error: 'not enough history' }; return; }

      const last = asc[asc.length - 1];
      const monthsAvailable = asc.length - 1;

      const cagrs = {};
      for (const w of WINDOWS) {
        const months = w * 12;
        if (monthsAvailable < months) { cagrs[`y${w}`] = null; continue; }
        const start = asc[asc.length - 1 - months];
        cagrs[`y${w}`] = cagr(start.c, last.c, w);
      }

      // Longest window we actually have data for — the most stable estimate.
      const maxYears = Math.round((monthsAvailable / 12) * 10) / 10;
      const full = cagr(asc[0].c, last.c, monthsAvailable / 12);

      // Worst and best rolling 12-month stretch, so the volatility is visible
      // next to the average rather than hidden by it.
      let worst = null, best = null;
      for (let i = 12; i < asc.length; i++) {
        const chg = (asc[i].c / asc[i - 12].c - 1) * 100;
        if (worst === null || chg < worst) worst = chg;
        if (best === null || chg > best) best = chg;
      }

      history[sym] = {
        ...cagrs,
        ...(wantSeries ? { series: asc } : {}),
        full,
        yearsAvailable: maxYears,
        firstDate: asc[0].t,
        lastDate: last.t,
        worstYear: worst === null ? null : Math.round(worst * 10) / 10,
        bestYear: best === null ? null : Math.round(best * 10) / 10,
      };
    } catch (e) {
      history[sym] = { error: e?.message || 'fetch error' };
    }
  }));

  // History changes slowly — cache for a day, serve stale for a week.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).json({ history });
}
