/** MGS · דף הקומבינציות — המשקיע בוחר תיק, ומשם המערכת יודעת הכל.
 *
 *  **אין ליבה קבועה.** הליבה היחידה היא שלושת המסלולים, ומנגנון
 *  הקנייה שרץ על מה שנבחר: בשיא 10% מההפקדה, מתחת לשיא אחוז הירידה,
 *  **והשארית כולה לרכיב שנפל הכי עמוק**.
 *
 *  **ואין ביטקוין.** לא כאן ולא בשום מקום אחר במערכת — רגולציית
 *  UCITS אוסרת קריפטו בקרן אירית, ולכן כל חשיפה לביטקוין יוצאת
 *  מהמבנה האירי ונכנסת לבסיס מס העיזבון האמריקאי.
 */
import { useMemo, useState } from 'react';
import { useMgsStore } from '../../store/mgsStore';
import {
  COMBOS_TESTED, COMBOS_FUNDS, TRACK_HE, TRACK_BAND, TRACK_WHY,
  byTrack, bestOf, riskWords, type TrackKey, type Combo,
} from '../../constants/combos';
import { IRISH, BUY, TIER_HE, type Tier } from '../../constants/irish';
import { useMyPortfolio, trackForAge } from '../../store/myPortfolio';
import { CustomPick } from './CustomPick';
import { ComboForecast } from './ComboForecast';
import { NumField } from './NumField';
import { ChosenMix } from './ChosenMix';

const pc = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

const TRACKS: TrackKey[] = ['flow', 'both', 'growth'];
const DOT: Record<Tier, string> = { calm: 'lab-calm', mid: 'lab-mid', hot: 'lab-hot' };

function Bar({ parts }: { parts: Combo['parts'] }) {
  return (
    <span className="cb-bar" aria-hidden="true">
      {parts.map(q => {
        const f = IRISH.find(x => x.k === q.k);
        return (
          <i key={q.k} className={`cb-seg ${f ? DOT[f.tier] : ''}`}
            style={{ flexGrow: q.w }} title={`${f?.he ?? q.k} ${q.w}%`} />
        );
      })}
    </span>
  );
}

/** מזהה יציב לתמהיל — מסלול ותנודתיות, כמו ב-key של הכרטיס */
const key = (c: { track: string; vol: number }) => `${c.track}-${c.vol}`;

export function Combos() {
  const [track, setTrack] = useState<TrackKey>('both');
  const { holdings, setHoldings, deposit, extra, fundStatus } = useMyPortfolio();
  const { age, setAge } = useMgsStore();

  const rows = useMemo(() => byTrack(track), [track]);
  const best = useMemo(() => bestOf(track), [track]);

  const picked = useMemo(() => {
    const key = holdings.map(h => `${h.k}:${h.w}`).sort().join('|');
    return (c: Combo) =>
      c.parts.map(q => `${q.k}:${q.w}`).sort().join('|') === key;
  }, [holdings]);

  // כמה כסף בפועל מגיע לכל רכיב — אם הוזנה הפקדה
  const toBroker = useMemo(() => {
    if (fundStatus === 'none') return deposit + extra;
    const ceil = { employee: 18854, self: 20566, both: 39420 }[fundStatus] / 12;
    return Math.max(0, deposit - Math.min(deposit, ceil)) + extra;
  }, [deposit, extra, fundStatus]);

  // הסכום שעליו מודגם הסיכון: שנתיים של הפקדות, או 200,000₪ כברירת מחדל
  const demo = toBroker > 0 ? Math.max(50000, Math.round(toBroker * 24)) : 200000;
  const suggested = trackForAge(age).track;
  /** איזה תמהיל פתוח בתחזית. null = אף אחד. */
  const [fcKey, setFcKey] = useState<string | null>(null);
  const fcCombo = useMemo(
    () => rows.find(c => key(c) === fcKey) ?? null, [rows, fcKey]);

  return (
    <>
      <section>
        <span className="eyebrow">קומבינציות</span>
        <h2>לבחור תיק — ומשם המערכת יודעת הכל</h2>
        <p className="lede">
          <b>{COMBOS_TESTED.toLocaleString('en-US')} שילובים נבדקו</b> על{' '}
          {COMBOS_FUNDS} הקרנות האיריות עם היסטוריה מלאה. בכל רמת
          תנודתיות נשמר <b>רק התמהיל עם היחס הטוב ביותר</b>.
          כל הקרנות כאן <b>פטורות ממס עיזבון אמריקאי</b> ונקנות דרך
          ברוקר זר.
        </p>

        {/* **הגיל בראש, והמסלול קופץ ממנו.**
            קודם הגיל ישב אחרי הכותרת ולפני הטאבים, וההסבר הארוך
            הפריד ביניהם — אז מי שהזין גיל לא ראה מה זה שינה.
            עכשיו: גיל → המסלול המומלץ מודגש בטאבים, וההסבר קצר
            ויושב מתחת לטאב שנבחר. */}
        <div className="cb-age">
          <span className="cb-age-q">לא יודעים מה לבחור?</span>
          <NumField value={age} min={18} max={75} label="גיל"
            unit="שנים" onCommit={setAge} />
          <span className="cb-age-arrow" aria-hidden="true">←</span>
          <button className="opt cb-age-go" type="button"
            onClick={() => setTrack(suggested)}>
            {TRACK_HE[suggested]}
          </button>
          <span className="cb-age-note">הצעה לפי גיל, לא המלצה</span>
        </div>

        <div className="chips cb-tabs">
          {TRACKS.map(t => (
            <button key={t} className="opt bh-mode" type="button"
              aria-pressed={track === t} onClick={() => setTrack(t)}>
              {TRACK_HE[t]}
              <small>{TRACK_BAND[t]}</small>
              {t === suggested && <i className="cb-sugg">לגיל {age}</i>}
            </button>
          ))}
        </div>

        <div className="lab-goal">
          <b>{TRACK_HE[track]}</b>
          <p>{TRACK_WHY[track]}</p>
          {track === suggested && (
            <p className="cb-why">
              <b>זה מה שמוצע לגיל {age}.</b> {trackForAge(age).why}
            </p>
          )}
          {best && (
            <p className="cb-best">
              <b>היחס הטוב ביותר במסלול:</b> {sg(best.cagr)} בתנודתיות{' '}
              {pc(best.vol)} — יחס <b>{best.ratio.toFixed(2)}</b>.
            </p>
          )}
          <p className="cb-caveat">
            <b>האופק קובע, לא הגיל</b> — מי שיצטרך את הכסף בעוד שלוש
            שנים שייך לתזרים גם בגיל 30, ומי שלא ייגע בו שייך לצמיחה
            גם בגיל 60. <b>אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
          </p>
        </div>

        <ChosenMix />

        {/* **התחזית מוצגת ברוחב מלא, לא בתוך הכרטיס.**
            שמונה עמודות בעמודה של 380px גלשו מהכרטיס החוצה. */}
        {fcCombo && (
          <ComboForecast combo={fcCombo} base={toBroker}
            onClose={() => setFcKey(null)} />
        )}

        <div className="cb-grid">
          {rows.map(c => {
            const on = picked(c);
            const gain = c.naive - c.vol;
            return (
              <article key={`${c.track}-${c.vol}`} className={`cb-card ${on ? 'on' : ''}`}>
                <header>
                  <span className="cb-vol" dir="ltr">{pc(c.vol)}</span>
                  <span className="cb-lab">תנודתיות</span>
                  {on && <span className="cb-mine">התיק שלך</span>}
                </header>

                <div className="cb-nums">
                  <div><b dir="ltr" className="up">{sg(c.cagr)}</b><small>תשואה שנתית</small></div>
                  <div><b dir="ltr" className={c.ratio >= 1.1 ? 'gold' : ''}>{c.ratio.toFixed(2)}</b><small>יחס</small></div>
                </div>

                <Bar parts={c.parts} />

                <ul className="cb-parts">
                  {c.parts.map(q => {
                    const f = IRISH.find(x => x.k === q.k);
                    const b = BUY[q.k];
                    return (
                      <li key={q.k}>
                        <span className={`lab-dot ${f ? DOT[f.tier] : ''}`} aria-hidden="true" />
                        <span className="cb-name">{f?.he ?? q.k}</span>
                        {b && <code dir="ltr">{b.sym}</code>}
                        <b dir="ltr">{q.w}%</b>
                        {toBroker > 0 && (
                          <em dir="ltr">{n0(toBroker * q.w / 100)}₪</em>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {(() => {
                  const r = riskWords(c, demo);
                  return (
                    <div className="cb-risk">
                      <p className="cb-fit">{r.fit}</p>
                      <p>{r.drawdown}</p>
                      <p>{r.badYear}</p>
                      {r.concentration && (
                        <p className="cb-conc">{r.concentration}</p>
                      )}
                    </div>
                  );
                })()}

                <footer>
                  <span className="cb-gain">
                    הפיזור חסך <b dir="ltr">{(gain * 100).toFixed(1)} נק׳</b> תנודתיות
                  </span>
                  <button className="opt cb-fc" type="button"
                    aria-expanded={fcKey === key(c)}
                    onClick={() => setFcKey(fcKey === key(c) ? null : key(c))}>
                    {fcKey === key(c) ? 'סגירת התחזית' : 'תחזית'}
                  </button>
                  <button className="opt" type="button"
                    onClick={() => setHoldings(c.parts.map(q => ({ k: q.k, w: q.w })))}>
                    {on ? 'נבחר' : 'לבחור את זה'}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        <CustomPick demo={demo} toBroker={toBroker} />

        <p className="note">
          <b>המספרים בשקלים בתיאור הסיכון</b> מודגמים על תיק של{' '}
          <b>{n0(demo)}₪</b>{toBroker > 0 ? ' — בערך שנתיים של ההפקדות שלכם לברוקר' : ''}.
          ״שנה גרועה״ היא סטיית תקן אחת מתחת לממוצע — בערך{' '}
          <b>אחת משש שנים</b>, ולא הגרועה ביותר. הנפילה המוצגת{' '}
          <b>קרתה בפועל</b> בחלון שנמדד.
        </p>
        <p className="note">
          <b>הסכומים בשקלים מופיעים רק אם הזנתם הפקדה</b>, והם מחושבים
          על <b>החלק שמגיע לברוקר</b> — אחרי שקרן ההשתלמות קיבלה את
          התקרה שלה. הצבעים בפס ובנקודות הם רמות היציבות:{' '}
          <span className="lab-dot lab-calm" aria-hidden="true" />{TIER_HE.calm} ·{' '}
          <span className="lab-dot lab-mid" aria-hidden="true" />{TIER_HE.mid} ·{' '}
          <span className="lab-dot lab-hot" aria-hidden="true" />{TIER_HE.hot}.
        </p>
        <p className="note">
          <b>ומה שקורה אחרי הבחירה:</b> מנגנון הקנייה רץ על מה שבחרתם —
          רכיב בשיא לוקח <b>10%</b> מההפקדה, רכיב שירד לוקח את{' '}
          <b>אחוז הירידה שלו</b>, <b>והשארית כולה הולכת לזה שנפל הכי
          עמוק</b>. המסלול קובע את לוח המשיכות.
          <b> אין באמור המלצה ואין בו ייעוץ פיננסי.</b>
        </p>
      </section>
    </>
  );
}
