/** MGS · אישור ההפקדה, המחיר הממוצע וההתקדמות בתיק.
 *
 *  **מה שהמסך הזה עונה עליו, ושום תחזית לא יכולה:** מה באמת קרה.
 *  כמה שילמתם, באיזה מחיר, וכמה הנייר עומד היום ביחס אליו.
 *
 *  **המחיר הממוצע הוא משוקלל ביחידות ולא ממוצע של מחירים.** זו
 *  הנקודה שבה רוב האנשים טועים: 100 יחידות ב-10$ ועוד 10 ב-20$
 *  נותנות **10.91$**, לא 15$ — כי קנו הרבה יותר בזול.
 *
 *  **ובדיוק זה מה שמנגנון הקנייה עושה.** הוא שולח יותר כסף למה
 *  שירד, ולכן הממוצע נדחף מטה מתחת לאמצע הטווח. הטור ״מול הממוצע״
 *  הוא המקום היחיד שבו רואים את זה על כסף אמיתי ולא בסימולציה.
 *
 *  **המחיר הנוכחי מוזן ידנית, במכוון.** הוא נמצא ממילא מול העיניים
 *  באפליקציית הברוקר, ו-Yahoo חוסם את ה-IP של Vercel. עדיף מספר
 *  מדויק שהוזן מאשר מספר שגוי שמוצג כאילו הוא חי.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stat } from '../shared/Stat';
import { IRISH, BUY } from '../../constants/irish';
import { useMyPortfolio, totalWeight } from '../../store/myPortfolio';
import {
  listDeposits, listMarks, addDeposits, removeDeposit, setMark,
  listWithdrawals, addWithdrawals, removeWithdrawal,
  positionsNet, summary, saleTax, CGT,
  type Deposit, type Mark, type NewBuy, type Withdrawal, type NewSale,
} from '../../lib/deposits';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const today = () => new Date().toISOString().slice(0, 10);

export function DepositLog({ toBroker, onBuild }: { toBroker: number; onBuild?: () => void }) {
  const { holdings } = useMyPortfolio();
  const [deps, setDeps] = useState<Deposit[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [outs, setOuts] = useState<Withdrawal[]>([]);
  /** איזה טופס פתוח: קנייה, מכירה, או כלום */
  const [mode, setMode] = useState<'buy' | 'sell' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [setupNeeded, setSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  /** טופס הקנייה: סכום ומחיר לכל רכיב */
  const [form, setForm] = useState<Record<string, { ils: string; px: string }>>({});
  /** טופס המכירה: רכיב אחד בלבד — יחידות ומחיר */
  const [sell, setSell] = useState({ k: '', units: '', px: '', ils: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [d, m, w] = await Promise.all([listDeposits(), listMarks(), listWithdrawals()]);
    if (!d.ok) { setErr(d.reason); setSetup(!!d.setupNeeded); }
    else { setDeps(d.data); setErr(null); setSetup(false); }
    if (m.ok) setMarks(m.data);
    if (w.ok) setOuts(w.data);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const tot = totalWeight(holdings);
  const ps = useMemo(() => positionsNet(deps, marks, outs), [deps, marks, outs]);
  const sum = useMemo(() => summary(ps), [ps]);

  /** פתיחת הטופס ממלאת מראש את החלוקה לפי המשקלות */
  const openForm = () => {
    const f: Record<string, { ils: string; px: string }> = {};
    for (const h of holdings) {
      f[h.k] = { ils: tot > 0 ? String(Math.round(toBroker * h.w / tot)) : '', px: '' };
    }
    setForm(f); setDate(today()); setMode('buy');
  };

  const rows = useMemo(() => holdings.map(h => {
    const f = IRISH.find(x => x.k === h.k);
    const v = form[h.k] ?? { ils: '', px: '' };
    const ils = Number(v.ils) || 0;
    const px = Number(v.px) || 0;
    // היחידות נגזרות ואינן מוזנות: סכום חלקי מחיר. פחות שדות, פחות טעויות.
    const units = px > 0 ? ils / px : 0;
    return { h, f, v, ils, px, units };
  }), [holdings, form]);

  const ready = rows.length > 0 && rows.every(r => r.ils > 0 && r.px > 0);
  const formTotal = rows.reduce((s, r) => s + r.ils, 0);

  const save = async () => {
    setSaving(true);
    const buys: NewBuy[] = rows.map(r => ({
      fund_key: r.h.k,
      symbol: BUY[r.h.k]?.sym ?? null,
      deposited_on: date,
      amount_ils: r.ils,
      units: r.units,
      unit_price: r.px,
      currency: BUY[r.h.k]?.cur ?? 'USD',
    }));
    const res = await addDeposits(buys);
    if (!res.ok) setErr(res.reason);
    else { setMode(null); await load(); }
    setSaving(false);
  };

  const mark = async (k: string, price: number) => {
    const r = await setMark(k, price, BUY[k]?.cur ?? 'USD');
    if (!r.ok) setErr(r.reason); else await load();
  };

  if (!holdings.length) {
    return (
      <section className="mp-empty">
        <span className="eyebrow">ההפקדות שלי</span>
        <h2>אין עדיין תיק לרשום אליו</h2>
        <p className="lede">
          <b>אחרי שבוחרים תיק</b>, כל הפקדה נרשמת כאן — המחיר ששולם,
          המחיר הממוצע שנצבר, וכמה הנייר עומד היום ביחס אליו.
        </p>
        {onBuild && (
          <div className="cta">
            <button className="opt mp-go" type="button" onClick={onBuild}>
              לבחור את התיק שלי
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="dl">
      <span className="eyebrow">ההפקדות שלי</span>
      <h2>מה באמת הפקדתם, ובאיזה מחיר</h2>
      <p className="lede">
        <b>המחיר הממוצע הוא המספר שקובע אם אתם ברווח.</b> הוא מחושב{' '}
        <b>משוקלל ביחידות</b> מכל הקניות — ומנגנון הקנייה דוחף אותו
        מטה, כי הוא קונה יותר כשזול.
      </p>

      <div className="stats">
        <Stat label="סך שהופקד" value={`${n0(sum.invested)}₪`}
          sub={`${sum.buys} קניות`} tone="gold" />
        <Stat label="שווי נוכחי"
          value={sum.value !== null ? `${n0(sum.value)}₪` : '—'}
          sub={sum.value !== null
            ? (sum.unmarked > 0 ? `${sum.unmarked} רכיבים בלי מחיר` : 'כל הרכיבים מעודכנים')
            : 'עדכנו מחיר נוכחי'} />
        <Stat label={sum.pl !== null && sum.pl < 0 ? 'הפסד על הנייר' : 'רווח על הנייר'}
          value={sum.pl !== null ? `${sum.pl >= 0 ? '+' : '−'}${n0(Math.abs(sum.pl))}₪` : '—'}
          sub={sum.plPct !== null ? sg(sum.plPct) : 'אין מספיק נתונים'}
          tone={sum.pl !== null && sum.pl >= 0 ? 'up' : undefined} />
        <Stat label="רכיבים בתיק" value={String(holdings.length)}
          sub={`${ps.length} עם קניות רשומות`} />
      </div>

      <div className="cta dl-cta">
        <button className="opt mp-go" type="button" onClick={openForm}>
          ✓ אישור הפקדה
        </button>
        <button className="opt" type="button"
          disabled={!ps.length}
          onClick={() => {
            const first = ps[0];
            setSell({ k: first?.k ?? '', units: '', px: String(first?.mark ?? ''), ils: '' });
            setDate(today()); setMode('sell');
          }}>
          ↓ אישור משיכה
        </button>
        <button className="opt" type="button" onClick={() => void load()}>
          רענון
        </button>
      </div>

      {err && (
        <p className="lab-access warn">
          {err}
          {setupNeeded && (
            <> ההרצה היא פעם אחת ב-SQL Editor של Supabase, והיא יוצרת
              את הטבלאות עם הרשאות שבהן <b>כל אחד רואה רק את שלו</b>.</>
          )}
        </p>
      )}
      {loading && <p className="note">טוען…</p>}

      {mode === 'buy' && (
        <div className="dl-form">
          <header>
            <b>רישום ההפקדה</b>
            <label className="own">
              <input className="amt dl-date" type="date" value={date}
                aria-label="תאריך ההפקדה"
                onChange={e => setDate(e.target.value)} />
            </label>
            <button className="opt" type="button" onClick={() => setMode(null)}>ביטול</button>
          </header>
          <p className="note">
            <b>מזינים את הסכום ואת המחיר ששולם לכל רכיב</b> — מאישור
            הביצוע בברוקר. <b>היחידות מחושבות לבד</b>, כדי שלא יהיה
            שדה אחד שאפשר לטעות בו.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th className="lead">הרכיב</th><th>סימול</th>
                  <th>כמה שקלים</th><th>מחיר ליחידה</th><th>יחידות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.h.k}>
                    <td className="lead">{r.f?.he ?? r.h.k}</td>
                    <td dir="ltr" className="tk">{BUY[r.h.k]?.sym ?? '—'}</td>
                    <td>
                      <input className="amt" type="number" min={0} step={1}
                        value={r.v.ils} aria-label={`סכום ${r.f?.he}`}
                        onChange={e => setForm(f => ({ ...f, [r.h.k]: { ...r.v, ils: e.target.value } }))} />
                    </td>
                    <td>
                      <input className="amt" type="number" min={0} step="0.01"
                        value={r.v.px} aria-label={`מחיר ${r.f?.he}`}
                        placeholder={BUY[r.h.k]?.cur ?? 'USD'}
                        onChange={e => setForm(f => ({ ...f, [r.h.k]: { ...r.v, px: e.target.value } }))} />
                    </td>
                    <td dir="ltr" className="dim">
                      {r.units > 0 ? r.units.toFixed(4) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cta">
            <span className="dl-sum">
              סך ההפקדה: <b dir="ltr">{n0(formTotal)}₪</b>
              {toBroker > 0 && formTotal !== Math.round(toBroker) && (
                <em> (התכנון היה {n0(toBroker)}₪)</em>
              )}
            </span>
            <button className="opt mp-go" type="button"
              disabled={!ready || saving} onClick={() => void save()}>
              {saving ? 'שומר…' : 'לאשר ולשמור'}
            </button>
          </div>
          {!ready && (
            <p className="note">צריך סכום ומחיר לכל רכיב כדי לשמור.</p>
          )}
        </div>
      )}

      {mode === 'sell' && (() => {
        const p = ps.find(x => x.k === sell.k) ?? null;
        const units = Number(sell.units) || 0;
        const px = Number(sell.px) || 0;
        const ils = Number(sell.ils) || 0;
        const f = IRISH.find(x => x.k === sell.k);
        // הרווח נגזר מהמחיר הממוצע — זה מה שקובע את המס
        const gainCcy = p && px > 0 ? (px - p.avgPrice) * units : 0;
        const costIls = p && px > 0 && ils > 0 ? ils * (p.avgPrice / px) : 0;
        const gainIls = ils > 0 ? ils - costIls : 0;
        const taxIls = gainIls > 0 ? gainIls * CGT : 0;
        const over = p ? units > p.units : false;
        const ok = !!p && units > 0 && px > 0 && ils > 0 && !over;
        return (
          <div className="dl-form dl-sell">
            <header>
              <b>רישום משיכה</b>
              <label className="own">
                <input className="amt dl-date" type="date" value={date}
                  aria-label="תאריך המשיכה"
                  onChange={e => setDate(e.target.value)} />
              </label>
              <button className="opt" type="button" onClick={() => setMode(null)}>ביטול</button>
            </header>

            <div className="grp">
              <span className="glab">מאיזה רכיב</span>
              <select className="amt dl-pick" value={sell.k} aria-label="הרכיב"
                onChange={e => {
                  const k = e.target.value;
                  const q = ps.find(x => x.k === k);
                  setSell(v => ({ ...v, k, px: String(q?.mark ?? '') }));
                }}>
                {ps.map(q => (
                  <option key={q.k} value={q.k}>
                    {IRISH.find(x => x.k === q.k)?.he ?? q.k}
                  </option>
                ))}
              </select>
              <span className="glab">יחידות שנמכרו</span>
              <input className="amt" type="number" min={0} step="0.0001"
                value={sell.units} aria-label="יחידות"
                onChange={e => setSell(v => ({ ...v, units: e.target.value }))} />
              <span className="glab">מחיר מימוש</span>
              <input className="amt" type="number" min={0} step="0.01"
                value={sell.px} aria-label="מחיר מימוש"
                onChange={e => setSell(v => ({ ...v, px: e.target.value }))} />
              <span className="glab">התקבל ביד</span>
              <input className="amt" type="number" min={0} step={1}
                value={sell.ils} aria-label="סכום בשקלים"
                onChange={e => setSell(v => ({ ...v, ils: e.target.value }))} />
              <span className="glab">₪</span>
            </div>

            {p && (
              <div className="stats">
                <Stat label="נשאר בתיק" value={p.units.toFixed(3)}
                  sub={over ? 'יותר ממה שיש!' : `${f?.he ?? p.k}`}
                  tone={over ? undefined : 'up'} />
                <Stat label="המחיר הממוצע" value={n2(p.avgPrice)}
                  sub="זה מה שקובע את הרווח" tone="gold" />
                <Stat label={gainCcy >= 0 ? 'רווח על המכירה' : 'הפסד על המכירה'}
                  value={px > 0 ? `${gainCcy >= 0 ? '+' : '−'}${n2(Math.abs(gainCcy))}` : '—'}
                  sub={px > 0 ? `${n2(px)} מול ${n2(p.avgPrice)}` : 'הזינו מחיר'} />
                <Stat label="מס מוערך" value={taxIls > 0 ? `${n0(taxIls)}₪` : '—'}
                  sub={`${CGT * 100}% על הרווח הנומינלי`} />
              </div>
            )}

            {over && (
              <p className="lab-access warn">
                <b>מכרתם יותר יחידות ממה שרשום בתיק.</b> בדקו את המספר —
                או שחסרה קנייה ביומן.
              </p>
            )}

            <p className="note">
              <b>המס כאן מוערך ונומינלי, והוא תקרה עליונה.</b> הרווח
              החייב בישראל הוא <b>ריאלי</b> — §88 מורה לראות את{' '}
              <b>שער המטבע כמדד</b>, ולכן עליית הדולר אינה חייבת במס.
              המס בפועל יהיה <b>נמוך מזה</b>. <b>אין באמור ייעוץ מס.</b>
            </p>

            <div className="cta">
              <span className="dl-sum">
                נטו מוערך: <b dir="ltr">{n0(Math.max(0, ils - taxIls))}₪</b>
              </span>
              <button className="opt mp-go" type="button"
                disabled={!ok || saving}
                onClick={() => void (async () => {
                  setSaving(true);
                  const sale: NewSale = {
                    fund_key: sell.k, symbol: BUY[sell.k]?.sym ?? null,
                    withdrawn_on: date, units, unit_price: px,
                    amount_ils: ils, currency: BUY[sell.k]?.cur ?? 'USD',
                    avg_at_sale: p?.avgPrice ?? null,
                  };
                  const r = await addWithdrawals([sale]);
                  if (!r.ok) setErr(r.reason); else { setMode(null); await load(); }
                  setSaving(false);
                })()}>
                {saving ? 'שומר…' : 'לאשר את המשיכה'}
              </button>
            </div>
          </div>
        );
      })()}

      {ps.length > 0 && (
        <>
          <h3 className="dl-h3">המחיר הממוצע לכל רכיב</h3>
          <div className="scroll bleed">
            <table>
              <thead>
                <tr>
                  <th className="lead">הרכיב</th>
                  <th>קניות</th>
                  <th>יחידות</th>
                  <th>מחיר ממוצע</th>
                  <th>מחיר נוכחי</th>
                  <th>מול הממוצע</th>
                  <th>הושקע</th>
                  <th>שווי</th>
                  <th>רווח/הפסד</th>
                </tr>
              </thead>
              <tbody>
                {ps.map(p => {
                  const f = IRISH.find(x => x.k === p.k);
                  return (
                    <tr key={p.k}>
                      <td className="lead">{f?.he ?? p.k}</td>
                      <td dir="ltr">{p.buys}</td>
                      <td dir="ltr" className="dim">{p.units.toFixed(3)}</td>
                      <td dir="ltr" className="gold"><b>{n2(p.avgPrice)}</b></td>
                      <td>
                        <input className="amt dl-mark" type="number" min={0} step="0.01"
                          defaultValue={p.mark ?? ''} placeholder="הזינו"
                          aria-label={`מחיר נוכחי ${f?.he}`}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (v > 0 && v !== p.mark) void mark(p.k, v);
                          }} />
                      </td>
                      <td dir="ltr" className={p.vsAvg === null ? 'dim' : p.vsAvg >= 0 ? 'up' : 'warn'}>
                        {p.vsAvg === null ? '—' : <b>{sg(p.vsAvg)}</b>}
                      </td>
                      <td dir="ltr">{n0(p.investedIls)}₪</td>
                      <td dir="ltr">{p.valueIls !== null ? `${n0(p.valueIls)}₪` : '—'}</td>
                      <td dir="ltr" className={p.plIls === null ? 'dim' : p.plIls >= 0 ? 'up' : 'warn'}>
                        {p.plIls === null ? '—'
                          : `${p.plIls >= 0 ? '+' : '−'}${n0(Math.abs(p.plIls))}₪`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">
            <b>״מול הממוצע״ שלילי אינו הפסד שנצבר — הוא הזדמנות.</b>{' '}
            רכיב שנמצא מתחת למחיר הממוצע שלכם הוא בדיוק מה שמנגנון
            הקנייה מחפש, וההפקדה הבאה תקנה בו יותר יחידות.{' '}
            <b>המחיר הנוכחי מוזן על ידכם</b> — מאפליקציית הברוקר,
            והוא נשמר עד שתעדכנו שוב.
          </p>
        </>
      )}

      {outs.length > 0 && (() => {
        const rowsW = outs.map(w => ({
          w, t: saleTax(w, ps.find(p => p.k === w.fund_key)?.avgPrice ?? null),
        }));
        const tot = rowsW.reduce((a, r) => ({
          proceeds: a.proceeds + r.t.proceedsIls,
          gain: a.gain + r.t.gainIls,
          tax: a.tax + r.t.taxEstIls,
        }), { proceeds: 0, gain: 0, tax: 0 });
        return (
          <>
            <h3 className="dl-h3">המשיכות שבוצעו</h3>
            <div className="stats">
              <Stat label="נמשך סך הכל" value={`${n0(tot.proceeds)}₪`}
                sub={`${outs.length} משיכות`} tone="up" />
              <Stat label="מזה רווח" value={`${n0(tot.gain)}₪`}
                sub="מעל המחיר הממוצע" />
              <Stat label="מס מוערך" value={`${n0(tot.tax)}₪`}
                sub="נומינלי — תקרה עליונה" />
            </div>
            <div className="scroll bleed">
              <table>
                <thead>
                  <tr>
                    <th className="lead">תאריך</th><th>הרכיב</th>
                    <th>יחידות</th><th>מחיר מימוש</th><th>ממוצע אז</th>
                    <th>התקבל</th><th>רווח</th><th>מס מוערך</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rowsW.map(({ w, t }) => {
                    const f = IRISH.find(x => x.k === w.fund_key);
                    return (
                      <tr key={w.id}>
                        <td className="lead" dir="ltr">{w.withdrawn_on}</td>
                        <td>{f?.he ?? w.fund_key}</td>
                        <td dir="ltr" className="dim">{Number(w.units).toFixed(4)}</td>
                        <td dir="ltr">{n2(Number(w.unit_price))}</td>
                        <td dir="ltr" className="gold">
                          {w.avg_at_sale ? n2(Number(w.avg_at_sale)) : '—'}
                        </td>
                        <td dir="ltr" className="up">{n0(t.proceedsIls)}₪</td>
                        <td dir="ltr" className={t.gainIls >= 0 ? 'up' : 'warn'}>
                          {t.gainIls >= 0 ? '+' : '−'}{n0(Math.abs(t.gainIls))}₪
                        </td>
                        <td dir="ltr" className="warn">
                          {t.taxEstIls > 0 ? `${n0(t.taxEstIls)}₪` : '—'}
                        </td>
                        <td>
                          <button className="opt dl-x" type="button" aria-label="מחיקה"
                            onClick={() => void removeWithdrawal(w.id).then(load)}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              <b>״ממוצע אז״ נשמר ברגע המכירה, בכוונה.</b> קנייה נוספת
              אחרי המשיכה משנה את המחיר הממוצע קדימה — אבל <b>לא את
              הרווח שכבר מומש</b>, וזה המספר שצריך לדיווח.
            </p>
          </>
        );
      })()}

      {deps.length > 0 && (
        <>
          <h3 className="dl-h3">כל ההפקדות</h3>
          <div className="scroll bleed">
            <table>
              <thead>
                <tr>
                  <th className="lead">תאריך</th><th>הרכיב</th><th>סימול</th>
                  <th>סכום</th><th>מחיר</th><th>יחידות</th><th />
                </tr>
              </thead>
              <tbody>
                {deps.map(d => {
                  const f = IRISH.find(x => x.k === d.fund_key);
                  return (
                    <tr key={d.id}>
                      <td className="lead" dir="ltr">{d.deposited_on}</td>
                      <td>{f?.he ?? d.fund_key}</td>
                      <td dir="ltr" className="tk">{d.symbol ?? '—'}</td>
                      <td dir="ltr" className="gold">{n0(d.amount_ils)}₪</td>
                      <td dir="ltr">{n2(Number(d.unit_price))}</td>
                      <td dir="ltr" className="dim">{Number(d.units).toFixed(4)}</td>
                      <td>
                        <button className="opt dl-x" type="button"
                          aria-label="מחיקה"
                          onClick={() => void removeDeposit(d.id).then(load)}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="note">
        <b>הנתונים נשמרים לחשבון שלכם ולא לדפדפן</b> — מי שנכנס
        מהטלפון רואה את אותו יומן. <b>אין באמור המלצה ואין בו ייעוץ
        פיננסי או ייעוץ מס.</b>
      </p>
    </section>
  );
}

