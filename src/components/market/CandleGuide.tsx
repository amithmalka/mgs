import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { Card } from '../layout/Card';
import { Icon } from '../shared/Icon';

const UP = '#34D399';
const DOWN = '#F87171';

/**
 * "How to read a candle" — an anatomy diagram plus the four shapes that come up
 * most. Collapsed by default so it teaches without crowding the market board.
 */
export function CandleGuide() {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 text-start">
        <div>
          <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">
            {he ? 'איך קוראים נרות יפניים' : 'How to read candlesticks'}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            {he ? 'כל נר מספר מה קרה למניה ביום אחד — ארבעה מספרים בצורה אחת.' : 'Each candle tells the whole story of one day in four numbers.'}
          </p>
        </div>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} className="text-text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          {/* ── Anatomy ─────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-5 items-center">
            <svg viewBox="0 0 200 260" width={150} height={195} className="flex-shrink-0" aria-hidden="true">
              {/* Green candle */}
              <line x1={60} x2={60} y1={20} y2={70} stroke={UP} strokeWidth={2.5} />
              <line x1={60} x2={60} y1={190} y2={240} stroke={UP} strokeWidth={2.5} />
              <rect x={38} y={70} width={44} height={120} fill={UP} rx={2} />

              {/* Labels */}
              <line x1={82} x2={128} y1={25} y2={25} stroke="#4A4A4A" strokeDasharray="3 3" />
              <text x={133} y={29} fill="#8A8A8A" fontSize={13}>{he ? 'הגבוה ביותר' : 'High'}</text>

              <line x1={86} x2={128} y1={70} y2={70} stroke="#4A4A4A" strokeDasharray="3 3" />
              <text x={133} y={74} fill="#8A8A8A" fontSize={13}>{he ? 'סגירה' : 'Close'}</text>

              <line x1={86} x2={128} y1={190} y2={190} stroke="#4A4A4A" strokeDasharray="3 3" />
              <text x={133} y={194} fill="#8A8A8A" fontSize={13}>{he ? 'פתיחה' : 'Open'}</text>

              <line x1={82} x2={128} y1={235} y2={235} stroke="#4A4A4A" strokeDasharray="3 3" />
              <text x={133} y={239} fill="#8A8A8A" fontSize={13}>{he ? 'הנמוך ביותר' : 'Low'}</text>

              {/* Body bracket */}
              <text x={8} y={135} fill="#D4AF37" fontSize={12}>{he ? 'גוף' : 'Body'}</text>
              <text x={8} y={45} fill="#6a6a6a" fontSize={11}>{he ? 'פתיל' : 'Wick'}</text>
            </svg>

            <div className="text-[12px] text-text-muted space-y-2 leading-relaxed">
              <p>
                <strong className="text-text">{he ? 'הגוף' : 'The body'}</strong>{' '}
                {he
                  ? 'הוא המרחק בין מחיר הפתיחה למחיר הסגירה. גוף ארוך = תנועה חזקה באותו יום, גוף קצר = יום שקט.'
                  : 'is the distance between the open and the close. A long body means a strong move that day; a short body means a quiet one.'}
              </p>
              <p>
                <strong className="text-text">{he ? 'הפתילים' : 'The wicks'}</strong>{' '}
                {he
                  ? 'הם הקווים הדקים: הם מראים עד לאן המחיר הגיע במהלך היום — למעלה ולמטה — לפני שחזר.'
                  : 'are the thin lines: they show how far the price travelled during the day, up and down, before coming back.'}
              </p>
              <p>
                {he
                  ? 'כלומר נר אחד מכיל ארבעה מספרים: פתיחה, סגירה, הגבוה ביותר והנמוך ביותר של אותו יום.'
                  : 'So one candle holds four numbers: the open, the close, the high and the low of that day.'}
              </p>
            </div>
          </div>

          {/* ── Colour ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorCard
              color={UP} filled
              title={he ? 'נר ירוק — עלייה' : 'Green candle — up'}
              body={he
                ? 'הסגירה גבוהה מהפתיחה. המחיר עלה במהלך היום.'
                : 'The close is above the open. The price rose during the day.'}
            />
            <ColorCard
              color={DOWN}
              title={he ? 'נר אדום — ירידה' : 'Red candle — down'}
              body={he
                ? 'הסגירה נמוכה מהפתיחה. המחיר ירד במהלך היום.'
                : 'The close is below the open. The price fell during the day.'}
            />
          </div>

          {/* ── Common shapes ───────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gold/70 mb-3">
              {he ? 'צורות שכדאי להכיר' : 'Shapes worth knowing'}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Shape
                kind="long" color={UP}
                title={he ? 'גוף ארוך' : 'Long body'}
                body={he ? 'צד אחד שלט ביום כולו — קונים או מוכרים.' : 'One side dominated the whole day.'}
              />
              <Shape
                kind="doji" color="#8A8A8A"
                title={he ? 'דוג׳י' : 'Doji'}
                body={he ? 'פתיחה וסגירה כמעט זהות — שיווי משקל, חוסר החלטה.' : 'Open and close nearly equal — indecision.'}
              />
              <Shape
                kind="hammer" color={UP}
                title={he ? 'פטיש' : 'Hammer'}
                body={he ? 'פתיל תחתון ארוך — ירדו חזק אבל חזרו למעלה.' : 'Long lower wick — sold off, then bought back up.'}
              />
              <Shape
                kind="shooting" color={DOWN}
                title={he ? 'כוכב נופל' : 'Shooting star'}
                body={he ? 'פתיל עליון ארוך — עלו חזק אבל נדחפו חזרה למטה.' : 'Long upper wick — rallied, then pushed back down.'}
              />
            </div>
          </div>

          <p className="text-[11px] text-text-dim leading-relaxed border-t border-surface-4 pt-3">
            {he
              ? 'חשוב: נר בודד הוא תיאור של יום אחד, לא תחזית. הצורות האלה מתארות מה כבר קרה — הן לא אומרות מה יקרה מחר, ואין להשתמש בהן כאות קנייה או מכירה. בשיטת MGS ההחלטה נקבעת לפי התוכנית וההפקדה החודשית, לא לפי צורת נר.'
              : 'Important: a single candle describes one day — it is not a forecast. These shapes say what already happened, not what comes next, and are not buy or sell signals. In the MGS method the decision follows your plan and monthly deposit, not the shape of a candle.'}
          </p>
        </div>
      )}
    </Card>
  );
}

function ColorCard({ color, filled = false, title, body }: { color: string; filled?: boolean; title: string; body: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-3 border border-surface-4">
      <svg viewBox="0 0 40 90" width={26} height={58} className="flex-shrink-0" aria-hidden="true">
        <line x1={20} x2={20} y1={4} y2={22} stroke={color} strokeWidth={2.5} />
        <line x1={20} x2={20} y1={68} y2={86} stroke={color} strokeWidth={2.5} />
        <rect x={7} y={22} width={26} height={46} fill={filled ? color : 'none'} stroke={color} strokeWidth={2.5} rx={2} />
      </svg>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold" style={{ color }}>{title}</p>
        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{body}</p>
      </div>
    </div>
  );
}

/** Small illustration of one canonical candle shape. */
function Shape({ kind, color, title, body }: {
  kind: 'long' | 'doji' | 'hammer' | 'shooting'; color: string; title: string; body: string;
}) {
  // [wickTop, bodyTop, bodyBottom, wickBottom] on a 0..90 canvas
  const geom = {
    long:     [6, 16, 74, 84],
    doji:     [6, 44, 47, 84],
    hammer:   [12, 16, 34, 84],
    shooting: [6, 56, 74, 80],
  }[kind];
  const [wt, bt, bb, wbm] = geom;

  return (
    <div className="p-3 rounded-xl bg-surface-3 border border-surface-4 text-center">
      <svg viewBox="0 0 40 90" width={24} height={54} className="mx-auto" aria-hidden="true">
        <line x1={20} x2={20} y1={wt} y2={bt} stroke={color} strokeWidth={2.5} />
        <line x1={20} x2={20} y1={bb} y2={wbm} stroke={color} strokeWidth={2.5} />
        <rect x={7} y={bt} width={26} height={Math.max(2, bb - bt)} fill={color} stroke={color} strokeWidth={2} rx={1.5} />
      </svg>
      <p className="text-[11px] font-semibold text-text mt-2">{title}</p>
      <p className="text-[10px] text-text-muted mt-1 leading-snug">{body}</p>
    </div>
  );
}
