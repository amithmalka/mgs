import { useState } from 'react';
import { Question, QuizShell } from './Quiz';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useMgsStore } from '../../store/mgsStore';
import { useStore } from '../../store';
import { projectTrack, recommendModel, INCOME_AGE } from '../../utils/trackProject';
import { horizonFor } from '../../constants/mgsScenarios';

const AGES = [
  { value: 20, label: '20–29', sub: '30 שנות מסלול' },
  { value: 30, label: '30–39', sub: '25 שנות מסלול' },
  { value: 40, label: '40–49', sub: '20 שנות מסלול' },
  { value: 50, label: '50–54', sub: '15 שנות מסלול' },
  { value: 55, label: '55–59', sub: '15 שנות מסלול' },
  { value: 60, label: '60 ומעלה', sub: '10 שנות מסלול' },
];

const DEPOSITS = [
  { value: 1000, label: '1,000 ₪' }, { value: 2000, label: '2,000 ₪' },
  { value: 3000, label: '3,000 ₪' }, { value: 4000, label: '4,000 ₪' },
  { value: 5000, label: '5,000 ₪' }, { value: 7500, label: '7,500 ₪' },
  { value: 10000, label: '10,000 ₪' },
];

const GOAL_2 = { value: 2, label: 'צמיחה ותזרים', sub: 'התיק גדל, ובמקביל נבנה תזרים חודשי שמתחזק עם השנים' };
const GOAL_1 = { value: 1, label: 'תזרים בלבד', sub: 'מזומן ביד כבר מהשנים הראשונות, על חשבון הגודל בסוף' };

/** From 55 the cash-flow track is the recommendation, and it says so. */
function goalsFor(age: number | null) {
  if (age !== null && age >= INCOME_AGE) {
    return [{ ...GOAL_1, sub: 'מומלץ בגיל הזה — באופק של 10–15 שנה רק המסלול הזה בונה תזרים אמיתי' },
            { ...GOAL_2, sub: 'אפשרי, אבל התזרים בסוף יהיה זניח: מחזורי הקציר לא מספיקים' }];
  }
  return [GOAL_2, GOAL_1];
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/**
 * Three questions before anything else: how old, how much a month, and whether
 * the point is cash flow alone or growth alongside it. The answers set the age
 * and deposit the whole app reads, so nothing has to be entered twice.
 */
export function Onboarding() {
  const [age, setAge] = useState<number | null>(null);
  const [deposit, setDeposit] = useState<number | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  const finish = useOnboardingStore(s => s.finish);
  const setStoreAge = useMgsStore(s => s.setAge);
  const setParams = useStore(s => s.setSimulationParams);

  const pickAge = (a: number) => { setAge(a); setGoal(recommendModel(a)); };

  const ready = age !== null && deposit !== null && goal !== null;
  const preview = ready ? projectTrack('pess', goal as 1 | 2, age, deposit) : null;
  const years = age !== null ? horizonFor(age).reduce((a, b) => a + b, 0) : 0;

  const go = () => {
    if (!ready) return;
    setStoreAge(age);
    setParams({ monthlyDeposit: deposit });
    finish(goal as 1 | 2);
  };

  return (
    <QuizShell
      title="לפני שמתחילים — שלוש שאלות"
      sub="הן קובעות את האופק, את ההפקדה ואת המסלול. אפשר לשנות הכל אחר כך בכל רגע."
    >
      <Question step={1} of={3} title="בן כמה אתה?"
        hint="הגיל קובע כמה שנים המסלול רץ ומתי מתחילים למשוך."
        choices={AGES} value={age} onPick={pickAge} />

      <Question step={2} of={3} title="כמה אפשר להפקיד כל חודש?"
        hint="אפשר להתחיל קטן ולהעלות בהמשך — התוצאה גדלה ביחס ישר."
        choices={DEPOSITS} value={deposit} onPick={setDeposit} />

      <div className="flex items-center gap-2 -mt-3">
        <span className="text-[11px] text-text-muted">או סכום אחר:</span>
        <input type="number" min={100} step={100} value={custom} placeholder="₪"
          onChange={e => { setCustom(e.target.value); const v = Number(e.target.value);
                           if (v >= 100) setDeposit(v); }}
          aria-label="סכום הפקדה אחר"
          className="w-24 bg-surface-3 border border-surface-4 rounded-lg px-2 py-1
                     text-[12px] text-gold text-center tabular-nums" />
      </div>

      <Question step={3} of={3} title="מה העיקר בשבילך?"
        hint="שני המסלולים מחזיקים את אותם נכסים — ההבדל הוא מתי הכסף יוצא."
        choices={goalsFor(age)} value={goal} onPick={setGoal} columns={2} />

      {preview && age !== null && deposit !== null && (
        <div className="rounded-xl border border-gold-border p-4" style={{ background: 'rgba(212,175,55,0.05)' }}>
          <p className="text-[11px] text-text-muted">
            לפי מה שבחרת — {years} שנות מסלול, {n0(deposit)} ₪ בחודש, בהערכה הזהירה
          </p>
          <p className="text-[26px] font-semibold text-gold tabular-nums leading-tight mt-1" dir="ltr">
            {n0(preview.monthly)} ₪
          </p>
          <p className="text-[12px] text-text-muted">
            בחודש מגיל {age + years} · ועוד {n0(preview.received)} ₪ שיתקבלו במזומן בדרך
          </p>
        </div>
      )}

      <button onClick={go} disabled={!ready}
        className={`text-[13px] px-5 py-2.5 rounded-lg font-semibold ${
          ready ? 'btn-gold' : 'bg-surface-3 text-text-dim cursor-not-allowed'}`}>
        {ready ? 'כניסה למערכת' : 'צריך לענות על שלוש השאלות'}
      </button>
    </QuizShell>
  );
}
