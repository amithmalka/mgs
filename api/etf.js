// **מחירים לקרנות האיריות — לפי ISIN, בלי מפתח ובלי מכסה.**
//
// ───────────────────────────────────────────────────────────────────────────
// **למה הנתיב הזה נולד.** נבדקו שלושה ספקים ב-8.11.2026 ואף אחד לא
// החזיר את הקווים האיריים:
//   · **Yahoo** (`/api/lse`) — 429 לכל בקשה, גם מ-Vercel וגם ממכונה מקומית.
//   · **Twelve Data** — ״available starting with the Grow plan״ ל-LSE.
//   · **FMP** — ``no history`` ל-`XLKS.L`, `SMH.L`, `SPXS.L`.
//
// התוצאה הייתה שמסך ההפקדה לא ידע מחירים: אי אפשר היה לגזור יחידות,
// לא היה מחיר עלות ממוצע, **וכלל המשיכה לא יכול היה לפעול בכלל.**
//
// **מה שכן עובד הוא חיפוש לפי ISIN**, וזה דווקא מתאים: הקטלוג שומר
// ISIN לכל קרן, וה-ISIN הוא הקרן עצמה — לא קו מסחר מסוים שלה.
// ───────────────────────────────────────────────────────────────────────────
//
// **ושני דברים שהמסך חייב לומר למשתמש.**
//
// 1. **זה אינו API מתועד.** זו נקודה פנימית של אתר, והיא יכולה
//    להשתנות או להיחסם בלי הודעה. לכן כל כישלון כאן חוזר כשקט ולא
//    כשגיאה — המסך נופל חזרה להזנה ידנית, שקיימת ועובדת.
// 2. **זירת הציטוט משתנה** — לפעמים לונדון ולפעמים פרנקפורט, לפי מה
//    שזמין לאותו ISIN. זו אותה קרן בדיוק, אבל **לא בהכרח אותה אגורה**
//    כמו אצל הברוקר. לכן `venue` חוזר, והמסך מציג אותו: מספר היחידות
//    הוא אומדן, והסכום בשקלים הוא מה שמחייב.
//
// **ומה שמרוויחים מזה מעבר למחיר:** `quoteLowHigh` מחזיר את **שיא 52
// השבועות האמיתי**. עד כה הנפילה מהשיא נמדדה מול מקסימום ששמור
// ב-localStorage, כלומר **המקסימום מאז שהדפדפן הזה נפתח לראשונה** —
// ובדפדפן חדש כל רכיב נראה כאילו הוא על השיא, וכלל הקנייה נשען על
// שקר. עכשיו הוא נשען על שיא שנמדד.

/** הקרנות שבקטלוג, לפי ISIN. סגור בכוונה — זה אינו פרוקסי כללי. */
const ALLOWED = {
  SPXS: 'IE00B3YCGJ38',
  CSPX: 'IE00B5BMR087',
  MXWO: 'IE00B60SX394',
  IWDA: 'IE00B4L5Y983',
  VWRA: 'IE00BK5BQT80',
  XLKS: 'IE00B3VSSL01',
  WTEC: 'IE00BYTRRD19',
  SMH:  'IE00BMC38736',
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function one(isin) {
  const u = `https://www.justetf.com/api/etfs/${encodeURIComponent(isin)}/quote`
    + `?locale=en&currency=USD&isin=${encodeURIComponent(isin)}`;
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) return null;
  const j = await r.json();

  const price = num(j?.latestQuote?.raw);
  if (price == null || price <= 0) return null;

  const high = num(j?.quoteLowHigh?.high?.raw);
  const low = num(j?.quoteLowHigh?.low?.raw);
  const prev = num(j?.previousQuote?.raw);

  return {
    price,
    currency: 'USD',
    // תאריך הציטוט — זה מה שאומר אם המספר של היום או של אתמול
    date: typeof j?.latestQuoteDate === 'string' ? j.latestQuoteDate : null,
    prevClose: prev,
    change: prev && prev > 0 ? price / prev - 1 : null,
    high52: high,
    low52: low,
    // **הנפילה מהשיא — המספר שכלל הקנייה פועל עליו**, ועכשיו משיא
    // שנמדד ולא ממקסימום מקומי
    fromHigh: high && high > 0 ? Math.max(0, 1 - price / high) : null,
    venue: typeof j?.quoteTradingVenue === 'string' ? j.quoteTradingVenue : null,
  };
}

export default async function handler(req, res) {
  const want = String(req.query.keys || '')
    .split(',').map(s => s.trim().toUpperCase())
    .filter(k => Object.prototype.hasOwnProperty.call(ALLOWED, k));

  const keys = want.length ? want : Object.keys(ALLOWED);

  try {
    const out = {};
    // במנות קטנות ולא בבת אחת — שמונה בקשות מקבילות לאתר אחד הן
    // בדיוק הדפוס שגורם לחסימה
    for (let i = 0; i < keys.length; i += 4) {
      const batch = keys.slice(i, i + 4);
      const got = await Promise.all(batch.map(k => one(ALLOWED[k]).catch(() => null)));
      for (let n = 0; n < batch.length; n++) {
        if (got[n]) out[batch[n]] = { ...got[n], isin: ALLOWED[batch[n]] };
      }
    }
    // סגירה יומית משתנה פעם ביום; מטמון ארוך גם מגן על המקור
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json({ asOf: Date.now(), quotes: out });
  } catch {
    res.status(502).json({ error: 'upstream failed' });
  }
}
