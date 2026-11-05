/** MGS · שערים חיים לקרנות האיריות.
 *
 *  המטרה אחת: לאמת שהפקודה היא על הנייר הנכון לפני ששולחים אותה.
 *  מי שרואה באינטראקטיב את אותו מחיר שרואה כאן — הוא על אותו נייר.
 *
 *  **מה מוצג מתי.** בורסת לונדון נסחרת 08:00–16:30 שעון לונדון, כלומר
 *  10:00–18:30 שעון ישראל. בזמן מסחר מוצג המחיר החי; מחוצה לו מוצג
 *  **השער האחרון שבו נסגרה הקרן ביום המסחר האחרון**, והשורה מסומנת
 *  כסגורה. לבורסת לונדון **אין פרי־מרקט** בסגנון האמריקאי — יש מכרז
 *  פתיחה בין 07:50 ל-08:00 שעון לונדון, ואין חלון מסחר לפניו.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { IRISH, BUY } from '../../constants/irish';

interface Quote {
  price: number | null; currency: string | null; prevClose: number | null;
  change: number | null; volume: number | null; state: string | null;
  time: number | null; exchange: string | null;
}
interface Feed { asOf: number; quotes: Record<string, Quote> }

const n2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** האם בורסת לונדון פתוחה כרגע, לפי שעון לונדון עצמו */
function lseOpen(): boolean {
  const now = new Date();
  const lon = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const day = lon.getDay();
  if (day === 0 || day === 6) return false;
  const mins = lon.getHours() * 60 + lon.getMinutes();
  return mins >= 8 * 60 && mins <= 16 * 60 + 30;
}

export function LiveQuotes() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(lseOpen);
  const timer = useRef<number | null>(null);

  const pull = useCallback(async () => {
    try {
      const r = await fetch('/api/lse');
      if (!r.ok) throw new Error(String(r.status));
      const j: Feed = await r.json();
      if (!j.quotes || !Object.keys(j.quotes).length) throw new Error('empty');
      setFeed(j); setErr(null);
    } catch {
      setErr('לא הצלחנו למשוך שערים כרגע');
    }
  }, []);

  useEffect(() => { void pull(); }, [pull]);

  // בזמן מסחר מרעננים כל 15 שניות; מחוץ לשעות אין טעם — השער לא זז
  useEffect(() => {
    const tick = () => setOpen(lseOpen());
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    if (!live || !open) return;
    timer.current = window.setInterval(() => { void pull(); }, 15_000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [live, open, pull]);

  const rows = IRISH.filter(f => BUY[f.k] && feed?.quotes[BUY[f.k].sym]);

  return (
    <section>
      <h2>שערים חיים — לאמת שאתם על הנייר הנכון</h2>
      <p className="lede">
        לפני ששולחים פקודה: אם המחיר שאתם רואים באינטראקטיב זהה למחיר
        כאן, <b>אתם על אותו נייר</b>. אם הוא שונה מהותית — בדקו את
        הבורסה ואת המטבע בשורה שבחרתם.
      </p>

      <div className="lq-bar">
        <span className={`lq-dot ${open ? 'on' : 'off'}`} aria-hidden="true" />
        <b>{open ? 'לונדון פתוחה' : 'לונדון סגורה'}</b>
        <span className="lq-sub">
          {open
            ? 'מתעדכן כל 15 שניות'
            : 'מוצג השער האחרון שבו נסגרה כל קרן ביום המסחר האחרון'}
        </span>
        {feed && <span className="lq-sub">עודכן {clock(feed.asOf)}</span>}
        <label className="lq-tog">
          <input type="checkbox" checked={live} disabled={!open}
            onChange={e => setLive(e.target.checked)} />
          רענון אוטומטי
        </label>
        <button className="opt" type="button" onClick={() => void pull()}>רענון עכשיו</button>
      </div>

      {err && <p className="lab-access warn">{err}. נסו רענון, או בדקו בחלון המסחר עצמו.</p>}

      {!feed && !err && <p className="lq-sub">מושך שערים…</p>}

      {feed && (
        <div className="scroll bleed">
          <table>
            <thead>
              <tr>
                <th className="lead">הקרן</th>
                <th>טיקר</th>
                <th>בורסה</th>
                <th>{open ? 'מחיר עכשיו' : 'שער סגירה אחרון'}</th>
                <th>מטבע</th>
                <th>שינוי</th>
                <th>סגירה קודמת</th>
                <th>נפח</th>
                <th>עודכן</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(f => {
                const b = BUY[f.k];
                const q = feed.quotes[b.sym]!;
                const thin = (q.volume ?? 0) > 0 && (q.volume ?? 0) < 1000;
                return (
                  <tr key={f.k}>
                    <td className="lead">{f.he}</td>
                    <td dir="ltr" className="tk"><b>{b.sym}</b></td>
                    <td dir="ltr" className="dim">
                      {b.ex === 'LSE' ? 'LSEETF' : 'AEB'}
                    </td>
                    <td dir="ltr" className="gold">
                      {q.price != null ? n2(q.price) : '—'}
                    </td>
                    <td dir="ltr">{q.currency ?? '—'}</td>
                    <td dir="ltr" className={(q.change ?? 0) >= 0 ? 'up' : 'warn'}>
                      {q.change != null
                        ? `${q.change >= 0 ? '+' : ''}${(q.change * 100).toFixed(2)}%`
                        : '—'}
                    </td>
                    <td dir="ltr" className="dim">
                      {q.prevClose != null ? n2(q.prevClose) : '—'}
                    </td>
                    <td dir="ltr" className={thin ? 'warn' : ''}>
                      {q.volume != null ? q.volume.toLocaleString('en-US') : '—'}
                      {thin && <small className="bk-sub">דליל · לימיט</small>}
                    </td>
                    <td dir="ltr" className="dim">
                      {q.time ? clock(q.time * 1000) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="note">
        <b>על שעות המסחר.</b> לונדון נסחרת <b>08:00–16:30</b> שעון לונדון,
        שהם <b>10:00–18:30</b> אצלנו. <b>אין בה פרי־מרקט</b> בסגנון
        האמריקאי — יש <b>מכרז פתיחה</b> בין 07:50 ל-08:00 שעון לונדון,
        ולפניו אין מסחר כלל. מחוץ לשעות, מה שמוצג כאן הוא{' '}
        <b>שער הסגירה האחרון</b>, והוא לא יזוז עד הפתיחה הבאה.
      </p>
      <p className="note">
        <b>ועמודת הנפח אינה קישוט.</b> שורה שמסומנת <b>דליל</b> נסחרה
        בפחות מ-1,000 יחידות היום — שם <b>שולחים לימיט ולא מרקט</b>,
        אחרת המרווח בין הקונה למוכר אוכל יותר מכל העמלה.
      </p>
    </section>
  );
}
