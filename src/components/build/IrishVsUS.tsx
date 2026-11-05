/** MGS · אירי מול אמריקאי — מה מחליף את מה, ומה זה חוסך.
 *
 *  **הנקודה בשורה אחת:** לכל נייר אמריקאי מוכר יש מקבילה אירית
 *  שעוקבת אחרי אותו מדד — **ומוציאה את המחזיק מבסיס מס העיזבון
 *  האמריקאי**. §2104(a) קובע שנייר הוא אמריקאי רק אם הנפיקה אותו
 *  חברה אמריקאית, ו-§2105(d) שאיפשר הסתכלות דרך הקרן **פג
 *  ב-31.12.2011**. קרן אירית שמחזיקה 100% מניות אמריקאיות — עדיין
 *  אינה נכס אמריקאי.
 *
 *  **הפטור הוא 60,000$ בלבד, לא צמוד מאז 1988, ולישראל אין אמנה.**
 *  מעל זה המס מגיע ל-40%, והברוקר מקפיא את החשבון עד שהיורשים
 *  מציגים אישור מה-IRS — תהליך של 12 עד 18 חודשים לפי ה-IRS עצמו.
 */
import { useMemo, useState } from 'react';
import { IRISH, BUY, TIER_HE, type Tier } from '../../constants/irish';
import { LEVERAGED, DECAY } from '../../constants/leveraged';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;

const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };
const TIERS: Tier[] = ['calm', 'mid', 'hot'];

export function IrishVsUS() {
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [showLev, setShowLev] = useState(false);

  const rows = useMemo(() => {
    const r = IRISH.filter(f => BUY[f.k] && (tier === 'all' || f.tier === tier));
    return [...r].sort((a, b) => b.cagr - a.cagr);
  }, [tier]);

  const maxC = Math.max(...IRISH.map(f => Math.abs(f.cagr)), 0.01);
  const maxV = Math.max(...IRISH.map(f => f.vol), 0.01);

  return (
    <section className="iv">
      <span className="eyebrow">הקטלוג</span>
      <h2>אירי מול אמריקאי — מה מחליף את מה</h2>
      <p className="lede">
        לכל נייר אמריקאי מוכר יש מקבילה אירית על אותו מדד,{' '}
        <b>שמוציאה את המחזיק מבסיס מס העיזבון האמריקאי</b>. הפטור שם
        הוא <b>60,000$ בלבד</b>, לא צמוד מאז 1988, <b>ולישראל אין
        אמנה</b> — מעליו המס מגיע ל-40%.
      </p>

      <div className="chips">
        <button className="opt" type="button" aria-pressed={tier === 'all'}
          onClick={() => setTier('all')}>הכל · {IRISH.filter(f => BUY[f.k]).length}</button>
        {TIERS.map(t => (
          <button key={t} className="opt" type="button"
            aria-pressed={tier === t} onClick={() => setTier(t)}>
            <span className={`lab-dot ${DOT[t]}`} aria-hidden="true" />
            {TIER_HE[t]}
          </button>
        ))}
      </div>

      <div className="iv-list">
        {rows.map(f => {
          const b = BUY[f.k]!;
          return (
            <article key={f.k} className="iv-row">
              <div className="iv-swap">
                <span className="iv-us" dir="ltr">{f.us}</span>
                <span className="iv-arrow" aria-hidden="true">←</span>
                <span className="iv-ie" dir="ltr">{b.sym}</span>
              </div>

              <div className="iv-name">
                <span className={`lab-dot ${DOT[f.tier]}`} aria-hidden="true" />
                <b>{f.he}</b>
                <small>{f.desc}</small>
              </div>

              <div className="iv-bars">
                <span className="iv-bar-row">
                  <small>תשואה</small>
                  <span className="iv-track">
                    <i className={f.cagr >= 0 ? 'up' : 'dn'}
                      style={{ width: `${Math.min(100, Math.abs(f.cagr) / maxC * 100)}%` }} />
                  </span>
                  <b dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</b>
                </span>
                <span className="iv-bar-row">
                  <small>תנודתיות</small>
                  <span className="iv-track">
                    <i className="vol" style={{ width: `${f.vol / maxV * 100}%` }} />
                  </span>
                  <b dir="ltr">{pc(f.vol)}</b>
                </span>
              </div>

              <div className="iv-meta">
                <span><b dir="ltr">{pc(f.ter, 2)}</b><small>דמי ניהול</small></span>
                <span><b dir="ltr">{b.cur}</b><small>{b.ex === 'LSE' ? 'LSEETF' : b.ex}</small></span>
                <span className="iv-isin"><b dir="ltr">{f.isin}</b><small>ISIN</small></span>
              </div>
            </article>
          );
        })}
      </div>

      <button className="cp-head iv-lev" type="button" aria-expanded={showLev}
        onClick={() => setShowLev(o => !o)}>
        <span className="cp-arrow" aria-hidden="true">{showLev ? '−' : '+'}</span>
        <b>⚠ ממונפות — נפרד לגמרי</b>
        <span className="cp-sub">×2 ו-×3, ולמה הן לא בקטלוג</span>
      </button>

      {showLev && (
        <div className="iv-lev-body">
          <p className="lab-access warn">
            <b>אין קרן UCITS ממונפת אירית. לא ×2 ולא ×3.</b> רגולציית
            UCITS מגבילה חשיפה ל-100% מה-NAV, ולכן ×2 הוא התקרה לקרן —
            <b> וכל ×3 בשוק האירופי הוא נייר חוב, בשום דומיסיל</b>.
            ותקופת ההחזקה שהמנפיקים עצמם נוקבים היא <b>יום אחד</b>.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th className="lead">המוצר</th><th>סימול</th><th>ISIN</th>
                  <th>אירי?</th><th>UCITS?</th><th>מינוף</th><th>ד״נ</th></tr>
              </thead>
              <tbody>
                {LEVERAGED.map(l => (
                  <tr key={l.isin}>
                    <td className="lead">{l.he}</td>
                    <td dir="ltr" className="tk">{l.tick}</td>
                    <td dir="ltr" className={l.irish ? 'gold' : 'warn'}>{l.isin}</td>
                    <td className={l.irish ? 'up' : 'warn'}>{l.irish ? 'כן' : 'לא'}</td>
                    <td className={l.ucits ? 'up' : 'warn'}>{l.ucits ? 'UCITS' : 'נייר חוב'}</td>
                    <td dir="ltr"><b>×{l.lev}</b></td>
                    <td dir="ltr">{pc(l.ter, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            <b>שתי העמודות האמצעיות לעולם לא ירוקות יחד</b> — מה שאירי
            אינו UCITS, ומה ש-UCITS אינו אירי.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr><th className="lead">המדד</th><th>המדד עצמו</th>
                  <th>×2 בפועל</th><th>×3 בפועל</th>
                  <th>״פי 3״ היה אמור</th></tr>
              </thead>
              <tbody>
                {DECAY.map(d => (
                  <tr key={d.he}>
                    <td className="lead">{d.he}</td>
                    <td dir="ltr">{sg(d.idx, 0)}</td>
                    <td dir="ltr">{sg(d.x2, 0)}</td>
                    <td dir="ltr" className="gold">{sg(d.x3, 0)}</td>
                    <td dir="ltr" className="dim">{sg(d.naive3, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            <b>סימולציה על 1,255 ימי מסחר אמיתיים</b>, כולל דמי ניהול.
            בנאסד״ק ×3 החזיר 144% במקום 468% — השחיקה אכלה שתי שלישים,
            ובתמורה נפילה של <b>81%</b>.
            <b> אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
          </p>
        </div>
      )}

      <p className="note">
        התשואות והתנודתיות נמדדו על <b>60 חודשים</b> (11.2021–11.2026),
        בדולר, על הקרן האירית עצמה בבורסה שבה היא נסחרת. קרן המסומנת
        ״חלון קצר״ נמדדה על פחות מכך ובשוק עולה.{' '}
        <b>תשואת עבר אינה מנבאת את העתיד, ואין באמור המלצה.</b>
      </p>
    </section>
  );
}
