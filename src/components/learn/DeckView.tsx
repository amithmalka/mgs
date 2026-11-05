/** MGS · מציג השקופיות.
 *
 *  **מצגת שנפתחת בתוך המערכת ולא קובץ נפרד.** היא נגישה מכל דפדפן,
 *  עובדת במובייל, והמספרים שבה נמשכים מאותו מנוע שמריץ את התיק —
 *  כך שהיא לא יכולה להתיישן ביחס אליו.
 */
import { useCallback, useEffect, useState } from 'react';
import { lookupTerm } from '../../constants/decks/glossary';
import type { Deck, Block } from '../../types/deck';
import { LiveBlock } from './LiveBlock';

export function DeckView({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const [i, setI] = useState(0);
  const n = deck.slides.length;
  const go = useCallback((d: number) => setI(x => Math.min(n - 1, Math.max(0, x + d))), [n]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(1);        // RTL: שמאלה = קדימה
      if (e.key === 'ArrowRight') go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, onClose]);

  useEffect(() => {
    document.getElementById('deck-top')?.scrollIntoView({ block: 'start' });
  }, [i]);

  const s = deck.slides[i];

  return (
    <div className="dk" id="deck-top">
      <header className="dk-bar">
        <button className="opt" type="button" onClick={onClose}>← לכל המצגות</button>
        <span className="dk-name">{deck.he}</span>
        <span className="dk-pos">{i + 1} / {n}</span>
      </header>

      <div className="dk-rail" aria-hidden="true">
        <i style={{ width: `${((i + 1) / n) * 100}%` }} />
      </div>

      <article className="dk-slide">
        {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
        <h2 className="dk-h">{s.title}</h2>
        {s.blocks.map((b, j) => <BlockView key={j} b={b} />)}
        {s.src && <p className="dk-src">{s.src}</p>}
      </article>

      <nav className="dk-nav">
        <button className="opt" type="button" disabled={i === 0} onClick={() => go(-1)}>
          הקודם
        </button>
        <div className="dk-dots">
          {deck.slides.map((x, j) => (
            <button key={x.id} type="button" className={`dk-dot ${j === i ? 'on' : ''}`}
              aria-label={`שקופית ${j + 1}`} title={x.title}
              onClick={() => setI(j)} />
          ))}
        </div>
        <button className="opt mp-go" type="button"
          disabled={i === n - 1} onClick={() => go(1)}>
          הבא
        </button>
      </nav>

      <p className="dk-hint">מקשי החיצים מדפדפים · Esc לסגירה</p>
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'lede':  return <p className="lede">{rich(b.text)}</p>;
    case 'p':     return <p>{rich(b.text)}</p>;
    case 'bullets': return (
      <ul className="dk-ul">{b.items.map((x, i) => <li key={i}>{rich(x)}</li>)}</ul>
    );
    case 'stats': return (
      <div className="stats">
        {b.items.map((x, i) => (
          <div key={i} className={`stat ${x.tone ?? ''}`}>
            <span className="k">{x.k}</span>
            <span className="n" dir="ltr">{x.v}</span>
            <span className="s">{x.s ?? ' '}</span>
          </div>
        ))}
      </div>
    );
    case 'table': return (
      <>
        <div className="scroll bleed">
          <table>
            <thead><tr>{b.head.map((h, i) => (
              <th key={i} className={i === 0 ? 'lead' : undefined}>{h}</th>
            ))}</tr></thead>
            <tbody>{b.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => (
                <td key={j} className={j === 0 ? 'lead' : undefined}
                  dir={j === 0 ? undefined : 'ltr'}>{c}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
        {b.note && <p className="note">{rich(b.note)}</p>}
      </>
    );
    case 'quote': return (
      <blockquote className="dk-q">
        <p>{rich(b.text)}</p>
        {b.by && <cite>{b.by}</cite>}
      </blockquote>
    );
    case 'warn': return <p className="lab-access warn">{rich(b.text)}</p>;
    case 'good': return <p className="lab-access dk-good">{rich(b.text)}</p>;
    case 'vs': return (
      <div className="dk-vs">
        {[b.a, b.b].map((c, i) => (
          <div key={i} className="dk-col">
            <h4>{c.h}</h4>
            <ul>{c.items.map((x, j) => <li key={j}>{rich(x)}</li>)}</ul>
          </div>
        ))}
      </div>
    );
    case 'timeline': return (
      <ol className="dk-tl">
        {b.items.map((x, i) => (
          <li key={i}><b dir="ltr">{x.when}</b><span>{rich(x.what)}</span></li>
        ))}
      </ol>
    );
    case 'live': return <LiveBlock id={b.id} />;
  }
}

/** **הדגשה ומונחים, בלי לפתוח דלת ל-HTML.**
 *
 *  `**כך**` הופך למודגש, ו-`[[חציון]]` הופך למונח שאפשר לפתוח
 *  ולקרוא מה הוא אומר. כל השאר נשאר טקסט — אין כאן
 *  `dangerouslySetInnerHTML`, ולכן אין דרך להזריק מכאן סימון.
 *
 *  **ולמה מונח ולא הערת שוליים.** הסבר שיושב בתחתית השקופית נקרא
 *  רק אחרי שהקורא כבר נתקע. כאן ההסבר נמצא **על המילה עצמה**,
 *  ברגע שהיא מופיעה — ומי שכבר יודע פשוט ממשיך לקרוא. */
function rich(s: string) {
  return s.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('[[') && part.endsWith(']]'))
      return <TermChip key={i} k={part.slice(2, -2)} />;
    return <span key={i}>{part}</span>;
  });
}

/** **המונח שנפתח במקום.** סגור הוא מילה עם קו מקווקו; פתוח הוא
 *  שלוש שורות — מה זה, למה מודדים את זה, ודוגמה במספרים. */
function TermChip({ k }: { k: string }) {
  const [open, setOpen] = useState(false);
  const t = lookupTerm(k);
  if (!t) return <span>{k}</span>;   // מונח שאין לו ערך — טקסט רגיל
  return (
    <span className="gl-wrap">
      <button type="button" className="gl-term" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        {k}
      </button>
      {open && (
        <span className="gl-pop" role="note">
          <b className="gl-h">{t.he}</b>
          <span className="gl-what">{rich(t.what)}</span>
          <span className="gl-why">{rich(t.why)}</span>
          {t.ex && <span className="gl-ex">{rich(t.ex)}</span>}
        </span>
      )}
    </span>
  );
}
