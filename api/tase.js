// Last reported Tel Aviv price, in shekels, per security number.
//
// Why this exists at all: the market-data provider on the current plan serves
// US-listed instruments and FX, and answers "available starting with the Grow
// plan" for London and SIX. The Tel Aviv securities this plan actually buys
// are not in it at any plan. The exchange publishes them itself, so this
// proxies that — from the server, because the exchange sends no CORS header
// and refuses requests without a browser's own headers.
//
// This is an END-OF-DAY rate. The exchange reports the rate carried into the
// next session, with the date it belongs to. There is no intraday price here
// and no pre-market: those do not exist in this source.

/** Security numbers are 6-8 digits. Nothing else is ever put in the URL. */
const ID = /^[0-9]{6,8}$/;
const MAX_IDS = 8;

const HEAD = {
  // the exchange's endpoint answers 403 without these
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://market.tase.co.il/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
};

/** "23/10/2026" -> "2026-10-23"; anything else -> null. */
function isoDate(v) {
  const m = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(String(v || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export default async function handler(req, res) {
  const ids = String(req.query.ids || '')
    .split(',').map(s => s.trim()).filter(s => ID.test(s)).slice(0, MAX_IDS);
  if (!ids.length) return res.status(400).json({ error: 'no valid security numbers' });

  const prices = {};
  await Promise.all([...new Set(ids)].map(async (id) => {
    try {
      const r = await fetch(
        'https://api.tase.co.il/api/company/securitydata?securityId=' + encodeURIComponent(id),
        { headers: HEAD },
      );
      if (!r.ok) { prices[id] = { error: 'HTTP ' + r.status }; return; }
      const j = await r.json();
      // BaseRate is quoted in agorot, like every price on this exchange.
      const agorot = Number(j?.BaseRate);
      if (!Number.isFinite(agorot) || agorot <= 0) { prices[id] = { error: 'no rate' }; return; }
      const chg = Number(j?.Change);
      prices[id] = {
        price: Math.round(agorot) / 100,
        agorot,
        changePct: Number.isFinite(chg) ? chg : null,
        date: isoDate(j?.EODTradeDate),
        source: 'tase',
      };
    } catch (e) {
      prices[id] = { error: e?.message || 'fetch error' };
    }
  }));

  // An end-of-day rate changes once a session; do not hammer the exchange.
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
  return res.status(200).json({ prices });
}
