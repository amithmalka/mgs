// שערים חיים לקרנות האיריות, כדי שאפשר יהיה לאמת שהפקודה היא על
// הנייר הנכון לפני ששולחים אותה.
//
// למה שרת ולמה לא מהדפדפן: Yahoo אינו מחזיר כותרות CORS, ולכן קריאה
// ישירה מהדף נחסמת. הפונקציה הזאת מושכת בצד השרת ומחזירה רק את מה
// שהדף צריך — מחיר, מטבע, שינוי, נפח ושעת העדכון.
//
// הסימולים מוגבלים לרשימה סגורה בכוונה: הפונקציה אינה פרוקסי כללי
// ל-Yahoo, והיא לא תמשוך שום נייר שאינו בקטלוג.

/** 24 הקווים הדולריים בלונדון, ועוד אחד באמסטרדם. סגור ולא ניתן להרחבה
 *  דרך הבקשה — זה מה שמונע שימוש בפונקציה כפרוקסי פתוח. */
const ALLOWED = {
  CSPX: 'CSPX.L', VUAA: 'VUAA.L', SPYL: 'SPYL.L', SPXS: 'SPXS.L',
  ISAC: 'ISAC.L', ACWD: 'ACWD.L', FWRA: 'FWRA.L', VWRA: 'VWRA.L',
  IWDA: 'IWDA.L', MXWO: 'MXWO.L', IUIT: 'IUIT.L', XLKS: 'XLKS.L',
  WTEC: 'WTEC.L', CNDX: 'CNDX.L', EQQS: 'EQQS.L', IWMO: 'IWMO.L',
  SMH: 'SMH.L', GDX: 'GDX.L', IAUP: 'IAUP.L', R2US: 'R2US.L',
  NDIA: 'NDIA.L', RBOT: 'RBOT.L', BCHN: 'BCHN.L', KWEB: 'KWEB.L',
  SEMI: 'SEMI.AS',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

async function one(sym) {
  const u = 'https://query2.finance.yahoo.com/v8/finance/chart/'
    + encodeURIComponent(sym) + '?range=5d&interval=1d';
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!r.ok) return { upstream: r.status };
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) return null;
  const m = res.meta || {};
  const px = m.regularMarketPrice ?? null;
  const prev = m.previousClose ?? m.chartPreviousClose ?? null;
  return {
    price: px,
    currency: m.currency ?? null,
    prevClose: prev,
    change: px != null && prev ? (px / prev - 1) : null,
    volume: m.regularMarketVolume ?? null,
    state: m.marketState ?? null,
    // חותמת הזמן של העסקה האחרונה — זה מה שאומר אם המספר חי או סגירה
    time: m.regularMarketTime ?? null,
    exchange: m.fullExchangeName ?? null,
  };
}

/** נפילה ל-FMP כש-Yahoo מגביל. FMP משתמש בסיומת ‎.L ללונדון ו-‎.AS
 *  לאמסטרדם — אותה צורה בדיוק. */
async function viaFmp(sym) {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const u = 'https://financialmodelingprep.com/stable/quote?symbol='
    + encodeURIComponent(sym) + '&apikey=' + key;
  const r = await fetch(u);
  if (!r.ok) return { upstream: 'fmp ' + r.status };
  const j = await r.json();
  const q = Array.isArray(j) ? j[0] : null;
  if (!q || q.price == null) return null;
  return {
    price: q.price, currency: null,
    prevClose: q.previousClose ?? null,
    change: q.previousClose ? (q.price / q.previousClose - 1) : null,
    volume: q.volume ?? null, state: null,
    time: q.timestamp ?? null, exchange: q.exchange ?? null,
    src: 'fmp',
  };
}

export default async function handler(req, res) {
  const want = String(req.query.symbols || '')
    .split(',').map(s => s.trim().toUpperCase())
    .filter(s => Object.prototype.hasOwnProperty.call(ALLOWED, s));

  const keys = want.length ? want : Object.keys(ALLOWED);

  try {
    const out = {};
    // במנות קטנות, כדי לא להיחסם מהצד השני
    for (let i = 0; i < keys.length; i += 6) {
      const batch = keys.slice(i, i + 6);
      const got = await Promise.all(batch.map(k => one(ALLOWED[k]).catch(() => null)));
      for (let n = 0; n < batch.length; n++) {
        const k = batch[n];
        let q = got[n];
        // Yahoo מגביל את ה-IP של Vercel (429) — אז נופלים ל-FMP
        if (!q || q.upstream || q.price == null) {
          const alt = await viaFmp(ALLOWED[k]).catch(() => null);
          if (alt && alt.price != null) q = alt;
        }
        if (q) out[k] = q;
      }
    }
    // 20 שניות מטמון בקצה — מספיק טרי למסך, ומונע הצפה של המקור
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    res.status(200).json({ asOf: Date.now(), quotes: out });
  } catch (e) {
    res.status(502).json({ error: 'upstream failed' });
  }
}
