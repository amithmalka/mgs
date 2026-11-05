/** MGS · מדף המצגות. */
import { useState } from 'react';
import { DECKS } from '../../constants/decks';
import { DeckView } from './DeckView';

export function Decks() {
  const [open, setOpen] = useState<string | null>(null);
  const deck = DECKS.find(d => d.id === open);

  if (deck) return <DeckView deck={deck} onClose={() => setOpen(null)} />;

  return (
    <section>
      <span className="eyebrow">המצגות</span>
      <h2>למה כל זה עובד</h2>
      <p className="lede">
        <b>המצגות נבנות מאותו מנוע שמריץ את התיק שלכם.</b> כשמספר
        במערכת משתנה, הוא משתנה גם כאן — אין כאן גרסה ישנה שנשארה
        מאחור.
      </p>
      <div className="dk-grid">
        {DECKS.map(d => (
          <button key={d.id} className="dk-card" type="button"
            onClick={() => setOpen(d.id)}>
            <span className="dk-tag">{d.tag}</span>
            <b>{d.he}</b>
            <small>{d.sub}</small>
            <em>{d.slides.length} שקופיות ←</em>
          </button>
        ))}
      </div>
    </section>
  );
}
