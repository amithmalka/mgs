/** **לוח הפקודות — ⌘K / Ctrl+K.**
 *
 *  **למה זה הפיצ׳ר ולא אנימציה.** למערכת תשע לשוניות, וחלק
 *  מהמסלול בתוכן דורש שלוש הקלקות. לוח פקודות הופך כל יעד
 *  לשתי הקשות: `⌘K`, ואז שתי אותיות מהשם. **זה הדבר שמשתמש
 *  כבד מרגיש בו כל יום**, בניגוד לאפקט שמרשים פעם אחת.
 *
 *  **החיפוש מכוון לעברית ולאנגלית גם יחד** — ״מס״ מוצא את
 *  מחשבון מס המשיכה, ו-`tax` מוצא אותו גם כן, כי שתי השפות
 *  נמצאות באינדקס בלי קשר לשפת התצוגה.
 *
 *  נגישות: `role="listbox"`, חיצים, Enter ו-Escape, ומיקוד
 *  שחוזר למקום שממנו נפתח.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/translations';
import { useLangStore } from '../../store/langStore';
import type { Tab } from '../layout/Sidebar';

/** היעדים, ובסוגריים הכינויים שמוצאים אותם בחיפוש. */
const TARGETS: Array<{ id: Tab; he: string; en: string; alias: string }> = [
  { id: 'dashboard', he: 'התיק שלי', en: 'My portfolio', alias: 'תיק בית portfolio home holdings' },
  { id: 'month', he: 'החודש', en: 'This month', alias: 'קנייה הפקדה buy deposit month' },
  { id: 'build', he: 'לבחור תיק', en: 'Choose a portfolio', alias: 'מסלול קומבינציה combo track build' },
  { id: 'study', he: 'קרן השתלמות', en: 'Study fund', alias: 'השתלמות גמל study fund pension' },
  { id: 'tax', he: 'הפקדות ומשיכות', en: 'Deposits & withdrawals', alias: 'הפקדה משיכה מס אישור תזכורת tax withdraw deposit 88' },
  { id: 'kids', he: 'MGS Kids', en: 'MGS Kids', alias: 'ילדים ילד kids child' },
  { id: 'academy', he: 'ללמוד', en: 'Learn', alias: 'מצגות שיעור academy learn decks' },
  { id: 'mgs', he: 'MGS', en: 'MGS', alias: 'mgs מנוע engine' },
  { id: 'system', he: 'המערכת', en: 'System', alias: 'מערכת system map' },
];

export function CommandPalette({ onPick }: { onPick: (t: Tab) => void }) {
  const { lang } = useLangStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const from = useRef<Element | null>(null);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TARGETS;
    return TARGETS.filter(x =>
      x.he.toLowerCase().includes(s) || x.en.toLowerCase().includes(s) || x.alias.toLowerCase().includes(s));
  }, [q]);

  // ⌘K פותח, וגם סוגר — אותה הקשה, כמו בכל כלי שמשתמשים בו
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => {
          if (!v) { from.current = document.activeElement; setQ(''); setI(0); }
          return !v;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { setI(0); }, [q]);

  const close = () => {
    setOpen(false);
    (from.current as HTMLElement | null)?.focus?.();
  };
  const pick = (tab: Tab) => { onPick(tab); close(); };

  if (!open) return null;

  return (
    <div className="cmdk-back" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label={t('cmdkTitle', lang)}>
        <input
          ref={input} value={q} onChange={e => setQ(e.target.value)}
          placeholder={t('cmdkPlaceholder', lang)}
          role="combobox" aria-expanded aria-controls="cmdk-list" aria-autocomplete="list"
          onKeyDown={e => {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(v + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI(v => Math.max(v - 1, 0)); }
            else if (e.key === 'Enter' && hits[i]) { e.preventDefault(); pick(hits[i].id); }
          }}
        />
        {hits.length === 0 ? (
          <p className="none">{t('cmdkNone', lang)}</p>
        ) : (
          <ul id="cmdk-list" role="listbox">
            {hits.map((x, n) => (
              <li
                key={x.id} role="option" aria-selected={n === i}
                onMouseEnter={() => setI(n)} onMouseDown={() => pick(x.id)}
              >
                <span>{lang === 'he' ? x.he : x.en}</span>
                {n === i && <span className="k">↵</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="foot">
          <span>↑↓ {t('cmdkMove', lang)}</span>
          <span>↵ {t('cmdkOpen', lang)}</span>
          <span>esc {t('close', lang)}</span>
        </div>
      </div>
    </div>
  );
}
