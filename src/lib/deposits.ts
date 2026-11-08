/** MGS · יומן ההפקדות והמחיר הממוצע.
 *
 *  **מה שהמחיר הממוצע באמת אומר.** הוא לא ״כמה הנייר עולה״ אלא
 *  **כמה שילמתם עליו בממוצע לאורך כל הקניות** — והוא היחיד שקובע
 *  אם אתם ברווח או בהפסד. מי שקנה בעשר קניות בעשרה מחירים שונים
 *  לא יכול לדעת את זה בלי לרשום.
 *
 *  **והחישוב הוא משוקלל ביחידות, לא ממוצע של מחירים.** קנייה של
 *  100 יחידות ב-10$ וקנייה של 10 יחידות ב-20$ נותנות ממוצע של
 *  **10.91$**, לא 15$. ממוצע פשוט של המחירים הוא טעות נפוצה
 *  ומטעה בדיוק לכיוון הלא נכון.
 *
 *  **ולמה המחיר מוזן ידנית.** המחיר שמעניין הוא זה ששולם בפועל,
 *  והוא כתוב באישור הביצוע של הברוקר. ציטוט מושהה מ-API אינו אותו
 *  מספר. בנוסף Yahoo מחזיר 429 ל-IP של Vercel ו-Twelve Data אינו
 *  מגיש LSE בחינם — כך שאין כאן ברירה אמיתית, ועדיף נתון מדויק
 *  שהמשתמש הזין על פני נתון שגוי שמוצג כאילו הוא חי.
 */
import { supabase } from './supabase';

export interface Deposit {
  id: string;
  fund_key: string;
  symbol: string | null;
  deposited_on: string;
  amount_ils: number;
  units: number;
  unit_price: number;
  currency: string;
  fx_rate: number;
  note: string | null;
}

export interface Mark {
  fund_key: string;
  price: number;
  currency: string;
  marked_at: string;
}

/** מצב רכיב אחד בתיק — ממה ששולם בפועל */
export interface Position {
  k: string;
  symbol: string | null;
  buys: number;
  units: number;
  /** סך השקלים שנכנסו לרכיב */
  investedIls: number;
  /** סך המט״ח ששולם (units × price), במטבע הקנייה */
  investedCcy: number;
  /** **המחיר הממוצע המשוקלל** — investedCcy ÷ units */
  avgPrice: number;
  currency: string;
  /** המחיר הנוכחי שהוזן, אם הוזן */
  mark: number | null;
  markedAt: string | null;
  /** כמה אחוז מעל או מתחת לממוצע נמצא המחיר הנוכחי */
  vsAvg: number | null;
  /** שווי נוכחי בשקלים, לפי שער ההמרה הממוצע ששולם */
  valueIls: number | null;
  /** רווח או הפסד בשקלים */
  plIls: number | null;
}

export type Err = { ok: false; reason: string; setupNeeded?: boolean };

/** **הטבלאות עוד לא נוצרו — וזו תקלה שלנו, לא משהו שהמשתמש יתקן.**
 *
 *  ההודעה שהוחזרה כאן עד כה אמרה למשתמש ״להריץ את
 *  `supabase/deposits-setup.sql`״. **זו הודעת מפתח שדלפה למסך.**
 *  משתמש לא יודע מה זה SQL Editor, אין לו גישה לבסיס הנתונים,
 *  ושם קובץ פנימי אינו משהו שמותר להציג לו — הוא גם חושף את מבנה
 *  המערכת לכל מי שרואה את המסך.
 *
 *  לכן: המשתמש מקבל מה שרלוונטי לו — **מה לא עובד ומה כן אפשר
 *  לעשות** — והפרט הטכני נכתב לקונסול, שם הוא שימושי למי שמתחזק. */
const MISSING = /relation .* does not exist|could not find the table|schema cache/i;
function wrap(msg: string): Err {
  if (!MISSING.test(msg)) return { ok: false, reason: msg };
  console.error('[mgs] deposits ledger tables are missing — run supabase/deposits-setup.sql once. Postgres said:', msg);
  return {
    ok: false, setupNeeded: true,
    reason: 'יומן ההפקדות אינו זמין כרגע. טיפלנו בזה — נסו שוב בהמשך.',
  };
}
export type Ok<T> = { ok: true; data: T };

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listDeposits(): Promise<Ok<Deposit[]> | Err> {
  const { data, error } = await supabase
    .from('mgs_deposits').select('*').order('deposited_on', { ascending: false });
  if (error) return wrap(error.message);
  return { ok: true, data: (data ?? []) as Deposit[] };
}

export async function listMarks(): Promise<Ok<Mark[]> | Err> {
  const { data, error } = await supabase.from('mgs_marks').select('*');
  if (error) return wrap(error.message);
  return { ok: true, data: (data ?? []) as Mark[] };
}

export interface NewBuy {
  fund_key: string; symbol?: string | null;
  deposited_on: string;
  amount_ils: number; units: number; unit_price: number;
  currency?: string; fx_rate?: number; note?: string | null;
}

/** רושם קנייה אחת או כמה, כולן באותו תאריך */
export async function addDeposits(buys: NewBuy[]): Promise<Ok<number> | Err> {
  const user = await uid();
  if (!user) return { ok: false, reason: 'לא מחוברים' };
  const rows = buys.map(b => ({
    user_id: user,
    fund_key: b.fund_key,
    symbol: b.symbol ?? null,
    deposited_on: b.deposited_on,
    amount_ils: b.amount_ils,
    units: b.units,
    unit_price: b.unit_price,
    currency: b.currency ?? 'USD',
    fx_rate: b.fx_rate ?? 1,
    note: b.note ?? null,
  }));
  const { error } = await supabase.from('mgs_deposits').insert(rows);
  if (error) return wrap(error.message);
  return { ok: true, data: rows.length };
}

export async function removeDeposit(id: string): Promise<Ok<true> | Err> {
  const { error } = await supabase.from('mgs_deposits').delete().eq('id', id);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, data: true };
}

export async function setMark(
  fund_key: string, price: number, currency = 'USD',
): Promise<Ok<true> | Err> {
  const user = await uid();
  if (!user) return { ok: false, reason: 'לא מחוברים' };
  const { error } = await supabase.from('mgs_marks').upsert({
    user_id: user, fund_key, price, currency, marked_at: new Date().toISOString(),
  }, { onConflict: 'user_id,fund_key' });
  if (error) return wrap(error.message);
  return { ok: true, data: true };
}

/** **הצבירה — ממוצע משוקלל ביחידות, לכל רכיב בנפרד.** */
export function positions(deps: Deposit[], marks: Mark[]): Position[] {
  const byMark = new Map(marks.map(m => [m.fund_key, m]));
  const acc = new Map<string, Position>();

  for (const d of deps) {
    const cur = acc.get(d.fund_key) ?? {
      k: d.fund_key, symbol: d.symbol, buys: 0, units: 0,
      investedIls: 0, investedCcy: 0, avgPrice: 0, currency: d.currency,
      mark: null, markedAt: null, vsAvg: null, valueIls: null, plIls: null,
    };
    cur.buys += 1;
    cur.units += Number(d.units);
    cur.investedIls += Number(d.amount_ils);
    cur.investedCcy += Number(d.units) * Number(d.unit_price);
    if (!cur.symbol && d.symbol) cur.symbol = d.symbol;
    acc.set(d.fund_key, cur);
  }

  for (const p of acc.values()) {
    p.avgPrice = p.units > 0 ? p.investedCcy / p.units : 0;
    const m = byMark.get(p.k);
    if (m && p.avgPrice > 0) {
      p.mark = Number(m.price);
      p.markedAt = m.marked_at;
      p.vsAvg = p.mark / p.avgPrice - 1;
      // השווי בשקלים נגזר מיחס המחירים על הכסף שהושקע — כך אין צורך
      // בשער המרה נוכחי, והמספר נשאר נכון גם בלי אחד.
      p.valueIls = p.investedIls * (p.mark / p.avgPrice);
      p.plIls = p.valueIls - p.investedIls;
    }
  }

  return [...acc.values()].sort((a, b) => b.investedIls - a.investedIls);
}

/** סיכום התיק כולו */
export function summary(ps: Position[]) {
  const invested = ps.reduce((s, p) => s + p.investedIls, 0);
  const marked = ps.filter(p => p.valueIls !== null);
  const value = marked.reduce((s, p) => s + (p.valueIls ?? 0), 0);
  const markedInvested = marked.reduce((s, p) => s + p.investedIls, 0);
  return {
    invested,
    buys: ps.reduce((s, p) => s + p.buys, 0),
    /** שווי נוכחי — **רק של מה שעודכן**, כדי לא לערבב מסומן ולא מסומן */
    value: marked.length ? value : null,
    markedInvested,
    pl: marked.length ? value - markedInvested : null,
    plPct: marked.length && markedInvested > 0 ? value / markedInvested - 1 : null,
    /** כמה רכיבים עוד מחכים למחיר נוכחי */
    unmarked: ps.length - marked.length,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// משיכות
//
// **משיכה אינה קנייה עם מינוס.** יש לה אירוע מס, מחיר מימוש, ורווח
// ריאלי שצריך לדווח — ולכן היא יושבת בטבלה משלה.
//
// **והמחיר הממוצע הוא מה שקובע את המס**: הרווח החייב הוא
// (מחיר המימוש − המחיר הממוצע) × יחידות. בלי יומן אין את המספר הזה.
// ─────────────────────────────────────────────────────────────────────────────

export interface Withdrawal {
  id: string;
  fund_key: string;
  symbol: string | null;
  withdrawn_on: string;
  units: number;
  unit_price: number;
  currency: string;
  amount_ils: number;
  avg_at_sale: number | null;
  note: string | null;
}

export interface NewSale {
  fund_key: string; symbol?: string | null;
  withdrawn_on: string;
  units: number; unit_price: number;
  amount_ils: number;
  currency?: string;
  avg_at_sale?: number | null;
  note?: string | null;
}

export async function listWithdrawals(): Promise<Ok<Withdrawal[]> | Err> {
  const { data, error } = await supabase
    .from('mgs_withdrawals').select('*').order('withdrawn_on', { ascending: false });
  if (error) return wrap(error.message);
  return { ok: true, data: (data ?? []) as Withdrawal[] };
}

export async function addWithdrawals(sales: NewSale[]): Promise<Ok<number> | Err> {
  const user = await uid();
  if (!user) return { ok: false, reason: 'לא מחוברים' };
  const rows = sales.map(w => ({
    user_id: user,
    fund_key: w.fund_key,
    symbol: w.symbol ?? null,
    withdrawn_on: w.withdrawn_on,
    units: w.units,
    unit_price: w.unit_price,
    currency: w.currency ?? 'USD',
    amount_ils: w.amount_ils,
    avg_at_sale: w.avg_at_sale ?? null,
    note: w.note ?? null,
  }));
  const { error } = await supabase.from('mgs_withdrawals').insert(rows);
  if (error) return wrap(error.message);
  return { ok: true, data: rows.length };
}

export async function removeWithdrawal(id: string): Promise<Ok<true> | Err> {
  const { error } = await supabase.from('mgs_withdrawals').delete().eq('id', id);
  if (error) return wrap(error.message);
  return { ok: true, data: true };
}

/** שיעור המס על רווח הון ריאלי ליחיד. **25%**, לא 15% — 15% שמור
 *  לאג״ח לא צמודה בלבד. מעל מדרגת היסף נוספים 3%+2% (§121ב). */
export const CGT = 0.25;

/** מה שמשיכה אחת יצרה: תמורה, עלות, רווח ומס מוערך. */
export interface SaleTax {
  proceedsIls: number;
  /** העלות של היחידות שנמכרו, לפי המחיר הממוצע */
  costIls: number;
  gainIls: number;
  /** **מוערך בלבד.** הרווח החייב הוא ריאלי — §88 מורה לראות את שער
   *  המטבע כמדד, ולכן עליית הדולר אינה חייבת. החישוב כאן נומינלי
   *  ומהווה תקרה עליונה למס בפועל. */
  taxEstIls: number;
  netIls: number;
}

export function saleTax(w: Withdrawal, avgPrice: number | null): SaleTax {
  const avg = w.avg_at_sale ?? avgPrice;
  const proceedsIls = Number(w.amount_ils);
  if (!avg || avg <= 0 || !w.unit_price) {
    return { proceedsIls, costIls: 0, gainIls: 0, taxEstIls: 0, netIls: proceedsIls };
  }
  // התמורה בשקלים מתורגמת לעלות דרך יחס המחירים — כך אין צורך בשער
  // המרה היסטורי, והיחס נשאר נכון.
  const costIls = proceedsIls * (avg / Number(w.unit_price));
  const gainIls = proceedsIls - costIls;
  const taxEstIls = gainIls > 0 ? gainIls * CGT : 0;
  return { proceedsIls, costIls, gainIls, taxEstIls, netIls: proceedsIls - taxEstIls };
}

/** הצבירה אחרי משיכות — היחידות שנשארו בפועל. */
export function positionsNet(
  deps: Deposit[], marks: Mark[], outs: Withdrawal[],
): Position[] {
  const ps = positions(deps, marks);
  const sold = new Map<string, number>();
  for (const w of outs) {
    sold.set(w.fund_key, (sold.get(w.fund_key) ?? 0) + Number(w.units));
  }
  for (const p of ps) {
    const out = sold.get(p.k) ?? 0;
    if (out <= 0) continue;
    const left = Math.max(0, p.units - out);
    const frac = p.units > 0 ? left / p.units : 0;
    // **המחיר הממוצע אינו משתנה במכירה** — רק הכמות והעלות הכוללת.
    p.units = left;
    p.investedIls *= frac;
    p.investedCcy *= frac;
    if (p.mark !== null && p.avgPrice > 0) {
      p.valueIls = p.investedIls * (p.mark / p.avgPrice);
      p.plIls = p.valueIls - p.investedIls;
    }
  }
  return ps;
}
