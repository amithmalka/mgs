// Live EOD prices, daily change and 30-day OHLC series.
//
// Financial Modeling Prep is the primary source when FMP_API_KEY is set, and
// Twelve Data is the fallback for whatever FMP will not serve. Either key alone
// is enough to run. Twelve Data's free tier is ~8 credits/min and 800/day — one
// symbol costs one credit — so the response is still cached hard.
//
// NOTE: LSE/Euronext ETF symbols may need an exchange suffix in Twelve Data
// (e.g. "I500:LSE"). Forex is "USD/ILS" here and FMP's adapter drops the slash.
import { fmpSeries } from './fmp.js';

/** Batch size kept under the free-tier per-minute credit budget. */
const MAX_SYMBOLS = 12;

export default async function handler(req, res) {
  const key = process.env.TWELVE_DATA_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;
  if (!key && !fmpKey) {
    return res.status(500).json({ error: 'אין מפתח ספק נתונים: הגדירו FMP_API_KEY או TWELVE_DATA_API_KEY' });
  }

  const symbols = String(req.query.symbols || '')
    .split(',').map(s => s.trim()).filter(Boolean).slice(0, MAX_SYMBOLS);
  if (!symbols.length) return res.status(400).json({ error: 'no symbols' });

  // Number of daily bars to return; enough for a 30-day change plus candles.
  const bars = Math.min(120, Math.max(2, Number(req.query.bars) || 31));

  const prices = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      if (fmpKey) {
        try {
          const hit = await fmpSeries(sym, bars, fmpKey);
          if (hit) { prices[sym] = hit; return; }
        } catch {
          // fall through to the other provider rather than failing the symbol
        }
      }
      if (!key) { prices[sym] = { error: 'no data' }; return; }
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}`
        + `&interval=1day&outputsize=${bars}&apikey=${key}`;
      const r = await fetch(url);
      const j = await r.json();

      if (j.status === 'error' || !Array.isArray(j.values) || j.values.length < 2) {
        prices[sym] = { error: j.message || 'no data' };
        return;
      }

      // Twelve Data returns newest first. Reverse to chronological for charting.
      const asc = j.values.slice().reverse().map(v => ({
        t: v.datetime,
        o: parseFloat(v.open),
        h: parseFloat(v.high),
        l: parseFloat(v.low),
        c: parseFloat(v.close),
      })).filter(b => Number.isFinite(b.c));

      if (asc.length < 2) { prices[sym] = { error: 'no data' }; return; }

      const last = asc[asc.length - 1];
      const prev = asc[asc.length - 2];
      const first = asc[0];

      const round2 = n => Math.round(n * 100) / 100;
      const pct = (a, b) => (b > 0 ? Math.round((a / b - 1) * 1000) / 10 : 0);

      prices[sym] = {
        price: last.c,
        // Day move: last close against the previous close.
        prevClose: prev.c,
        change: round2(last.c - prev.c),
        changePct: pct(last.c, prev.c),
        // Change across the whole window we fetched (~30 trading days).
        perf30: pct(last.c, first.c),
        high: last.h,
        low: last.l,
        open: last.o,
        currency: j.meta?.currency || null,
        exchange: j.meta?.exchange || null,
        candles: asc,
        source: 'twelvedata',
      };
    } catch (e) {
      prices[sym] = { error: e?.message || 'fetch error' };
    }
  }));

  // Cache hard: EOD data changes once a day, and the free tier is tight.
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  return res.status(200).json({ prices });
}
