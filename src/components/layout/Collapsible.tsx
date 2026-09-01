import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../shared/Icon';

/**
 * A section that starts closed unless it is the main thing on the screen.
 *
 * The screens grew by stacking every card a topic could need, so each one
 * opened with a dozen panels and read as noise. Anything that is reference or
 * detail lives in here, closed, so a screen opens with only what it is for.
 */
export function Collapsible({
  title, subtitle, children, defaultOpen = false, badge,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-surface-4 bg-surface-2/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-surface-3/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-gold-light tracking-wide flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-4 text-text-dim font-normal">
                {badge}
              </span>
            )}
          </h3>
          {subtitle && <p className="text-[11px] text-text-muted mt-0.5 font-light">{subtitle}</p>}
        </div>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} className="text-text-muted flex-shrink-0" />
      </button>

      {open && <div className="px-1 pb-1">{children}</div>}
    </div>
  );
}
