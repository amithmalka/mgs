import type { ReactNode } from 'react';

/** One multiple-choice question: a prompt, and cards to pick from. */
export interface Choice<T> { value: T; label: string; sub?: string }

export function Question<T extends string | number>({
  step, of, title, hint, choices, value, onPick, columns = 3, compact = false,
}: {
  step: number; of: number; title: string; hint?: string;
  choices: Array<Choice<T>>; value: T | null;
  onPick: (v: T) => void; columns?: 2 | 3;
  /** a dense row of chips, for a long list of small answers */
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] tracking-[2px] text-gold font-semibold">
          שאלה {step} מתוך {of}
        </p>
        <h2 className="text-[20px] font-bold text-text mt-1 leading-snug">{title}</h2>
        {hint && <p className="text-[12px] text-text-muted mt-1">{hint}</p>}
      </div>
      {compact ? (
        <div className="flex flex-wrap gap-1.5">
          {choices.map(c => {
            const on = value === c.value;
            return (
              <button key={String(c.value)} type="button" onClick={() => onPick(c.value)}
                aria-pressed={on} title={c.sub}
                className={`min-w-[50px] rounded-lg border px-3 py-2 text-center transition-colors ${
                  on ? 'border-gold bg-gold text-surface font-semibold'
                     : 'border-surface-4 bg-surface-2 text-text-muted hover:border-gold-border hover:text-text'}`}>
                <span className="block text-[14px] font-semibold tabular-nums">{c.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
      <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {choices.map(c => {
          const on = value === c.value;
          return (
            <button key={String(c.value)} type="button" onClick={() => onPick(c.value)}
              aria-pressed={on}
              className={`text-start rounded-xl border p-3 transition-colors ${
                on ? 'border-gold bg-gold-muted' : 'border-surface-4 bg-surface-2 hover:border-gold-border'}`}>
              <span className={`block text-[14px] font-semibold ${on ? 'text-gold' : 'text-text'}`}>
                {c.label}
              </span>
              {c.sub && <span className="block text-[10.5px] text-text-muted mt-0.5">{c.sub}</span>}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

export function QuizShell({ title, sub, children, footer }: {
  title: string; sub: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div dir="rtl" className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <p className="text-[10px] tracking-[2.4px] text-gold font-semibold">MONEY GROWTH SYSTEM</p>
        <h1 className="text-[26px] font-bold text-gold-gradient mt-1.5">{title}</h1>
        <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">{sub}</p>
      </div>
      <div className="glass-card rounded-2xl p-5 flex flex-col gap-6">{children}</div>
      {footer}
    </div>
  );
}
