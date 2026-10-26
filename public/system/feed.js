/* ───────── MGS · שליפת שערים מהשוק ─────────
   שתי בורסות, שני מקורות, ושני דברים שונים לגמרי מבחינת דיוק:

   תל אביב  — /api/tase מחזיר את השער שהבורסה בתל אביב מדווחת לנייר עצמו,
              באגורות, והשרת ממיר לשקלים. זה שער הנייר. exact=true.
   חו״ל     — ספק הנתונים בתוכנית הנוכחית אינו מכסה את לונדון ואת SIX
              ("available starting with the Grow plan"), ולכן מה שנשלף הוא
              הנייר האמריקאי שעוקב אחרי אותו מדד. אחוז הירידה מהשיא — שהוא
              מה שקובע את חלוקת ההפקדה — נכון. מספר היחידות מקורב. exact=false.

   בשני המקרים זה שער סגירה. אין פה שער תוך-יומי ואין פרי-מרקט:
   הם לא קיימים במקורות האלה. */

/** מספר שנראה כמו שער. כל מה שחוזר מהרשת עובר כאן לפני שהוא נוגע במערכת. */
const fNum = v => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 && n < 1e12 ? n : null;
};
/** "2026-10-23" → 20261023, וכל דבר אחר → null */
const fDate = v => {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(v == null ? "" : v));
  if (!m) return null;
  const n = +m[1] * 10000 + +m[2] * 100 + +m[3];
  return n >= 19700101 && n <= 21001231 ? n : null;
};

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); }
  catch (e) {
    throw new Error(/<!doctype html|<html/i.test(txt)
      ? "שליפת שערים עובדת רק באתר הפרוס, לא בשרת פיתוח מקומי"
      : "תגובה לא צפויה מהשרת (HTTP " + r.status + ")");
  }
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "HTTP " + r.status);
  return j;
}

/**
 * מחזיר {dateN, BTC, SEM, TEC, exact, per:{t:{dateN,exact}}} או זורק.
 * לא כותב לשום מקום — הקורא מחליט מה לעשות עם זה.
 */
async function fetchRates(mkt) {
  const want = {};
  for (const t of K) {
    const f = INST[t] && INST[t][mkt] && INST[t][mkt].feed;
    if (!f) throw new Error("אין מקור מוגדר ל" + NM[t] + " ב" + MKT[mkt].nm);
    want[t] = f;
  }
  const kinds = new Set(Object.values(want).map(f => f.kind));
  if (kinds.size !== 1) throw new Error("מקורות מעורבים אינם נתמכים");
  const kind = [...kinds][0];

  const keys = [...new Set(Object.values(want).map(f => f.key))];
  const j = kind === "tase"
    ? await getJson("/api/tase?ids=" + encodeURIComponent(keys.join(",")))
    : await getJson("/api/prices?symbols=" + encodeURIComponent(keys.join(",")) + "&bars=2");

  const src = j && j.prices;
  if (!src || typeof src !== "object") throw new Error("אין שערים בתשובה");

  const out = { per: {} }, miss = [], dates = [];
  let exact = true;
  for (const t of K) {
    const hit = src[want[t].key];
    const px = hit ? fNum(hit.price) : null;
    if (px === null) { miss.push(NM[t]); continue; }
    out[t] = px;
    if (!want[t].exact) exact = false;
    const d = hit ? fDate(hit.date) || fDate((hit.candles || []).length
      ? hit.candles[hit.candles.length - 1].t : null) : null;
    if (d) dates.push(d);
    out.per[t] = { dateN: d, exact: !!want[t].exact };
  }
  if (miss.length) throw new Error("לא חזר שער ל: " + miss.join(", "));

  // התאריך המשותף הוא הישן שבהם — שער משולב לא יכול להיות טרי מהרכיב הכי מאחר
  out.dateN = dates.length ? Math.min.apply(null, dates) : null;
  out.exact = exact;
  return out;
}
