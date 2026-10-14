import { useState } from 'react';
import { Question, QuizShell } from './Quiz';
import { useOnboardingStore } from '../../store/onboardingStore';
import { projectKid, HANDOVER_AGE } from '../../utils/kidsProject';

const CHILD_AGES = Array.from({ length: 21 }, (_, a) => ({
  value: a,
  label: String(a),
  sub: `${Math.max(1, HANDOVER_AGE - a)} שנות הפקדה`,
}));

const AMOUNTS = [
  { value: 200, label: '200 ₪' }, { value: 300, label: '300 ₪' },
  { value: 500, label: '500 ₪' }, { value: 750, label: '750 ₪' },
  { value: 1000, label: '1,000 ₪' }, { value: 1500, label: '1,500 ₪' },
];

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** Two questions before the children's calculator: whose, and how much. */
export function KidsIntro() {
  const [childAge, setChildAge] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const finishKids = useOnboardingStore(s => s.finishKids);

  const ready = childAge !== null && amount !== null;
  const preview = ready ? projectKid('pess', childAge, amount) : null;

  return (
    <QuizShell
      title="MGS Kids — שתי שאלות"
      sub="בן כמה הילד היום, וכמה מפקידים עבורו כל חודש. אפשר לשנות הכל אחר כך."
    >
      <Question step={1} of={2} title="בן כמה הילד היום?"
        hint="המסלול רץ עד גיל 20, ואז הוא מתחיל למשוך ממנו."
        choices={CHILD_AGES} value={childAge} onPick={setChildAge} compact />
      {childAge !== null && (
        <p className="text-[11.5px] text-text-muted -mt-3">
          בן {childAge} · נשארו <b className="text-gold">{Math.max(1, HANDOVER_AGE - childAge)}</b> שנות הפקדה
        </p>
      )}

      <Question step={2} of={2} title="כמה מפקידים עבורו כל חודש?"
        choices={AMOUNTS} value={amount} onPick={setAmount} />

      <div className="flex items-center gap-2 -mt-3">
        <span className="text-[11px] text-text-muted">או סכום אחר:</span>
        <input type="number" min={1} step={50} value={custom} placeholder="₪"
          onChange={e => { setCustom(e.target.value); const v = Number(e.target.value);
                           if (v >= 1) setAmount(v); }}
          aria-label="סכום אחר"
          className="w-24 bg-surface-3 border border-surface-4 rounded-lg px-2 py-1
                     text-[12px] text-gold text-center tabular-nums" />
      </div>

      {preview && childAge !== null && (
        <div className="rounded-xl border border-gold-border p-4" style={{ background: 'rgba(212,175,55,0.05)' }}>
          <p className="text-[11px] text-text-muted">בהערכה הזהירה, בגיל 20 הילד יקבל</p>
          <p className="text-[26px] font-semibold text-gold tabular-nums leading-tight mt-1" dir="ltr">
            {n0(preview.net)} ₪
          </p>
          <p className="text-[12px] text-text-muted">
            נטו אחרי מס · ואז {n0(preview.monthly)} ₪ בחודש לפי כלל ה-4%
          </p>
        </div>
      )}

      <button onClick={() => ready && finishKids(childAge, amount)} disabled={!ready}
        className={`text-[13px] px-5 py-2.5 rounded-lg font-semibold ${
          ready ? 'btn-gold' : 'bg-surface-3 text-text-dim cursor-not-allowed'}`}>
        {ready ? 'למחשבון המלא' : 'צריך לענות על שתי השאלות'}
      </button>
    </QuizShell>
  );
}
