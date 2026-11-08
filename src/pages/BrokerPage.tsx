/** MGS · ברוקר זר — מה קונים, איפה, ובאיזה מטבע.
 *
 *  הדף הזה עונה על שלוש שאלות נפרדות שקל לבלבל ביניהן:
 *
 *  1. **איפה הנייר נסחר** — תל אביב, לונדון, אמסטרדם או Xetra.
 *  2. **באיזה מטבע משלמים** — לאותה קרן יש לרוב כמה קווים, בדולר,
 *     בליש״ט ובפני, **עם אותו ISIN בדיוק**.
 *  3. **מס עיזבון** — תלוי **רק** במי הנפיק את הנייר, לא בבורסה ולא
 *     במטבע ולא בברוקר. כל הקרנות כאן איריות ולכן מחוץ לבסיס המס.
 *
 *  כל הקווים אומתו מול נתוני ה-LSE וטבלאות הליסטינג של המנפיקים,
 *  2.11.2026. אין בדף הזה המלצה ואין בו ייעוץ פיננסי או ייעוץ מס.
 */
import { useMemo, useState } from 'react';
import { DataCards } from '../components/shared/DataCards';
import { Rows } from '../components/shared/Rows';
import { IRISH, UMBRELLA, HOLDINGS, LENDING, WINDOW, type IrishFund } from '../constants/irish';
import { BUY, BUY_UNVERIFIED } from '../constants/irish';
import { ACCESS, TURNOVER, MIN_TURNOVER, EXPOSURES, ASK } from '../constants/access';
import { LADDER, LADDER_COMBOS, LADDER_FUNDS, ladderPeak } from '../constants/ladder';
import { LiveQuotes } from '../components/build/LiveQuotes';
import { LEVERAGED, DECAY, ISSUER_WARNINGS, RECOMMENDED_HOLD } from '../constants/leveraged';

const pc = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const sg = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** תפקיד בתיק — לא דירוג ולא המלצה, רק קיבוץ לקריאה */
const ROLE: Record<string, string> = {
  CSPX: 'core', SPXS: 'core', VUAA: 'core', SPYL: 'core', SSAC: 'core',
  ACWD: 'core', FWRA: 'core', VWRA: 'core', MXWO: 'core', IWDA: 'core',
  CNDX: 'growth', EQQS: 'growth', IUIT: 'growth',
  XUTC: 'growth', XLKS: 'growth', WTEC: 'growth', IWMO: 'growth',
  SEMI: 'sector', SMH: 'sector', RBOT: 'sector', BCHN: 'sector',
  GDX: 'spread', SPGP: 'spread', ZPRR: 'spread', NDIA: 'spread', KWEB: 'spread',
};
const ROLE_HE: Record<string, { he: string; sub: string }> = {
  core: { he: 'גרעין', sub: 'מדד רחב — הבסיס' },
  growth: { he: 'צמיחה', sub: 'טכנולוגיה ונאסד״ק' },
  sector: { he: 'סקטור', sub: 'סקטור ממוקד' },
  spread: { he: 'מפזר', sub: 'מתאם נמוך — תפקידם לפזר' },
};
const ROLES = ['core', 'growth', 'sector', 'spread'];

/** התנגשויות טיקר שעלולות להביא לקניית נייר אמריקאי בטעות */
const CLASH: Array<{ sym: string; us: string; isin: string; why: string }> = [
  { sym: 'SPXS', us: 'Direxion Daily S&P 500 Bear 3X Shares', isin: 'US25460E1901',
    why: 'אמריקאית, ממונפת פי שלוש, ובכיוון ההפוך. ההתנגשות החמורה ברשימה.' },
  { sym: 'NDIA', us: 'Global X India Active ETF', isin: 'קרן אמריקאית',
    why: 'קרן הודו אמריקאית, לא האירית.' },
  { sym: 'RBOT', us: 'Vicarious Surgical Inc', isin: 'מניה בודדת',
    why: 'זו בכלל לא קרן אלא מניה של חברה אחת.' },
];

/** קרנות שהוצאו מהקטלוג, ולמה */
const DROPPED: Array<{ he: string; sym: string; why: string }> = [
  { he: 'טכנולוגיה ארה״ב · Xtrackers', sym: 'XUIT',
    why: 'מחלקת 1C הצוברת מחזיקה כ-225,000$ בלבד — מחלקת זרע ולא נייר '
       + 'סחיר. הטיקר XUTC שייך בכלל למחלקה המחלקת, ISIN אחר. '
       + 'לאותה חשיפה יש IUIT ו-XLKS.' },
];

function Flag({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: React.ReactNode }) {
  return <span className={`bk-flag bk-${tone}`}>{children}</span>;
}

export function BrokerPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [tab, setTab] = useState<'foreign' | 'israeli' | 'order' | 'ladder' | 'lev'>('foreign');
  const peak = useMemo(() => ladderPeak(), []);
  const [trk, setTrk] = useState<string>('הכל');
  const TRACKS = ['הכל', 'תזרים בלבד', 'תזרים וצמיחה', 'צמיחה בלבד'];

  const ils = useMemo(
    () => IRISH.filter(f => ACCESS[f.k] === 'ils')
      .sort((a, b) => (TURNOVER[b.k] ?? 0) - (TURNOVER[a.k] ?? 0)), []);
  const dropped = useMemo(
    () => IRISH.filter(f => ACCESS[f.k] === 'out'), []);
  const buyable = useMemo(
    () => IRISH.filter(f => BUY[f.k]), []);

  const byRole = (role: string) =>
    buyable.filter(f => ROLE[f.k] === role).sort((a, b) => b.cagr - a.cagr);

  const Wrap = embedded
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => <div className="term">{children}</div>;

  return (
    <Wrap>
      <section>
        <span className="eyebrow">ברוקר זר · איפה קונים</span>
        {embedded
          ? <h2>מה קונים, איפה, ובאיזה מטבע</h2>
          : <h1>מה קונים, איפה, ובאיזה מטבע</h1>}
        <p className="lede">
          שלוש שאלות נפרדות שקל לערבב: <b>איפה הנייר נסחר</b>,{' '}
          <b>באיזה מטבע משלמים עליו</b>, ו<b>האם הוא חשוף למס עיזבון
          אמריקאי</b>. התשובה לשלישית לא תלויה בשתי הראשונות.
        </p>
        <div className="chips">
          <button className="opt" type="button" aria-pressed={tab === 'foreign'}
            onClick={() => setTab('foreign')}>
            דרך ברוקר זר — {buyable.length} קרנות
          </button>
          <button className="opt" type="button" aria-pressed={tab === 'israeli'}
            onClick={() => setTab('israeli')}>
            דרך ברוקר ישראלי — {ils.length} קרנות
          </button>
          <button className="opt" type="button" aria-pressed={tab === 'order'}
            onClick={() => setTab('order')}>
            איך מוצאים באינטראקטיב
          </button>
          <button className="opt" type="button" aria-pressed={tab === 'ladder'}
            onClick={() => setTab('ladder')}>
            סולם התשואות
          </button>
          <button className="opt lev-tab" type="button" aria-pressed={tab === 'lev'}
            onClick={() => setTab('lev')}>
            ⚠ ממונפות — נפרד
          </button>
        </div>
      </section>

      {tab === 'foreign' && (
        <>
          <section>
            <h2>מס עיזבון — למה כל הרשימה פטורה</h2>
            <p>
              <b>§2104(a)</b> קובע שנייר הוא נכס אמריקאי <b>רק אם הנפיקה
              אותו חברה אמריקאית</b>. קרן אירית היא חברה אירית.
              ו-<b>§2105(d)</b>, שאיפשר להסתכל דרך הקרן אל ההחזקות שלה,{' '}
              <b>פג ב-31.12.2011 ולא חודש</b> — ולכן קרן אירית שמחזיקה
              100% מניות אמריקאיות עדיין אינה נכס אמריקאי.
            </p>
            <p>
              <b>ומכאן שלושה דברים שאינם משנים כלום:</b> באיזו בורסה קנית,
              באיזה מטבע שילמת, ואיפה יושב הברוקר. לאותה קרן יש קו בדולר
              וקו בליש״ט <b>עם אותו ISIN בדיוק</b> — אותה קרן, אותו NAV,
              אותו סיטוס.
            </p>
            <p className="note">
              <b>החריג היחיד, והוא אמיתי: מזומן.</b> §2105(b) פוטר{' '}
              <b>פיקדונות בנקאיים</b> — לא מזומן שיושב בחשבון ברוקראז׳
              אמריקאי. הפטור הוא <b>60,000$ בלבד</b>, אינו צמוד, ולישראל{' '}
              <b>אין אמנת מס עיזבון עם ארצות הברית</b>. מעל זה המס מגיע
              ל-40%. לכן יתרת מזומן בחשבון היא החשיפה, לא הקרנות.
            </p>
            <p className="note">
              <b>וסייג אחד שלא אחליק:</b> ניתוח המבנה אומת על{' '}
              <b>plc</b>. {Object.values(UMBRELLA).filter(u => u === 'plc').length}{' '}
              מהקרנות כאן הן plc, ו-<b>KWEB היא ICAV</b> — מבנה שלא מצאתי
              עליו אסמכתה ייעודית. <b>אין כאן ייעוץ מס</b>; ההכרעה היא של
              יועץ מס אמריקאי.
            </p>
          </section>

          <section>
            <h2>⚠ התנגשויות טיקר — הסכנה האמיתית</h2>
            <p className="lede">
              שלושה מהסימולים ברשימה שייכים <b>בארצות הברית</b> לנייר אחר
              לגמרי. מי שיקליד את הסימול ויקבל את הבורסה הלא נכונה קונה
              נייר אמריקאי — בדיוק מה שהרשימה הזאת באה למנוע.
            </p>
            <DataCards
              items={CLASH} keyOf={c => c.sym}
              cols={[
                { h: 'הסימול', v: c => <span dir="ltr">{c.sym}</span> },
                { h: 'בארה״ב הוא', mono: true, v: c => c.us },
                { h: 'ISIN האמריקאי', mono: true, tone: () => 'dn', v: c => c.isin },
              ]}
              note={c => c.why}
            />
            <p>
              <b>והכלל שמגן עליכם בלי קשר:</b> באינטראקטיב, חפשו{' '}
              <b>לפי ISIN ולא לפי סימול</b>. כל ISIN בדף הזה מתחיל
              ב-<b dir="ltr">IE</b>. אם מה שעולה מתחיל ב-<b dir="ltr">US</b>{' '}
              — זו הגרסה האמריקאית.
            </p>
            <p className="note">
              הגרסאות האמריקאיות של GDX, SMH ו-SPY <b>כן</b> נסחרות
              בלונדון — אבל תחת הקודים <span dir="ltr">0LKC</span>,{' '}
              <span dir="ltr">0LLB</span> ו-<span dir="ltr">0KZC</span>.
              הסימולים הפשוטים בלונדון שייכים לקרן האירית.
            </p>
          </section>

          {ROLES.map(role => {
            const rows = byRole(role);
            return (
              <section key={role}>
                <h2>{ROLE_HE[role].he} — {ROLE_HE[role].sub} ({rows.length})</h2>
                <Rows
                  cols={[
                    { k: 'he', label: 'הקרן', lead: true },
                    { k: 'sym', label: 'סימול להזמנה', ltr: true },
                    { k: 'ex', label: 'בורסה' },
                    { k: 'cur', label: 'מטבע', ltr: true },
                    { k: 'isin', label: 'ISIN', ltr: true, dim: true },
                    { k: 'struct', label: 'מבנה', ltr: true },
                    { k: 'holds', label: 'מחזיקה', ltr: true },
                    { k: 'top3', label: '3 הגדולות', ltr: true },
                    { k: 'lend', label: 'השאלה בפועל', ltr: true },
                    { k: 'ter', label: 'דמי ניהול', ltr: true },
                    { k: 'cagr', label: 'תשואה', ltr: true },
                    { k: 'vol', label: 'תנודתיות', ltr: true },
                  ]}
                  empty="אין כאן קרנות — אף קרן בתפקיד הזה לא אומתה להזמנה דרך ברוקר זר."
                  rows={rows.map(f => {
                    const b = BUY[f.k];
                    const h = HOLDINGS[f.k];
                    const l = LENDING[f.k];
                    const unv = BUY_UNVERIFIED.includes(f.k);
                    return {
                      id: f.k,
                      cells: {
                        he: <>
                          {f.he}
                          <small className="bk-sub">{f.desc}</small>
                        </>,
                        sym: <span className="tk"><b>{b.sym}</b></span>,
                        ex: b.ex,
                        cur: <>
                          <Flag tone={unv ? 'warn' : 'ok'}>{b.cur}</Flag>
                          {unv && <small className="bk-sub">לא אומת מול הבורסה</small>}
                        </>,
                        isin: f.isin,
                        struct: UMBRELLA[f.k] === 'ICAV'
                          ? <Flag tone="warn">ICAV</Flag>
                          : <span className="dim">plc</span>,
                        holds: h ? n0(h.n) : '—',
                        top3: <span className={h && h.top3 > 0.45 ? 'warn' : undefined}>
                          {h ? pc(h.top3, 0) : '—'}
                        </span>,
                        lend: <span className={l && l.actual !== null && l.actual > 0.15 ? 'warn' : undefined}>
                          {l
                            ? l.actual === null ? `עד ${pc(l.max ?? 0, 0)}`
                              : l.actual === 0 ? '—' : pc(l.actual, 1)
                            : '—'}
                        </span>,
                        ter: pc(f.ter, 2),
                        cagr: <span className={f.cagr >= 0 ? 'up' : 'warn'}>
                          {sg(f.cagr)}
                          {f.short && <span className="lab-flag">חלון קצר</span>}
                        </span>,
                        vol: pc(f.vol, 0),
                      },
                    };
                  })}
                />
              </section>
            );
          })}

          <section>
            <h2>איך לקרוא את העמודות</h2>
            <p>
              <b>מטבע.</b> לכל קרן יש לרוב כמה קווים — בדולר, בליש״ט
              ובפני — <b>עם אותו ISIN</b>. בחרתי לכל אחת את הקו{' '}
              <b>הדולרי</b>, כדי שתהיה המרה אחת מהשקל ולא שתיים.{' '}
              <b>חריגה אחת:</b> לשבבים של iShares אין קו דולרי בלונדון
              כלל — בלונדון היא בליש״ט, ב-Xetra ביורו, והדולרי הוא
              באמסטרדם.
            </p>
            <p>
              <b>מחזיקה</b> הוא מספר הניירות שהקרן באמת מחזיקה, ו
              <b>3 הגדולות</b> הוא כמה מהתיק יושב בשלוש הראשונות. הפער
              עצום: מצד אחד קרן אחת עם 1,923 מניות שהגדולה בהן 0.43%,
              ומצד שני קרן עם 75 מניות ששלוש הראשונות בה הן{' '}
              <b>56.4%</b>. שתיהן נקראות ״קרן מחקה מדד״.
            </p>
            <p>
              <b>השאלה בפועל</b> היא כמה מהתיק הושאל לצד שלישי — לא כמה{' '}
              <i>מותר</i>. הפער גדול: יש קרן שמותר לה 37% ובפועל הגיעה
              ל-5.4%, ויש אחת שבפועל <b>36.9%</b>. מעל 15% מסומן.
              VanEck אינה משאילה כלל, אבל הניסוח בתשקיף שלה הוא{' '}
              <b>הצהרת כוונה ולא הגבלה חוזית</b>.
            </p>
            <p className="note">
              <b>וארבע קרנות אינן מחזיקות את המדד שלהן בכלל</b> — אלה
              חוזי חילופין. הן מחזיקות סל מניות אמיתי ונפרד ומחליפות את
              תשואתו בתשואת המדד מול בנק. בקרן הטכנולוגיה של Invesco,
              למשל, הסל מחזיק בפועל פארמה בריטית, מזון שוויצרי וגז טבעי.
              <b> על מס עיזבון זה לא משפיע</b> — העטיפה האירית היא
              הקובעת. זה <b>סיכון צד נגדי</b>, שאלה אחרת לגמרי.
            </p>
          </section>

          {dropped.length + DROPPED.length > 0 && (
            <section>
              <h2>מה הוצא מהרשימה, ולמה</h2>
              <DataCards
                items={DROPPED} keyOf={d => d.sym}
                titleSym={d => d.sym}
                cols={[{ h: 'הקרן', v: d => d.he }]}
                note={d => d.why}
              />
            </section>
          )}
        </>
      )}

      {tab === 'israeli' && (
        <>
          <section>
            <h2>בשקלים בתל אביב — {ils.length} קרנות</h2>
            <p className="lede">
              מסחר מקוון רגיל אצל כל ברוקר ישראלי, בשקלים,{' '}
              <b>בלי עמלת המרת מט״ח</b> ובלי חדר מסחר. אלה אותן קרנות
              איריות בדיוק, ולכן <b>אותו פטור ממס עיזבון</b> — פשוט דרך
              הבורסה המקומית.
            </p>
            <Rows
              cols={[
                { k: 'he', label: 'הקרן', lead: true },
                { k: 'tase', label: 'מספר נייר', ltr: true, big: true },
                { k: 'cur', label: 'מטבע' },
                { k: 'turn', label: 'תמורה יומית', ltr: true },
                { k: 'isin', label: 'ISIN', ltr: true, dim: true },
                { k: 'struct', label: 'מבנה', ltr: true, dim: true },
                { k: 'ter', label: 'דמי ניהול', ltr: true },
                { k: 'cagr', label: 'תשואה', ltr: true },
                { k: 'vol', label: 'תנודתיות', ltr: true },
              ]}
              rows={ils.map(f => {
                const t = TURNOVER[f.k] ?? 0;
                return {
                  id: f.k,
                  cells: {
                    he: <>{f.he}<small className="bk-sub">{f.desc}</small></>,
                    tase: <span className="gold"><b>{f.tase}</b></span>,
                    cur: <Flag tone="ok">₪ שקלים</Flag>,
                    turn: <span className={t < 0 ? 'gold' : undefined}>
                      {t < 0 ? 'מ-5.11.2026' : `${n0(t)}₪`}
                    </span>,
                    isin: f.isin,
                    struct: UMBRELLA[f.k] ?? '—',
                    ter: pc(f.ter, 2),
                    cagr: <span className="up">{sg(f.cagr)}
                      {f.short && <span className="lab-flag">חלון קצר</span>}</span>,
                    vol: pc(f.vol, 0),
                  },
                };
              })}
            />
            <p className="note">
              <b>אבל {ils.length} קרנות אינן {ils.length} אפשרויות.</b>{' '}
              קרנות שמתואמות 0.92 ומעלה הן אותו נכס באריזה אחרת. בפועל יש
              כאן <b>{EXPOSURES.length} חשיפות נבדלות</b>:{' '}
              {EXPOSURES.map(g => g.he).join(' · ')}.
            </p>
          </section>

          <section>
            <h2>מה שרשום בתל אביב אך לא נסחר</h2>
            <p className="lede">
              אלה <b>כן</b> מופיעות ברשימת הבורסה, ולכן קל לחשוב שאפשר
              לקנות אותן בשקלים. התמורה היומית אומרת אחרת. הסף כאן הוא{' '}
              {n0(MIN_TURNOVER)}₪ ליום.
            </p>
                        <DataCards
              items={dropped} keyOf={f => f.k}
              cols={[
                { h: 'הקרן', v: f => f.he },
                { h: 'נייר בת״א', mono: true, v: f => f.tase },
                { h: 'תמורה יומית', tone: () => 'dn', v: f => `${n0(TURNOVER[f.k] ?? 0)}₪` },
                { h: 'איפה כן אפשר', mono: true,
                  v: f => BUY[f.k] ? `${BUY[f.k].sym} · ${BUY[f.k].ex}` : '—' },
              ]}
            />
            <p className="note">
              <b>וזו לא הערת שוליים.</b> טכנולוגיה (1159193) החזיקה לבדה
              את כל הגבול היעיל של תל אביב עד 22% תנודתיות — והיא נסחרת
              בפחות מ-50 אלף ש״ח ביום. בלעדיה, <b>הגבול בתל אביב נעצר
              ב-15.0% במקום ב-21.9%</b>, ומה שנשאר הוא מדדים רחבים בלבד.{' '}
              <b>אין בתל אביב אף קרן סקטור נזילה</b> מלבד השבבים שנכנסים
              ב-5.11.2026.
            </p>
          </section>

          <section>
            <h2>מה שבאמת חוסם — הברוקר, לא הבורסה</h2>
            <p>
              את {IRISH.length - ils.length} הקרנות שאינן בתל אביב{' '}
              <b>אולי</b> אפשר לקנות דרך ברוקר ישראלי — בחדר מסחר ניירות
              ערך זרים, בטלפון, במטבע זר. <b>זה לא אומת.</b> פסגות
              ואקסלנס מפרסמות גישה לבורסות אירופה; <b>מיטב אינה נוקבת
              בשם של אף בורסה אירופית</b> באתר שלה, והמסחר המקוון שלה
              אמריקאי בלבד.
            </p>
            <p>
              <b>ובחשבון IRA יש שכבה שלישית:</b> תקנה 4(א)(2) מאפשרת
              לחברה המנהלת לנקוב בשמות הברוקרים המותרים. גם אם הברוקר
              יכול — החברה המנהלת צריכה להתיר אותו.
            </p>
            <div className="lab-goal">
              <b>מה לשאול בכתב, עם ה-ISIN</b>
              <ol className="ask">{ASK.map(q => <li key={q}>{q}</li>)}</ol>
            </div>
          </section>
        </>
      )}

      {tab === 'order' && (
        <>
          <LiveQuotes />

          <section>
            <h2>איך מוצאים את הקרן באינטראקטיב</h2>
            <p className="lede">
              <b>מחפשים לפי ISIN, לא לפי טיקר.</b> אותו טיקר שייך לפעמים
              לנייר אחר לגמרי בבורסה אחרת, ולפעמים לקרן אמריקאית. ה-ISIN
              מזהה את הקרן עצמה ואינו משתנה בין בורסות.
            </p>
            <ol className="ask">
              <li>
                בשורת החיפוש מדביקים את ה-<b>ISIN</b> מהטבלה. כל אחד מהם
                מתחיל ב-<b dir="ltr">IE</b>.
              </li>
              <li>
                נפתחת רשימה של <b>כמה שורות לאותה קרן</b> — אחת לכל
                בורסה ולכל מטבע. <b>זה תקין</b>, זו אותה קרן.
              </li>
              <li>
                בוחרים את השורה שבה <b>הבורסה והמטבע</b> תואמים לטבלה:
                ברובן <span dir="ltr">LSE</span> ב-<b>USD</b>.
              </li>
              <li>
                מוודאים לפני השליחה שה-ISIN בחלון הפקודה{' '}
                <b>עדיין מתחיל ב-<span dir="ltr">IE</span></b>. אם הוא
                מתחיל ב-<span dir="ltr">US</span> — זו הגרסה האמריקאית,
                ויש עליה מס עיזבון.
              </li>
            </ol>
            <p className="note">
              <b>ולמה הבורסה חשובה גם כשהקרן נכונה:</b> לאותה קרן יש
              שורות בכמה מטבעות. שורה בליש״ט או ביורו תגרור{' '}
              <b>המרת מט״ח נוספת</b> מהשקל — ואת זה אפשר לחסוך בבחירת
              השורה הדולרית.
            </p>
          </section>

          <section>
            <h2>הטבלה — שם, טיקר, ואיפה לבחור</h2>
            <div className="scroll bleed">
              <table>
                <thead>
                  <tr>
                    <th className="lead">שם הקרן האירית</th>
                    <th>טיקר</th>
                    <th>ISIN — להדביק בחיפוש</th>
                    <th>הבורסה לבחור</th>
                    <th>המטבע</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.flatMap(role => {
                    const rows = byRole(role);
                    if (!rows.length) return [];
                    return [
                      <tr key={`h-${role}`} className="cross">
                        <td className="lead" colSpan={5}>
                          <b>{ROLE_HE[role].he}</b> · {ROLE_HE[role].sub}
                        </td>
                      </tr>,
                      ...rows.map(f => {
                        const b = BUY[f.k];
                        const odd = b.cur !== 'USD' || b.ex !== 'LSE';
                        return (
                          <tr key={f.k}>
                            <td className="lead">{f.he}</td>
                            <td dir="ltr" className="tk"><b>{b.sym}</b></td>
                            <td dir="ltr" className="gold">{f.isin}</td>
                            <td dir="ltr" className={odd ? 'warn' : ''}>{b.ex}</td>
                            <td dir="ltr">
                              <Flag tone={b.cur === 'USD' ? 'ok' : 'warn'}>{b.cur}</Flag>
                            </td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              <b>שורה אחת חורגת:</b> לשבבים של iShares <b>אין שורה
              דולרית בלונדון בכלל</b> — בלונדון היא בליש״ט, וה-USD שלה
              יושב ב-Euronext אמסטרדם. אם המערכת תציע את הלונדונית,
              תשלמו המרה לליש״ט.
            </p>
          </section>

          <section>
            <h2>⚠ שלושה טיקרים שלא לסמוך עליהם</h2>
                        <DataCards
              wide items={CLASH} keyOf={c => c.sym}
              titleSym={c => c.sym}
              cols={[
                { h: 'הטיקר', v: () => 'אותו סימול, שני ניירות' },
                { h: 'בלונדון — אירית, תקין', he: true, tone: () => 'up',
                  v: c => IRISH.find(f => BUY[f.k]?.sym === c.sym)?.he ?? '—' },
                { h: 'בארצות הברית', mono: true, tone: () => 'dn', v: c => c.us },
              ]}
              note={c => c.why}
            />
          </section>
        </>
      )}

      {tab === 'ladder' && (
        <>
          <section>
            <h2>סולם התשואות — מהנמוך לגבוה</h2>
            <p className="lede">
              נבדקו <b>{LADDER_COMBOS.toLocaleString('en-US')}</b> שילובים:
              כל צירופי המשקולות בקפיצות של 10%, עד ארבעה רכיבים, על{' '}
              <b>{LADDER_FUNDS}</b> הקרנות האיריות עם היסטוריה מלאה של
              60 חודשים. בכל רמת תנודתיות נשמר <b>רק מה שהניב הכי הרבה</b>.
            </p>
            <p>
              <b>הסולם לא אומר לכם איפה לשבת.</b> הוא אומר מה עלה כל שלב.
              בוחרים כמה תנודתיות סופגים, ורואים מה זה החזיר.
            </p>
            <div className="chips">
              {TRACKS.map(t => (
                <button key={t} className="opt" type="button"
                  aria-pressed={trk === t} onClick={() => setTrk(t)}>{t}</button>
              ))}
            </div>
            <div className="scroll bleed">
              <table>
                <thead>
                  <tr>
                    <th className="lead">תנודתיות</th>
                    <th>תשואה שנתית</th>
                    <th>תשואה לכל יחידת תנודתיות</th>
                    <th>למי זה מתאים</th>
                    <th>התמהיל שהשיג את זה</th>
                  </tr>
                </thead>
                <tbody>
                  {LADDER.filter(r => trk === 'הכל' || r.track === trk).map(r => (
                    <tr key={r.vol} className={r === peak ? 'cross' : ''}>
                      <td className="lead" dir="ltr">{pc(r.vol, 0)}</td>
                      <td dir="ltr" className="up">{sg(r.cagr)}</td>
                      <td dir="ltr" className={r.cagr / r.vol >= 1.14 ? 'gold' : ''}>
                        {(r.cagr / r.vol).toFixed(2)}
                        {r === peak && <small className="bk-sub">השיא</small>}
                      </td>
                      <td>{r.track}</td>
                      <td>
                        {r.parts.map(q => (
                          <span key={q.k} className="lab-part">
                            {IRISH.find(f => f.k === q.k)?.he ?? q.k}
                            <b dir="ltr">{q.w}%</b>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>שלוש קריאות מהסולם</h2>
            <p>
              <b>אחת. התשואה עולה ברציפות — והיחס לא.</b> מ-12% ל-29%
              תנודתיות התשואה עולה מ-13.3% ל-30.1%, אבל{' '}
              <b>היחס מגיע לשיא ב-{pc(peak.vol, 0)} ומשם יורד</b>. מעל
              הנקודה הזאת כל נקודת תשואה נוספת עולה יותר מקודמתה.
            </p>
            <p>
              <b>שתיים. כורות זהב חוזרים כמעט בכל שלב, ב-10%–20%.</b> לא
              בגלל התשואה שלהם — בגלל שהמתאם שלהם לשוק הוא{' '}
              <b>0.06</b>, הנמוך בכל הקטלוג. הם מורידים את תנודתיות התיק
              יותר ממה שהם מוסיפים לה. <b>ו-GDX אינה נסחרת בתל אביב</b>,
              ולכן הסולם הזה כולו דורש ברוקר זר.
            </p>
            <p>
              <b>שלוש. הנפילה היא המספר שמפיל אנשים, לא התנודתיות.</b>{' '}
              בשלב של 29% תנודתיות הנפילה המקסימלית הייתה{' '}
              <b>35%−</b>. מי שמושך כסף באמצע נפילה כזאת נועל אותה. לכן
              העמודה הזאת כאן — ולכן ״צמיחה בלבד״ מתאים רק למי שבאמת לא
              מושך בדרך.
            </p>
            <p className="note">
              <b>ותיקון שחשוב שתדעו עליו:</b> גרסה קודמת של הסולם כללה את
              Xtrackers Nasdaq-100. סדרת המחירים שלה נמצאה <b>פגומה</b> —
              בינואר 2023 היא הראתה קפיצה של 33.4% בחודש שבו הנאסד״ק עלה
              10.7%, והיא נמדדה <b>7.8 נקודות מעל</b> שתי קרנות אחרות על
              אותו מדד בדיוק. היא הוסרה מכל הקטלוג והסולם חושב מחדש.
              <b> השיא ביחס ירד מ-1.20 ל-{(peak.cagr / peak.vol).toFixed(2)}.</b>
            </p>
            <p className="note">
              <b>וסייג על כל המספרים כאן:</b> הם מתארים{' '}
              <b>חלון אחד של 60 חודשים</b> שכבר קרה. התמהיל שהניב הכי
              הרבה בעבר אינו בהכרח זה שיניב בעתיד, והסולם אינו תחזית.
              אין בו המלצה ואין בו ייעוץ פיננסי.
            </p>
          </section>
        </>
      )}

      {tab === 'lev' && (
        <>
          <section className="lev-zone">
            <span className="eyebrow lev-eyebrow">אזור נפרד · מוצרים ממונפים</span>
            <h2>ממונפות — ולמה הן לא בקטלוג</h2>
            <p className="lede">
              <b>אין קרן UCITS ממונפת אירית. לא ×2 ולא ×3.</b> נבדק מול
              DWS, Amundi, iShares, Invesco ו-justETF. הסיבה רגולטורית:
              UCITS מגבילה חשיפה גלובלית ל-100% מה-NAV, ולכן ×2 הוא
              התקרה המעשית לקרן UCITS — <b>וכל ×3 ו-×5 בשוק האירופי הוא
              נייר חוב, בשום דומיסיל</b>.
            </p>
            <p className="lab-access warn">
              <b>תקופת ההחזקה שהמנפיקים עצמם נוקבים: {RECOMMENDED_HOLD}.</b>{' '}
              כל המערכת כאן בנויה על הפקדה חודשית שמוחזקת עשרות שנים.
              אלה שני דברים הפוכים, ולכן המוצרים האלה יושבים בטאב נפרד
              ולא מעורבבים עם הקטלוג.
            </p>
          </section>

          <section>
            <h2>מה שחזר מהבדיקה</h2>
            <div className="scroll bleed">
              <table>
                <thead>
                  <tr>
                    <th className="lead">המוצר</th>
                    <th>סימול</th>
                    <th>ISIN</th>
                    <th>דומיסיל</th>
                    <th>אירי?</th>
                    <th>UCITS?</th>
                    <th>מינוף</th>
                    <th>ד״נ</th>
                    <th>מטבע</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVERAGED.map(l => (
                    <tr key={l.isin}>
                      <td className="lead">{l.he}
                        <small className="bk-sub">{l.note.replace(/\*\*/g, '')}</small></td>
                      <td dir="ltr" className="tk"><b>{l.tick}</b></td>
                      <td dir="ltr" className={l.irish ? 'gold' : 'warn'}>{l.isin}</td>
                      <td>{l.domicile}</td>
                      <td>{l.irish
                        ? <Flag tone="ok">כן · IE</Flag>
                        : <Flag tone="bad">לא</Flag>}</td>
                      <td>{l.ucits
                        ? <Flag tone="ok">UCITS</Flag>
                        : <Flag tone="bad">נייר חוב</Flag>}</td>
                      <td dir="ltr"><b>×{l.lev}</b></td>
                      <td dir="ltr">{pc(l.ter, 2)}</td>
                      <td dir="ltr">{l.cur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note">
              <b>שימו לב לשתי העמודות האמצעיות — הן לעולם לא ירוקות
              יחד.</b> מה שאירי אינו UCITS, ומה ש-UCITS אינו אירי.
              <b> אין מוצר ממונף שהוא גם וגם</b>, וזה לא מקרה אלא
              תוצאה של הרגולציה.
            </p>
            <p className="note">
              <b>ומה זה אומר למס עיזבון:</b> קרן נבחנת לפי{' '}
              <b>§2104(a)</b> — מניה של חברה. נייר חוב נבחן לפי{' '}
              <b>§2104(c)</b> — חוב, לפי זהות החייב. <b>זו שאלה משפטית
              נפרדת שלא אומתה כאן</b>, ואסור להניח שהתשובה זהה לזו של
              הקרנות האיריות בקטלוג.
            </p>
          </section>

          <section>
            <h2>שחיקת האיפוס — נמדדה, לא הוסברה</h2>
            <p className="lede">
              סימלצתי <b>איפוס יומי אמיתי</b> על 1,255 ימי מסחר, חמש
              שנים, כולל דמי ניהול. זה מה שקרה בפועל מול מה ש״פי 2״
              ו״פי 3״ היו אמורים לתת.
            </p>
            <Rows
              cols={[
                { k: 'he', label: 'המדד', lead: true },
                { k: 'idx', label: 'המדד עצמו', ltr: true },
                { k: 'x2', label: '×2 בפועל', ltr: true },
                { k: 'x3', label: '×3 בפועל', ltr: true, big: true },
                { k: 'naive3', label: '״פי 3״ היה אמור', ltr: true, dim: true },
              ]}
              rows={DECAY.map(d => ({
                id: d.he,
                cells: {
                  he: d.he,
                  idx: sg(d.idx, 0),
                  x2: sg(d.x2, 0),
                  x3: <span className="gold">{sg(d.x3, 0)}</span>,
                  naive3: sg(d.naive3, 0),
                },
              }))}
            />
            <p>
              <b>בנאסד״ק, ×3 החזיר 144% במקום 468%.</b> השחיקה אכלה
              שתי שלישים מהתשואה התיאורטית — ובתמורה הוא ספג נפילה של{' '}
              <b>81%</b>. ו-×2 נתן 136%, כלומר <b>כמעט אותו דבר כמו ×3,
              בחצי הנפילה</b>. זה לא טיעון נגד מינוף — זו אריתמטיקה של
              איפוס יומי.
            </p>
          </section>

          <section>
            <h2>בלשון המנפיקים עצמם</h2>
            {ISSUER_WARNINGS.map(w => (
              <div key={w.who} className="lab-goal">
                <b>{w.who}</b>
                <p>{w.he.replace(/\*\*/g, '')}</p>
              </div>
            ))}
            <p className="note">
              <b>אין באמור המלצה ואין בו ייעוץ פיננסי.</b> המוצרים
              בעמוד הזה מופרדים מהקטלוג בכוונה, ואינם נכללים בסולם
              התשואות, בגבול היעיל או בכל חישוב אחר במערכת.
            </p>
          </section>
        </>
      )}

      <section>
        <p className="note">
          כל התשואות והתנודתיות נמדדו על <b>{WINDOW.months} חודשים</b>{' '}
          ({WINDOW.from}–{WINDOW.to}), בדולר, מתשואות חודשיות כולל
          דיבידנדים. קרן המסומנת <b>״חלון קצר״</b> נמדדה על פחות מכך
          ובשוק עולה, ולכן המספר שלה מוטה כלפי מעלה.
          נתוני ההחזקות, ההשאלה והמבנה המשפטי אומתו מול מסמכי המנפיקים,
          אוקטובר–נובמבר 2026. <b>אין באמור המלצה, ייעוץ השקעות או ייעוץ
          מס. תשואת עבר אינה מנבאת את העתיד.</b>
        </p>
      </section>
    </Wrap>
  );
}

export type { IrishFund };
