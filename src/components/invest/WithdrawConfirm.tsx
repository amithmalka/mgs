/** **אישור המשיכה של החודש, ומה נשאר בתיק אחריה.**
 *
 *  **הכלל שמסך הזה אוכף.** נמכר **רק רכיב שמחירו מעל מחיר העלות
 *  הממוצע שלכם**. זה מה שמונע ממשיכה לנעול הפסד, וזה גם מה שעלול
 *  לומר ״החודש אין מה למשוך״ — ואם כל הרכיבים מתחת לעלות, זו
 *  התשובה הנכונה ולא תקלה. המס מחושב על **הרווח הריאלי** בתוך
 *  הפרוסה שנמכרת, לפי סעיף 88: בנייר במטבע חוץ ה״מדד״ הוא שער
 *  החליפין, ולכן **עליית הדולר אינה רווח לצורכי מס.**
 *
 *  **ושוב אותו דבר שנאמר בהפקדה.** המחירים הם סוף יום, ולכן
 *  **מספר היחידות למכירה הוא אומדן** — הסכום בשקלים הוא היעד.
 *
 *  **ומותר לומר שלא נמשך.** חודש בלי משיכה הוא מצב תקין במסלול
 *  צמיחה, והוא בחירה לגיטימית בכל מסלול.
 */
import { useEffect, useMemo, useState } from 'react';
import { listDeposits, listMarks, listWithdrawals, positionsNet, addWithdrawals } from '../../lib/deposits';
import type { Position, NewSale } from '../../lib/deposits';
import { withdrawTax, monthlyDraw, CGT } from '../../lib/withdrawTax';
import { useMyPortfolio } from '../../store/myPortfolio';
import { useMgsStore, currentPlanMonth } from '../../store/mgsStore';
import { useMonthLog } from '../../store/monthLog';
import { thisMonth } from '../../store/planStore';
import { mix, IRISH, BUY } from '../../constants/irish';
import { useMarket } from '../../hooks/useMarket';
import { Card } from '../layout/Card';
import { Rows } from '../shared/Rows';
import { NumField } from '../build/NumField';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n4 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
const pc = (v: number) => `${(v * 100).toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);

const TRACK_HE = { flow: 'תזרים', both: 'תזרים וצמיחה', growth: 'צמיחה' } as const;

export function WithdrawConfirm() {
  const { holdings } = useMyPortfolio();
  const { startMonth } = useMgsStore();
  const market = useMarket(holdings);
  const month = thisMonth();
  const entry = useMonthLog(s => s.entries[month]);
  const confirmWithdraw = useMonthLog(s => s.confirmWithdraw);
  const skipWithdraw = useMonthLog(s => s.skipWithdraw);
  const clearW = useMonthLog(s => s.clearMonth);

  const planYear = Math.floor((currentPlanMonth(startMonth) - 1) / 12) + 1;
  const track = useMemo<'flow' | 'both' | 'growth'>(() => {
    const v = mix(holdings).vol;
    return v < 0.145 ? 'flow' : v < 0.225 ? 'both' : 'growth';
  }, [holdings]);

  const [pos, setPos] = useState<Position[]>([]);
  const [ledger, setLedger] = useState<'ok' | 'missing' | 'loading'>('loading');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    void (async () => {
      const [d, m, w] = await Promise.all([listDeposits(), listMarks(), listWithdrawals()]);
      if (!d.ok || !m.ok || !w.ok) { setLedger('missing'); return; }
      setPos(positionsNet(d.data, m.data, w.data)); setLedger('ok');
    })();
  }, [reload]);

  /** **המחיר העדכני, ובסדר העדפה.** ציטוט חי קודם, אחריו המחיר
   *  שסומן ביומן, ורק אם אין שניהם — העלות הממוצעת, שפירושה
   *  ״נניח שאין רווח״. */
  const prices = useMemo(() => {
    const o: Record<string, number> = {};
    for (const p of pos) {
      const sym = BUY[p.k]?.sym;
      const live = sym ? market.quotes[sym]?.price : null;
      const px = live ?? p.mark ?? null;
      if (px) o[p.k] = px;
    }
    return o;
  }, [pos, market.quotes]);

  const value = useMemo(() => pos.reduce((t, p) => {
    const px = prices[p.k] ?? p.avgPrice;
    const fx = p.currency === 'GBp' ? market.rates.GBP / 100 : market.rates[p.currency] ?? 1;
    return t + px * p.units * fx;
  }, 0), [pos, prices, market.rates]);

  const draw = monthlyDraw(track, planYear, value);
  const [gross, setGross] = useState<number | null>(null);
  const useGross = gross ?? Math.round(draw.amount);

  const t = useMemo(() => withdrawTax(pos, prices, market.rates, useGross),
    [pos, prices, market.rates, useGross]);

  const rows = useMemo(() => t.lines.map(l => {
    const px = prices[l.k];
    const fx = l.ccy === 'GBp' ? market.rates.GBP / 100 : market.rates[l.ccy] ?? 1;
    const p = pos.find(x => x.k === l.k);
    // הסכום שנלקח מהרכיב — פרו־רטה לפי מה שהחישוב הקצה לו
    const takeIls = l.sold ?? 0;
    const units = px && fx ? takeIls / (px * fx) : null;
    return { ...l, px: px ?? null, units, takeIls, avg: p?.avgPrice ?? null };
  }).filter(r => r.takeIls > 0.5), [t, prices, market.rates, pos]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    const sales: NewSale[] = rows
      .filter(r => r.px && r.units)
      .map(r => ({
        fund_key: r.k, symbol: BUY[r.k]?.sym ?? null, withdrawn_on: today(),
        units: Math.round(r.units! * 1e6) / 1e6,
        unit_price: r.px!,
        amount_ils: Math.round(r.takeIls * 100) / 100,
        currency: r.ccy,
        avg_at_sale: r.avg,
        note: `אושר במסך המשיכות · ${month}`,
      }));
    if (!sales.length) { setMsg('אין מה לרשום — אין רכיב מעל העלות עם מחיר עדכני.'); setBusy(false); return; }
    const res = await addWithdrawals(sales);
    if (!res.ok) { setMsg(res.reason); setBusy(false); return; }
    confirmWithdraw(month, t.gross, t.tax, t.net,
      rows.map(r => ({ k: r.k, ils: Math.round(r.takeIls), units: r.units, px: r.px })));
    setReload(x => x + 1);
    setBusy(false);
  };

  if (ledger === 'missing') {
    return (
      <Card id="withdraw">
        <span className="eyebrow">המשיכה של החודש</span>
        <h3 className="text-[15px] font-bold text-gold-light mb-2">
          היומן אינו זמין כרגע
        </h3>
        <p className="note">
          <b>אי אפשר למשוך ממה שלא נרשם.</b> המשיכה נגזרת מהיחידות
          ומהעלות הממוצעת שביומן ההפקדות. <b>טיפלנו בזה</b> — אפשר
          לנסות שוב בהמשך.
        </p>
      </Card>
    );
  }

  if (ledger === 'ok' && pos.length === 0) {
    return (
      <Card id="withdraw">
        <span className="eyebrow">המשיכה של החודש</span>
        <h3 className="text-[15px] font-bold text-gold-light mb-2">אין עוד מה למשוך</h3>
        <p className="note">
          <b>אין הפקדות רשומות.</b> אשרו הפקדה אחת למעלה, ומכאן ואילך
          המסך הזה יגיד כמה אפשר למשוך, מאיזה רכיב, וכמה מס.
        </p>
      </Card>
    );
  }

  // ───────── אחרי שהחודש הוכרע ─────────
  if (entry?.withdraw) {
    const w = entry.withdraw;
    return (
      <Card id="withdraw">
        <span className="eyebrow">המשיכה של החודש</span>
        <h3 className="text-[15px] font-bold text-gold-light mb-2">
          {w.decision === 'done'
            ? `נמשכו ${n0(w.gross)}₪ — ${n0(w.net)}₪ הגיעו לחשבון`
            : 'דווח שלא נמשך החודש'}
        </h3>
        <p className="note">
          {w.decision === 'done'
            ? <>נרשם ב-{new Date(w.at).toLocaleDateString('he-IL')}. מס רווחי
                הון {n0(w.tax)}₪. <b>יתרת התיק אחרי המשיכה: {n0(value)}₪</b> —
                מחושבת מהיחידות שנשארו ביומן, אחרי שהמכירה נרשמה.</>
            : <>נרשם ב-{new Date(w.at).toLocaleDateString('he-IL')}. <b>יתרת
                התיק: {n0(value)}₪.</b> חודש בלי משיכה משאיר את הכסף
                לעבוד — וזה מה שהתוכנית מניחה במסלול צמיחה.</>}
        </p>
        <div className="cta mt-3">
          <button className="opt" type="button" onClick={() => clearW(month)}>
            לבטל את הדיווח של החודש
          </button>
        </div>
      </Card>
    );
  }

  // ───────── לפני ההכרעה ─────────
  return (
    <Card id="withdraw">
      <span className="eyebrow">המשיכה של החודש</span>
      <h3 className="text-[15px] font-bold text-gold-light mb-1">
        כמה אפשר למשוך, ומה יישאר
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
        {[
          ['המסלול', TRACK_HE[track]],
          ['שנה בתוכנית', String(planYear)],
          ['שיעור המשיכה', draw.rate ? `${(draw.rate * 100).toFixed(0)}% לשנה` : 'אין משיכה'],
          ['שווי התיק עכשיו', `${n0(value)} ₪`],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5">
            <p className="text-[9.5px] text-text-dim tracking-wide">{k}</p>
            <p className="text-[14px] font-semibold text-text tabular-nums" dir="ltr">{v}</p>
          </div>
        ))}
      </div>

      <div className="term cx-edit mt-3">
        <div className="grp">
          <span className="glab">למשוך החודש</span>
          <NumField value={useGross} min={0} max={Math.max(1, Math.round(value))} step={50}
            label="סכום המשיכה" unit="₪" onCommit={v => setGross(Math.round(v))} />
        </div>
        <p className="note">
          התוכנית אומרת <b>{n0(draw.amount)}₪</b> החודש
          {track === 'growth' && <> — <b>במסלול צמיחה אין משיכה לאורך
            התקופה</b>, ולכן המספר הזה אפס. אפשר להזין סכום ידנית וללמוד
            מה המס יהיה</>}.
          {draw.nextStep !== null && <> עוד <b>{draw.nextStep} שנים</b> השיעור
            עולה מ-1% ל-4% לשנה.</>}
        </p>
      </div>

      <div className="mt-3">
        <Rows
          cols={[
            { k: 'he', label: 'הרכיב', lead: true },
            { k: 'take', label: 'למכור', ltr: true, big: true },
            { k: 'units', label: 'יחידות (אומדן)', ltr: true },
            { k: 'px', label: 'מחיר', ltr: true, dim: true },
            { k: 'avg', label: 'עלות ממוצעת', ltr: true, dim: true },
            { k: 'gain', label: 'רווח ריאלי ₪', ltr: true },
          ]}
          rows={rows.map(r => ({
            id: r.k,
            cells: {
              he: IRISH.find(y => y.k === r.k)?.he ?? r.k,
              take: <>{n0(r.takeIls)}₪</>,
              units: r.units ? n4(r.units) : '—',
              px: <>{r.px ?? '—'} {r.ccy}</>,
              avg: r.avg ? n4(r.avg) : '—',
              gain: n0(r.gainReal),
            },
          }))}
          empty="אין רכיב שאפשר למכור בסכום הזה."
        />
      </div>

      <div className="ptable mt-3">
        <table>
          <tbody>
            <tr><td>המשיכה המבוקשת</td><td dir="ltr">{n0(t.gross)} ₪</td></tr>
            <tr><td>מתוכה רווח ריאלי — <b>בסיס המס</b></td><td dir="ltr">{n0(t.taxableShare)} ₪</td></tr>
            <tr><td><b>מס רווחי הון {pc(CGT)}</b></td>
                <td dir="ltr" style={{ color: 'var(--down, #F87171)' }}>−{n0(t.tax)} ₪</td></tr>
            <tr><td><b>מגיע לחשבון</b></td>
                <td dir="ltr" style={{ color: 'var(--up, #4ADE80)', fontWeight: 700 }}>{n0(t.net)} ₪</td></tr>
            <tr><td><b>יתרת התיק אחרי המשיכה</b></td>
                <td dir="ltr"><b>{n0(Math.max(0, value - t.gross))} ₪</b></td></tr>
          </tbody>
        </table>
      </div>

      {t.belowCost.length > 0 && (
        <p className="note mt-3">
          <b>{t.belowCost.join(', ')} מתחת למחיר העלות שלהם, ולכן לא נמכרים.</b>{' '}
          המשיכה נלקחת רק מהרכיבים שמעל העלות — זה מה שמונע ממשיכה
          לנעול הפסד. <b>אם כל הרכיבים מתחת לעלות, לא נמשך כלום.</b>
        </p>
      )}
      {t.saved > 0 && (
        <p className="note mt-3">
          <b>סעיף 88 חוסך כאן {n0(t.saved)}₪.</b> לולא הכלל שקובע ששער
          החליפין הוא ה״מדד״, המס היה {n0(t.taxIfNominal)}₪. ההפרש הוא
          עליית המטבע, <b>והיא אינה רווח לצורכי מס.</b>
        </p>
      )}
      {msg && <p className="lab-access warn mt-3">{msg}</p>}

      <div className="cta mt-3">
        <button className="opt" type="button" disabled={busy || !rows.length}
          onClick={() => void save()}>
          {busy ? 'רושם…' : 'אישור משיכה'}
        </button>
        <button className="opt" type="button" disabled={busy}
          onClick={() => skipWithdraw(month)}>
          לא משכתי החודש
        </button>
      </div>

      <p className="note">
        <b>מספר היחידות הוא אומדן</b> — המחיר הוא סוף יום ולא זמן אמת,
        ולכן המכירה בפועל תצא בכמה אגורות אחרת. <b>הסכום בשקלים הוא
        היעד</b>, ואפשר לתקן את היחידות ביומן אחרי הביצוע.
      </p>
    </Card>
  );
}
