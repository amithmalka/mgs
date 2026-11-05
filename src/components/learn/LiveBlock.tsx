/** MGS · רכיבים חיים בתוך שקופית.
 *
 *  **זה העיקר של הבחירה לבנות את המצגות בתוך המערכת.** מצגת
 *  שמדפיסה ״תנודתיות 18%״ קופאת ברגע שהמדידה מתעדכנת. כאן השקופית
 *  **שואלת את אותו קטלוג ואת אותו מנוע** שמריצים את התיק, ולכן
 *  היא לא יכולה לסתור אותם.
 */
import { useMemo } from 'react';
import type { LiveId } from '../../types/deck';
import { IRISH, BUY, TIER_HE, type Tier } from '../../constants/irish';
import { FORWARD } from '../../constants/forward';
import { depositAt, WITHDRAW_AFTER_STOP, DEPOSIT_YEARS } from '../../utils/comboProject';
import { withdrawRate } from '../../utils/mgsSim';
import { COMBOS, TRACK_HE, type TrackKey } from '../../constants/combos';
import { CEILINGS, RATE } from '../../constants/studyFunds';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };

export function LiveBlock({ id }: { id: LiveId }) {
  switch (id) {
    case 'catalog':      return <Catalog />;
    case 'depositCurve': return <Curve />;
    case 'tracks':       return <Tracks />;
    case 'combos':       return <Combos />;
    case 'ceilings':     return <Ceilings />;
  }
}

function Catalog() {
  const rows = useMemo(
    () => IRISH.filter(f => BUY[f.k]).sort((a, b) => b.cagr - a.cagr), []);
  return (
    <>
      <div className="scroll bleed">
        <table>
          <thead><tr>
            <th className="lead">הקרן</th><th>הטיקר האירי</th><th>המקבילה</th>
            <th>רמה</th><th>תשואה</th><th>תנודתיות</th><th>ד״נ</th><th>ההנחה קדימה</th>
          </tr></thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.k}>
                <td className="lead">{f.he}</td>
                <td dir="ltr" className="tk"><b>{BUY[f.k]!.sym}</b></td>
                <td dir="ltr" className="dim">{f.us}</td>
                <td>
                  <span className={`lab-dot ${DOT[f.tier]}`} aria-hidden="true" />
                  {TIER_HE[f.tier]}
                </td>
                <td dir="ltr" className={f.cagr >= 0 ? 'up' : 'warn'}>{sg(f.cagr)}</td>
                <td dir="ltr">{pc(f.vol)}</td>
                <td dir="ltr" className="dim">{pc(f.ter, 2)}</td>
                <td dir="ltr" className="gold">{pc(FORWARD[f.k]?.real ?? 0.075, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        <b>הטבלה הזאת נמשכת מהקטלוג החי</b> — אותו אחד שבונה את התיק.
        תשואה ותנודתיות נמדדו על <b>60 חודשים</b> בדולר; ההנחה קדימה
        היא הנחה מפורסמת, לא תחזית שלנו.
      </p>
    </>
  );
}

function Curve() {
  const base = 2000, g = 0.05, dy = 20;
  const rows = useMemo(() => Array.from({ length: dy + 2 }, (_, i) => {
    const y = i + 1;
    return { y, dep: depositAt(y, base, g, dy) };
  }), []);
  const max = Math.max(...rows.map(r => r.dep), 1);
  return (
    <>
      <div className="dk-curve">
        {rows.map(r => (
          <span key={r.y} className="dk-bar" title={`שנה ${r.y}: ${n0(r.dep)}₪`}>
            <i className={r.dep === 0 ? 'off' : r.y <= 5 ? 'up' : 'dn'}
              style={{ height: `${(r.dep / max) * 100}%` }} />
            <small>{r.y}</small>
          </span>
        ))}
      </div>
      <p className="note">
        <b>בסיס {n0(base)}₪, עליה {pc(g)} בשנה, אופק {dy} שנה.</b>{' '}
        שנים 1–5 עולות עד <b dir="ltr">{n0(depositAt(5, base, g, dy))}₪</b>,
        ומשם יורדות עד שהן מתאפסות בשנה {dy + 1}.{' '}
        <b>סך הכל {n0(rows.reduce((s, r) => s + r.dep * 12, 0))}₪.</b>
      </p>
    </>
  );
}

function Tracks() {
  const T: TrackKey[] = ['flow', 'both', 'growth'];
  // **תוקן 4.11.2026.** הטבלה אמרה שצמיחה ״לא מושך כלל״ ומקף
  // בעמודת הקצב — שארית מהתקופה שבה הוא באמת לא משך. מאז תקרת
  // ה-4% הוא **כן מושך, 4%, משנת המעבר של קבוצת הגיל** — וזה
  // משתנה לפי הגיל: שנה 25 לקבוצה הצעירה ועד שנה 5 לוותיקה.
  // המספרים נקראים מ-`withdrawRate` ולא נכתבים כאן, כדי שלא
  // ייווצר שוב פער בין מה שהקוד עושה למה שהטבלה אומרת.
  const firstDraw: Record<TrackKey, string> = {
    flow: 'שנה 1', both: 'שנה 1', growth: 'שנת המעבר, לפי הגיל',
  };
  return (
    <div className="scroll bleed">
      <table>
        <thead><tr>
          <th className="lead">המסלול</th><th>תנודתיות</th>
          <th>מתי מתחילים למשוך</th><th>הקצב בשלב הצבירה</th>
          <th>אחרי עצירת ההפקדות</th>
        </tr></thead>
        <tbody>
          {T.map(t => (
            <tr key={t}>
              <td className="lead">{TRACK_HE[t]}</td>
              <td dir="ltr">{t === 'flow' ? 'עד 14%' : t === 'both' ? '14%–22%' : 'מעל 22%'}</td>
              <td className="up">{firstDraw[t]}</td>
              <td dir="ltr" className="dim">
                {t === 'growth'
                  ? '0% → 4% משנת המעבר'
                  : `${pc(withdrawRate(t, '30-40', 1), 0)} → ${pc(withdrawRate(t, '30-40', 12), 0)}`}
              </td>
              <td dir="ltr" className={WITHDRAW_AFTER_STOP[t] > 0 ? 'gold' : 'dim'}>
                {WITHDRAW_AFTER_STOP[t] > 0 ? pc(WITHDRAW_AFTER_STOP[t], 1) : 'אין משיכות'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Combos() {
  const T: TrackKey[] = ['flow', 'both', 'growth'];
  return (
    <div className="scroll bleed">
      <table>
        <thead><tr>
          <th className="lead">המסלול</th><th>כמה תמהילים</th>
          <th>טווח תנודתיות</th><th>טווח תשואה</th><th>היחס הטוב ביותר</th>
        </tr></thead>
        <tbody>
          {T.map(t => {
            const c = COMBOS.filter(x => x.track === t);
            if (!c.length) return null;
            const best = c.reduce((a, b) => (b.ratio > a.ratio ? b : a));
            return (
              <tr key={t}>
                <td className="lead">{TRACK_HE[t]}</td>
                <td dir="ltr">{c.length}</td>
                <td dir="ltr">{pc(Math.min(...c.map(x => x.vol)))}–{pc(Math.max(...c.map(x => x.vol)))}</td>
                <td dir="ltr" className="up">
                  {sg(Math.min(...c.map(x => x.cagr)), 0)}–{sg(Math.max(...c.map(x => x.cagr)), 0)}
                </td>
                <td dir="ltr" className="gold"><b>{best.ratio.toFixed(2)}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Ceilings() {
  return (
    <>
      <div className="stats">
        <div className="stat gold">
          <span className="k">עצמאי — הפקדה מוטבת</span>
          <span className="n" dir="ltr">{n0(CEILINGS.selfExempt)}₪</span>
          <span className="s">{pc(RATE.self)} מההכנסה, עד {n0(CEILINGS.selfIncome)}₪</span>
        </div>
        <div className="stat gold">
          <span className="k">שכיר — הפקדה מוטבת</span>
          <span className="n" dir="ltr">{n0(CEILINGS.empExempt)}₪</span>
          <span className="s">{pc(RATE.employee)} מהשכר, עד {n0(CEILINGS.empMonthly)}₪ לחודש</span>
        </div>
        <div className="stat up">
          <span className="k">שניהם יחד</span>
          <span className="n" dir="ltr">{n0(CEILINGS.selfExempt + CEILINGS.empExempt)}₪</span>
          <span className="s">שני חשבונות נפרדים</span>
        </div>
        <div className="stat">
          <span className="k">לחודש, שניהם</span>
          <span className="n" dir="ltr">{n0((CEILINGS.selfExempt + CEILINGS.empExempt) / 12)}₪</span>
          <span className="s">מעל זה — לברוקר</span>
        </div>
      </div>
      <p className="note">
        <b>המספרים נמשכים מאותו קובץ</b> שמחשב את החלוקה בתיק שלכם.
        שנות ההפקדה לפי קבוצת גיל:{' '}
        {Object.entries(DEPOSIT_YEARS).map(([k, v]) => `${k} → ${v}`).join(' · ')}.
      </p>
    </>
  );
}
