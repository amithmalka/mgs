/** MGS · כל הקרנות האיריות שנקנות דרך אינטראקטיב — טבלה אחת, גלויה.
 *
 *  זו הרשימה המלאה, בלי סינון ובלי אקורדיון: מה קונים, באיזה סימול,
 *  באיזו בורסה, באיזה מטבע, ומה נמדד לכל אחת.
 *
 *  **כל ה-ISIN מתחילים ב-IE.** זה מה שמוציא אותן מבסיס מס העיזבון
 *  האמריקאי — §2104(a) קובע שנייר הוא אמריקאי רק אם הנפיקה אותו חברה
 *  אמריקאית, ו-§2105(d) שאיפשר הסתכלות דרך הקרן פג ב-31.12.2011.
 *
 *  **להזמין לפי ISIN ולא לפי סימול.** שלושה סימולים כאן שייכים בארה״ב
 *  לנייר אחר לגמרי, ואחד מהם ממונף פי שלוש בכיוון ההפוך.
 */
import { useMemo, useState } from 'react';
import { IRISH, BUY, REPL, REPL_HE, HOLDINGS, LENDING, TIER_HE, withholds, type Tier } from '../../constants/irish';
import { ACCESS, TURNOVER } from '../../constants/access';
import { useMyPortfolio } from '../../store/myPortfolio';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

type SortKey = 'vol' | 'cagr' | 'ter' | 'name';
const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };

export function AllFunds({ toBroker }: { toBroker: number }) {
  const [sort, setSort] = useState<SortKey>('vol');
  const { holdings, toggle } = useMyPortfolio();
  const sel = useMemo(() => new Set(holdings.map(h => h.k)), [holdings]);

  const rows = useMemo(() => {
    const r = IRISH.filter(f => BUY[f.k]);
    const by: Record<SortKey, (a: typeof r[0], b: typeof r[0]) => number> = {
      vol: (a, b) => a.vol - b.vol,
      cagr: (a, b) => b.cagr - a.cagr,
      ter: (a, b) => a.ter - b.ter,
      name: (a, b) => a.he.localeCompare(b.he, 'he'),
    };
    return [...r].sort(by[sort]);
  }, [sort]);

  return (
    <section>
      <h2>כל הקרנות שנקנות דרך אינטראקטיב — {rows.length}</h2>
      <p className="lede">
        הרשימה המלאה. <b>כל ה-ISIN מתחילים ב-<span dir="ltr">IE</span></b>,
        וזה מה שמוציא אותן מבסיס מס העיזבון האמריקאי. לסמן קרן —
        מוסיף אותה לתיק שלכם.
      </p>

      <div className="grp">
        <span className="glab">למיין לפי</span>
        {([['vol', 'תנודתיות'], ['cagr', 'תשואה'], ['ter', 'דמי ניהול'], ['name', 'שם']] as Array<[SortKey, string]>)
          .map(([k, he]) => (
            <button key={k} className="opt" type="button"
              aria-pressed={sort === k} onClick={() => setSort(k)}>{he}</button>
          ))}
      </div>

      <div className="scroll bleed">
        <table>
          <thead>
            <tr>
              <th className="lead">הקרן</th>
              <th>סימול</th>
              <th>בורסה</th>
              <th>מטבע</th>
              <th>ISIN</th>
              <th>רמה</th>
              <th>שחזור</th>
              <th>ניכוי 15%</th>
              <th>מחזיקה</th>
              <th>השאלה</th>
              <th>גם בת״א</th>
              <th>ד״נ</th>
              <th>תשואה</th>
              <th>תנודתיות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => {
              const b = BUY[f.k]!;
              const h = HOLDINGS[f.k];
              const l = LENDING[f.k];
              const on = sel.has(f.k);
              const il = ACCESS[f.k] === 'ils';
              return (
                <tr key={f.k} className={on ? '' : 'dim'}>
                  <td className="lead">
                    <label className="lab-pick">
                      <input type="checkbox" checked={on} onChange={() => toggle(f.k)} />
                      {f.he}
                    </label>
                    <small className="lab-sub">{f.desc}</small>
                  </td>
                  <td dir="ltr" className="tk"><b>{b.sym}</b></td>
                  <td dir="ltr" className="dim">{b.ex === 'LSE' ? 'LSEETF' : b.ex}</td>
                  <td dir="ltr">{b.cur}</td>
                  <td dir="ltr" className="gold">{f.isin}</td>
                  <td>
                    <span className={`lab-dot ${DOT[f.tier]}`} aria-hidden="true" />
                    {TIER_HE[f.tier]}
                  </td>
                  <td className={REPL[f.k] === 'swap' ? 'warn' : ''}>
                    {REPL[f.k] ? REPL_HE[REPL[f.k]] : '—'}
                  </td>
                  <td dir="ltr" className={withholds(f.k) ? 'warn' : 'up'}>
                    {withholds(f.k) ? 'כן' : 'לא'}
                  </td>
                  <td dir="ltr">{h ? n0(h.n) : '—'}</td>
                  <td dir="ltr" className={l && l.actual !== null && l.actual > 0.15 ? 'warn' : ''}>
                    {l ? (l.actual === null ? `עד ${pc(l.max ?? 0)}`
                      : l.actual === 0 ? '—' : pc(l.actual, 1)) : '—'}
                  </td>
                  <td dir="ltr" className={il ? 'gold' : 'dim'}>
                    {il ? (TURNOVER[f.k] === -1 ? 'מ-5.11' : f.tase) : '—'}
                  </td>
                  <td dir="ltr">{pc(f.ter, 2)}</td>
                  <td dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>
                    {sg(f.cagr)}
                    {f.short && <span className="lab-flag">חלון קצר</span>}
                  </td>
                  <td dir="ltr">{pc(f.vol)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toBroker > 0 && holdings.length > 0 && (
        <p className="note">
          <b>סימנתם {holdings.length} קרנות.</b> חלוקת{' '}
          {n0(toBroker)}₪ ביניהן מופיעה בפירוט התמהיל למעלה.
        </p>
      )}
      <p className="note">
        <b>⚠ להזמין לפי ISIN ולא לפי סימול.</b> שלושה סימולים כאן
        שייכים בארצות הברית לנייר אחר: <b dir="ltr">SPXS</b> היא שם
        Direxion Bear 3X — <b>ממונפת פי שלוש בכיוון ההפוך</b>,{' '}
        <b dir="ltr">NDIA</b> היא קרן הודו אמריקאית, ו-<b dir="ltr">RBOT</b>{' '}
        היא מניה בודדת. ואם ה-ISIN בחלון הפקודה מתחיל
        ב-<b dir="ltr">US</b> — זו הגרסה האמריקאית.
      </p>
      <p className="note">
        <b>עמודת ״שחזור״:</b> ארבע קרנות הן <b>חוזה חילופין</b> ואינן
        מחזיקות את המדד שלהן אלא סל נפרד — על מס עיזבון זה לא משפיע,
        אבל זה <b>סיכון צד נגדי</b>. <b>ועמודת ״ניכוי 15%״</b> אומרת
        אם הקרן סופגת ניכוי במקור על דיבידנד אמריקאי; קרן חילופין
        מקבלת את המדד ברוטו ולכן לא.
        <b> אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
      </p>
    </section>
  );
}
