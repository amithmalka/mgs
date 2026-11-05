/** MGS · שדה מספר שאפשר באמת להקליד בו.
 *
 *  **הבאג שזה מתקן.** שדה מבוקר שחותך לטווח בכל הקשה אינו ניתן
 *  להקלדה: מי שמקליד ״30״ בשדה גיל שחתוך ל-18–75 מקבל אחרי ההקשה
 *  הראשונה ״3״ → 18, ואז ״180״ → 75. המספר קופץ מתחת לאצבע,
 *  ואי אפשר להגיע לערך שבאמצע.
 *
 *  **הפתרון הוא טיוטה.** בזמן ההקלדה השדה מחזיק את מה שהוקלד כמות
 *  שהוא, **בלי חיתוך**. החיתוך קורה ביציאה מהשדה או ב-Enter — שם
 *  הוא נכון ואינו מפריע. שדה ריק חוזר לערך שהיה.
 */
import { useEffect, useState } from 'react';

export function NumField({
  value, min, max, step = 1, unit, label, onCommit, className = 'amt', width,
}: {
  value: number; min: number; max: number; step?: number;
  unit?: string; label: string; onCommit: (v: number) => void;
  className?: string; width?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  // כשהערך משתנה מבחוץ (מקור אמת אחר) — מסתנכרנים, אבל לא תוך כדי הקלדה
  const [typing, setTyping] = useState(false);
  useEffect(() => { if (!typing) setDraft(String(value)); }, [value, typing]);

  const commit = () => {
    setTyping(false);
    const n = Number(draft);
    if (draft.trim() === '' || Number.isNaN(n)) { setDraft(String(value)); return; }
    const c = Math.min(max, Math.max(min, Math.round(n / step) * step));
    setDraft(String(c));
    if (c !== value) onCommit(c);
  };

  return (
    <label className="own">
      <input
        className={className} type="number" inputMode="numeric"
        min={min} max={max} step={step} value={draft} aria-label={label}
        style={width ? { width } : undefined}
        onFocus={e => { setTyping(true); e.currentTarget.select(); }}
        onChange={e => { setTyping(true); setDraft(e.target.value); }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { setTyping(false); setDraft(String(value)); }
        }} />
      {unit && <span>{unit}</span>}
    </label>
  );
}
