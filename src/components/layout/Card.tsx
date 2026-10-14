import type { ReactNode } from 'react';
import { Explain } from '../shared/Explain';
import type { ExplainKey } from '../../constants/mgsExplain';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  float?: boolean;
  /** shows a "?" beside the title that opens the explanation for this topic */
  explain?: ExplainKey;
}

export function Card({ title, subtitle, children, className = '', glow = false, float = false, explain }: CardProps) {
  return (
    <div className={`glass-card rounded-2xl p-5 animate-fade-in ${glow ? 'gold-glow' : ''} ${float ? 'animate-float' : ''} ${className}`}>
      {title && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">{title}</h3>
            {explain && <Explain topic={explain} />}
          </div>
          {subtitle && <p className="text-[11px] text-text-muted mt-0.5 font-light">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
