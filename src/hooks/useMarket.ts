/** **מצב השוק של הרגע הזה — מחירים, שיאים, שערים ומה שמוחזק בפועל.**
 *
 *  מסך האישור צריך את ארבעתם יחד: בלי מחיר אין יחידות, בלי שיא אין
 *  נפילה, בלי שער אין תרגום משקל לשקל, ובלי מה שמוחזק אין פער
 *  למשקל היעד. לכן הם נמשכים במקום אחד.
 *
 *  **המקור הוא `/api/etf`, ולא `/api/lse`.** הפרוקסי ל-Yahoo מחזיר
 *  429 לכל בקשה מאז 8.11.2026, ולכן הוא לא החזיר ולו מחיר אחד. הנתיב
 *  החדש שואל לפי **ISIN** — וזה גם נכון יותר: ה-ISIN הוא הקרן עצמה
 *  ולא קו מסחר מסוים שלה.
 *
 *  **ושיאים — מהמקור, לא מהדפדפן.** עד כה הנפילה נמדדה מול מקסימום
 *  ששמור ב-localStorage, כלומר **המקסימום מאז שהדפדפן הזה נפתח
 *  לראשונה**; בדפדפן חדש כל רכיב נראה על השיא וכלל הקנייה נשען על
 *  שקר. עכשיו `high52` מגיע מהמקור, והמטמון המקומי נשאר רק כגיבוי
 *  למי שהבקשה שלו נכשלה.
 *
 *  **ושני דברים שאינם מושלמים, ונאמרים במפורש.**
 *
 *  1. **המחיר הוא סגירה, לא זמן אמת**, ו**זירת הציטוט משתנה** —
 *     לונדון או פרנקפורט, לפי מה שזמין ל-ISIN. אותה קרן, לא בהכרח
 *     אותה אגורה כמו אצל הברוקר. לכן מספר היחידות הוא אומדן.
 *  2. **שערי המטבע נמשכים, ואם אין מפתח לספק הם נופלים לברירת מחדל**
 *     (3.70 / 4.00 / 4.65). ‏`ratesSource` אומר מה קרה, והמסך חייב
 *     להציג את זה — שער שגוי מזיז את מספר היחידות.
 */
import { useCallback, useEffect, useState } from 'react';
import { BUY } from '../constants/irish';
import { listDeposits, listMarks, listWithdrawals, positionsNet } from '../lib/deposits';
import { fetchPrices } from '../lib/marketData';
import type { Quote } from '../utils/buySplit';

const PEAKS_KEY = 'mgs-peaks';

/** ברירת המחדל כשאין ספק שערים — אותם מספרים שמחשבון המס מציג */
export const FALLBACK_RATES = { USD: 3.70, EUR: 4.00, GBP: 4.65 };

export type RatesSource = 'live' | 'fallback' | 'loading';

/** מה ש-`/api/etf` מחזיר לכל קרן */
export interface EtfQuote {
  price: number; currency: string; date: string | null;
  prevClose: number | null; change: number | null;
  high52: number | null; low52: number | null;
  fromHigh: number | null; venue: string | null; isin: string;
}

export interface MarketState {
  quotes: Record<string, Quote>;
  /** התשובה המלאה לכל קרן, לפי מפתח הקטלוג */
  etf: Record<string, EtfQuote>;
  /** תאריך הציטוט, וזירת המסחר שממנה הוא הגיע */
  quoteDate: string | null;
  venues: string[];
  peaks: Record<string, number>;
  held: Record<string, number>;
  rates: Record<string, number>;
  ratesSource: RatesSource;
  /** מתי הציטוטים נמשכו */
  at: Date | null;
  loading: boolean;
  /** שגיאת מחירים — החלוקה עדיין תוצג, לפי המשקלות */
  err: string | null;
  /** האם יומן ההפקדות קיים בכלל */
  ledger: 'ok' | 'missing' | 'loading';
  refresh: () => void;
}

function loadPeaks(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PEAKS_KEY) ?? '{}') as Record<string, number>; }
  catch { return {}; }
}
function savePeaks(p: Record<string, number>) {
  try { localStorage.setItem(PEAKS_KEY, JSON.stringify(p)); } catch { /* פרטי או חסום */ }
}

export function useMarket(holdings: Array<{ k: string; w: number }>): MarketState {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [etf, setEtf] = useState<Record<string, EtfQuote>>({});
  const [quoteDate, setQuoteDate] = useState<string | null>(null);
  const [venues, setVenues] = useState<string[]>([]);
  const [peaks, setPeaks] = useState<Record<string, number>>(loadPeaks);
  const [held, setHeld] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<Record<string, number>>(
    { ...FALLBACK_RATES, GBp: FALLBACK_RATES.GBP / 100, ILS: 1 });
  const [ratesSource, setRatesSource] = useState<RatesSource>('loading');
  const [at, setAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ledger, setLedger] = useState<'ok' | 'missing' | 'loading'>('loading');
  const [tick, setTick] = useState(0);

  const keys = holdings.map(h => h.k).join(',');

  // מה שמוחזק בפועל — ואם היומן לא מותקן, ריק וזה תקין
  useEffect(() => {
    void (async () => {
      const [d, m, w] = await Promise.all([listDeposits(), listMarks(), listWithdrawals()]);
      if (!d.ok || !m.ok || !w.ok) { setLedger('missing'); return; }
      const next: Record<string, number> = {};
      for (const q of positionsNet(d.data, m.data, w.data)) next[q.k] = q.units;
      setHeld(next); setLedger('ok');
    })();
  }, [tick]);

  // השערים — נמשכים, ואם לא הצליחו נאמר שנפלנו לברירת מחדל
  useEffect(() => {
    void (async () => {
      try {
        const p = await fetchPrices(['USD/ILS', 'EUR/ILS', 'GBP/ILS']);
        const pick = (k: string, d: number) => {
          const v = p[k]?.price;
          return typeof v === 'number' && v > 0 ? v : d;
        };
        const usd = pick('USD/ILS', FALLBACK_RATES.USD);
        const got = usd !== FALLBACK_RATES.USD || !!p['USD/ILS']?.price;
        const gbp = pick('GBP/ILS', FALLBACK_RATES.GBP);
        // `GBp` הוא פני ולא לירה — קרנות ב-LSE נקובות בו, ובלי השורה
        // הזאת כל חישוב עליהן יוצא פי מאה
        setRates({
          USD: usd,
          EUR: pick('EUR/ILS', FALLBACK_RATES.EUR),
          GBP: gbp, GBp: gbp / 100,
          ILS: 1,
        });
        setRatesSource(got ? 'live' : 'fallback');
      } catch {
        setRatesSource('fallback');
      }
    })();
  }, [tick]);

  // הציטוטים, והשיאים שמתעדכנים מהם
  const pull = useCallback(async () => {
    if (!holdings.length) return;
    setLoading(true);
    try {
      const ks = holdings.map(h => h.k).join(',');
      const r = await fetch(`/api/etf?keys=${encodeURIComponent(ks)}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json() as { quotes?: Record<string, EtfQuote> };
      if (!j.quotes || !Object.keys(j.quotes).length) throw new Error('empty');

      setEtf(j.quotes);
      setErr(null); setAt(new Date());
      setQuoteDate(Object.values(j.quotes).map(q => q.date).filter(Boolean).sort().pop() ?? null);
      setVenues([...new Set(Object.values(j.quotes).map(q => q.venue).filter(Boolean) as string[])]);

      // **הציטוטים נשמרים לפי סימול**, כי `buySplit` מחפש לפיו
      const bySym: Record<string, Quote> = {};
      for (const h of holdings) {
        const q = j.quotes[h.k];
        const sym = BUY[h.k]?.sym;
        if (q && sym) bySym[sym] = { price: q.price, currency: q.currency, change: q.change };
      }
      setQuotes(bySym);

      // **השיא מהמקור מנצח את המטמון המקומי**, ומעדכן אותו —
      // כך שגם אם המקור ייפול מחר, הערך האחרון שנמדד נשאר.
      setPeaks(prev => {
        const next = { ...prev };
        for (const h of holdings) {
          const q = j.quotes![h.k];
          if (!q) continue;
          const hi = q.high52 ?? q.price;
          next[h.k] = Math.max(next[h.k] ?? 0, hi);
        }
        savePeaks(next);
        return next;
      });
    } catch {
      setErr('לא הצלחנו למשוך מחירים — אפשר להזין אותם ידנית');
    } finally { setLoading(false); }
  }, [keys]);

  useEffect(() => { void pull(); }, [pull, tick]);

  return {
    quotes, etf, quoteDate, venues, peaks, held, rates, ratesSource, at, loading, err, ledger,
    refresh: () => setTick(t => t + 1),
  };
}
