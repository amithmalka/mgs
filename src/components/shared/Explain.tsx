import { useState } from 'react';
import { EXPLAIN, type ExplainKey } from '../../constants/mgsExplain';
import { Icon } from './Icon';

/**
 * The small "?" beside a heading, and the panel it opens.
 *
 * Collapsed by default so the screen stays readable for someone who already
 * knows the system, and one tap away for someone who does not.
 */
export function Explain({ topic, className = '' }: { topic: ExplainKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const e = EXPLAIN[topic];
  if (!e) return null;

  return (
    <span className={`inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`הסבר: ${e.title}`}
        className="w-[15px] h-[15px] rounded-full border border-gold-border text-gold
                   text-[10px] leading-none flex items-center justify-center
                   hover:bg-gold-muted transition-colors flex-shrink-0"
      >
        ?
      </button>
      {open && <ExplainPanel topic={topic} onClose={() => setOpen(false)} />}
    </span>
  );
}

/**
 * The panel itself. `inline` drops the popover positioning so it can sit in
 * normal flow — needed wherever the heading is already a button and a nested
 * one would be invalid.
 */
export function ExplainPanel(
  { topic, onClose, inline = false }: { topic: ExplainKey; onClose?: () => void; inline?: boolean },
) {
  const e = EXPLAIN[topic];
  if (!e) return null;

  return (
    <div
      dir="rtl"
      className={inline
        ? 'rounded-xl border p-3.5 mb-4'
        : 'absolute z-20 mt-6 right-0 w-[290px] rounded-xl border p-3.5 shadow-xl'}
      style={{ background: '#17181C', borderColor: 'rgba(212,175,55,0.22)' }}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <h4 className="text-[12px] font-semibold text-gold-light flex-1 leading-snug">{e.title}</h4>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="סגירה"
                  className="text-text-dim hover:text-text transition-colors flex-shrink-0">
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      <p className="text-[11.5px] leading-relaxed text-text-muted font-light">{e.body}</p>

      {e.facts && e.facts.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'rgba(212,175,55,0.12)' }}>
          {e.facts.map((f, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 py-[3px]">
              <span className="text-[10.5px] text-text-dim font-light leading-snug">{f.label}</span>
              <span className="text-[11px] text-text font-semibold flex-shrink-0">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {e.note && (
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-text-dim font-light">{e.note}</p>
      )}
    </div>
  );
}
