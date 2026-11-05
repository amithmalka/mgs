/** MGS · התאמה אישית — כרטיסים, לא גיליון.
 *
 *  **למה לא טבלה.** 25 שורות על 15 עמודות מנסות לעשות שני דברים
 *  בבת אחת: **לבחור** ו**לתעד**. דמי ניהול, ISIN, שיטת שחזור, ניכוי
 *  דיבידנד והשאלת ניירות הם תיעוד — הם חשובים, אבל אף אחד מהם אינו
 *  משפיע על ההחלטה אילו רכיבים לקחת. הם נשארים בטבלה המלאה
 *  ב״ללמוד״.
 *
 *  **מה כן צריך כדי לבחור:** כמה הקרן הניבה, כמה היא זזה, וכמה
 *  עמוק היא נפלה. שלושה מספרים לכרטיס, ומשקל.
 *
 *  **והקיבוץ לפי רמת יציבות אינו קישוט** — הוא חלוקת העבודה בתיק,
 *  והקו המנחה שנמדד הוא **2 עד 4 רכיבים**, אחד מכל רמה.
 */
import { useMemo, useState } from 'react';
import { Stat } from '../shared/Stat';
import { IRISH, BUY, TIER_HE, TIER_BAND, REPL, mix, type Tier } from '../../constants/irish';
import { ACCESS } from '../../constants/access';
import { riskWords, type Combo } from '../../constants/combos';
import { useMyPortfolio } from '../../store/myPortfolio';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

const TIERS: Tier[] = ['calm', 'mid', 'hot'];
const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };
const ROLE: Record<Tier, string> = {
  calm: 'הבסיס — מחזיק את התיק כשהשאר נופל',
  mid: 'מנוע הצמיחה — כאן התשואה ורוב התנודתיות',
  hot: 'התבלין — במינון קטן מפזר, בגדול שולט',
};

export function CustomPick({ demo, toBroker }: { demo: number; toBroker: number }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [ilsOnly, setIlsOnly] = useState(false);
  const [noSwap, setNoSwap] = useState(false);
  const [minCagr, setMinCagr] = useState(false);
  const { holdings, setWeight, toggle, clear } = useMyPortfolio();

  const sel = useMemo(
    () => Object.fromEntries(holdings.map(h => [h.k, h.w])) as Record<string, number>,
    [holdings]);
  const m = useMemo(() => mix(holdings.map(h => ({ k: h.k, w: h.w }))), [holdings]);
  const tot = holdings.reduce((s, h) => s + h.w, 0);

  const shown = useMemo(() => IRISH.filter(f => {
    if (!BUY[f.k]) return false;
    if (sel[f.k] > 0) return true;              // מה שנבחר נשאר תמיד
    if (ilsOnly && ACCESS[f.k] !== 'ils') return false;
    if (noSwap && REPL[f.k] === 'swap') return false;
    if (minCagr && f.cagr < 0.15) return false;
    if (q && !f.he.includes(q) && !BUY[f.k].sym.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [q, ilsOnly, noSwap, minCagr, sel]);

  const asCombo: Combo | null = holdings.length >= 2 ? {
    track: m.vol < 0.14 ? 'flow' : m.vol < 0.22 ? 'both' : 'growth',
    vol: m.vol, cagr: m.cagr, dd: m.ddEst, ratio: m.vol ? m.cagr / m.vol : 0,
    naive: m.naive,
    // תמהיל שהמשתמש הרכיב בעצמו — אין לו מדידה בשקל ואין לו שנה
    // גרועה מדודה, ולכן אומדן הנפילה משמש לשניהם ומסומן כאומדן.
    ddIls: m.ddEst, volIls: m.vol, w12: m.ddEst,
    // תמהיל שהורכב ביד — ההתאוששות שלו היא של הרכיב האיטי שבו,
    // ומחושבת ב-CustomPick מתוך RECOVERY. 0 פירושו ״לא נמדד״.
    recov: m.recov ?? 0,
    parts: holdings.map(h => ({ k: h.k, w: Math.round(tot ? h.w / tot * 100 : 0) }))
      .sort((a, b) => b.w - a.w),
  } : null;
  const risk = asCombo ? riskWords(asCombo, demo) : null;

  return (
    <div className="cp">
      <button className="cp-head" type="button" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <span className="cp-arrow" aria-hidden="true">{open ? '−' : '+'}</span>
        <b>התאמה אישית</b>
        <span className="cp-sub">
          {holdings.length
            ? `${holdings.length} רכיבים · ${sg(m.cagr)} · ${pc(m.vol)} תנודתיות`
            : `להרכיב בעצמכם מתוך ${IRISH.filter(f => BUY[f.k]).length} הקרנות`}
        </span>
      </button>

      {open && (
        <div className="cp-body">
          {holdings.length > 0 && (
            <>
              <div className="stats">
                <Stat label="רכיבים" value={String(holdings.length)}
                  sub={holdings.length >= 2 && holdings.length <= 4 ? 'בטווח שנמדד' : holdings.length < 2 ? 'אין פיזור' : 'מעל הטווח'}
                  tone={holdings.length >= 2 && holdings.length <= 4 ? 'up' : undefined} />
                <Stat label="תשואה" value={sg(m.cagr)} sub="60 חודשים" tone="gold" />
                <Stat label="תנודתיות" value={pc(m.vol)} sub={`בלי פיזור ${pc(m.naive)}`} />
              </div>
              {risk && (
                <div className="cb-risk">
                  <p className="cb-fit">{risk.fit}</p>
                  <p>{risk.drawdown}</p>
                  {risk.concentration && <p className="cb-conc">{risk.concentration}</p>}
                </div>
              )}
            </>
          )}

          <div className="cp-filters">
            <label className="own cp-search">
              <input className="amt cp-q" type="search" value={q} placeholder="חיפוש שם או טיקר"
                aria-label="חיפוש" onChange={e => setQ(e.target.value)} />
            </label>
            <button className="opt" type="button" aria-pressed={ilsOnly}
              onClick={() => setIlsOnly(v => !v)}>רק בשקלים בת״א</button>
            <button className="opt" type="button" aria-pressed={noSwap}
              onClick={() => setNoSwap(v => !v)}>בלי חוזי חילופין</button>
            <button className="opt" type="button" aria-pressed={minCagr}
              onClick={() => setMinCagr(v => !v)}>תשואה מעל 15%</button>
            <span className="cp-count">{shown.length} מוצגות</span>
            {holdings.length > 0 && (
              <button className="opt" type="button" onClick={clear}>לנקות הכל</button>
            )}
          </div>

          {TIERS.map(t => {
            const rows = shown.filter(f => f.tier === t);
            if (!rows.length) return null;
            return (
              <div key={t} className="cp-tier">
                <h4 className="lab-h4">
                  <span className={`lab-dot ${DOT[t]}`} aria-hidden="true" />
                  {TIER_HE[t]}
                  <small>{TIER_BAND[t]} · {ROLE[t]}</small>
                </h4>
                <div className="cp-grid">
                  {rows.map(f => {
                    const w = sel[f.k] ?? 0;
                    const b = BUY[f.k]!;
                    const on = w > 0;
                    return (
                      <article key={f.k} className={`cp-card ${on ? 'on' : ''}`}>
                        <button className="cp-pick" type="button"
                          aria-pressed={on} onClick={() => toggle(f.k)}>
                          <span className="cp-nm">{f.he}</span>
                          <code dir="ltr">{b.sym}</code>
                        </button>

                        <div className="cp-nums">
                          <span>
                            <b dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</b>
                            <small>תשואה</small>
                          </span>
                          <span>
                            <b dir="ltr">{pc(f.vol)}</b>
                            <small>תנודתיות</small>
                          </span>
                        </div>

                        {on && (
                          <div className="cp-w">
                            <input className="amt lab-w" type="number" min={0} max={100} step={5}
                              value={w} aria-label={`משקל ${f.he}`}
                              onChange={e => setWeight(f.k, Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                            <span>{tot > 0 ? pc(w / tot) : '—'}</span>
                            {toBroker > 0 && tot > 0 && (
                              <em dir="ltr">{n0(toBroker * w / tot)}₪</em>
                            )}
                          </div>
                        )}
                        {f.short && <span className="lab-flag">חלון קצר</span>}
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!shown.length && (
            <p className="note">אין קרנות שעונות על הסינון. נקו מסנן אחד.</p>
          )}

          <p className="note">
            <b>כאן רק מה שצריך כדי לבחור</b> — תשואה ותנודתיות.
            דמי ניהול, ISIN, שיטת שחזור, ניכוי דיבידנד והשאלת ניירות
            הם <b>תיעוד ולא החלטה</b>, והם בטבלה המלאה ב״ללמוד״.
            <b> אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
          </p>
        </div>
      )}
    </div>
  );
}

